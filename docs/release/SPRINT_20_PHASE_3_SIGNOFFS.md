# Sprint 20 Phase 3 - Signoffs production

Date: 2026-05-05
Statut cible: `SIGNOFF_READY`
Statut par defaut sans signatures: `SIGNOFF_NO_GO`

## Objectif

Formaliser la matrice de signatures humaines requises avant mise en
production. La decision `SIGNOFF_READY` est possible uniquement lorsque les
cinq signoffs explicites valent `GO`.

Le script associe une sortie Markdown lisible a un bloc JSON exploitable par CI
ou par un dossier de release. Il est non destructif: il lit uniquement les
variables d'environnement et n'ecrit aucun fichier.

## Commande

```bash
node scripts/production-signoff-matrix.mjs
```

Pour une sortie machine uniquement:

```bash
node scripts/production-signoff-matrix.mjs --format json
```

## Signoffs obligatoires

| Role | Variable GO obligatoire | Signe quoi | Preuves attendues |
| --- | --- | --- | --- |
| Responsable RH | `PROD_SIGNOFF_RH=GO` | Validation metier RH du perimetre production. | PV de recette RH, liste des ecarts acceptes, confirmation du support utilisateurs. |
| Manager pilote | `PROD_SIGNOFF_MANAGER=GO` | Validation operationnelle du service pilote et du calendrier de bascule. | Compte rendu pilote, plan de communication equipe, acceptation des impacts connus. |
| Responsable exploitation | `PROD_SIGNOFF_EXPLOITATION=GO` | Validation run, supervision, sauvegardes et procedure rollback. | Checklist exploitation, preuve backup/restore, procedure rollback, astreinte identifiee. |
| Referent securite | `PROD_SIGNOFF_SECURITY=GO` | Validation securite, acces, dependances et risques residuels. | Revue dependances, revue secrets/acces, journal des risques residuels acceptes. |
| Direction / sponsor metier | `PROD_SIGNOFF_DIRECTION=GO` | Arbitrage final GO/NO-GO et acceptation du risque de mise en production. | Decision sponsor datee, fenetre de lancement approuvee, criteres de retour arriere valides. |

## Metadonnees optionnelles

Chaque role peut fournir un signataire, une date et une raison. Les dates sont
informatives et ne bloquent pas `SIGNOFF_READY`; la valeur bloquante reste le
`GO` explicite.

| Role | Owner | Date optionnelle | Raison optionnelle |
| --- | --- | --- | --- |
| Responsable RH | `PROD_SIGNOFF_RH_OWNER` | `PROD_SIGNOFF_RH_DATE` | `PROD_SIGNOFF_RH_REASON` |
| Manager pilote | `PROD_SIGNOFF_MANAGER_OWNER` | `PROD_SIGNOFF_MANAGER_DATE` | `PROD_SIGNOFF_MANAGER_REASON` |
| Responsable exploitation | `PROD_SIGNOFF_EXPLOITATION_OWNER` | `PROD_SIGNOFF_EXPLOITATION_DATE` | `PROD_SIGNOFF_EXPLOITATION_REASON` |
| Referent securite | `PROD_SIGNOFF_SECURITY_OWNER` | `PROD_SIGNOFF_SECURITY_DATE` | `PROD_SIGNOFF_SECURITY_REASON` |
| Direction / sponsor metier | `PROD_SIGNOFF_DIRECTION_OWNER` | `PROD_SIGNOFF_DIRECTION_DATE` | `PROD_SIGNOFF_DIRECTION_REASON` |

## Decision

`SIGNOFF_READY` si et seulement si:

- `PROD_SIGNOFF_RH=GO`;
- `PROD_SIGNOFF_MANAGER=GO`;
- `PROD_SIGNOFF_EXPLOITATION=GO`;
- `PROD_SIGNOFF_SECURITY=GO`;
- `PROD_SIGNOFF_DIRECTION=GO`.

`SIGNOFF_NO_GO` si une seule valeur manque, est vide, ou differe de `GO`.

## Garde-fous

- Aucun deploiement.
- Aucun tag.
- Aucun push.
- Aucune modification de version.
- Aucune migration.
- Aucun seed.
- Aucune restauration backup.
- Aucune mutation Docker, API ou base de donnees.

## Verification locale

Sans environnement de signatures, la decision attendue est `SIGNOFF_NO_GO`:

```bash
node scripts/production-signoff-matrix.mjs --format json
```

Avec les cinq valeurs simulees a `GO`, la decision attendue est
`SIGNOFF_READY`:

```bash
PROD_SIGNOFF_RH=GO \
PROD_SIGNOFF_MANAGER=GO \
PROD_SIGNOFF_EXPLOITATION=GO \
PROD_SIGNOFF_SECURITY=GO \
PROD_SIGNOFF_DIRECTION=GO \
node scripts/production-signoff-matrix.mjs --format json
```
