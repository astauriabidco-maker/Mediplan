# Sprint 32 - Decision pilote externe securise

## Objectif

Determiner si Mediplan peut etre presente a un hopital pilote sans exposer de
donnees sensibles ni promettre un `GO_UTILISATEUR_EXTERNE` non signe.

## Statut cible

Decision cible: `PILOT_READY` ou `PILOT_NOT_READY`.

Statut provisoire: `PILOT_READY_INTERNE`.

## Conditions PILOT_READY

- Documents partageables anonymises.
- Pack pilote externe court disponible:
  `docs/recette/SPRINT_32_PHASE_2_PACK_PILOTE_EXTERNE_COURT.md`.
- Roles signataires hopital definis sans noms inventes:
  `docs/recette/SPRINT_32_PHASE_3_ROLES_SIGNATAIRES_HOPITAL.md`.
- Jeu de demo non sensible stable.
- Script de demo guidee disponible.
- Risques ouverts identifies avec mitigation.
- Validation automatisee Sprint 31 toujours verte.

## Conditions PILOT_NOT_READY

- Presence de donnees personnelles, noms reels non autorises ou details client
  dans un document partageable.
- Absence de parcours demo clair.
- Absence de criteres GO/NO-GO pilote.
- Risque P1 non mitige avant exposition externe.

## Validation technique attendue

```bash
npm run sprint31:phase5
git diff --check
```

## Validation technique executee

| Controle | Resultat |
| --- | --- |
| Pack documentaire Sprint 32 | `PASSED` - documents anonymises et limites au pilote controle. |
| Fixture demo Ops | `PASSED` - tenants generiques `tenant-demo-sain`, `tenant-demo-warning`, `tenant-demo-critique`. |
| Tests et build frontend | `PASSED` - `npm run sprint31:phase5`. |
| Controle whitespace | `PASSED` - `git diff --check`. |

## Decision finale

`PILOT_READY_INTERNE`.

Mediplan est pret pour une demonstration pilote externe controlee, avec
donnees anonymisees, script guide, risques ouverts documentes et roles
signataires a remplir avec de vraies personnes le jour du pilote.

Cette decision ne vaut pas `GO_UTILISATEUR_EXTERNE` et ne remplace pas un PV
pilote signe. Elle autorise uniquement la preparation et l'execution d'une
session pilote encadree.
