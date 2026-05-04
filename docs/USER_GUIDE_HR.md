# Guide utilisateur - Ressources humaines

## Périmètre réel

Ce guide couvre les surfaces RH actuellement exposées:

| Usage | Route UI | Menu |
| --- | --- | --- |
| Agents | `/agents` | `Agents` > `Liste des Agents` |
| Services | `/agents/services` | `Agents` > `Services` |
| Hiérarchie | `/agents/hierarchy` | `Agents` > `Hiérarchie` |
| Compétences | `/competencies` | `Compétences` |
| Congés | `/leaves` | `Congés` |
| GED | `/ged` | `GED & Documents` |
| Paie | `/payment` | `Facturation & Paies` |
| Politiques et règles | `/settings?tab=rules` | `Paramètres` > `Structure & Règles` |
| Rôles | `/settings?tab=roles` | `Paramètres` > `Rôles & Permissions` |

La route `/settings` n'est affichée dans le menu que si l'utilisateur possède `settings:all` d'après le layout actuel. Les composants internes affichent certains onglets aux profils `ADMIN`, `SUPER_ADMIN` ou `MANAGER`.

## Permissions utiles

| Domaine | Lecture | Écriture / validation |
| --- | --- | --- |
| Agents | `agents:read` | `agents:write` |
| Services | `services:read` | `services:write`, `services:manage_staff` |
| Documents | `documents:read` | `documents:write` |
| Congés | `leaves:read` | `leaves:request`, `leaves:validate`, `leaves:manage` |
| Paie | `payroll:read` | `payroll:write` |
| Politiques RH | `hr-policies:read` | `hr-policies:write`, `hr-policies:manage` |
| Paramètres paie | `settings:read` | `settings:write` |

Le rôle système `HR_MANAGER` possède agents, documents, congés, paie, politiques RH et lecture services.

## Gérer les agents

Ouvrir `/agents`.

La page permet de:

- rechercher par nom, matricule, email, service ou manager;
- filtrer par service, manager, type de contrat ou statut;
- créer un nouvel agent;
- modifier un agent existant;
- générer un contrat RH dans la GED;
- consulter ou gérer les bénéficiaires et dossiers santé quand les contrôles sont utilisés dans la fiche.

Endpoints principaux:

```text
GET /api/agents
POST /api/agents
GET /api/agents/:id
PATCH /api/agents/:id
DELETE /api/agents/:id
GET /api/agents/:id/health-records
POST /api/agents/:id/health-records
DELETE /api/agents/health-records/:recordId
```

Sécurité réelle:

- le `tenantId` est forcé depuis l'utilisateur connecté, sauf règles super admin spécifiques;
- les retours agent sont sérialisés selon le profil lecteur;
- les modifications agents sont auditées côté backend.

## Gérer services et hiérarchie

Ouvrir `/agents/services` pour l'annuaire des services et `/agents/hierarchy` pour la vue hiérarchique.

Actions disponibles côté API:

```text
GET /api/hospital-services
GET /api/hospital-services/tree
GET /api/hospital-services/stats
GET /api/hospital-services/:id/hierarchy
POST /api/hospital-services
POST /api/hospital-services/:id/sub-service
PUT /api/hospital-services/:id
PUT /api/hospital-services/:id/assign-responsible
DELETE /api/hospital-services/:id
```

Le retrait d'un service renvoie `Service disabled successfully`: il s'agit d'une désactivation fonctionnelle, pas nécessairement d'une suppression physique.

## Congés

Ouvrir `/leaves`.

Un agent peut demander un congé pour lui-même; un profil RH ou manager autorisé peut agir sur les demandes d'équipe.

Endpoints:

```text
POST /api/leaves/request
GET /api/leaves/my-leaves
GET /api/leaves/team-requests
PATCH /api/leaves/:id/validate
GET /api/leaves/balances?year=...
```

Statuts de validation pris en charge par l'endpoint de validation:

```text
APPROVED
REJECTED
```

Pour un rejet, renseigner `rejectionReason` afin de conserver une justification exploitable.

## GED, contrats et signature

Ouvrir `/ged` pour la GED et `/agents/templates` pour les modèles de contrat si la route est utilisée directement.

Endpoints documents:

```text
GET /api/documents?agentId=...
POST /api/documents/upload
GET /api/documents/templates
POST /api/documents/templates
POST /api/documents/generate-contract
POST /api/documents/:id
POST /api/documents/:id/request-signature
POST /api/documents/:id/sign
```

Règles importantes:

- un agent standard ne peut voir ou téléverser que ses propres documents;
- un admin peut cibler d'autres agents;
- les documents uploadés sont stockés sous `/public/uploads/documents`;
- la signature journalise l'adresse IP et le user-agent.

## Paie

Ouvrir `/payment`.

Fonctions backend disponibles:

```text
GET /api/payroll/payslips?month=...&year=...
POST /api/payroll/generate/:agentId
POST /api/payroll/generate-all
GET /api/payroll/payslips/:id/pdf
GET /api/payroll/export/sage?month=...&year=...
GET /api/payroll/export/dipe?month=...&year=...
GET /api/payroll/bonus-templates
POST /api/payroll/bonus-templates
GET /api/payroll/rules
POST /api/payroll/rules
POST /api/payroll/rules/:id/delete
```

Les exports SAGE et DIPE renvoient du CSV. Le PDF de bulletin est disponible seulement si le bulletin existe pour le tenant connecté.

## Politiques RH et règles de travail

Les politiques de travail sont exposées par l'API:

```text
GET /api/work-policies
POST /api/work-policies
PUT /api/work-policies/:id
DELETE /api/work-policies/:id
```

Elles sont utilisées par la conformité planning. Toute création, mise à jour ou suppression est auditée avec l'acteur.

## Bonnes pratiques RH

1. Créer ou mettre à jour d'abord les services.
2. Associer chaque agent à un service et à un manager.
3. Maintenir compétences, certificats et dossiers santé avant la génération planning.
4. Valider les congés avant pré-publication.
5. Générer les contrats dans la GED après vérification des informations agent.
6. Générer la paie après clôture des variables de période.
7. Contrôler les exports avant transmission comptable ou déclarative.

