# Sprint 16 - PV recette terrain pilote executable

## Objectif

Transformer la preparation de recette terrain pilote en execution locale
simulable, sans appel API et sans action destructive. Le script central est:

```bash
node scripts/pilot-recette-execute.mjs
```

Il lit une campagne JSON si elle est fournie avec `--campaign`; si le fichier
n'existe pas, il genere une campagne pilote par defaut pour manager, RH,
auditeur et admin. Il produit ensuite:

- un PV Markdown lisible par les equipes terrain;
- un JSON structure pour consolidation, archivage ou reprise automatique.

Par defaut, les fichiers sont ecrits dans `preprod-reports`. Le dossier peut
etre change avec `REPORT_DIR` ou `--out-dir`.

## Commandes

Validation syntaxique:

```bash
node --check scripts/pilot-recette-execute.mjs
```

Execution locale complete en simulation:

```bash
node scripts/pilot-recette-execute.mjs \
  --out-dir /private/tmp \
  --run-id sprint-16-pilot-recette \
  --status all=PASSED
```

Generation ou lecture d'une campagne externe:

```bash
node scripts/pilot-recette-execute.mjs \
  --campaign /private/tmp/pilot-campaign.json \
  --out-dir /private/tmp \
  --status manager=PASSED \
  --status rh.absences=BLOCKED \
  --auditor-status=TODO
```

Pilotage par environnement:

```bash
PILOT_RECETTE_STATUS=TODO \
PILOT_RECETTE_MANAGER_STATUS=PASSED \
PILOT_RECETTE_ADMIN_PILOT_SETUP_STATUS=BLOCKED \
node scripts/pilot-recette-execute.mjs
```

## Statuts

Les statuts acceptes sont:

- `TODO`: scenario a executer ou preuve manquante;
- `PASSED`: scenario valide avec preuve collectee;
- `BLOCKED`: scenario bloque, reserve critique ou decision requise.

Priorite d'application:

1. `--status role.scenario=STATUS` ou variable scenario precise;
2. `--status role=STATUS` ou raccourci `--manager-status=STATUS`;
3. `--status all=STATUS` ou `PILOT_RECETTE_STATUS`;
4. les arguments gagnent sur les variables d'environnement.

## Parcours couverts

| Role | Scenario | Preuves attendues principales |
| --- | --- | --- |
| Manager | Valider et publier un planning pilote | Captures planning, alertes, trace preview/publication |
| Manager | Traiter une absence et proposer un remplacement | Fiche absence, propositions de remplacement, planning consolide |
| RH | Controler les absences et compteurs RH | Export liste filtree, dossier agent, rapprochement compteur/planning |
| Auditeur | Verifier la chaine d audit | Logs filtres, identifiants audit, acteur et horodatage |
| Admin | Verifier le parametrage pilote | Configuration tenant/service, comptes, matrice d acces |

## Decision PILOT_GO / PILOT_NO_GO

Decision `PILOT_GO` uniquement si:

- tous les scenarios sont `PASSED`;
- aucun scenario n'est `BLOCKED`;
- aucun scenario ne reste `TODO`;
- aucun bloquant actif n'est remonte dans le PV.

Decision `PILOT_NO_GO` si:

- au moins un scenario est `BLOCKED`;
- au moins un scenario reste `TODO`;
- un bloquant terrain doit etre leve ou confirme avant ouverture pilote.

## Synthese produite

Le Markdown et le JSON contiennent:

- les compteurs `TODO`, `PASSED`, `BLOCKED`;
- la decision `PILOT_GO` ou `PILOT_NO_GO`;
- les reserves par scenario;
- les irritants UI/UX par role;
- les bloquants actifs uniquement pour les scenarios `BLOCKED`;
- les prochaines corrections priorisees.

## Reserves initiales

- Toute publication reelle doit rester sous accord explicite du responsable
  pilote.
- Les preuves contenant des donnees nominatives doivent etre floutees ou
  conservees dans un espace restreint.
- Les comptes temporaires de recette doivent etre desactives ou reinitialises
  apres campagne.
- Les regles locales de remplacement doivent etre confirmees avec le terrain
  avant validation definitive.

## Prochaines corrections

| Priorite | Sujet | Correction attendue |
| --- | --- | --- |
| P1 | Bloquants terrain | Traiter tout scenario `BLOCKED` avant ouverture pilote elargie |
| P2 | Irritants UI/UX | Consolider les irritants confirmes par role et arbitrer les corrections rapides |
| P2 | Preuves nominatives | Anonymiser captures et exports RH/audit avant partage |

## Validation locale

Commandes executees pour ce lot:

```bash
node --check scripts/pilot-recette-execute.mjs
node scripts/pilot-recette-execute.mjs --out-dir /private/tmp/mediplan-sprint16-pilot --run-id sprint-16-pilot-recette --status manager=PASSED --status rh.absences=BLOCKED --auditor-status=PASSED --admin-status=TODO
```

Critere d'acceptation:

- `node --check` ne remonte aucune erreur de syntaxe;
- l'execution locale ecrit un PV Markdown et un JSON dans le dossier cible;
- le recapitulatif affiche les compteurs `TODO`, `PASSED` et `BLOCKED`;
- le JSON contient `decision.value` avec `PILOT_GO` ou `PILOT_NO_GO`;
- aucune commande destructive ni appel API n'est execute.
