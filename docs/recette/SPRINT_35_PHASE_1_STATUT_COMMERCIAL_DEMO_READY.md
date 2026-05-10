# Sprint 35 - Phase 1 - Statut Commercial Demo Ready

Date: 2026-05-10
Statut cible: `COMMERCIAL_DEMO_READY_SOUS_RESERVE`

## Objectif

Definir un statut de readiness commercial pour rendre Mediplan presentable en
acquisition, demo prospect ou premiere discussion client, sans le confondre
avec une readiness production hospitaliere reelle.

Ce document encadre une demonstration commerciale controlee. Il ne signe pas un
deploiement, ne cree pas de client reel, ne vaut pas engagement contractuel et
ne declenche aucun `GO_UTILISATEUR_EXTERNE`.

## Perimetre autorise

Le statut commercial demo autorise uniquement:

- Une demonstration guidee par l'equipe Mediplan.
- Des donnees fictives, anonymisees ou non sensibles.
- Des parcours representatifs de la valeur produit.
- Des supports d'acquisition, de vente ou de due diligence initiale.
- Une collecte de retours prospect sans usage operationnel hospitalier.

Le statut commercial demo n'autorise pas:

- Une utilisation par des soignants sur des patients reels.
- Une integration a un SI hospitalier de production.
- Une decision de planning, RH, soin ou facturation reelle.
- Une promesse de disponibilite, de support ou de SLA production.
- Une collecte de donnees personnelles de sante reelles.
- Une qualification `PROD_READY` par raccourci.

## Statuts possibles

### COMMERCIAL_DEMO_READY

La plateforme est publiable pour acquisition ou demonstration commerciale
controlee, sans reserve bloquante connue dans le perimetre demo.

Conditions minimales:

- Parcours demo principal rejouable de bout en bout.
- Donnees de demo non sensibles et explicitement fictives ou anonymisees.
- Aucun contenu ne laisse croire a une production hospitaliere active.
- Les limites d'usage sont visibles dans les supports de demo.
- Les reserves P1/P2 connues sont absentes ou fermees pour le perimetre demo.
- L'environnement utilise pour la demo est identifie et separable de toute
  production reelle.
- Les messages commerciaux restent coherents avec l'etat reel du produit.
- Aucun nom de signataire ou client reel n'est invente.

### COMMERCIAL_DEMO_READY_SOUS_RESERVE

La plateforme est presentable commercialement, mais certaines preuves ou
validations restent a completer avant une diffusion plus large.

Ce statut est recommande pour Sprint 35 tant que les preuves de demo, captures,
supports finaux, validation metier ou revue de formulation commerciale ne sont
pas toutes rattachees.

Reserves typiques:

- Parcours demo valide localement mais non rejoue sur l'environnement cible.
- Captures, script de demo ou dossier prospect encore incomplets.
- Donnees de demo a relire pour confirmer l'absence de donnees sensibles.
- Formulations marketing a ajuster pour eviter toute promesse production.
- Performance ou stabilite suffisante pour une demo guidee mais non garantie
  pour une exposition autonome.
- Validation finale d'un responsable commercial, produit ou juridique absente.

### COMMERCIAL_DEMO_NOT_READY

La plateforme ne doit pas etre montree a un prospect ou utilisee dans une
demarche d'acquisition.

Declencheurs:

- Donnees personnelles, hospitalieres ou patient reelles dans la demo.
- Parcours demo principal casse ou impossible a rejouer.
- Confusion visible entre demo commerciale et exploitation production.
- Mention d'un `GO_UTILISATEUR_EXTERNE` ou d'une signature fictive.
- Reserve P1 non mitigee dans le parcours presente.
- Risque de mauvaise interpretation commerciale non corrige.
- Environnement instable au point de compromettre la demonstration guidee.

## Distinction avec PROD_READY

`COMMERCIAL_DEMO_READY` et `PROD_READY` ne mesurent pas la meme chose.

