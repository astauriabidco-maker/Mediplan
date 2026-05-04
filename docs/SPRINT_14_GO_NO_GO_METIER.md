# Sprint 14 Phase 7 - Matrice GO/NO-GO metier

## Objectif

Transformer le `GO PREPRODUCTION TECHNIQUE` obtenu en Sprint 13 en decision
metier exploitable par les parties prenantes hospitalieres. Cette matrice ne
remplace pas les preuves techniques: elle verifie que les managers, RH,
auditeurs, referents incidents, UX et securite dependances peuvent accepter ou
bloquer l'ouverture de la recette terrain.

Decision cible:

- `GO METIER`: ouverture recette metier autorisee;
- `GO METIER SOUS RESERVE`: ouverture autorisee avec reserve acceptee,
  contournement documente, responsable et echeance;
- `NO-GO METIER`: ouverture bloquee jusqu'a levee des points critiques.

## Point d'entree Sprint 13

Decision technique source du 2026-05-04: `GO PREPRODUCTION TECHNIQUE`.

Preuves techniques reprises:

| Domaine          | Preuve Sprint 13                  | Resultat                                                                 |
| ---------------- | --------------------------------- | ------------------------------------------------------------------------ |
| Stack preprod    | `npm run preprod:compose:up`      | backend, Postgres, Redis healthy                                         |
| Migrations       | `npm run preprod:compose:migrate` | aucune migration en attente                                              |
| Seed hospitalier | `npm run preprod:compose:seed`    | tenant `HGD-DOUALA`, 3 etablissements, 21 services, 35 agents, 29 shifts |
| Smoke API        | `npm run preprod:compose:smoke`   | `PASSED`                                                                 |
| Conformite       | rapport smoke                     | `HEALTHY`, alertes ouvertes `0`, shifts pending `0`                      |
| Audit            | `GET /api/audit/verify` via smoke | chaine valide, 8 evenements, 0 anomalie                                  |
| Backup           | `npm run preprod:backup:restore`  | `PASSED`, compteurs coherents                                            |

Sources:

- `docs/SPRINT_13_PREPROD_EXECUTION.md`
- `docs/SPRINT_12_GO_NO_GO_CHECKLIST.md`, section
  `Decision formelle Sprint 13 - 2026-05-04`

## Regles de decision metier

| Situation                                                                         | Decision                 |
| --------------------------------------------------------------------------------- | ------------------------ |
| Tous les criteres metier sont `GO`, aucune reserve critique                       | `GO METIER`              |
| Une ou plusieurs reserves non critiques sont acceptees par le signataire concerne | `GO METIER SOUS RESERVE` |
| Un critere manager bloque la publication ou rend le blocage incomprehensible      | `NO-GO METIER`           |
| Un critere RH expose des donnees sensibles ou contourne une permission            | `NO-GO METIER`           |
| Un critere auditeur empeche de reconstruire une decision                          | `NO-GO METIER`           |
| Un incident critique n'a pas de procedure, responsable ou trace de cloture        | `NO-GO METIER`           |
| Une vulnerabilite `high` ou `critical` non acceptee existe dans les dependances   | `NO-GO METIER`           |
| Une reserve touche securite, audit, donnees sensibles ou publication bloquante    | `NO-GO METIER`           |

## Matrice GO/NO-GO

