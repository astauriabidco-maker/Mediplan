# Sprint 35 Phase 6 - Checklist lancement premier client

Date: 2026-05-10
Statut cible: `COMMERCIAL_READY_SOUS_RESERVE`
Cadre: go-live commercial controle, pas production hospitaliere

## Objectif

Preparer une premiere session client commerciale controlee, reproductible et
documentee. Cette checklist encadre la demo, la qualification du lead, les
reserves, les preuves et la prochaine etape pilote sans promettre une mise en
production hospitaliere.

Ce document ne declenche aucun push, aucune migration, aucun reset DB, aucune
suppression massive, aucun deploiement et aucune decision clinique ou
hospitaliere. Il sert uniquement a qualifier un lancement commercial et a
securiser la suite pilote.

## Garde-fous commerciaux

- Statut autorise: `COMMERCIAL_READY`, `COMMERCIAL_READY_SOUS_RESERVE` ou
  `COMMERCIAL_NO_GO`.
- Statut interdit: `PROD_HOSPITALIERE_GO`, `GO_UTILISATEUR_EXTERNE` ou toute
  formulation equivalente sans contrat, pilote signe, preuves et decision
  nominative.
- Donnees autorisees: donnees anonymisees, fictives ou deja validees pour demo.
- Donnees interdites: patients reels, dossiers hospitaliers reels, noms agents
  non anonymises, exports sensibles non controles.
- Environnement attendu: demo ou preprod controlee, avec version et commit
  notes.
- Action interdite pendant la session: mutation technique improvisee, reset DB,
  seed, migration, suppression, import massif, correction directe en production.
- Engagement commercial: qualifier l'interet, les criteres de pilote et les
  prochaines etapes, pas signer une acceptation production.

## Avant demo

| Controle | Attendu | Statut | Preuve |
| --- | --- | --- | --- |
| Lead | Organisation, role du contact, contexte et douleur metier identifies. | `A_VERIFIER` | Fiche lead ou note CRM. |
| Public | Sponsor, referent operationnel et interlocuteur conformite invites ou identifies. | `A_VERIFIER` | Invitation, liste participants. |
| Cadre | Message d'ouverture prepare: demo commerciale, pas prod hospitaliere. | `A_VERIFIER` | Script ou ordre du jour. |
| Version | Commit, build, URL et environnement notes avant ouverture. | `A_VERIFIER` | Note session, capture terminal ou ticket. |
| Donnees | Jeu de demo anonymise verifie, aucun nom reel visible. | `A_VERIFIER` | Capture pre-check ou attestation observateur. |
| Parcours | Scenario court choisi: Ops, Audit, reserves, preuves et pilotage. | `A_VERIFIER` | Script de demo. |
| Roles | Animateur, operateur, observateur et responsable prise de notes nommes. | `A_VERIFIER` | Note session. |
| Limites | Limites d'usage et exclusions preparees pour reponse client. | `A_VERIFIER` | Section "Limites d'usage" ci-dessous. |
| Preuves | Dossier restreint ou ticket de preuves cree avant la session. | `A_VERIFIER` | Reference dossier ou ticket. |
| Repli | Plan B pret si demo live indisponible: captures, note de parcours, video interne validee. | `A_VERIFIER` | Liens restreints et statut anonymisation. |

## Pendant demo

| Etape | Action | Resultat attendu | Preuve minimale |
| --- | --- | --- | --- |
| Ouverture | Rappeler le cadre commercial et les limites. | Le client comprend que la session qualifie un pilote. | Note observateur. |
| Contexte lead | Reformuler douleur, population cible et criteres de succes. | Accord oral ou correction documentee. | Note CRM ou compte rendu. |
| Parcours Ops | Montrer l'identification d'un tenant ou signal prioritaire de demo. | Le cas d'usage est compris sans donnees reelles. | Capture anonymisee. |
| Parcours action | Montrer runbook, preuve attendue, statut et responsabilite. | La valeur operationnelle est explicite. | Capture ou note de parcours. |
| Parcours Audit | Montrer reconstruction horodatee de la sequence. | Le client voit la tracabilite attendue. | Capture audit anonymisee. |
| Questions | Capturer questions, objections, demandes d'integration et contraintes. | Chaque point a un owner ou une suite. | Journal questions/reponses. |
| Reserves | Classer les reserves en P1, P2, P3. | Aucun blocage n'est masque. | Registre reserves. |
| Qualification | Tester budget, calendrier, decisionnaires, donnees, securite et pilote. | Le lead est qualifie ou disqualifie. | Grille qualification. |
| Cloture | Proposer une prochaine etape pilote datee ou un no-go commercial. | Le client connait la suite et les limites. | Compte rendu envoye. |

