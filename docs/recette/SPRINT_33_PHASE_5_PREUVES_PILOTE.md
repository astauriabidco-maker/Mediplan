# Sprint 33 Phase 5 - Preuves robustes pilote externe

## Objectif

Durcir la collecte et l'exploitation des preuves du pilote externe controle.
La Phase 5 transforme les captures et notes de recette en preuves robustes:
horodatees, referencees, anonymisees, rattachees au commit ou build teste,
stockees dans un espace restreint et reconstructibles via audit trail.

Ce document ne declenche aucune migration, aucun reset DB, aucune suppression
massive et aucun push. Il decrit uniquement les regles de preuve a appliquer
pendant le pilote Sprint 33.

## Perimetre

| Domaine | Inclus | Hors perimetre |
| --- | --- | --- |
| Captures | Ecrans Ops, Audit, RH, Manager, decisions et reserves. | Capture de donnees nominatives brutes partagees hors espace restreint. |
| Liens | URL interne, ticket recette, reference fichier, trace audit. | Lien public, lien mail non controle, partage direct non journalise. |
| Horodatage | Date session, heure locale, fuseau, horodatage audit si disponible. | Reconstruction approximative sans note d'observateur. |
| Version | Commit, build, tag, environnement et tenant pilote. | Mention vague du type "derniere version". |
| Stockage | Espace projet restreint avec droits nominatifs. | Dossier personnel, messagerie, outil public ou export non protege. |
| Anonymisation | Alias stables, masquage noms, emails, SSO, identifiants sensibles. | Suppression de contexte qui rend la preuve inexploitable. |
| Integrite | Hash, reference ticket, nommage stable et controle anti-duplication. | Fichier renomme sans trace ni lien avec le parcours. |
| Audit trail | Evenement applicatif, action observee, acteur pseudonymise, decision. | Preuve isolee impossible a relier au scenario execute. |

## Convention de preuve

Chaque preuve doit porter une reference unique:

```text
S33-P5-<parcours>-<numero>-<objet>-<date>-<env>
```

Exemples:

- `S33-P5-OPS-01-cockpit-critical-2026-05-08-preprod`
- `S33-P5-AUDIT-04-resolution-trace-2026-05-08-preprod`
- `S33-P5-RH-02-export-anonymise-2026-05-08-pilote`

La reference doit etre reprise dans le ticket de recette, le nom de fichier,
la note de parcours et, si possible, le commentaire de decision.

## Metadonnees obligatoires

| Champ | Regle | Exemple |
| --- | --- | --- |
| Reference preuve | Unique, stable et lisible. | `S33-P5-OPS-01-cockpit-critical-2026-05-08-preprod` |
| Parcours | Manager, RH, Ops, Audit ou Decision. | `Ops` |
| Scenario | ID du script ou checklist pilote. | `P32-P5-03` ou `P31-P3-08` |
| Environnement | URL ou alias interne non public. | `preprod-pilote` |
| Tenant | Alias pilote anonymise. | `tenant-pilote-a` |
| Date et heure | Heure locale + fuseau. | `2026-05-08 14:35 Europe/Paris` |
| Version | Commit SHA court et build si disponible. | `commit abc1234`, `build 2026.05.08.1` |
| Operateur | Alias role, pas email nominatif. | `ops-pilote-01` |
| Observateur | Alias ou role. | `observateur-recette-01` |
| Stockage | Emplacement restreint ou reference ticket. | `ticket PILOTE-33-P5`, dossier restreint `preuves/S33/P5` |
| Hash | SHA-256 du fichier quand un fichier est conserve. | `sha256:<64 hex>` |
| Statut anonymisation | `OK`, `RESTREINT`, `A_REPRENDRE`. | `OK` |
| Audit associe | ID evenement ou filtre audit permettant de retrouver la trace. | `audit:event:ops-action-resolved` |

## Captures et liens

