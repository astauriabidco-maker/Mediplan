# Sprint 32 Phase 6 - Risques ouverts avant pilote externe

## Objectif

Lister les risques encore ouverts avant pilote externe Mediplan, sans modifier
le statut produit ni transformer la validation interne en signoff hospitalier.

Statut courant: `VALIDATION_INTERNE`.

Decision interne heritee: `GO_INTERNE_SOUS_RESERVE`.

Ce registre complete:

- `docs/recette/SPRINT_31_DECISION_INTERNE.md`
- `docs/recette/SPRINT_31_PHASE_3_PACK_PILOTE_EXTERNE.md`
- `docs/recette/SPRINT_31_PHASE_6_BACKLOG_RESERVES.md`
- `docs/ops/SPRINT_23_PHASE_6_RUNBOOK_AUTOMATISE.md`

Il doit etre relu avant toute session avec un hopital pilote, puis annexe au
ticket de preparation pilote avec les owners, dates cibles et preuves de levee.

## Synthese decisionnelle

Decision documentaire Sprint 32 Phase 6: `RISQUES_AVANT_PILOTE_LISTES`.

Le pilote externe reste possible uniquement en mode controle si les risques P1
sont acceptes avec mitigation active, owner nomme et critere de sortie explicite.
Un risque P1 sans owner ou sans mitigation datee bloque la decision
`PILOT_GO`.

| Niveau | Sens avant pilote | Regle de decision |
| --- | --- | --- |
| P1 | Risque susceptible de bloquer securite, donnees, signoff, exploitation ou support pendant une session externe. | Bloque `PILOT_GO` si non mitige, non accepte ou sans owner. |
| P2 | Risque important mais contournable pendant une session accompagnee. | Autorise `PILOT_GO_SOUS_RESERVE` si plan de levee et preuve de controle existent. |
| P3 | Irritant ou dette documentaire sans impact direct sur la decision pilote. | Suivi backlog, non bloquant si visible dans le PV. |

## Matrice des risques ouverts

| ID | Domaine | Risque ouvert | Priorite | Impact pilote | Mitigation avant session | Owner cible | Critere de levee |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `S32-R01` | Securite | Comptes pilote, droits par role et desactivation post-session pas encore verifies sur un tenant externe nominatif. | P1 | Acces excessif ou compte temporaire actif apres recette. | Creer une matrice comptes/roles, limiter au tenant pilote, executer une cloture acces en fin de session. | Lead technique + responsable Ops | Liste des comptes, droits constates, date de desactivation et preuve de revue rattachees au ticket pilote. |
| `S32-R02` | Donnees | Jeu de donnees pilote pas encore confirme par le referent conformite comme anonymise ou pseudonymise. | P1 | Fuite de donnees agent, patient, RH ou tenant dans captures, exports ou tickets. | Appliquer la grille d'anonymisation Sprint 31 Phase 3, interdire les exports bruts, stocker preuves en zone restreinte. | Referent conformite / DPO + observateur recette | Avis conformite explicite, echantillon de donnees valide, preuves classees `ANONYMISEES` ou `RESTREINTES`. |
| `S32-R03` | Signoff | Aucun representant hospitalier externe nominatif n'a encore signe la decision pilote. | P1 | Confusion entre validation interne et accord utilisateur externe. | Nommer sponsor, manager pilote et referent conformite avant session; conserver signatures placeholders tant que noms absents. | Fondateur / produit | PV de session avec noms, roles, dates et decision `PILOT_GO`, `PILOT_GO_SOUS_RESERVE` ou `PILOT_NO_GO`. |
| `S32-R04` | UX | Parcours clavier, focus, contraste informationnel et messages d'erreur critiques restent a rejouer avec un utilisateur ou observateur externe. | P2 | Blocage ou incomprehension pendant parcours manager, RH, Ops ou audit. | Rejouer les parcours critiques sans souris, noter les irritants, fournir accompagnement de session. | PO/UX + observateur recette | Checklist UX signee: aucun blocage P1, reserves P2/P3 classees avec owner et date cible. |
| `S32-R05` | Performance | Performance percue du cockpit Ops, audit et parcours planning non mesuree sur l'environnement pilote cible. | P2 | Session ralentie, feedback mutation mal percu, perte de confiance utilisateur. | Relancer build et tests cibles, chronometrer chargement initial et mutations pendant dry-run interne. | Frontend + responsable Ops | Temps observes et build conserves; aucune degradation bloquante sur `/ops`, `/audit` et parcours planning pilote. |
| `S32-R06` | Exploitation | Procedure incident, support de session, escalade et rollback non encore rattaches au pilote nominatif. | P1 | Incident de session sans responsable, preuve ou sortie controlee. | Preparer canal support, incident commander, scribe, procedure de fin de test et runbook incident. | Responsable Ops | Fiche exploitation pilote avec canal, contacts, criteres `NO-GO`, rollback et cloture acces. |
| `S32-R07` | Support | Capacite de support pendant la session et apres-session non formalisee: triage, delais, canal, priorisation. | P2 | Reserves terrain perdues ou delais de reponse non alignes avec le pilote. | Ouvrir un ticket support pilote, definir SLA de reponse, etiquettes P1/P2/P3 et rituel de consolidation. | Support / produit | Ticket support pilote actif, proprietaire nomme, format de triage et calendrier de restitution valides. |
| `S32-R08` | Preuves | Captures et notes de parcours Sprint 30/31 ne sont pas toutes rattachees ou anonymisees. | P2 | Decision externe fragile faute de preuves partageables. | Remplacer capture manquante par note horodatee signee; marquer toute preuve sensible comme restreinte. | Observateur recette + conformite | Dossier preuves avec statut par parcours `ACCEPTEE`, `RESTREINTE`, `REMPLACEE_PAR_NOTE` ou `MANQUANTE_JUSTIFIEE`. |
| `S32-R09` | Donnees | Exports CSV ou rapports de direction peuvent exposer plus de colonnes que necessaire pour une recette pilote. | P2 | Diffusion excessive de donnees RH ou operationnelles. | Generer exports minimaux, supprimer colonnes inutiles, verifier stockage et destinataires. | RH + conformite | Echantillon export valide, colonnes justifiees, destinataires approuves. |
| `S32-R10` | Exploitation | Readiness reelle de l'environnement pilote non prouvee par les controles quotidiens et smoke de pre-session. | P1 | Session externe lancee sur environnement instable. | Executer le paquet Ops quotidien ou controles equivalents le jour J; conserver synthese health, alertes, audit chain et backup. | Responsable Ops + lead technique | Decision `READY` horodatee avant session; aucun `HIGH` ouvert sans owner. |
| `S32-R11` | UX | Libelles d'escalade et aides Ops encore perfectibles entre Action Center, notifications et audit. | P3 | Irritant de comprehension en astreinte accompagnee. | Fournir glossaire de session, noter ecarts de libelle, prioriser correction si confusion observee. | PO/UX + frontend | Memes termes metier visibles sur `/ops`, notifications et `/audit`, ou reserve acceptee P3 dans le PV. |
| `S32-R12` | Support | Process de consolidation apres session non encore date: retour sponsor, arbitrage reserves et decision suivante. | P2 | Reserves non arbitrees, decision pilote retardee ou contestable. | Planifier debrief a chaud et comite de cloture, avec matrice P1/P2/P3 et owners. | Produit + sponsor pilote | Compte rendu de cloture avec decision, backlog signe et date de re-test des P1/P2. |