| Domaine              | Critere metier                                                                                                 | Preuves attendues                                                                                                                                                    | GO                                                                                     | NO-GO                                                                                              | Reserve acceptable                                                                   | Signataire                                   |
| -------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------- |
| Manager              | Le manager ouvre `/manager/cockpit`, comprend les compteurs et identifie les priorites.                        | Capture ou PV de recette; periode testee; valeurs `openAlerts`, `blockedShifts`, `agentsAtRisk`, `pendingCorrections`; endpoint `GET /api/planning/manager/cockpit`. | Indicateurs lisibles, periode valide, erreur 401/403 comprise.                         | Cockpit inaccessible, compteurs incoherents ou statut degrade non explique.                        | Libelle mineur ou aide contextuelle incomplete si les actions restent comprises.     | Responsable managers                         |
| Manager              | La file `/manager/worklist` permet de comprendre pourquoi un shift est bloque.                                 | Scenario de recette avec item selectionne; cause, criticite, regle, agent et `shiftId`; appels guidance/compliance documentes.                                       | Cause du blocage comprehensible et action corrective identifiable.                     | Cause opaque, categorie manquante, item critique impossible a prioriser.                           | Tri ou filtre perfectible si l'item critique reste retrouvable.                      | Responsable managers                         |
| Manager              | Une correction ou exception est executee avec justification, puis la preview est relancee.                     | Trace action `reassign`, `request-replacement`, `revalidate` ou `exception`; justification; preview `POST /api/planning/publish/preview`; audit associe.             | Correction visible, justification conservee, preview mise a jour.                      | Action critique sans justification, publication possible malgre violation bloquante, audit absent. | Exception acceptee uniquement avec approbateur, justification et date.               | Responsable managers + approbateur exception |
| RH                   | Les donnees agents, services, grades, competences et conges sont exploitables pour la recette.                 | PV RH; exemples agents/services; verification tenant; guides `USER_GUIDE_HR.md`; endpoints agents/services/conges.                                                   | Donnees coherentes, rattachements services/agents presents, aucun jeu de donnees reel. | Donnees personnelles reelles, agents sans tenant, services non relies, conges incoherents.         | Donnee non bloquante a completer si elle ne modifie pas la validation planning.      | Responsable RH                               |
| RH                   | Une politique RH service/grade peut etre mise a jour et son effet planning est verifie.                        | Requete `POST/PUT /api/work-policies`; preview ou validation planning avant/apres; audit `WORK_POLICY`.                                                              | Impact visible sur conformite, action auditee, permissions respectees.                 | Suppression ou modification sans permission, absence d'audit, effet planning invisible.            | Libelle politique a clarifier si la regle technique appliquee est correcte.          | Responsable RH                               |
| RH                   | Les champs sensibles restent limites aux roles autorises.                                                      | Test role non RH; reponse agent serialisee; controle documents/sante/contacts; absence d'exposition inutile.                                                         | Donnees sensibles masquees ou indisponibles selon role.                                | Role non autorise voit NIR, contacts, documents ou dossiers sante inutiles.                        | Aucune reserve acceptable sur fuite de donnees.                                      | Responsable RH + securite                    |
| Auditeur             | L'auditeur reconstruit la sequence alerte -> recommandation -> action manager -> preview/publication -> audit. | `GET /api/audit`; filtres `from`, `to`, `entityType`, `entityId`, `detailAction`; timeline conformite; rapports conformite.                                          | Sequence complete, acteurs et justifications retrouvables.                             | Decision impossible a reconstruire, identifiants absents, timeline contradictoire.                 | UI auditeur dediee absente acceptee si API et onglet historique couvrent la recette. | Auditeur                                     |
| Auditeur             | La chaine d'audit est verifiee et exportable.                                                                  | `GET /api/audit/verify`; `GET /api/audit/export`; resultat archive dans le dossier recette.                                                                          | Chaine valide, anomalies `0`, export exploitable.                                      | Hash invalide, trou de sequence, export impossible.                                                | Format export a industrialiser si extraction brute reste exploitable.                | Auditeur                                     |
| Incidents            | Un incident conformite peut etre qualifie, corrige, controle et cloture.                                       | Ticket exemple; guide `USER_GUIDE_COMPLIANCE_INCIDENT.md`; cockpit, worklist, timeline, rapports, audit verify; responsable des actions.                             | Declencheur clair, priorisation claire, cloture avec preuves.                          | Incident critique sans responsable, sans trace de decision ou sans critere de cloture.             | Mode manuel accepte si le ticket contient toutes les preuves.                        | Referent exploitation/incidents              |
| Incidents            | Les exceptions metier sont gouvernees.                                                                         | Liste exceptions; approbateur; justification; date; shift/periode; presence dans audit et preview.                                                                   | Exception motivee, assumee et visible avant publication.                               | Exception non motivee, approbateur inconnu, risque non accepte.                                    | Nombre limite d'exceptions accepte si elles sont datees et recontrolees.             | Approbateur exception                        |
| UX                   | Les parcours critiques sont comprehensibles sans support developpeur.                                          | Recette manager/RH/auditeur observee; guides utilisateur; captures ou notes UX; erreurs 401/403/409 documentees.                                                     | Utilisateur cible sait quoi faire apres un blocage ou une erreur.                      | Parcours bloquant sans message utile, CTA trompeur, action critique ambigue.                       | Texte ou polish mineur si le parcours reste autonome.                                | PO/UX                                        |
| UX                   | Les routes exposees correspondent aux capacites reelles.                                                       | Verification `/manager/cockpit`, `/manager/worklist`, `/planning/prepublication`, `/leaves`, `/settings?tab=history`; limites documentees.                           | Ecrans critiques disponibles ou limitation explicite avec alternative API.             | Route annoncee mais inutilisable pour une recette critique.                                        | Absence de route auditeur dediee acceptee si signataire auditeur valide l'usage API. | PO/UX + auditeur                             |
| Securite dependances | Les vulnerabilites dependances sont connues, classees et acceptees ou corrigees.                               | `npm audit` backend/frontend ou commande projet equivalente; rapport date; niveau, package, surface exposee, decision.                                               | Aucune vulnerabilite `high`/`critical`; `moderate` acceptee avec ticket.               | `high`/`critical` non acceptee, package expose en production, absence de rapport.                  | Vulnerabilite transitive `moderate` avec ticket, contournement et echeance.          | Securite                                     |
| Securite dependances | Le lot securite dependances issu de Sprint 13 est trace.                                                       | Reserve Sprint 13 "vulnerabilites npm backend"; ticket securite; owner; echeance; decision d'acceptation.                                                            | Reserve reprise et gouvernee avant ouverture metier.                                   | Reserve oubliee ou sans responsable.                                                               | GO sous reserve seulement si le risque est non critique et signe par securite.       | Securite + sponsor metier                    |