| Type de preuve | Regle de capture | Lien ou reference attendu |
| --- | --- | --- |
| Capture ecran | PNG pleine page ou zone utile, sans barre personnelle ni notification systeme. | Reference fichier + ticket recette. |
| Capture formulaire | Masquer noms, emails, SSO, commentaires libres sensibles avant partage externe. | Reference fichier + statut anonymisation. |
| Capture audit | Conserver date, action, famille, statut et contexte minimal. | Filtre audit reproduisible + ID evenement si disponible. |
| Export | CSV/XLSX anonymise, colonnes minimales, hash obligatoire. | Reference fichier + hash + proprietaire. |
| Lien applicatif | URL interne seulement, avec environnement et tenant explicites. | Ticket restreint, jamais un lien public. |
| Note de parcours | Obligatoire si capture impossible ou insuffisante. | Texte signe par observateur + horodatage. |

Les liens doivent pointer vers une ressource controlee. Si un lien donne acces
a une preuve non anonymisee, il doit rester en cercle restreint et porter le
statut `RESTREINT`, pas `PARTAGEABLE`.

## Horodatage et version

Avant la session, l'observateur note:

```text
Date session:
Fuseau:
Environnement:
Tenant:
Commit teste:
Build teste:
URL interne:
Compte operateur:
Compte observateur:
```

Pendant la session, chaque preuve doit etre rattachee a l'heure de l'action.
Si l'audit applicatif affiche un horodatage different de l'heure observateur,
conserver les deux valeurs et noter le decalage apparent.

Regle minimale:

- pas de preuve pilote sans date;
- pas de decision pilote sans commit ou build;
- pas de capture externe sans environnement et tenant;
- pas de note substitutive sans operateur et observateur.

## Stockage restreint

| Regle | Application |
| --- | --- |
| Acces nominatifs | Seuls sponsor pilote, referent conformite, observateur recette et lead Mediplan autorises. |
| Pas de diffusion mail | Envoyer un lien vers l'espace restreint, pas la piece jointe. |
| Preuves non anonymisees | Stocker uniquement en zone `RESTREINT`, avec justification et date de purge cible. |
| Preuves partageables | Stocker en zone `PARTAGEABLE` apres controle anonymisation. |
| Exports | Hash obligatoire, droits de lecture limites, pas de copie locale durable. |
| Retention | Conserver seulement la duree necessaire a la recette et au PV pilote. |
| Journal d'acces | Noter qui ajoute, consulte, remplace ou refuse une preuve. |

Structure recommandee:

```text
preuves/S33/P5/
  RESTREINT/
  PARTAGEABLE/
  REJETEES/
  manifest.md
```

`manifest.md` contient les references, chemins restreints, hash, statut
d'anonymisation, responsable et decision de conservation.

## Anonymisation

| Donnee | Traitement obligatoire | Statut si impossible |
| --- | --- | --- |
| Nom, prenom, matricule agent | Alias stable `AGENT-001`. | `RESTREINT` |
| Email, login, SSO | Masquage complet ou alias role. | `RESTREINT` |
| Patient | Exclure de la preuve ou pseudonymiser strictement. | `REJETER` sauf validation conformite explicite. |
| Commentaire libre | Relire et masquer details personnels, medicaux ou disciplinaires. | `A_REPRENDRE` |
| Tenant ou hopital reel | Alias pilote non public. | `RESTREINT` |
| Service sensible | Generaliser l'intitule si necessaire. | `RESTREINT` |
| Horodatage | Conserver precision utile a l'audit, arrondir si exposition externe non necessaire. | `RESTREINT` |
| Piece jointe | Eviter; sinon hash + stockage restreint + validation conformite. | `RESTREINT` |

Une preuve marquee `A_REPRENDRE` ne peut pas soutenir une decision `PILOT_GO`.
Une preuve marquee `RESTREINT` peut soutenir une decision interne, mais ne doit
pas etre diffusee au-dela du cercle valide.

## Hash et reference

Pour chaque fichier conserve, calculer un hash SHA-256 et l'ajouter au
manifest:

```text
Reference:
Fichier:
Sha256:
Taille:
Date collecte:
Collecteur:
Statut anonymisation:
Audit associe:
Ticket:
Decision: ACCEPTEE / RESTREINTE / REJETEE / REMPLACEE
```

Si une preuve est remplacee, ne pas ecraser silencieusement l'entree. Ajouter
une ligne `REMPLACEE_PAR` avec la nouvelle reference et la raison:

```text
Reference initiale:
Decision: REMPLACEE
Remplacee par:
Raison:
Auteur:
Date:
```