## Mitigations minimales avant invitation externe

| Domaine | Mitigation minimale | Preuve attendue |
| --- | --- | --- |
| Securite | Comptes temporaires limites au tenant pilote, MFA/SSO ou mot de passe controle selon politique, droits relus par role. | Matrice comptes/roles et confirmation de cloture acces. |
| Donnees | Donnees agent, patient, RH, tenant et exports anonymises ou confines en zone restreinte. | Avis conformite et statut de chaque preuve. |
| Signoff | Representants reels nommes avant session, placeholders non presentes comme signatures. | PV avec noms, roles et decision explicite. |
| UX | Parcours critiques rejoues, reserves qualifiees, accompagnement disponible pendant la session. | Notes de parcours ou captures anonymisees. |
| Performance | Build et filet de tests cibles relances; chargements principaux observes sur environnement pilote. | Sortie commande et mesures de session. |
| Exploitation | Readiness jour J, canal support, incident commander, rollback et cloture acces prets. | Fiche exploitation pilote et decision `READY`. |
| Support | Ticket pilote, SLA de triage, rituel de debrief et owners de reserves predefinis. | Ticket support et calendrier de restitution. |

## Conditions de blocage

Le pilote externe doit etre reporte si l'un des cas suivants est observe:

- un risque P1 reste sans owner, sans mitigation active ou sans date cible;
- une donnee nominative brute doit etre partagee hors zone restreinte;
- le signataire externe est absent ou remplace par un placeholder;
- l'environnement pilote n'a pas de readiness horodatee le jour de la session;
- le canal support ou la procedure d'escalade ne sont pas connus des
  participants;
- un compte temporaire ne peut pas etre desactive ou audite apres la session;
- un parcours critique manager, RH, Ops ou audit est `BLOCKED` sans
  contournement accepte.

## Format de suivi des risques

```text
ID risque:
Domaine:
Priorite: P1 | P2 | P3
Owner:
Date cible:
Statut: OUVERT | MITIGE | ACCEPTE | LEVE | BLOQUANT
Mitigation appliquee:
Preuve rattachee:
Decision pilote impactee: PILOT_GO | PILOT_GO_SOUS_RESERVE | PILOT_NO_GO
Commentaire sponsor:
```

## Validations attendues

Avant diffusion du registre, conserver:

```bash
git diff --check docs/recette/SPRINT_32_PHASE_6_RISQUES_AVANT_PILOTE.md
```

Avant session pilote, conserver dans le ticket:

```bash
npm run sprint31:phase5
npm run ops:daily
git diff --check
```

## Statut final Phase 6

Statut documentaire: `RISQUES_AVANT_PILOTE_LISTES`.

La preparation pilote peut continuer, mais le passage en `PILOT_GO` reste
conditionne a la mitigation des P1 `S32-R01`, `S32-R02`, `S32-R03`,
`S32-R06` et `S32-R10`, avec owners nommes et preuves rattachees. A defaut,
la seule decision compatible reste `PILOT_GO_SOUS_RESERVE` si les mitigations
sont actives, ou `PILOT_NO_GO` si un P1 demeure non maitrise.
