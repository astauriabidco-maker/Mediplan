# Sprint 15 Phase 3 - Checklist validation drills preprod

Date: 2026-05-05

## Objectif

Verifier que le drill incident preprod est repetable, non destructif par defaut
et exploitable comme preuve Go/No-Go.

## Matrice de validation

| Mode            | Commande                                                                           | Mutation attendue              | Resultat attendu                              |
| --------------- | ---------------------------------------------------------------------------------- | ------------------------------ | --------------------------------------------- |
| Smoke local     | `npm run preprod:incident:smoke`                                                   | Aucune                         | Assertions script `PASSED`                    |
| Dry-run         | `ENV_FILE=.env.preprod npm run preprod:incident:dry-run`                           | Aucune                         | Mutations simulees; `PASSED` si reprise saine |
| Nominal         | `ENV_FILE=.env.preprod npm run preprod:incident:drill`                             | Preview publication uniquement | `PASSED`, observability non critique          |
| Restore encadre | `ENV_FILE=.env.preprod INCIDENT_ALLOW_RESTORE=true npm run preprod:incident:drill` | Import backup explicite        | Import trace, compteurs coherents             |

## Preuves a conserver

- rapport JSON `preprod-incident-drill-YYYY-MM-DD.json`;
- rapport Markdown `preprod-incident-drill-YYYY-MM-DD.md`;
- statut global;
- statut observability final;
- nombre d'alertes `HIGH` ouvertes;
- validite de la chaine audit;
- statut backup exportable;
- liste des mutations executees ou simulees.

## Criteres Go/No-Go

| Controle      | GO                                        | NO-GO                          |
| ------------- | ----------------------------------------- | ------------------------------ |
| Dry-run       | aucune mutation executee                  | appel `POST` mutable observe   |
| Restore       | bloque sans `INCIDENT_ALLOW_RESTORE=true` | import execute sans flag       |
| Publication   | preview par defaut                        | publication reelle sans flag   |
| Observability | `HEALTHY` ou `DEGRADED` documente         | `CRITICAL` non justifie        |
| Audit         | chaine valide                             | chaine invalide                |
| Backup        | exportable                                | export absent ou non parseable |

## Commandes finales

```bash
node --check scripts/preprod-incident-drill.mjs
node --check scripts/preprod-incident-drill.smoke.mjs
npm run preprod:incident:smoke
ENV_FILE=.env.preprod npm run preprod:incident:dry-run
ENV_FILE=.env.preprod npm run preprod:incident:drill
git diff --check
```

## Resultats observes

Le 2026-05-05, le premier dry-run preprod a produit un `NO-GO` attendu cote metier:
aucune mutation n'a ete executee, mais l'observability finale est restee
`CRITICAL` avec raison `HIGH_ALERTS_OPEN` et 4 alertes hautes ouvertes. Le drill
est donc robuste et bloque correctement la decision Go tant que la preprod n'est
pas revenue a un etat sain.

Apres remediation ciblee des 4 alertes hautes, le dry-run preprod a ete rejoue
avec succes:

- statut: `PASSED`;
- decision: `GO`;
- observability finale: `HEALTHY`;
- alertes hautes ouvertes: `0`;
- audit chain: `valid=true`;
- backup: exportable;
- mutations reelles: aucune, publication en preview et restauration bloquee.