| Axe | Commercial demo | Production |
| --- | --- | --- |
| Finalite | Montrer la valeur produit et soutenir l'acquisition. | Servir un usage operationnel reel. |
| Donnees | Fictives, anonymisees ou non sensibles. | Donnees reelles sous controles contractuels, securite et conformite. |
| Utilisateurs | Equipe Mediplan, prospects accompagnes, evaluateurs. | Utilisateurs clients habilites. |
| Preuves | Parcours demo, script, captures, limites d'usage. | Go-live, backup/restore, supervision, support, rollback, signatures. |
| Risque acceptable | Incident de demonstration maitrise. | Incident operationnel ou clinique a prevenir et traiter. |
| Decision | Readiness commerciale interne. | Decision institutionnelle de mise en production. |

Un statut `COMMERCIAL_DEMO_READY` ne peut donc pas etre converti en
`PROD_READY` sans dossier production distinct. Les gates Sprint 34 restent la
reference pour toute discussion de production.

## Limites d'usage

Toute demo Sprint 35 doit etre presentee comme une experience commerciale ou
produit, pas comme une exploitation hospitaliere reelle.

Formulation recommandee:

```text
Mediplan est pret pour une demonstration commerciale controlee avec donnees de
demo. Ce statut ne vaut pas mise en production hospitaliere, ni autorisation
d'usage par des utilisateurs externes sur des donnees reelles.
```

Formulations interdites:

- `GO_UTILISATEUR_EXTERNE`.
- "Production hospitaliere active".
- "Pret pour usage patient reel".
- "Valide par l'hopital" sans preuve et signataire reel.
- "SLA production garanti" sans contrat et organisation support validee.

## Criteres de decision Sprint 35

```text
COMMERCIAL_DEMO_READY
  si le parcours commercial est rejouable
  et les donnees sont non sensibles
  et les limites d'usage sont explicites
  et aucune reserve demo bloquante n'est ouverte.

COMMERCIAL_DEMO_READY_SOUS_RESERVE
  si la demo est exploitable pour acquisition controlee
  mais qu'il reste des preuves, supports ou validations a finaliser.

COMMERCIAL_DEMO_NOT_READY
  si la demo contient des donnees sensibles
  ou si le parcours principal est casse
  ou si elle peut etre comprise comme un go-live production.
```

## Decision recommandee

Decision recommandee: `COMMERCIAL_DEMO_READY_SOUS_RESERVE`.

Motifs:

- Le Sprint 35 vise une publication pour acquisition et demo premier client,
  pas une production hospitaliere reelle.
- Les preuves commerciales finales doivent rester rattachees a un dossier de
  demo et ne remplacent pas les preuves `PROD_READY`.
- Aucun deploiement, migration destructive, reset DB, push, faux signataire ou
  `GO_UTILISATEUR_EXTERNE` ne doit etre declenche par ce statut.

## Conditions pour lever les reserves

| Reserve | Condition de levee | Preuve attendue |
| --- | --- | --- |
| Parcours demo | Scenario principal rejoue sur l'environnement cible. | Rapport ou checklist demo datee. |
| Donnees | Jeu de demo relu et declare non sensible. | Inventaire ou note d'anonymisation. |
| Supports | Script, captures et discours prospect finalises. | Dossier commercial ou lien interne. |
| Limites d'usage | Disclaimer demo present dans les supports. | Capture ou extrait support. |
| Messages commerciaux | Promesses revues pour exclure production reelle. | Revue produit, commerciale ou juridique. |
| Stabilite | Demo guidee acceptable sur la fenetre prevue. | Smoke demo ou repetition interne. |

## Position explicite

Le statut commercial demo est un feu vert de presentation controlee, pas un feu
vert d'exploitation. Sans dossier production distinct, signatures reelles,
preuves operationnelles et decision institutionnelle, Mediplan reste hors
`PROD_READY`.
