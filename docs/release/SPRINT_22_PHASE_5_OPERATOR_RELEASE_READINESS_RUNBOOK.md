# Sprint 22 Phase 5 - Runbook operateur Release Readiness

Date: 2026-05-05
Objectif: passer une decision de `PROD_NO_GO` a `PROD_READY` depuis
l'interface, sans deploiement ni action mutante hors signoffs.

## Perimetre

Ce runbook couvre uniquement l'ecran applicatif `Release readiness`.
L'operateur doit:

- ouvrir la page de decision production;
- lire les blockers affiches;
- ajouter les preuves et signatures humaines;
- verifier les gates production;
- recalculer la decision;
- exporter et attacher la decision au ticket de release.

Ce runbook ne remplace pas les scripts Sprint 20. Il donne la procedure
operateur quand les gates techniques ont deja ete preparees et que la decision
doit etre finalisee via l'interface.

## Pre-requis

Compte applicatif:

- permission `release:read` pour voir la page et la decision;
- permission `release:write` pour enregistrer les signoffs;
- permission `audit:read` si l'operateur doit recouper la trace d'audit.

Contexte attendu avant ouverture de page:

- les preuves techniques sont disponibles dans le ticket ou la GED;
- les URLs de preuve sont accessibles par les validateurs;
- les gates production ont ete posees cote environnement backend;
- aucun deploy, tag, push, migration, seed ou restore n'est lance depuis cette
  procedure.

Route applicative:

```text
/admin/release
```

Le menu lateral affiche l'entree `Release readiness` pour les profils non
agents ayant `release:read`.

## Etats visibles

L'ecran affiche une decision globale:

- `PROD_NO_GO`: au moins un signoff, une preuve ou une gate bloque;
- `PROD_READY`: tous les signoffs obligatoires sont `GO` avec preuve et toutes
  les gates obligatoires sont `PASSED`.

La section `Blockers` est la source de travail prioritaire. Elle liste les
raisons qui empechent `PROD_READY`.

## Lire les blockers

Ouvrir `Release readiness`, puis traiter chaque ligne de `Blockers`.

| Blocker affiche | Cause probable | Action operateur |
| --- | --- | --- |
| `Missing HR signoff` | Aucun signoff RH enregistre. | Renseigner la carte `RH`, choisir `GO` ou `NO_GO`, ajouter signataire et preuve si `GO`. |
| `Pending SECURITY signoff` | Le signoff Securite existe mais reste `En attente`. | Obtenir l'arbitrage Securite, puis enregistrer `GO` avec preuve ou `NO_GO` motive. |
| `OPERATIONS signoff is NO_GO` | L'exploitation a explicitement bloque. | Ne pas forcer. Faire lever le risque, puis remplacer par `GO` uniquement apres nouvelle validation. |
| `TECHNICAL signoff has no proof URL` | Un `GO` technique existe sans URL exploitable. | Ajouter une URL `http(s)` de preuve et un libelle clair. |
| `FREEZE gate is UNKNOWN` | `PROD_FREEZE_STATUS` n'est pas lu comme pret. | Demander a l'owner release de confirmer `PROD_FREEZE_STATUS=FREEZE_READY` cote backend. |
| `SMOKE gate is FAILED` | `PROD_GATE_SMOKE` existe mais n'est pas `PASSED`. | Joindre le rapport d'echec, corriger hors runbook, puis refaire valider la gate. |
| `BACKUP gate is UNKNOWN` | La preuve backup/restore n'est pas declaree cote gate. | Attacher la preuve backup/restore et faire poser `PROD_GATE_BACKUP=PASSED`. |

Les blockers de gates suivent tous le meme modele: `<GATE> gate is UNKNOWN` ou
`<GATE> gate is FAILED`. Une gate ne disparait que lorsque sa source backend
retourne le statut attendu.

## Ajouter preuves et signatures

La matrice contient cinq cartes obligatoires:

- `RH`;
- `Securite`;
- `Operations`;
- `Technique`;
- `Direction`.

Pour chaque carte:

1. Selectionner la decision: `En attente`, `GO` ou `NO_GO`.
2. Pour `GO` ou `NO_GO`, renseigner `Signataire`.
3. Renseigner `Role` avec la fonction reelle du signataire.
4. Pour `GO`, renseigner `Preuve URL` avec une URL `http` ou `https`
   accessible.
5. Renseigner `Libelle preuve` avec un nom exploitable dans le dossier de
   release.
6. Renseigner `Commentaire` si la decision porte une reserve, un contexte ou
   une reference de ticket.
7. Cliquer `Enregistrer le signoff`.

Regles de validation de l'interface:

- un `GO` sans `Preuve URL` est refuse;
- une preuve `GO` doit etre une URL `http(s)` valide;
- un `GO` ou `NO_GO` sans signataire est refuse;
- repasser une carte a `En attente` efface les champs de signature et preuve
  cote backend.

Preuves recommandees par role:

| Role | Preuve minimale attendue |
| --- | --- |
| RH | PV de recette RH, ecarts acceptes, confirmation support utilisateurs. |
| Securite | Revue dependances, acces/secrets, risques residuels acceptes. |
| Operations | Checklist exploitation, backup/restore, rollback, astreinte. |
| Technique | Compte rendu technique, plan de bascule, impacts connus. |
| Direction | Decision sponsor datee, fenetre approuvee, criteres rollback. |

## Valider les gates

La section `Gates production` affiche:

- `FREEZE`, source `PROD_FREEZE_STATUS`;
- `MIGRATION`, source `PROD_GATE_MIGRATION`;
- `SEED`, source `PROD_GATE_SEED`;
- `SMOKE`, source `PROD_GATE_SMOKE`;
- `COMPLIANCE`, source `PROD_GATE_COMPLIANCE`;
- `AUDIT`, source `PROD_GATE_AUDIT`;
- `BACKUP`, source `PROD_GATE_BACKUP`.

L'operateur ne modifie pas ces gates dans l'interface. Il verifie que chacune
affiche `PASSED`.

Valeurs attendues cote backend:

| Gate | Valeur attendue |
| --- | --- |
| `FREEZE` | `PROD_FREEZE_STATUS=FREEZE_READY` |
| `MIGRATION` | `PROD_GATE_MIGRATION=PASSED` |
| `SEED` | `PROD_GATE_SEED=PASSED` |
| `SMOKE` | `PROD_GATE_SMOKE=PASSED` |
| `COMPLIANCE` | `PROD_GATE_COMPLIANCE=PASSED` |
| `AUDIT` | `PROD_GATE_AUDIT=PASSED` |
| `BACKUP` | `PROD_GATE_BACKUP=PASSED` |

Si une gate affiche `UNKNOWN` ou `FAILED`, conserver `PROD_NO_GO`, attacher la
preuve du blocage au ticket, puis demander au responsable de la gate de corriger
la source. Ne pas saisir un signoff humain pour masquer une gate non validee.

## Recalculer la decision

Apres chaque `Enregistrer le signoff`, l'ecran recharge la decision.

Procedure de recalcul:

1. Enregistrer le signoff modifie.
2. Attendre le retour visuel de la page.
3. Relire le badge de decision en haut de page.
4. Si le badge reste `PROD_NO_GO`, retraiter la section `Blockers`.
5. Si une gate vient d'etre corrigee cote backend, rafraichir la page
   `Release readiness`.
6. Continuer jusqu'a disparition complete de la section `Blockers`.

La decision est prete uniquement lorsque:

- le badge affiche `PROD_READY`;
- la section `Blockers` n'est plus presente;
- le message `Tous les signoffs et gates obligatoires sont valides` est
  visible;
- chaque carte de signoff obligatoire porte le bon signataire et la bonne
  preuve;
- chaque gate production affiche `PASSED`.

## Exporter et attacher la decision

Quand `PROD_READY` est visible:

1. Exporter la page depuis le navigateur en PDF ou capture horodatee.
2. Nommer le fichier avec la date et le statut, par exemple
   `release-readiness-PROD_READY-2026-05-05.pdf`.
3. Attacher ce fichier au ticket de release.
4. Attacher aussi les preuves liees par URL si le systeme de ticket ne conserve
   pas les liens externes.
5. Ajouter un commentaire de decision contenant:
   - statut final: `PROD_READY`;
   - date et heure de validation;
   - tenant ou perimetre concerne;
   - liste des cinq signataires;
   - confirmation que les gates sont toutes `PASSED`;
   - lien vers le PDF ou la capture de la page.

Modele de commentaire:

```text
Decision release readiness: PROD_READY
Date/heure: YYYY-MM-DD HH:mm TZ
Perimetre: <tenant / environnement>
Signoffs GO: RH, Securite, Operations, Technique, Direction
Gates PASSED: FREEZE, MIGRATION, SEED, SMOKE, COMPLIANCE, AUDIT, BACKUP
Preuves: voir pieces jointes et URLs de signoff
Decision attachee: <nom du PDF ou lien ticket>
```

Si le badge reste `PROD_NO_GO`, exporter quand meme la page uniquement pour un
compte rendu de blocage. Le fichier doit alors etre nomme avec `PROD_NO_GO` et
le ticket doit rester ouvert.

## Controle final operateur

Avant de demander le GO final:

- le badge global affiche `PROD_READY`;
- aucun blocker n'est visible;
- aucun signoff obligatoire n'est `En attente` ou `NO_GO`;
- chaque `GO` a un signataire, un role et une preuve URL;
- les URLs de preuve ouvrent le bon document;
- toutes les gates affichent `PASSED`;
- la decision exportee est attachee au ticket;
- le commentaire de decision est ajoute au ticket;
- la trace d'audit des signoffs est consultable si demandee.

## Garde-fous

Cette procedure ne doit jamais servir a:

- deployer;
- creer ou pousser un tag;
- pousser une branche;
- modifier une version package;
- lancer migration, seed, backup, restore ou mutation de donnees;
- remplacer une gate technique par une validation humaine;
- passer `GO` sans preuve reelle et accessible.

Un `PROD_READY` obtenu via l'interface est une decision documentee. Il ne
declenche pas automatiquement la mise en production.
