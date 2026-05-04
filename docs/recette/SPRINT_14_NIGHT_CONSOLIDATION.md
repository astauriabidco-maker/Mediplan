# Sprint 14 - Consolidation autonome nuit

Date: 2026-05-05

## Perimetre autorise

Travail realise sans:

- suppression massive;
- migration destructive;
- reset DB;
- push GitHub;
- `npm audit fix --force`;
- restauration/import preprod non demande.

## Corrections preprod constatees

Objectif: lever la reserve `HIGH_ALERTS_OPEN` avant commit.

Actions appliquees sur le tenant `HGD-DOUALA`:

1. Attribution/renouvellement `AFGSU Niveau 2` pour Pauline NGONO EBOGO.
2. Alignement de Robert ABENA MANGA sur le poste attendu par la regle
   `IDE urgence AFGSU2`.
3. Renouvellement de competences expirees detectees pendant la verification.
4. Resolution justifiee des alertes hautes liees a la couverture Urgences et
   aux validations exploratoires non appliquees.

Resultat:

| Controle                  | Resultat     |
| ------------------------- | ------------ |
| Alertes hautes ouvertes   | `0`          |
| Drill incident            | `PASSED`     |
| Observability finale      | `HEALTHY`    |
| Audit chain               | `valid=true` |
| Evenements audit verifies | `14`         |
| Backup exportable         | `true`       |

Commande de preuve:

```bash
ENV_FILE=.env.preprod node scripts/preprod-incident-drill.mjs
```

## Consolidation documentaire

Fichiers enrichis:

- `docs/SPRINT_14_GO_NO_GO_METIER.md`;
- `docs/recette/SPRINT_14_INCIDENTS_RECETTE.md`;
- `docs/SPRINT_15_BACKLOG.md`.

## Amelioration outillage

Le script `scripts/preprod-incident-drill.mjs` liste maintenant les alertes
hautes ouvertes dans le rapport JSON et dans le Markdown lorsque la reprise
reste critique. Cela permet d'identifier directement l'agent, le type, la regle
et le message sans relancer une enquete API manuelle.

## Reserve restante

La reserve principale est la securite dependances backend:

- `expr-eval` dans le moteur de regles paie, traite en Sprint 15 Phase 1;
- `nodemailer` dans le module mail;
- `uuid` transitif via `typeorm` / `preview-email`.

Decision: ne pas forcer les correctifs cassants. Traiter en Sprint 15 Phase 1.

## Validations relancees

| Commande                                                                                                                                                             | Resultat                                 |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `npm run build`                                                                                                                                                      | `PASSED`                                 |
| `npm --prefix frontend run build`                                                                                                                                    | `PASSED`                                 |
| `npm run frontend:budget:check`                                                                                                                                      | `PASSED`                                 |
| `npm --prefix frontend run lint`                                                                                                                                     | `PASSED`                                 |
| `npm --prefix frontend run test -- --run src/pages/ManagerCockpitPage.test.tsx src/pages/PlanningPrepublicationPage.test.tsx src/pages/ManagerWorklistPage.test.tsx` | 3 fichiers, 11 tests `PASSED`            |
| `npm run test:e2e -- sprint14-manager-recette.e2e-spec.ts sprint14-rh-recette.e2e-spec.ts sprint14-auditor-recette.e2e-spec.ts --runInBand`                          | 3 suites, 6 tests `PASSED`               |
| `node --check scripts/preprod-incident-drill.mjs`                                                                                                                    | `PASSED`                                 |
| `npx eslint src/mail/mail.module.ts test/sprint14-manager-recette.e2e-spec.ts test/sprint14-rh-recette.e2e-spec.ts test/sprint14-auditor-recette.e2e-spec.ts`        | `PASSED`                                 |
| `git diff --check`                                                                                                                                                   | `PASSED`                                 |
| `npm --prefix frontend audit --audit-level=moderate`                                                                                                                 | 0 vulnerabilite                          |
| `npm audit --omit=dev --audit-level=moderate`                                                                                                                        | reserve connue: 6 vulnerabilites backend |
