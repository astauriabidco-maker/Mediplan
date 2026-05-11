# Sprint 37 - Phase 6 - Securite dependances finale

Date de preparation: 2026-05-10

## Objectif

Valider le dernier controle des dependances avant passage en vraie production
client, sans action destructive ni correction automatique non maitrisee.

Cette phase ne lance pas de migration, ne reset pas la base, ne modifie pas les
lockfiles et ne publie rien. Les commandes attendues sont des audits npm en
lecture seule et une verification de diff.

## Surface inspectee

| Surface | Fichiers | Script existant | Commentaire |
| ------- | -------- | --------------- | ----------- |
| Backend | `package.json`, `package-lock.json` | Aucun script backend dedie; commande npm directe requise. | Le gate release existant reference `npm audit --omit=dev --audit-level=moderate`. |
| Frontend | `frontend/package.json`, `frontend/package-lock.json` | `npm run frontend:audit` | Le script lance `npm --prefix frontend audit --audit-level=moderate`. |
| CI produit | `package.json` | `ci:frontend` | Inclut `frontend:audit`, mais aussi build/lint/test/smoke; hors perimetre de cette phase finale si seul l'audit est demande. |

## Commandes d'audit

Controle production strict, attendu pour decision GO/NO-GO:

```bash
npm audit --omit=dev --audit-level=high
npm --prefix frontend audit --omit=dev --audit-level=high
```

Controle complet recommande pour le dossier de preuve, en alignement avec les
gates historiques:

```bash
npm audit --audit-level=moderate
npm run frontend:audit
```

Les commandes ci-dessus interrogent le service npm audit et peuvent echouer si
le reseau ou le registry est indisponible. En environnement client ferme, joindre
la sortie d'erreur brute et relancer depuis l'environnement autorise par le RSSI
ou l'infogerance.

## Criteres de decision

| Niveau | Decision attendue |
| ------ | ----------------- |
| `critical` | `NO-GO` tant que la dependance n'est pas corrigee, retiree ou formellement acceptee par Securite avec justification explicite. |
| `high` | `NO-GO` par defaut en production client, sauf exception signee couvrant exposition, contournement, echeance et owner. |
| `moderate` | Acceptable uniquement avec ticket, surface exposee qualifiee, mitigation documentee et date de revue. |
| `low` / info | Non bloquant si trace dans le rapport et sans exposition sensible identifiee. |

Decision `GO` attendue:

- zero vulnerabilite `critical`;
- zero vulnerabilite `high` non acceptee;
- aucune dependance exposee en runtime production avec CVE non qualifiee;
- toutes les exceptions `moderate` ou residuelles ont un ticket, un owner, une
  echeance et une decision Securite.

Decision `NO-GO`:

- vulnerabilite `critical` presente;
- vulnerabilite `high` presente sans exception signee;
- absence de rapport d'audit exploitable;
- audit impossible a relancer dans un environnement reseau autorise avant mise
  en production;
- proposition de correction par `npm audit fix --force` impliquant downgrade,
  changement majeur non teste ou mutation de dependances critiques.

## Exceptions acceptables

Une exception doit etre explicite et rattachee au dossier de decision Sprint 37.

Champs minimum:

| Champ | Attendu |
| ----- | ------- |
| Package | Nom, version installee et chaine transitive si applicable. |
| Niveau | `critical`, `high`, `moderate` ou `low`. |
| Surface exposee | Backend runtime, frontend runtime, dev-only, outil de build, test uniquement. |
| Impact | Scenario exploitable ou raison de non-exposition. |
| Mitigation | Configuration, usage non expose, WAF/proxy, remplacement prevu, surveillance ou autre mesure. |
| Owner | Responsable technique ou Securite nomme. |
| Echeance | Date de correction ou de reevaluation. |
| Decision | `ACCEPTEE`, `ACCEPTEE SOUS RESERVE`, `REFUSEE`. |
| Signataire | Securite/RSSI ou delegue habilite. |

Les exceptions `high` ne doivent pas devenir implicites: elles exigent une
signature Securite et un chemin de correction date. Les exceptions `critical`
sont considerees bloquantes sauf acceptation formelle exceptionnelle du RSSI et
du sponsor client.

## Preuve attendue

Joindre au dossier de recette ou au ticket de go-live:

- date, heure, branche et commit audites;
- version Node.js et npm utilisees;
- sorties completes des audits backend et frontend;
- statut final par surface: `PASSED`, `FAILED`, `BLOCKED_NETWORK` ou `WAIVED`;
- liste des vulnerabilites restantes avec niveau, package, surface et decision;
- tickets d'exception ou de correction;
- validation Securite/RSSI pour toute exception `high` ou `critical`;
- resultat de `git diff --check`.

Format de synthese recommande:

| Surface | Commande | Resultat | High | Critical | Decision |
| ------- | -------- | -------- | ---- | -------- | -------- |
| Backend production | `npm audit --omit=dev --audit-level=high` | A completer | A completer | A completer | A completer |
| Frontend production | `npm --prefix frontend audit --omit=dev --audit-level=high` | A completer | A completer | A completer | A completer |
| Backend complet | `npm audit --audit-level=moderate` | A completer | A completer | A completer | A completer |
| Frontend complet | `npm run frontend:audit` | A completer | A completer | A completer | A completer |

## Execution locale du 2026-05-10

Commandes lancees localement, sans correction automatique:

```bash
npm audit --omit=dev --audit-level=high
npm --prefix frontend audit --omit=dev --audit-level=high
```

Resultat local:

```text
npm warn audit request to https://registry.npmjs.org/-/npm/v1/security/audits/quick failed, reason: getaddrinfo ENOTFOUND registry.npmjs.org
npm error audit endpoint returned an error
```

Statut: `BLOCKED_NETWORK` pour backend et frontend dans l'environnement local.

Interpretation:

- aucun audit concluant ne peut etre signe depuis cette session locale;
- aucune modification de dependance, lockfile ou configuration n'a ete appliquee;
- la preuve finale doit etre rejouee depuis un environnement autorise a joindre
  le registry npm, ou via un miroir/outil Securite client fournissant un rapport
  equivalent.

## Garde-fous Sprint 37

Interdits dans cette phase:

- `npm audit fix --force`;
- correction automatique sans ticket;
- suppression massive de dependances;
- migration destructive;
- reset DB, seed destructif ou restauration non demandee;
- push, tag ou publication;
- revert de modifications existantes.

Autorise:

- audits npm en lecture seule;
- collecte de sorties de commandes;
- documentation des exceptions;
- `git diff --check`.
