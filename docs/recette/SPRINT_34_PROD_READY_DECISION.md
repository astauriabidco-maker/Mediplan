# Sprint 34 - Production Ready Decision

Date: 2026-05-10
Decision recommandee: `PROD_READY_SOUS_RESERVE`

## Objectif

Formaliser la decision courte de readiness production apres Sprint 33, sans
confondre readiness technique et autorisation reelle de mise en production.

Le depot est prepare pour examiner une production, mais une personne seule ne
peut pas produire a elle seule les preuves metier, exploitation, securite et
direction qui valent decision institutionnelle.

## Statuts possibles

### PROD_READY

Production envisageable sans reserve bloquante.

Conditions minimales:

- Version, commit et tag candidat identifies.
- Environnement production ou preproduction finale verifie.
- Migrations inventoriees et plan de migration valide.
- Smoke critique passe sur environnement cible.
- Backup/restore prouve et recent.
- Drill incident realise.
- Observabilite et alertes operationnelles.
- Audit dependances revu.
- Rollback documente, teste ou explicitement accepte.
- Support lancement identifie.
- Signatures reelles RH, securite, exploitation, technique et direction
  rattachees au dossier.

### PROD_READY_SOUS_RESERVE

Production techniquement preparable, mais decision finale suspendue a des
preuves ou validations humaines reelles.

Ce statut est le statut recommande par defaut pour Sprint 34, car l'utilisateur
est seul et aucune signature externe reelle ne doit etre inventee.

Reserves typiques:

- Signataires reels non renseignes.
- Rapport backup/restore non rattache.
- Smoke production non rejoue sur environnement cible.
- Audit dependances ou exceptions de securite a confirmer.
- Fenetre de rollback ou support lancement a confirmer.

### PROD_NOT_READY

Production non envisageable.

Declencheurs:

- Donnee sensible non maitrisee dans les supports ou jeux de demo.
- Migration destructive requise ou non repetee.
- Absence de rollback praticable.
- Backup/restore non prouve et non acceptable.
- Smoke critique rouge.
- Reserve P1 non mitigee.
- Signataire cle explicitement oppose au passage en production.

## Decision Sprint 34

Decision recommandee: `PROD_READY_SOUS_RESERVE`.

Motifs:

- Sprint 33 a etabli une base `PILOT_SESSION_READY`, pas un
  `GO_UTILISATEUR_EXTERNE`.
- Les scripts de readiness production existent et restent non destructifs en
  mode dry-run ou plan.
- Aucune signature reelle n'est fournie dans ce lot.
- Aucun deploiement, tag, migration, seed, reset DB, backup restore ou push ne
  doit etre declenche.

## Conditions pour lever les reserves

| Reserve | Condition de levee | Preuve |
| --- | --- | --- |
| Signatures reelles | Cinq roles de decision renseignes par de vraies personnes. | PV ou matrice signoff datee. |
| Version/tag | Version release et tag candidat identifies. | Tag ou reference commit release. |
| Environnement | Configuration cible validee hors depot. | Checklist exploitation signee. |
| Migrations | Plan valide, non destructif ou approuve. | Inventaire migrations, plan rollback. |
| Smoke | Parcours critiques verts. | Rapport smoke horodate. |
| Backup/restore | Export et restauration verifies. | Rapport avec RPO/RTO observes. |
| Incident drill | Escalade et runbook testes. | Compte rendu drill. |
| Observabilite | Alertes et dashboards valides. | Captures ou liens internes. |
| Securite dependances | Vulns traitees ou acceptees formellement. | Rapport audit et registre exceptions. |
| Rollback/support | Fenetre, owner et support lancement confirmes. | Runbook et planning support. |

## Formule de decision

```text
PROD_READY
  si toutes les preuves sont presentes
  et toutes les signatures reelles sont GO
  et aucune reserve bloquante n'est ouverte.

PROD_READY_SOUS_RESERVE
  si les controles techniques sont preparables
  mais qu'il manque des preuves finales ou validations humaines.

PROD_NOT_READY
  si un controle critique est rouge
  ou si le risque ne peut pas etre accepte formellement.
```

## Position explicite

Ne pas transformer ce document en GO production automatique. Sans preuves et
signatures reelles, la decision reste `PROD_READY_SOUS_RESERVE`.
