# Guide utilisateur - Auditeur

## Périmètre réel

Le backend expose les journaux d'audit, la vérification de chaîne, l'export d'audit, les rapports de conformité et la timeline de conformité.

Côté frontend, il n'existe pas de route dédiée `/audit` dans `frontend/src/App.tsx`. Une page `AuditLogPage` existe, mais elle est montée dans `Paramètres` > `Historique` via `/settings?tab=history` et l'onglet est affiché aux profils `ADMIN`, `SUPER_ADMIN` ou `MANAGER`. Le rôle système `AUDITOR` possède bien `audit:read` et `audit:export`, mais l'accès UI auditeur dédié n'est pas exposé dans le menu actuel.

Conséquence: l'audit complet s'appuie aujourd'hui sur les endpoints API et sur l'onglet historique pour les profils qui y ont accès.

## Permissions utiles

| Usage | Permission |
| --- | --- |
| Lire les journaux | `audit:read` |
| Exporter les journaux | `audit:read` côté contrôleur actuel |
| Lire rapports et timeline conformité | `audit:read` |
| Lire services pour contextualiser | `services:read` |
| Lire planning pour contextualiser | `planning:read` |

Le rôle système `AUDITOR` reçoit `audit:read`, `audit:export`, `planning:read` et `services:read`.

## Journal d'audit

Endpoint principal:

```text
GET /api/audit
```

Filtres disponibles:

| Paramètre | Usage |
| --- | --- |
| `tenantId` | sélection tenant, utile surtout super admin |
| `actorId` | filtrer par acteur |
| `action` | filtrer par action d'audit |
| `entityType` | filtrer par type d'entité |
| `entityId` | filtrer par identifiant d'entité |
| `detailAction` | filtrer sur `details.action` |
| `from` | début de période ISO |
| `to` | fin de période ISO |
| `limit` | nombre maximum de lignes |

Exemples:

```text
GET /api/audit?from=2026-05-01T00:00:00.000Z&to=2026-05-31T23:59:59.999Z&limit=100
GET /api/audit?entityType=SHIFT&entityId=123&limit=50
GET /api/audit?detailAction=PUBLISH_PLANNING&limit=50
```

## Export audit

Endpoint:

```text
GET /api/audit/export
```

Les filtres sont les mêmes que `GET /api/audit`. Le contrôleur retourne le résultat de `auditService.exportLogs`; vérifier le format exact côté client consommateur avant d'intégrer un bouton de téléchargement.

## Vérification de chaîne

Endpoint:

```text
GET /api/audit/verify
```

Objectif: vérifier l'intégrité de la chaîne d'audit pour le tenant demandé. La migration `AuditHashChain` ajoute les champs `chainSequence`, `previousHash` et `eventHash`, ainsi que les index de recherche.

Utilisation recommandée:

1. Lancer la vérification sur le tenant.
2. Si la chaîne est invalide, bloquer l'attestation et ouvrir un incident.
3. Comparer les logs autour du premier maillon en erreur.
4. Joindre le résultat de vérification au dossier d'audit.

## Rapports conformité planning

Endpoint:

```text
GET /api/planning/compliance/reports
```

Permission: `audit:read`.

Filtres:

| Paramètre | Usage |
| --- | --- |
| `tenantId` | tenant cible selon droits |
| `from` | début période |
| `to` | fin période |
| `limit` | nombre de rapports, entre 1 et 1000 |

Les rapports permettent d'investiguer les previews et publications planning, avec violations, avertissements et recommandations.

## Timeline conformité

Endpoint:

```text
GET /api/planning/compliance/timeline
```

Permission: `audit:read`.

Filtres:

| Paramètre | Usage |
| --- | --- |
| `from`, `to` | période |
| `limit` | nombre d'événements |
| `agentId` | limiter à un agent |
| `shiftId` | limiter à un shift |

La timeline agrège les événements d'audit et les alertes afin de reconstruire le parcours détecter, corriger, publier.

## Vue historique frontend

Pour les profils qui y ont accès, ouvrir:

```text
/settings?tab=history
```

La vue affiche:

- date et heure;
- acteur;
- action;
- cible;
- détails JSON;
- recherche locale par acteur, action ou entité;
- actualisation périodique toutes les 60 secondes.

Limite actuelle: le bouton `Exporter CSV` est présent dans l'interface mais ne déclenche pas d'appel API dans le composant `AuditLogPage`.

## Procédure d'investigation

1. Identifier tenant, période, acteur éventuel et objet métier.
2. Extraire `GET /api/audit` avec `from`, `to` et `limit`.
3. Pour une publication, filtrer `detailAction=PUBLISH_PLANNING`.
4. Pour un shift, filtrer `entityType=SHIFT` ou utiliser `shiftId` dans la timeline.
5. Lancer `GET /api/audit/verify`.
6. Comparer timeline conformité et journal brut.
7. Vérifier que les exceptions possèdent une justification, un approbateur et une date.
8. Archiver les requêtes, réponses et identifiants d'audit dans le dossier de contrôle.

