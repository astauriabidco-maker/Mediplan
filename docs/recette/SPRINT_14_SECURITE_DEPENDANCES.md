# Sprint 14 - Phase 6 - Securite dependances backend

## Objectif

Reduire le risque de dependances backend avant recette metier preproduction, sans appliquer de correctif cassant non maitrise sur le noyau planning, conformite et audit.

## Actions realisees

1. Audit initial backend avec `npm audit --audit-level=moderate`.
2. Application du correctif compatible via `npm audit fix --cache /private/tmp/mediplan-npm-cache`.
3. Nettoyage des changements generes dans `node_modules` pour ne conserver que la mise a jour reproductible du `package-lock.json`.
4. Audit production avec `npm audit --omit=dev --audit-level=moderate --cache /private/tmp/mediplan-npm-cache`.

## Resultat

| Controle         |                         Avant correction |         Apres correction |
| ---------------- | ---------------------------------------: | -----------------------: |
| Audit complet    |                        96 vulnerabilites |         7 vulnerabilites |
| Audit production | 96 vulnerabilites runtime/dev confondues | 6 vulnerabilites runtime |
| Critiques        |                                        2 |                        0 |
| Hautes           |                                       70 |                        2 |

## Correctifs appliques

Le lockfile a ete mis a jour par `npm audit fix` non force. Les familles de dependances corrigees couvrent notamment:

- `@nestjs/*` et dependances associees exposees a `path-to-regexp`, `multer`, `file-type`.
- `axios`, `follow-redirects`, `qs`, `socket.io-parser`.
- `@aws-sdk/*` et `fast-xml-parser`.
- `webpack`, `ajv`, `picomatch`, `minimatch`, `glob`, `handlebars`, `liquidjs`, `mjml`.
- `uuid` direct racine vers une version corrigee compatible.

## Risques residuels

| Dependence        | Niveau   | Origine                                                                  | Decision Sprint 14                                                              |
| ----------------- | -------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `expr-eval`       | High     | Dependence directe, aucun correctif publie par npm audit                 | Traite en Sprint 15 Phase 1 par remplacement interne strict.                    |
| `nodemailer`      | High     | Dependence directe `nodemailer@6`, fix npm propose via changement majeur | Traite en Sprint 15 Phase 1 par migration vers `nodemailer@8.0.7`.              |
| `uuid`            | Moderate | Transitive via `typeorm` et `preview-email`                              | Traite en Sprint 15 Phase 1 par override `uuid@14.0.0`, sans downgrade TypeORM. |
| `brace-expansion` | Moderate | Reliquat dev/transitif dans l'arbre installe                             | Traite en Sprint 15 Phase 1 par `npm audit fix` non force.                      |

## Decision

Phase 6 validee avec reserve maitrisee.

Le projet ne doit pas lancer `npm audit fix --force` sur cette base, car npm propose au moins une regression TypeORM majeure et un changement majeur mailer. La suite recommandee est un mini-lot cible:

1. Migrer `nodemailer` et tester les scenarios SMTP/mailer.
2. Evaluer une alternative ou une configuration de `@nestjs-modules/mailer` qui retire `preview-email` du chemin production.
3. Rejouer `npm audit --omit=dev` en CI preprod apres migration.

## Controle de consolidation nuit

Date: 2026-05-05

| Controle                                             | Resultat                  |
| ---------------------------------------------------- | ------------------------- |
| `npm audit --audit-level=moderate`                   | `PASSED`, 0 vulnerabilite |
| `npm --prefix frontend audit --audit-level=moderate` | 0 vulnerabilite           |
| `npm run build`                                      | `PASSED`                  |
| `npm --prefix frontend run build`                    | `PASSED`                  |
| `npm run frontend:budget:check`                      | `PASSED`                  |
| `npm --prefix frontend run lint`                     | `PASSED`                  |

Surfaces runtime identifiees:

- `nodemailer`: invitations mail via `src/mail/mail.service.ts`.
- `uuid`: transitif via `typeorm` et `preview-email`, a traiter sans downgrade
  TypeORM.

Decision maintenue: `GO SOUS RESERVE` securite dependances backend.

## Avancement Sprint 15 Phase 1

Date: 2026-05-05

`expr-eval` a ete retire du backend. Le moteur de regles paie utilise maintenant
un evaluateur interne strict:

- variables limitees au contexte numerique paie;
- fonctions allowlist: `min`, `max`, `abs`, `round`, `floor`, `ceil`;
- operateurs arithmetiques, comparaisons, logique booleenne et ternaires;
- aucun acces membre, prototype ou fonction arbitraire.

Validations:

| Commande                                                       | Resultat                  |
| -------------------------------------------------------------- | ------------------------- |
| `npm test -- payroll-expression-evaluator.spec.ts --runInBand` | `PASSED`, 4 tests         |
| `npm run build`                                                | `PASSED`                  |
| `npm audit --omit=dev --audit-level=moderate`                  | `PASSED`, 0 vulnerabilite |

Corrections complementaires:

- `nodemailer` migre vers `8.0.7`;
- `uuid` force vers `14.0.0` via `overrides`, sans downgrade TypeORM;
- chargement CommonJS verifie pour `uuid`, `typeorm` et `preview-email`.