## Preuves attendues par dossier de decision

Chaque passage GO/NO-GO Sprint 14 doit conserver:

- date, version, branche et commit de la candidate;
- tenant de recette, periode testee et profils utilises;
- resultat de la reprise Sprint 13 technique;
- PV ou notes de recette manager, RH, auditeur, incidents et UX;
- rapports `audit/verify`, audit export ou extraction equivalente;
- rapport dependances date;
- liste des reserves avec severite, responsable, echeance et decision;
- signatures nominatives ou validation outillee des signataires.

## Reserves ouvertes au demarrage Sprint 14

| Reserve                                                   | Source                  | Niveau initial | Condition de levee                                                                   | Impact decision                              |
| --------------------------------------------------------- | ----------------------- | -------------- | ------------------------------------------------------------------------------------ | -------------------------------------------- |
| Vulnerabilites npm backend signalees pendant build Docker | Sprint 13               | Moyen          | rapport dependances date, ticket ownerise, absence de `high`/`critical` non acceptee | `GO SOUS RESERVE` possible si securite signe |
| Rapports preprod locaux non historises en Git             | Sprint 13               | Faible         | preuves rattachees au dossier de recette ou ticket decision                          | reserve acceptable                           |
| Acces UI auditeur dedie absent                            | `USER_GUIDE_AUDITOR.md` | Moyen          | auditeur valide le parcours API et/ou onglet historique disponible                   | `GO SOUS RESERVE` possible                   |
| Export CSV audit UI non raccorde                          | `USER_GUIDE_AUDITOR.md` | Faible a moyen | export API documente et utilisable pour le controle                                  | reserve acceptable si auditeur signe         |

## Resultat de cloture Sprint 14

Date de cloture technique: 2026-05-04