Phrase d'ouverture recommandee:

```text
Cette session est une demo commerciale controlee sur donnees anonymisees.
Elle sert a verifier l'interet, les criteres de pilote et les reserves avant
tout engagement operationnel. Elle ne vaut pas mise en production hospitaliere.
```

## Apres demo

| Controle | Attendu | Delai cible | Preuve |
| --- | --- | ---: | --- |
| Compte rendu | Envoyer synthese courte: besoin, valeur percue, reserves, suite. | J+1 | Email ou note CRM. |
| Preuves | Ranger captures, notes et references dans l'espace restreint. | J+1 | Manifest ou ticket preuves. |
| Anonymisation | Verifier qu'aucune preuve partageable ne contient de donnee sensible. | J+1 | Statut `OK`, `RESTREINT` ou `A_REPRENDRE`. |
| Reserves | Confirmer severite, owner, critere de levee et date cible. | J+2 | Registre reserves. |
| Qualification | Mettre a jour statut lead et probabilite de pilote. | J+2 | Fiche lead. |
| Decision | Formaliser `COMMERCIAL_READY`, `COMMERCIAL_READY_SOUS_RESERVE` ou `COMMERCIAL_NO_GO`. | J+2 | Decision datee. |
| Prochaine etape | Planifier atelier pilote, cadrage securite ou session sponsor. | J+5 | Invitation ou proposition. |

## Qualification lead

| Axe | Questions a valider | Statut attendu |
| --- | --- | --- |
| Probleme | Quel incident, cout, retard ou risque Mediplan doit reduire ? | Douleur explicite et priorisee. |
| Population | Quels services, roles ou equipes seraient concernes par un pilote ? | Perimetre pilote restreint. |
| Decision | Qui decide du pilote, qui signe, qui peut bloquer ? | Decisionnaires identifies. |
| Calendrier | Quelle fenetre realiste pour un atelier ou pilote ? | Date cible ou contrainte connue. |
| Budget | Existe-t-il une enveloppe ou un processus achat ? | Signal budgetaire qualifie. |
| Donnees | Quelles donnees peuvent etre exposees en pilote sans risque ? | Regles anonymisation comprises. |
| Securite | Quelles exigences SSI, DPO, hebergement ou audit sont obligatoires ? | Check securite a ouvrir si necessaire. |
| Integration | Quelles interfaces ou imports seraient indispensables ? | Besoins listes sans promesse. |
| Succes | Quels criteres rendraient le pilote concluant ? | 3 a 5 criteres mesurables. |
| Risque | Quelle objection pourrait annuler le pilote ? | Risque majeur nomme. |

Statuts lead proposes:

- `LEAD_A_QUALIFIER`: interet observe, criteres incomplets.
- `LEAD_QUALIFIE_PILOTE`: besoin, sponsor, calendrier et reserves connus.
- `LEAD_SOUS_RESERVE`: interet present, blocage securite, budget ou donnees.
- `LEAD_NON_PRIORITAIRE`: pas de douleur immediate, pas de sponsor ou pas de
  fenetre pilote.

## Reserves

| Severite | Definition | Impact commercial |
| --- | --- | --- |
| P1 | Donnee sensible exposee, audit incomprehensible, promesse impossible ou blocage securite majeur. | Bloque `COMMERCIAL_READY`; prochaine etape limitee a remediation interne. |
| P2 | Valeur comprise mais preuve incomplete, integration a clarifier, parcours a ajuster. | Autorise `COMMERCIAL_READY_SOUS_RESERVE`. |
| P3 | Irritant de formulation, ergonomie, support ou documentation. | Ne bloque pas la suite pilote si owner et date sont notes. |

