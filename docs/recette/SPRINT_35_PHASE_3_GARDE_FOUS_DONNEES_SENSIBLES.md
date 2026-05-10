# Sprint 35 Phase 3 - Garde-fous donnees sensibles demo commerciale

Date: 2026-05-10
Statut cible: `GO_LIVE_COMMERCIAL_CONTROLE_SOUS_GARDE_FOUS`

## Objectif

Fixer les garde-fous obligatoires pour une demonstration commerciale Mediplan,
sans exposition de donnees patient, RH, hospitalieres ou contractuelles
sensibles.

Ce document autorise uniquement une demo controlee avec donnees fictives ou
anonymisees. Il ne vaut pas autorisation de traiter des donnees reelles, de
signer un engagement client, de publier des exports ou de lancer une migration
ou purge en environnement actif.

## Perimetre autorise

| Autorise | Interdit |
| --- | --- |
| Jeu de donnees demo fictif, stable et relu. | Donnee patient reelle, meme partielle. |
| Aliases anonymises non rattachables a un hopital ou employeur reel. | Donnee RH reelle: nom, matricule, planning, absence, contrat, commentaire libre. |
| Comptes demo dedies et revocables. | Connexion avec compte personnel, compte client ou compte interne nominatif non autorise. |
| Captures, exports et logs prevalides pour la session. | Export brut depuis production, preproduction client ou outil support. |
| Parcours fonctionnels commerciaux prepares. | Test de migration, reset DB, seed destructif ou purge non encadree. |

## Garde-fous donnees

- Toute donnee presentee doit etre `FICTIVE`, `SYNTHETIQUE` ou
  `ANONYMISEE_VALIDEE`.
- Aucun nom, prenom, email, telephone, identifiant SSO, matricule RH, NIR,
  numero patient, date de naissance complete, commentaire medical ou motif
  d'absence reel ne doit apparaitre.
- Les noms d'etablissements, services, poles, directions et fournisseurs reels
  sont remplaces par des aliases generiques: `Hopital Demo A`,
  `Service Demo B`, `Equipe Commerciale Demo`.
- Les dates de planning doivent etre generiques ou arrondies a une periode de
  demo; elles ne doivent pas reproduire un planning operationnel reel.
- Les volumes, alertes, incidents, absences et indicateurs doivent rester
  plausibles mais non derivables d'un client reel.
- Les champs libres sont relus avant session; aucun copier-coller issu d'un
  ticket support, d'un dossier patient, d'un outil RH ou d'un email client n'est
  accepte.

## Interdiction patient et RH reel

| Categorie | Regle Sprint 35 Phase 3 |
| --- | --- |
| Patient | Interdiction totale de patient reel, pseudonymise ou partiellement masque. |
| Donnee medicale | Interdiction totale: diagnostic, motif, commentaire, parcours, service identifiant. |
| RH | Interdiction de donnees reelles d'agent, manager, contrat, absence, planning ou paie. |
| Contacts | Aucun email, telephone ou identifiant nominatif reel dans l'interface, les logs ou les exports. |
| Client prospect | Ne pas afficher son nom, son organisation ou ses contraintes internes sans accord ecrit. |

Si une donnee reelle est detectee pendant la preparation ou la session, la
demo est suspendue, la preuve est classee `NON_PARTAGEABLE`, et l'incident est
trace dans le journal de preparation.

## Bannieres et mentions visibles

Chaque environnement, capture et export partageable doit porter une mention
explicite:

```text
DEMO COMMERCIALE - DONNEES FICTIVES / ANONYMISEES - AUCUNE DONNEE PATIENT OU RH REELLE
```

Regles d'affichage:

- La banniere doit etre visible sur l'ecran principal de la demo.
- Les exports PDF, CSV ou captures doivent inclure la mention dans le titre, le
  filigrane, le nom de fichier ou la page de garde.
- Les captures recadrees ne doivent pas retirer la mention si elles sont
  destinees a etre partagees.
- Toute slide commerciale issue de la demo doit reprendre la mention ou pointer
  vers ce document.

## Comptes demo

| Compte | Usage | Garde-fou |
| --- | --- | --- |
| `demo-commercial-admin@example.invalid` | Parcours admin commercial. | Mot de passe temporaire, rotation apres session. |
| `demo-manager@example.invalid` | Parcours manager fictif. | Acces limite au tenant demo. |
| `demo-observateur@example.invalid` | Lecture seule pour projection ou replay. | Aucun export sensible active. |

Exigences:

- Les comptes demo ne doivent pas etre rattaches a un SSO client ou interne.
- Les secrets ne sont jamais stockes dans le depot, les slides ou le script de
  demo.
- Les droits sont limites au tenant demo et revus avant chaque session.
- Les comptes sont desactives ou leurs mots de passe sont rotates apres la
  fenetre commerciale.

## Logs, traces et observabilite

- Les logs de demo ne doivent pas contenir de payload patient, RH, email reel,
  token, cookie, secret, IP client nominative ou URL interne sensible.
- Les captures de dashboards d'observabilite sont interdites si elles exposent
  des domaines internes, noms de machines, chemins, traces applicatives brutes
  ou identifiants utilisateurs.