| Domaine              | Preuve                                                                 | Resultat                                 | Decision          |
| -------------------- | ---------------------------------------------------------------------- | ---------------------------------------- | ----------------- |
| Recette manager      | `npm run test:e2e -- sprint14-manager-recette.e2e-spec.ts --runInBand` | `PASSED`                                 | `GO`              |
| Recette RH           | `npm run test:e2e -- sprint14-rh-recette.e2e-spec.ts --runInBand`      | `PASSED`                                 | `GO`              |
| Recette auditeur     | `npm run test:e2e -- sprint14-auditor-recette.e2e-spec.ts --runInBand` | `PASSED`                                 | `GO`              |
| UX preprod           | tests frontend manager/prepublication/worklist                         | 3 fichiers, 11 tests `PASSED`            | `GO`              |
| Incident preprod     | `ENV_FILE=.env.preprod node scripts/preprod-incident-drill.mjs`        | `PASSED`, observability `HEALTHY`        | `GO`              |
| Audit preprod        | drill incident                                                         | chaine valide, 14 evenements, 0 anomalie | `GO`              |
| Backup preprod       | drill incident                                                         | snapshot exportable                      | `GO`              |
| Alertes critiques    | `GET /api/agent-alerts?severity=HIGH&isResolved=false`                 | `0` alerte haute ouverte                 | `GO`              |
| Securite dependances | `npm audit fix` non force + `npm audit --omit=dev`                     | 6 vulnerabilites restantes documentees   | `GO SOUS RESERVE` |

Corrections preprod realisees avant la cloture:

- correction de la couverture Urgences `IDE urgence AFGSU2`;
- renouvellement des competences AFGSU2 necessaires;
- resolution auditee des alertes hautes avec justification Sprint 14;
- relance du drill incident jusqu'au statut `PASSED`.

Decision recommandee: `GO METIER SOUS RESERVE`.

Reserve restante: securite dependances backend. Au 2026-05-05, `expr-eval` a
ete remplace en Sprint 15 Phase 1; les vulnerabilites restantes touchent
`nodemailer` et `uuid` transitif via `typeorm` / `preview-email`. Elles ne
doivent pas etre corrigees par `npm audit fix --force`; un lot dedie est requis.

## Signataires

| Role signataire                 | Nom         | Decision                           | Reserves acceptees | Date        | Signature   |
| ------------------------------- | ----------- | ---------------------------------- | ------------------ | ----------- | ----------- |
| Sponsor metier                  | A completer | `GO` / `GO SOUS RESERVE` / `NO-GO` | A completer        | A completer | A completer |
| Responsable managers            | A completer | `GO` / `GO SOUS RESERVE` / `NO-GO` | A completer        | A completer | A completer |
| Responsable RH                  | A completer | `GO` / `GO SOUS RESERVE` / `NO-GO` | A completer        | A completer | A completer |
| Auditeur                        | A completer | `GO` / `GO SOUS RESERVE` / `NO-GO` | A completer        | A completer | A completer |
| Referent exploitation/incidents | A completer | `GO` / `GO SOUS RESERVE` / `NO-GO` | A completer        | A completer | A completer |
| PO/UX                           | A completer | `GO` / `GO SOUS RESERVE` / `NO-GO` | A completer        | A completer | A completer |
| Securite                        | A completer | `GO` / `GO SOUS RESERVE` / `NO-GO` | A completer        | A completer | A completer |

## Journal de decision Sprint 14

```text
Date:
Version/commit:
Tenant recette:
Periode testee:
Profils testes:
Resultat reprise technique Sprint 13:
Resultat recette manager:
Resultat recette RH:
Resultat recette auditeur:
Resultat exercice incident:
Resultat validation UX:
Resultat securite dependances:
Reserves acceptees:
Reserves refusees:
Decision: GO METIER | GO METIER SOUS RESERVE | NO-GO METIER
Signataires:
```

## References

- `docs/SPRINT_13_PREPROD_EXECUTION.md`
- `docs/SPRINT_12_GO_NO_GO_CHECKLIST.md`
- `docs/USER_GUIDE_MANAGER.md`
- `docs/USER_GUIDE_HR.md`
- `docs/USER_GUIDE_AUDITOR.md`
- `docs/USER_GUIDE_COMPLIANCE_INCIDENT.md`
- `docs/SPRINT_11_PRODUCTION_RUNBOOK.md`
