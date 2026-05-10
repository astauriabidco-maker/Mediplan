# Sprint 36 Phase 3 - Mode demo commerciale

Statut cible: `DEMO_COMMERCIALE_FICTIVE_ISOLEE`

## Perimetre

- Tenant dedie: `MEDIPLAN-DEMO-COMMERCIALE-S36`.
- Donnees attendues: jeux fictifs uniquement, sans donnee patient, RH, paie ou audit reelle.
- UI: bannire globale `Sprint36CommercialDemoBanner` visible quand le tenant actif est le tenant demo.
- Garde import/export sensible: backup tenant, audit export et exports paie CSV bloques sur le tenant demo.

## Recette fonctionnelle

| Controle | Attendu | Statut |
| --- | --- | --- |
| Tenant separe | Le parcours commercial utilise `MEDIPLAN-DEMO-COMMERCIALE-S36`, pas un tenant pilote ou production. | `A_VERIFIER` |
| Donnees fictives | La bannire indique explicitement que les donnees sont fictives. | `A_VERIFIER` |
| Export backup | `/api/tenant-backups/export` renvoie un refus sur le tenant demo. | `A_VERIFIER` |
| Import backup | `/api/tenant-backups/import` renvoie un refus sur le tenant demo. | `A_VERIFIER` |
| Export audit | `/api/audit/export` renvoie un refus sur le tenant demo. | `A_VERIFIER` |
| Export paie | `/api/payroll/export/sage` et `/api/payroll/export/dipe` renvoient un refus sur le tenant demo. | `A_VERIFIER` |
| Parcours lecture demo | Dashboard, planning, manager et ops restent consultables avec les donnees fictives. | `A_VERIFIER` |

## Commandes de validation

```bash
npm --prefix frontend run test -- --run src/lib/sprint36CommercialDemo.test.ts src/components/Sprint36CommercialDemoBanner.test.tsx src/api/axios.test.ts
npm test -- backup.controller.spec.ts audit.controller.spec.ts --runInBand
git diff --check
```

## Notes d'exploitation

- Ne pas lancer de reset DB ou migration destructive pour activer ce mode.
- Ne pas importer de snapshot reel dans le tenant demo.
- Ne pas exposer de fichiers CSV, PDF ou backups generes depuis le tenant demo commercial.