Modele de reserve:

```text
Reference:
Date:
Source:
Description:
Severite: P1 / P2 / P3
Impact:
Owner:
Critere de levee:
Date cible:
Preuve associee:
Statut: OUVERTE / ACCEPTEE / LEVEE / NON_RETENUE
```

## Prochaine etape pilote

| Scenario | Conditions | Suite proposee |
| --- | --- | --- |
| `COMMERCIAL_READY` | Lead qualifie, aucune reserve P1, sponsor et criteres pilote clairs. | Planifier atelier cadrage pilote avec sponsor, operations et conformite. |
| `COMMERCIAL_READY_SOUS_RESERVE` | Valeur comprise, reserves P2/P3 documentees, securite ou donnees a cadrer. | Envoyer compte rendu, lever reserves P2 prioritaires, proposer atelier limite. |
| `COMMERCIAL_NO_GO` | Pas de besoin prioritaire, P1 ouverte, decisionnaire absent ou cadre incompatible. | Clore proprement, noter motif, proposer recontact si contexte change. |

Proposition de suite pilote a documenter:

```text
Client / organisation:
Sponsor pressenti:
Perimetre pilote:
Objectifs pilote:
Criteres de succes:
Donnees autorisees:
Contraintes securite:
Reserves ouvertes:
Date atelier proposee:
Decision commerciale:
```

## Preuves

| Preuve | Obligatoire | Regle |
| --- | --- | --- |
| Note de session | Oui | Date, participants, roles, environnement, version, statut commercial. |
| Captures demo | Oui si disponibles | Anonymisees ou marquees `RESTREINT`; jamais de donnees hospitalieres reelles partageables. |
| Questions client | Oui | Question, reponse donnee, suite, owner. |
| Grille qualification | Oui | Statut lead et hypotheses encore ouvertes. |
| Registre reserves | Oui | Severite, impact, owner, critere de levee. |
| Decision commerciale | Oui | `COMMERCIAL_READY`, `COMMERCIAL_READY_SOUS_RESERVE` ou `COMMERCIAL_NO_GO`. |
| Proposition pilote | Si applicable | Perimetre, objectifs, criteres, date cible, limites. |

Convention de reference:

```text
S35-P6-<client-alias>-<objet>-<numero>-<date>
```

Exemples:

- `S35-P6-client-a-note-session-01-2026-05-10`
- `S35-P6-client-a-ops-capture-02-2026-05-10`
- `S35-P6-client-a-reserve-p2-03-2026-05-10`

## Limites d'usage

Ces limites doivent etre rappelees oralement si le client demande une decision
operationnelle immediate:

- la demo ne constitue pas une homologation hospitaliere;
- la demo ne prouve pas la conformite finale au SI client;
- aucune donnee patient reelle ne doit etre importee pour "tester vite";
- aucun engagement SLA, securite, hebergement ou integration n'est valide sans
  cadrage dedie;
- aucune signature pilote ne doit etre inventee ou anticipee;
- les captures commerciales ne remplacent pas un PV pilote signe;
- toute production hospitaliere future exige un gate separe avec preuves,
  responsables, signataires reels et reserves levees ou acceptees.

## Decision de cloture

```text
Date:
Client alias:
Animateur:
Observateur:
Version / commit:
Environnement:
Statut lead:
Decision commerciale: COMMERCIAL_READY / COMMERCIAL_READY_SOUS_RESERVE / COMMERCIAL_NO_GO
Motif:
Reserves P1:
Reserves P2:
Reserves P3:
Prochaine etape:
Owner Mediplan:
Owner client:
Preuves rattachees:
Limites rappelees: OUI / NON
```

La decision par defaut reste `COMMERCIAL_READY_SOUS_RESERVE` tant que la
qualification lead, les reserves, les preuves et la prochaine etape pilote ne
sont pas completes.

## Validation locale

Validation documentaire non destructive a conserver:

```bash
git diff --check
```

Commandes volontairement exclues de cette phase:

- `git push`
- `npm run migration:run`
- `npm run migration:revert`
- `npm run seed:demo`
- `npm run demo:reset`
- toute suppression massive ou reset DB
- tout deploiement ou bascule production hospitaliere