- Les traces techniques partagees sont reduites a un statut, un horodatage
  arrondi, un identifiant demo et une conclusion.
- Les logs bruts restent en stockage restreint, non joints au dossier
  commercial.

## Exports et supports commerciaux

| Support | Statut par defaut | Condition de partage |
| --- | --- | --- |
| Capture ecran | `PARTAGEABLE_APRES_RELECTURE` | Banniere visible et aucune donnee reelle. |
| Export CSV | `RESTREINT` | Autorise seulement si genere depuis tenant demo et relu. |
| Export PDF | `PARTAGEABLE_APRES_RELECTURE` | Mention demo et absence de metadonnees sensibles. |
| Replay video | `RESTREINT` | Validation image par image des ecrans et notifications. |
| Logs | `NON_PARTAGEABLE` | Synthese uniquement, sauf accord securite explicite. |
| Slides | `PARTAGEABLE_CONTROLE` | Mentions incluses, pas de preuve brute ni nom reel. |

Les noms de fichiers doivent eviter tout client reel:
`mediplan-demo-commerciale-s35-YYYYMMDD.*`.

## Preuves attendues

| Preuve | Owner | Statut attendu |
| --- | --- | --- |
| Liste du jeu de donnees demo et aliases utilises. | Produit / Ops | `A_VERIFIER` |
| Capture de la banniere demo visible. | Commercial / Produit | `A_VERIFIER` |
| Liste des comptes demo et droits associes. | Ops / Securite | `A_VERIFIER` |
| Relecture des exports et captures pre-session. | Produit / Securite | `A_VERIFIER` |
| Journal des incidents de preparation ou session. | Ops | `A_VERIFIER` |
| Attestation de purge ou rotation post-session. | Ops / Securite | `A_VERIFIER` |
| Limites contractuelles communiquees au prospect. | Commercial / Legal | `A_VERIFIER` |

## Purge et fin de session

Actions obligatoires apres la demo:

1. Desactiver ou faire tourner les mots de passe des comptes demo utilises.
2. Supprimer les exports temporaires locaux non retenus comme preuves.
3. Classer les captures validees dans le dossier de preuves controlees.
4. Marquer tout support contenant une anomalie comme `NON_PARTAGEABLE`.
5. Purger les fichiers temporaires de presentation sur postes partages ou
   outils de visioconference.
6. Conserver uniquement les preuves necessaires a l'audit commercial, avec
   statut, date et owner.

Aucune purge ne doit viser une base de donnees applicative, un environnement
client ou un stockage partage sans procedure approuvee et ticket explicite.

## Limites contractuelles

La demo commerciale doit rester accompagnee des limites suivantes:

- Les donnees affichees sont fictives ou anonymisees et ne prouvent pas une
  integration avec les systemes du prospect.
- Les performances observees en demo ne constituent pas un engagement de SLA.
- Les roles, workflows, alertes et exports presentes sont des exemples de
  produit, pas une validation juridique ou RH.
- Toute activation client necessite cadrage contractuel, securite,
  confidentialite, traitement de donnees et conditions de support.
- Aucun traitement de donnees patient ou RH reelles ne peut commencer sans
  base contractuelle, analyse de risques, DPA si applicable, habilitations et
  environnement approuve.

## Checklist go / no-go demo

| Controle | Statut avant session | Decision |
| --- | --- | --- |
| Donnees demo fictives ou anonymisees relues. | `A_VERIFIER` | Bloquant si non conforme. |
| Aucune donnee patient ou RH reelle. | `A_VERIFIER` | Bloquant si doute. |
| Banniere demo visible sur ecrans et supports. | `A_VERIFIER` | Bloquant pour partage externe. |
| Comptes demo dedies, limites et revocables. | `A_VERIFIER` | Bloquant si compte reel utilise. |
| Exports/captures prevalides. | `A_VERIFIER` | Bloquant si export brut. |
| Logs et dashboards non sensibles. | `A_VERIFIER` | Bloquant si trace brute exposee. |
| Limites contractuelles preparees. | `A_VERIFIER` | Bloquant avant discussion commerciale engageante. |
| Purge/rotation post-session planifiee. | `A_VERIFIER` | Bloquant si aucun owner. |

## Commandes de controle documentaire

Commandes non destructives proposees:

```bash
rg -n "patient reel|RH reel|@|token|secret|password|NIR|SSN" docs/recette/SPRINT_35_PHASE_3_GARDE_FOUS_DONNEES_SENSIBLES.md
git diff --check
```

La premiere commande peut retourner les exemples volontairement presents dans
ce document. Toute occurrence hors exemple, compte `.invalid`, mention de
garde-fou ou interdiction doit etre revue manuellement.

## Decision Phase 3

Decision documentaire: `GARDE_FOUS_DONNEES_SENSIBLES_ACTIFS`.

Le go-live commercial reste controle et sous reserve tant que les preuves
listees ne sont pas completees. En cas de doute sur une donnee, un export, une
capture ou un log, le support est classe `NON_PARTAGEABLE` et exclu de la demo.
