# Sprint 15 - Cloture courte GO/NO-GO preprod

Objectif: produire une decision courte et tracable pour la cloture Sprint 15,
sans mutation preprod implicite. L'orchestrateur agregateur est
`scripts/preprod-go-no-go-final.mjs`.

## Commande finale

```bash
ENV_FILE=.env.preprod node scripts/preprod-go-no-go-final.mjs
```

Rapports produits dans `preprod-reports/`:

- `preprod-go-no-go-final-YYYY-MM-DD.md`;
- `preprod-go-no-go-final-YYYY-MM-DD.json`.

Le JSON contient la decision `GO` / `NO-GO`, le tenant, la date de generation,
les checks relances, les chemins des preuves sources et les raisons bloquantes.

## Preuves agregees

| Preuve | Commande relancee | Mutation |
| --- | --- | --- |
| Incident dry-run | `node scripts/preprod-incident-drill.mjs --dry-run` avec `INCIDENT_DRY_RUN=true`, `INCIDENT_ALLOW_PUBLISH=false`, `INCIDENT_ALLOW_RESTORE=false` | Aucune mutation volontaire; publication/restauration forcees en simulation |
| Synthese operationnelle | `node scripts/preprod-operational-summary.mjs` | Lecture seule API + rapports locaux |
| Demo health check | `node scripts/preprod-demo-health-check.mjs` | Lecture seule API + rapports locaux |
| CI produit liste | `node scripts/ci-product-verify.mjs --list` | Aucune execution de build/test |
| CI produit dry-run | `node scripts/ci-product-verify.mjs --dry-run` | Aucune execution de build/test |

L'orchestrateur continue apres une preuve en echec afin d'ecrire un rapport
final exploitable. Les preuves sources gardent leurs rapports Markdown/JSON du
jour dans le meme `REPORT_DIR`.

## Criteres GO/NO-GO

Decision `GO` uniquement si:

- toutes les commandes obligatoires terminent avec un code retour `0`;
- chaque rapport JSON attendu existe;
- aucune preuve ne retourne `FAILED`, `NO-GO` ou une `blockingReason`;
- la cloture est lancee en mode preprod lecture seule, pas en mock local.

Decision `NO-GO` si:

- une commande echoue ou ne produit pas son rapport JSON;
- le drill incident, la synthese operationnelle ou le health-check demo remonte
  `FAILED` / `NO-GO`;
- une raison bloquante est presente, par exemple alerte HIGH ouverte, audit
  invalide, backup non exportable ou observability critique;
- le script est lance en mode mock local.

## Smoke local sans preprod

Pour valider la syntaxe et le format du rapport sans appeler la preprod:

```bash
node --check scripts/preprod-go-no-go-final.mjs
REPORT_DIR=/tmp/mediplan-go-no-go-smoke node scripts/preprod-go-no-go-final.mjs --mock
```

Le mode `--mock` execute uniquement les preuves locales ou mockables
(`operational-summary --mock`, CI list/dry-run) et marque les preuves preprod
non mockables comme `SKIPPED`. La decision reste volontairement `NO-GO` pour ne
pas confondre un smoke local avec une cloture preprod reelle.

## Exploitation

1. Verifier que `.env.preprod` pointe vers la preprod cible et que le tenant
   attendu est `TENANT_ID=HGD-DOUALA` ou explicitement defini.
2. Lancer la commande finale.
3. Conserver le Markdown final dans le ticket de cloture Sprint 15.
4. En cas de `NO-GO`, traiter les raisons bloquantes listees puis relancer la
   commande finale.
