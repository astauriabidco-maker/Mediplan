# Sprint 20 - Decision Evidence Pack

Date: 2026-05-05
Objectif: rattacher les `GO` de production a des personnes et preuves reelles.

## Pourquoi maintenant

Le statut technique peut retourner `PROD_READY`, mais une mise en production
hospitaliere exige que les `GO` soient rattaches a des signataires, dates,
raisons et pieces de preuve. Ce pack sert de modele de ticket de decision.

## Commande

```bash
npm run production:evidence-pack
```

Le script genere:

- `preprod-reports/production-decision-evidence-pack-YYYY-MM-DD.md`
- `preprod-reports/production-decision-evidence-pack-YYYY-MM-DD.json`

## Variables a renseigner

Pour chaque role:

| Role | Decision | Signataire | Date | Raison | Preuve |
| --- | --- | --- | --- | --- | --- |
| RH | `PROD_SIGNOFF_RH=GO` | `PROD_SIGNOFF_RH_OWNER` | `PROD_SIGNOFF_RH_DATE` | `PROD_SIGNOFF_RH_REASON` | `PROD_SIGNOFF_RH_EVIDENCE` |
| Manager | `PROD_SIGNOFF_MANAGER=GO` | `PROD_SIGNOFF_MANAGER_OWNER` | `PROD_SIGNOFF_MANAGER_DATE` | `PROD_SIGNOFF_MANAGER_REASON` | `PROD_SIGNOFF_MANAGER_EVIDENCE` |
| Exploitation | `PROD_SIGNOFF_EXPLOITATION=GO` | `PROD_SIGNOFF_EXPLOITATION_OWNER` | `PROD_SIGNOFF_EXPLOITATION_DATE` | `PROD_SIGNOFF_EXPLOITATION_REASON` | `PROD_SIGNOFF_EXPLOITATION_EVIDENCE` |
| Securite | `PROD_SIGNOFF_SECURITY=GO` | `PROD_SIGNOFF_SECURITY_OWNER` | `PROD_SIGNOFF_SECURITY_DATE` | `PROD_SIGNOFF_SECURITY_REASON` | `PROD_SIGNOFF_SECURITY_EVIDENCE` |
| Direction | `PROD_SIGNOFF_DIRECTION=GO` | `PROD_SIGNOFF_DIRECTION_OWNER` | `PROD_SIGNOFF_DIRECTION_DATE` | `PROD_SIGNOFF_DIRECTION_REASON` | `PROD_SIGNOFF_DIRECTION_EVIDENCE` |

## Gates a confirmer

- `PROD_GATE_CI_PRODUCT=PASSED`
- `PROD_GATE_FRONTEND_BUDGET=PASSED`
- `PROD_GATE_AUDITS=PASSED`
- `PROD_GATE_PREPROD_GO_NO_GO=PASSED`
- `PROD_GATE_OPS_READINESS=PASSED`
- `PROD_GATE_BACKUP_RESTORE_RECENT=PASSED`
- `PROD_GATE_BACKUP_RESTORE=PASSED`
- `PROD_GATE_SECURITY_AUDIT=PASSED`
- `PROD_GATE_ROLLBACK=PASSED`

## Sortie attendue

- `EVIDENCE_INCOMPLETE`: il manque au moins un signataire, une date, une
  raison, une preuve ou une gate.
- `EVIDENCE_READY`: les signoffs et gates sont complets pour rattachement au
  ticket.

## Garde-fous

Le pack ne deploie rien, ne tagge rien, ne pousse rien, ne modifie aucune
version et ne touche pas a la base de donnees. Il produit uniquement un modele
de preuve Markdown/JSON.
