# Sprint 35 Phase 5 - Observabilite minimale go-live demo commerciale

Date: 2026-05-10
Contexte: go-live commercial controle
Statut cible: `DEMO_COMMERCIALE_MONITORABLE_SOUS_RESERVE`

## Objectif

Verifier qu'une demo commerciale Mediplan peut etre suivie en conditions
controlees avec un monitoring minimal, sans deploiement, migration destructive,
reset DB, restauration de donnees, suppression massive ni push.

Ce document ne valide pas une mise en production client. Il sert a confirmer
que les signaux essentiels sont visibles avant, pendant et juste apres une
demo commerciale.

## Garde-fous

- Aucun push.
- Aucun reset DB.
- Aucune migration destructive.
- Aucune suppression massive.
- Aucune restauration backup sur environnement partage.
- Aucun seed ou reset demo non approuve.
- Aucun contournement manuel des alertes.
- Aucune donnee sensible ajoutee aux supports ou aux logs de demo.

## Checklist monitoring minimal

| Domaine | Controle attendu | Statut Sprint 35 | Preuve attendue |
| --- | --- | --- | --- |
| Uptime | Endpoint applicatif principal et page demo accessibles avant la session. | `A_VERIFIER` | Horodatage, URL cible, resultat HTTP ou capture status. |
| Health backend | Healthcheck backend vivant et pret, sans degradation critique. | `A_VERIFIER` | Resultat `live` / `ready` ou dashboard equivalent. |
| Erreurs frontend | Absence de vague d'erreurs JS visibles sur le parcours demo. | `A_VERIFIER` | Console capturee, outil RUM ou note smoke navigateur. |
| Erreurs backend | Absence d'erreurs 5xx recurrentes sur la fenetre demo. | `A_VERIFIER` | Logs filtres par fenetre horaire, taux 5xx ou rapport API. |
| Logs | Logs applicatifs consultables par l'owner de demo. | `A_VERIFIER` | Lien interne, commande lecture seule ou capture anonymisee. |
| Alertes | Canal d'alerte minimum teste et destinataire identifie. | `A_VERIFIER` | Message test, horodatage, personne ou canal de reception. |
| Formulaire contact | Formulaire contact soumis et reception verifiee sans donnees sensibles. | `A_VERIFIER` | ID submission, email/reception CRM, horodatage. |
| Backup status | Dernier backup connu, exportable ou statut equivalent verifie. | `A_VERIFIER` | Date dernier backup, statut, RPO cible ou rapport backup. |
| Incident runbook | Procedure courte connue: diagnostiquer, communiquer, contourner, escalader. | `A_VERIFIER` | Runbook ci-dessous complete avec owners reels. |
| Acquisition | Metriques minimales de trafic et conversions demo visibles. | `A_VERIFIER` | Visites, sources, clic contact, demandes entrantes. |

## Fenetre de surveillance

Fenetre recommandee:

- `T-30 min`: verifier uptime, health backend, logs, alertes et backup status.
- `T0`: demarrer la demo avec un owner monitoring identifie.
- `T+15 min`: verifier erreurs frontend/backend et formulaire contact si utilise.
- `T+60 min`: consolider incidents, metriques acquisition et anomalies.
- `T+24 h`: confirmer qu'aucune erreur differee ou demande contact n'a ete
  perdue.

## Seuils GO / NO-GO demo

### GO demo commerciale controlee

La demo peut etre lancee si tous les points suivants sont vrais:

- page demo accessible;
- backend `live` et `ready` ou equivalent vert;
- aucun incident P1/P2 ouvert sur le parcours demo;
- logs consultables par une personne identifiee;
- canal d'alerte teste ou astreinte courte confirmee;
- formulaire contact verifie si le parcours commercial l'utilise;
- dernier backup ou statut backup connu;
- metriques acquisition minimales disponibles;
- runbook incident court partage aux participants internes.

### NO-GO demo commerciale

Reporter ou basculer en demo statique si un point bloquant est observe:

- application inaccessible ou instable;
- backend non pret;
- erreurs 5xx recurrentes sur le parcours critique;
- erreur frontend bloquant la navigation ou la conversion;
- logs indisponibles pour diagnostiquer;
- aucun canal d'escalade operationnel;
- formulaire contact non verifie alors qu'il est annonce comme canal commercial;
- backup status inconnu ou explicitement rouge;
- donnee sensible exposee dans l'interface, les logs ou les supports.

## Runbook incident leger

| Etape | Action | Owner | Delai cible |
| --- | --- | --- | --- |
| Detection | Confirmer le symptome avec URL, heure, navigateur et compte demo. | `A_RENSEIGNER` | 5 min |
| Qualification | Classer P1 bloquant, P2 degradant, P3 cosmetique. | `A_RENSEIGNER` | 10 min |
| Communication | Informer le presenter et choisir continuer, contourner ou reporter. | `A_RENSEIGNER` | 10 min |
| Contournement | Basculer vers parcours alternatif, capture ou environnement de secours. | `A_RENSEIGNER` | 15 min |
| Escalade | Ouvrir ticket avec logs, captures, heure, impact et decision. | `A_RENSEIGNER` | 30 min |
| Cloture | Documenter cause probable, impact commercial et action corrective. | `A_RENSEIGNER` | 24 h |

## Metriques acquisition minimales

| Metrique | Pourquoi | Preuve attendue |
| --- | --- | --- |
| Sessions demo | Confirmer que le trafic arrive sur la page attendue. | Analytics, logs web ou compteur interne. |
| Source trafic | Identifier lien direct, campagne, referral ou contact manuel. | Parametres UTM ou rapport acquisition. |
| Clic contact | Mesurer l'intention commerciale. | Evenement analytics ou journal frontend. |
| Soumission contact | Verifier la conversion et la reception operationnelle. | ID formulaire, email ou entree CRM. |
| Erreur conversion | Detecter un blocage sur formulaire ou confirmation. | Logs frontend/backend filtres sur la fenetre. |

## Preuves a rattacher

- URL ou reference environnement de demo.
- Horodatage de la fenetre de surveillance.
- Capture ou export health backend.
- Extrait logs anonymise pour la fenetre demo.
- Preuve de reception alerte test.
- Preuve formulaire contact bout en bout.
- Statut dernier backup.
- Capture ou export metriques acquisition.
- Ticket incident si anomalie detectee.

## Decision attendue

Decision recommandee par defaut: `DEMO_COMMERCIALE_MONITORABLE_SOUS_RESERVE`.

La reserve est levee uniquement quand les preuves ci-dessus sont rattachees a
la session reelle, avec owners identifies et sans alerte bloquante ouverte.
