# Sprint 31 Phase 6 - Backlog reserves restantes

## Objectif

Lister les reserves encore ouvertes apres la decision interne Sprint 31, sans
changer le statut produit ni masquer les limites du signoff interne.

Statut courant: `VALIDATION_INTERNE`.

Decision interne associee: `GO_INTERNE_SOUS_RESERVE`.

Ce backlog complete `docs/recette/SPRINT_31_DECISION_INTERNE.md` et reprend les
reserves deja acceptees dans le PV Ops Sprint 30. Il sert de point d'entree pour
la preparation du pilote externe.

## Synthese

| ID | Reserve | Priorite | Statut | Owner cible | Critere de levee |
| --- | --- | --- | --- | --- | --- |
| `S31-R01` | Harmoniser les libelles d'escalade entre Action Center, notifications et audit Ops. | P2 | `OUVERTE` | PO/UX + frontend | Les memes termes metier sont visibles sur `/ops`, notifications et `/audit`; aucune interpretation technique n'est requise. |
| `S31-R02` | Rattacher des captures anonymisees ou notes de parcours signees pour le cockpit Ops. | P2 | `OUVERTE` | Referent recette | Les preuves `S30-P5-01` a `S30-P5-12` sont rattachees au ticket ou remplacees par observations anonymisees signees. |
| `S31-R03` | Confirmer l'accessibilite clavier, focus, contraste informationnel et messages d'erreur sur le parcours Ops. | P2 | `A_VERIFIER` | PO/UX + referent accessibilite | Parcours `/ops` et `/audit` rejoue sans souris, focus visible, messages utiles, aucune impasse de comprehension. |
| `S31-R04` | Rejouer le controle performance percue et le build frontend avant archivage. | P3 | `A_VERIFIER` | Frontend | Chargement `/ops` stable, mutations avec feedback visible, `npm --prefix frontend run build` relance sans regression bloquante. |
| `S31-R05` | Obtenir un pilote externe nominatif avant toute decision utilisateur externe. | P1 externe | `BLOQUANT_GO_EXTERNE` | Fondateur / produit | Representant hospitalier reel designe, parcours execute sur donnees anonymisees, decision `GO_UTILISATEUR_EXTERNE`, `GO_EXTERNE_SOUS_RESERVE` ou `NO_GO_EXTERNE` signee. |

## Details par reserve

### `S31-R01` - Libelles

Constat: le PV Sprint 30 accepte une reserve sur l'harmonisation du libelle
d'escalade entre Action Center et notifications. La reserve reste ouverte tant
que le vocabulaire n'est pas relu sur les trois surfaces visibles par
l'utilisateur: cockpit Ops, notification et audit.

Impact: ralentissement possible en astreinte, mais pas de blocage de resolution
tant que la priorite et la cause restent lisibles.

Preuves attendues:

- capture ou note `/ops` avec item Action Center critique;
- capture ou note panneau notifications avec le meme incident;
- capture ou note `/audit` permettant de retrouver la sequence.

### `S31-R02` - Captures anonymisees

Constat: les preuves visuelles Sprint 30 Phase 5 sont documentees comme trace
textuelle acceptable sous reserve de captures. Toute capture contenant
identifiant agent, donnees RH, details patient ou information nominative doit
etre anonymisee avant diffusion large.

Impact: risque documentaire et conformite si les preuves sont partagees hors
cercle restreint.

Preuves attendues:

- fichiers ou observations `S30-P5-01` a `S30-P5-12`;
- mention explicite de l'environnement, du navigateur, du tenant et de la date;
- confirmation `ANONYMISEE` ou stockage en espace restreint.

### `S31-R03` - Accessibilite

Constat: le GO interne repose surtout sur validations automatisees et revue
produit. Une passe d'accessibilite utilisateur reste a rejouer avant pilote
externe.

Impact: risque d'impasse utilisateur si une action critique depend de la souris,
d'un focus invisible, d'un contraste insuffisant ou d'un message ambigu.

Checklist minimale:

- navigation clavier sur `/ops` jusqu'au tenant critique, Action Center,
  runbook, notifications et resolution;
- navigation clavier sur `/audit` avec filtres Runbook/SLO et recherche;
- focus visible sur controles interactifs;
- statuts `OPEN`, `IN_PROGRESS`, `WAITING_EVIDENCE`, `RESOLVED`, `FAILED` et
  `WARNING` comprehensibles hors couleur seule;
- erreur ou mutation en attente annoncee par un message lisible.

### `S31-R04` - Performance

Constat: les controles frontend doivent etre relances avant archivage final des
preuves. La reserve porte sur la performance percue du cockpit Ops et la
stabilite de build, pas sur un incident bloquant observe.

Impact: risque de degradation UX si le cockpit charge lentement, si les
mutations ne donnent pas de feedback ou si le layout bouge pendant le
rafraichissement.

Preuves attendues:

- note de parcours sur chargement `/ops`, rafraichissement et mutation Action
  Center;
- build frontend relance;
- absence de regression bloquante dans le controle diff.

### `S31-R05` - Pilote externe

Constat: la decision Sprint 31 est interne et ne vaut pas signoff hospitalier.
Cette reserve est bloquante uniquement pour un `GO_UTILISATEUR_EXTERNE`.

Impact: aucune ouverture client ou hospitaliere reelle ne doit s'appuyer sur le
seul statut `VALIDATION_INTERNE` ou sur la decision interne
`GO_INTERNE_SOUS_RESERVE`.

Preuves attendues:

- nom, role et organisation du representant pilote;
- donnees de parcours anonymisees;
- captures ou notes rattachees au ticket pilote;
- decision externe explicite avec date.

## Validations attendues

Avant cloture de ces reserves, conserver dans le ticket de recette:

```bash
npm --prefix frontend run test -- --run src/api/ops.contract.test.ts src/api/ops.api.test.ts src/api/queryKeys.test.ts src/pages/OpsDashboardPage.test.tsx src/pages/AuditLogPage.test.tsx
npm --prefix frontend run build
git diff --check
```

## Decision Phase 6

Decision documentaire: `BACKLOG_RESERVES_LISTE`.

Le statut `VALIDATION_INTERNE` avec decision interne `GO_INTERNE_SOUS_RESERVE`
reste coherent si aucune reserve P1 interne n'est ajoutee. Le passage en
`GO_UTILISATEUR_EXTERNE` reste bloque par `S31-R05` tant qu'un pilote externe
nominatif n'a pas signe une decision explicite.
