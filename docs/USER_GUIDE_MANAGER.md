# Guide utilisateur - Manager

## Périmètre réel

Ce guide couvre les écrans manager exposés dans le frontend React:

| Usage | Route UI | Accès principal |
| --- | --- | --- |
| Synthèse opérationnelle | `/manager/cockpit` ou `/manager` | menu `Cockpit manager` |
| File des corrections | `/manager/worklist` | menu `Corrections` |
| Planning courant | `/planning` | menu `Planning` |
| Pré-publication | `/planning/prepublication` | menu `Pré-publication` |
| Congés équipe | `/leaves` | menu `Congés` |

Les routes sont protégées par authentification. Le menu manager est affiché aux utilisateurs non agents disposant de `planning:read`; les rôles `ADMIN`, `SUPER_ADMIN` et `MANAGER` sont traités comme profils manager dans le layout.

## Permissions utiles

| Action | Permission backend |
| --- | --- |
| Lire cockpit, planning, worklist et diagnostics | `planning:read` |
| Modifier, réassigner ou revalider un shift | `planning:write` |
| Publier le planning | `planning:publish` |
| Approuver une exception de conformité | `planning:exceptions:approve` |
| Valider les congés équipe | `leaves:validate` |
| Lire agents et services | `agents:read`, `services:read` |

Le rôle système `MANAGER` reçoit notamment `planning:read`, `planning:write`, `planning:publish`, `leaves:validate`, `services:manage_staff` et les permissions de politiques RH.

## Cockpit manager

Ouvrir `/manager/cockpit`.

Le cockpit charge la période courante par défaut et permet de choisir 7 jours, 30 jours ou une période personnalisée. Si la date de fin est antérieure à la date de début, la page bloque le chargement et affiche l'erreur de période.

Indicateurs à surveiller:

| Indicateur | Interprétation |
| --- | --- |
| `openAlerts` | alertes conformité encore ouvertes |
| `blockedShifts` | shifts bloquants avant publication |
| `agentsAtRisk` | agents à risque opérationnel ou réglementaire |
| `refusedPublications` | publications récemment refusées |
| `pendingCorrections` | corrections restantes |
| statut observabilité | `HEALTHY`, `DEGRADED`, `CRITICAL` ou `UNKNOWN` |

Endpoints appelés:

```text
GET /api/planning/manager/cockpit?from=...&to=...
GET /api/planning/compliance/service-indicators?from=...&to=...
GET /api/planning/observability/health?from=...&to=...
```

## File des corrections

Ouvrir `/manager/worklist`.

La file regroupe les problèmes avant publication. Les catégories visibles correspondent aux catégories backend:

| Catégorie | Libellé UI |
| --- | --- |
| `REST_INSUFFICIENT` | Repos insuffisant |
| `WEEKLY_OVERLOAD` | Surcharge hebdo |
| `MISSING_COMPETENCY` | Compétence manquante |
| `LEAVE_CONFLICT` | Congé conflictuel |

La page permet de filtrer par période, catégorie, criticité, agent ou règle, puis de trier par criticité, échéance ou catégorie. Quand un élément est sélectionné, la page charge le guidage de correction sur le shift ou sur l'alerte associée.

Endpoints appelés:

```text
GET /api/planning/compliance/worklist?from=...&to=...
GET /api/agents
GET /api/planning/shifts/:id/correction-guidance
GET /api/planning/alerts/:id/correction-guidance
```

## Comprendre un blocage

Depuis la file, ouvrir le détail d'un item. Pour un shift, le diagnostic complet est disponible via:

```text
GET /api/planning/shifts/:id/compliance
GET /api/planning/shifts/:id/correction-guidance
GET /api/planning/shifts/:id/suggestions
```

Le diagnostic distingue les raisons bloquantes, les avertissements et les métadonnées de règle. Les suggestions de remplacement utilisent les agents disponibles sur la période et le poste du shift.

## Corriger

Actions backend disponibles:

| Action | Endpoint | Permission |
| --- | --- | --- |
| Réassigner un shift | `POST /api/planning/shifts/:id/reassign` | `planning:write` |
| Demander un remplacement | `POST /api/planning/shifts/:id/request-replacement` | `planning:write` |
| Revalider après correction | `POST /api/planning/shifts/:id/revalidate` | `planning:write` |
| Résoudre une alerte | `PATCH /api/planning/alerts/:id/resolve` | `planning:write` ou `alerts:manage` |
| Approuver une exception | `POST /api/planning/shifts/:id/exception` | `planning:exceptions:approve` |

Les actions de correction acceptent une justification (`reason`) et peuvent transporter `recommendationId` et `alertId` quand elles viennent d'une recommandation. Une exception doit rester motivée: elle est tracée dans l'audit et apparaît comme avertissement en pré-publication.

## Pré-publication et publication

Ouvrir `/planning/prepublication`.

La pré-publication affiche:

- la période choisie;
- le statut publiable ou bloqué;
- les violations bloquantes;
- les avertissements;
- les recommandations correctives;
- la timeline de conformité.

Règles de décision:

1. Lancer la preview avant toute publication.
2. Si `publishable=false`, traiter les violations dans `/manager/worklist`.
3. Si seules des exceptions contrôlées restent, vérifier la justification, l'approbateur et la date.
4. Publier uniquement lorsque le rapport est publiable et que les avertissements sont assumés.

Endpoints:

```text
POST /api/planning/publish/preview
POST /api/planning/publish
GET /api/planning/compliance/timeline?from=...&to=...
```

## Congés équipe

Ouvrir `/leaves`.

Les managers peuvent lire les demandes de l'équipe et valider ou rejeter selon leurs permissions.

Endpoints:

```text
GET /api/leaves/team-requests
PATCH /api/leaves/:id/validate
GET /api/leaves/balances?year=...
```

## États d'erreur attendus

| Cas | Réaction attendue |
| --- | --- |
| Période invalide | corriger les dates dans la page |
| `401` | se reconnecter |
| `403` | demander la permission adaptée |
| `404` shift ou alerte | recharger la file, l'item peut déjà être traité |
| `409` concurrence métier | recharger cockpit et worklist avant de décider |
| Preview non publiable | revenir aux corrections, ne pas publier |