## Audit trail

Une preuve robuste doit permettre de reconstruire la sequence:

1. contexte de session;
2. action realisee;
3. ecran ou export observe;
4. trace applicative ou audit associee;
5. reserve ou decision;
6. responsable de suite.

| Parcours | Trace audit attendue |
| --- | --- |
| Ops cockpit | Consultation tenant, statut, KPI et periode si journalises. |
| Action Center | Assignation, commentaire, changement de statut, preuve rattachee. |
| Runbook | Consultation du runbook et permissions visibles. |
| Audit | Filtre applique, evenement ouvert, detail consulte. |
| RH | Export, consultation dossier anonymise, filtre applique. |
| Manager | Preview, arbitrage, validation ou reserve de publication. |

Si la trace audit attendue n'existe pas, la reserve est au minimum `P2`. Si
l'action sensible ne peut pas etre reconstruite, la reserve devient `P1` et
bloque un `PILOT_GO`.

## Capture impossible

Une capture peut etre impossible pour cause de navigateur indisponible,
restriction conformite, donnees trop sensibles, panne outil ou session a
distance non enregistrable. Dans ce cas, utiliser une note substitutive.

Modele obligatoire:

```text
Reference preuve:
Date et heure:
Fuseau:
Environnement:
Commit/build:
Tenant:
Operateur:
Observateur:
Parcours:
Scenario:
Action realisee:
Ecran attendu:
Observation factuelle:
Raison capture impossible:
Donnees sensibles evitees:
Audit associe:
Preuve alternative:
Reserve:
Decision etape: PASSED / PASSED_WITH_RESERVE / BLOCKED / NOT_RUN
Signature observateur:
```

Regles de decision:

| Situation | Statut preuve | Impact |
| --- | --- | --- |
| Capture impossible mais note complete + audit associe | `SUBSTITUT_ACCEPTABLE` | `PILOT_GO_SOUS_RESERVE` possible. |
| Capture impossible et audit absent | `INSUFFISANT` | Reserve `P1` si parcours critique. |
| Capture refusee pour donnees sensibles | `RESTREINT` ou `REJETEE` | Validation conformite requise avant partage. |
| Capture floue ou partielle | `A_REPRENDRE` | Ne soutient pas une decision finale. |
| Capture impossible sur parcours non critique | `SUBSTITUT_ACCEPTABLE` | Reserve `P2/P3` selon impact. |

## Checklist de controle

| Controle | Attendu | Statut |
| --- | --- | --- |
| Reference unique | Chaque preuve a un ID `S33-P5-*`. | `A_VERIFIER` |
| Commit/build | Version testee notee dans le manifest. | `A_VERIFIER` |
| Horodatage | Heure locale + fuseau presents. | `A_VERIFIER` |
| Stockage | Emplacement restreint et droits connus. | `A_VERIFIER` |
| Anonymisation | Statut `OK`, `RESTREINT` ou `A_REPRENDRE` explicite. | `A_VERIFIER` |
| Hash | SHA-256 present pour chaque fichier conserve. | `A_VERIFIER` |
| Audit trail | Trace ou justification substitutive rattachee. | `A_VERIFIER` |
| Capture impossible | Note substitutive complete si besoin. | `A_VERIFIER` |
| Decision | `PILOT_GO`, `PILOT_GO_SOUS_RESERVE` ou `PILOT_NO_GO` justifie. | `A_VERIFIER` |

## Seuils de decision

| Decision | Conditions minimales |
| --- | --- |
| `PILOT_GO` | Preuves critiques completes, anonymisation validee, audit trail reconstructible, aucun P1 ouvert. |
| `PILOT_GO_SOUS_RESERVE` | Preuves principales disponibles ou substituees, reserves P2/P3 datees, pas de fuite sensible. |
| `PILOT_NO_GO` | Donnee sensible exposee, action critique non auditable, preuve critique absente ou capture impossible sans note fiable. |

## Validation documentaire

Controle a effectuer apres modification de ce document:

```bash
git diff --check
```

La Phase 5 est terminee lorsque ce document est disponible, que le dossier de
preuves pilote applique ces regles et que toute exception est rattachee a une
reserve explicite dans le PV ou ticket de recette.
