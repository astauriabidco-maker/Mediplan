# Sprint 0 - Core Foundations

## Goal

Stabilize the conventions that every core module must follow before hardening agents, planning, compliance, and audit.

## Core Scope

- Agents and hospital services
- Planning and leaves
- Compliance rules
- Audit trail

Modules such as payroll, documents, WhatsApp, FHIR, QVT, and analytics can depend on the core, but they must not define core security or tenant conventions.

## Authentication Convention

Authenticated requests expose a canonical user object:

- `req.user.id`: authenticated agent id
- `req.user.tenantId`: authenticated tenant id
- `req.user.role`: effective role name
- `req.user.permissions`: effective permissions

Temporary compatibility aliases are also exposed while legacy controllers are cleaned:

- `req.user.userId`
- `req.user.sub`
- `req.user.tenant`

New code must use only `id` and `tenantId`.

## Tenant Convention

The tenant must come from the JWT by default. Client-supplied `tenantId` values are ignored unless the authenticated user is `SUPER_ADMIN`.

Allowed pattern:

```ts
const tenantId = req.user.role === 'SUPER_ADMIN' && queryTenantId
    ? queryTenantId
    : req.user.tenantId;
```

Forbidden pattern:

```ts
const tenantId = queryTenantId || 'HGD-DOUALA';
```

## Sprint 0 Exit Criteria

- Authenticated request shape is documented and typed.
- JWT strategy exposes the canonical request identity.
- Obvious `id/userId/sub` and `tenantId/tenant` mismatches are corrected in core controllers.
- Analytics no longer trusts `tenantId` query parameters for non-super-admin users.
- Build or targeted tests are run after the changes.
