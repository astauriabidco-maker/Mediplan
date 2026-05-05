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

| Role       | Decision                     | Signataire                      | Date                           | Raison                           | Preuve                             |
| ---------- | ---------------------------- | ------------------------------- | ------------------------------ | -------------------------------- | ---------------------------------- |
| HR         | `PROD_SIGNOFF_HR=GO`         | `PROD_SIGNOFF_HR_OWNER`         | `PROD_SIGNOFF_HR_DATE`         | `PROD_SIGNOFF_HR_REASON`         | `PROD_SIGNOFF_HR_EVIDENCE`         |
| Securite   | `PROD_SIGNOFF_SECURITY=GO`   | `PROD_SIGNOFF_SECURITY_OWNER`   | `PROD_SIGNOFF_SECURITY_DATE`   | `PROD_SIGNOFF_SECURITY_REASON`   | `PROD_SIGNOFF_SECURITY_EVIDENCE`   |
| Operations | `PROD_SIGNOFF_OPERATIONS=GO` | `PROD_SIGNOFF_OPERATIONS_OWNER` | `PROD_SIGNOFF_OPERATIONS_DATE` | `PROD_SIGNOFF_OPERATIONS_REASON` | `PROD_SIGNOFF_OPERATIONS_EVIDENCE` |
| Technical  | `PROD_SIGNOFF_TECHNICAL=GO`  | `PROD_SIGNOFF_TECHNICAL_OWNER`  | `PROD_SIGNOFF_TECHNICAL_DATE`  | `PROD_SIGNOFF_TECHNICAL_REASON`  | `PROD_SIGNOFF_TECHNICAL_EVIDENCE`  |
| Direction  | `PROD_SIGNOFF_DIRECTION=GO`  | `PROD_SIGNOFF_DIRECTION_OWNER`  | `PROD_SIGNOFF_DIRECTION_DATE`  | `PROD_SIGNOFF_DIRECTION_REASON`  | `PROD_SIGNOFF_DIRECTION_EVIDENCE`  |

## Gates a confirmer

- `PROD_FREEZE_STATUS=FREEZE_READY`
- `PROD_GATE_MIGRATION=PASSED`
- `PROD_GATE_SEED=PASSED`
- `PROD_GATE_SMOKE=PASSED`
- `PROD_GATE_COMPLIANCE=PASSED`
- `PROD_GATE_AUDIT=PASSED`
- `PROD_GATE_BACKUP=PASSED`

## Sortie attendue

- `EVIDENCE_INCOMPLETE`: il manque au moins un signataire, une date, une
  raison, une preuve ou une gate.
- `EVIDENCE_READY`: les signoffs et gates sont complets pour rattachement au
  ticket.

## Garde-fous

Le pack ne deploie rien, ne tagge rien, ne pousse rien, ne modifie aucune
version et ne touche pas a la base de donnees. Il produit uniquement un modele
de preuve Markdown/JSON.
