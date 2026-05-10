# Sprint 35 - Decision go-live commercial controle

Date: 2026-05-10
Decision recommandee: `COMMERCIAL_DEMO_READY_SOUS_RESERVE`

## Objectif

Autoriser une mise en ligne commerciale controlee pour acquisition, demo et
qualification premier client, sans confondre cette etape avec une production
hospitaliere complete.

Le but est de rendre Mediplan visible, testable et credible pour vendre ou
ouvrir un pilote, avec donnees fictives ou anonymisees et limites d'usage
explicites.

## Statuts possibles

### COMMERCIAL_DEMO_READY

La plateforme peut etre mise en ligne pour demonstration commerciale controlee.

Conditions minimales:

- environnement public ou semi-public disponible en HTTPS;
- donnees demo fictives ou anonymisees uniquement;
- aucun patient, agent reel, planning reel ou document RH reel;
- formulaire contact ou demande demo operationnel ou procedure alternative;
- monitoring minimal et alerte incident disponibles;
- backup minimal ou strategie de restauration documentee;
- limites d'usage visibles dans le dossier commercial;
- rollback simple documente.

### COMMERCIAL_DEMO_READY_SOUS_RESERVE

La demo peut etre preparee, mais une reserve doit etre levee avant exposition
large.

Exemples:

- domaine ou HTTPS non finalise;
- formulaire contact non branche;
- monitoring minimal incomplet;
- mentions limites d'usage a relire;
- preuve backup ou rollback non rattachee.

### COMMERCIAL_DEMO_NOT_READY

La mise en ligne commerciale doit attendre.

Declencheurs:

- donnees sensibles reelles presentes;
- confusion possible avec une production hospitaliere;
- absence de compte demo controle;
- aucun moyen de contact;
- pas de rollback exploitable;
- fail technique bloquant sur parcours demo.

## Distinction avec production

`COMMERCIAL_DEMO_READY` n'est pas `PROD_READY`.

Ce statut autorise:

- demo commerciale;
- prospection premier client;
- qualification pilote;
- environnement demo controle;
- collecte de leads.

Ce statut n'autorise pas:

- exploitation hospitaliere reelle;
- hebergement de donnees patient ou RH reelles;
- engagement SLA production;
- signature d'un `GO_UTILISATEUR_EXTERNE`;
- suppression des reserves Sprint 34.

## Validation attendue

```bash
npm run sprint35:commercial:check
git diff --check
```

## Validation executee

| Controle | Resultat |
| --- | --- |
| Statut commercial demo | `PASSED` - Phase 1 documentee. |
| Environnement demo public | `PASSED` - checklist Phase 2 disponible. |
| Garde-fous donnees sensibles | `PASSED` - Phase 3 documentee. |
| Contact / demande demo | `SOUS_RESERVE` - specification disponible, implementation a livrer ou procedure alternative a activer. |
| Observabilite minimale | `PASSED` - checklist Phase 5 disponible. |
| Lancement premier client | `PASSED` - checklist Phase 6 disponible. |
| Validation automatisee | `PASSED` - `npm run sprint35:commercial:check`. |

## Reserves ouvertes

| Reserve | Impact | Condition de levee |
| --- | --- | --- |
| Contact public | Le formulaire de demande demo n'est pas encore implemente dans le frontend; une procedure alternative peut couvrir une demo guidee. | Page/formulaire contact livre ou canal manuel documente et teste. |
| Environnement public reel | La checklist existe, mais le domaine HTTPS et le deploiement cible restent a renseigner. | URL demo, monitoring et rollback rattaches au dossier. |
| Donnees demo cible | Les garde-fous sont poses; le jeu de donnees final doit etre relu sur l'environnement expose. | Inventaire donnees demo signe ou note d'anonymisation. |

## Decision Sprint 35

Decision recommandee: `COMMERCIAL_DEMO_READY_SOUS_RESERVE`.

Mediplan peut etre prepare pour une mise en ligne commerciale controlee, sous
reserve de conserver le perimetre demo et de ne pas accepter de donnees
hospitalieres reelles avant passage explicite par les gates production.

Ce statut suffit pour organiser une demo commerciale guidee et preparer
l'acquisition du premier client. Il ne suffit pas encore pour une exposition
publique autonome sans canal de contact operationnel et environnement demo
verifie.
