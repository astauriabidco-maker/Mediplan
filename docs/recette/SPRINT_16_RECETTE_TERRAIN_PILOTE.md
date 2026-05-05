# Sprint 16 - Recette terrain pilote

## Objectif

Preparer la recette terrain pilote avec un generateur non destructif de
checklist et PV de campagne pour les parcours manager, RH, auditeur et admin.

Le script central est:

```bash
node scripts/pilot-recette-checklist.mjs
```

Il genere deux fichiers:

- un PV Markdown lisible par les equipes terrain;
- un JSON structure pour suivi, consolidation ou archivage.

Par defaut, les fichiers sont ecrits dans `preprod-reports`. Le dossier peut
etre change avec `REPORT_DIR` ou `--out-dir`.

## Parcours couverts

| Role | Scenario | Preuves attendues principales |
| --- | --- | --- |
| Manager | Valider et publier un planning pilote | Captures planning, alertes, trace preview/publication |
| Manager | Traiter une absence et proposer un remplacement | Fiche absence, propositions de remplacement, planning consolide |
| RH | Controler les absences et compteurs RH | Export liste filtree, dossier agent, rapprochement compteur/planning |
| Auditeur | Verifier la chaine d audit | Logs filtres, identifiants audit, acteur et horodatage |
| Admin | Verifier le parametrage pilote | Configuration tenant/service, comptes, matrice d acces |

## Statuts pilotables

Les statuts acceptes sont:

- `TODO`: scenario a executer ou preuve manquante;
- `PASSED`: scenario valide avec preuve collectee;
- `BLOCKED`: scenario bloque, reserve ou decision requise.

Exemples par arguments:

```bash
node scripts/pilot-recette-checklist.mjs \
  --status manager=PASSED \
  --status rh.absences=BLOCKED \
  --auditor-status=TODO
```

Exemples par environnement:

```bash
PILOT_RECETTE_STATUS=TODO \
PILOT_RECETTE_MANAGER_STATUS=PASSED \
PILOT_RECETTE_ADMIN_PILOT_SETUP_STATUS=BLOCKED \
node scripts/pilot-recette-checklist.mjs
```

Les statuts les plus precis gagnent sur les statuts globaux. Les arguments
passes a la commande gagnent sur les variables d'environnement.

## Criteres d'acceptation transverses

- Chaque parcours possede au moins une preuve attendue explicite.
- Les actions sensibles restent non destructives tant que la campagne pilote
  ne demande pas une validation manuelle hors script.
- Les statuts sont limites a `TODO`, `PASSED` et `BLOCKED`.
- Le Markdown est exploitable comme PV de recette terrain.
- Le JSON contient les scenarios, criteres, irritants UI/UX et reserves pour
  consolidation ulterieure.

## Irritants UI/UX a suivre

- Alertes planning trop techniques pour un arbitrage manager rapide.
- Difference visuelle insuffisante entre preview et planning courant.
- Filtres RH a reinitialiser manuellement entre deux controles.
- Colonnes audit techniques sans libelles metier suffisants.
- Matrice admin difficile a scanner lorsque tous les droits sont depliees.

## Reserves

- Toute publication reelle doit rester sous accord explicite du responsable
  pilote.
- Les preuves contenant des donnees nominatives doivent etre floutees ou
  conservees dans un espace restreint.
- Les comptes temporaires de recette doivent etre desactives ou reinitialises
  apres campagne.
- Les regles locales de remplacement doivent etre confirmees avec le terrain
  avant validation definitive.

## Validation

Commandes executees pour ce lot:

```bash
node --check scripts/pilot-recette-checklist.mjs
node scripts/pilot-recette-checklist.mjs --out-dir /private/tmp --run-id sprint-16-pilot-recette --status manager=PASSED --status rh.absences=BLOCKED
```

Critere d'acceptation:

- `node --check` ne remonte aucune erreur de syntaxe;
- l'execution locale ecrit un fichier Markdown et un fichier JSON dans le
  dossier cible;
- le recapitulatif affiche les compteurs `TODO`, `PASSED` et `BLOCKED`;
- aucune commande destructive ni appel API n'est execute.
