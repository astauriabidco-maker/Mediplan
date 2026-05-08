# Sprint 32 Phase 1 - Guide anonymisation docs recette Sprint 29-31

## Objectif

Produire une base documentaire partageable pour les recettes Sprint 29 a 31,
sans exposer de noms reels, emails, identifiants hospitaliers, donnees RH,
donnees patient, secrets ou details operationnels sensibles.

Ce guide ne change pas les decisions produit deja documentees. Il fixe la
version diffusable des preuves et les controles a appliquer avant diffusion
hors cercle projet restreint.

## Perimetre audite

| Document | Statut partageable | Ajustement Sprint 32 Phase 1 |
| --- | --- | --- |
| `docs/recette/SPRINT_29_OPS_UX_RECETTE.md` | `PARTAGEABLE_INTERNE` | Aucun nom reel detecte; tenants deja generiques `tenant-ops-*`. |
| `docs/recette/SPRINT_30_PHASE_1_OPS_RECETTE_GUIDEE.md` | `PARTAGEABLE_APRES_ALIAS` | Remplacement des tenants realistes par `tenant-demo-critique`. |
| `docs/recette/SPRINT_30_OPS_SIGNOFF.md` | `PARTAGEABLE_INTERNE` | Signataires conserves en placeholders `<NOM_...>`; ne pas remplacer dans une version publique. |
| `docs/recette/SPRINT_30_PHASE_3_OPS_GO_NO_GO_UTILISATEUR.md` | `PARTAGEABLE_INTERNE` | Aucun nom reel detecte; PV modele a remplir uniquement avec placeholders. |
| `docs/recette/SPRINT_30_PHASE_5_PREUVES_VISUELLES.md` | `PARTAGEABLE_SANS_CAPTURES_BRUTES` | Garder les noms de preuves; anonymiser ou restreindre toute capture rattachee. |
| `docs/recette/SPRINT_31_DECISION_INTERNE.md` | `PARTAGEABLE_INTERNE` | Signataire unique non nominatif conserve; ne vaut pas signoff externe. |
| `docs/recette/SPRINT_31_PHASE_3_PACK_PILOTE_EXTERNE.md` | `PARTAGEABLE_EXTERNE_CONTROLE` | Section anonymisation existante valide; appliquer avant envoi au pilote. |
| `docs/recette/SPRINT_31_PHASE_4_DONNEES_DEMO_PILOTE_OPS.md` | `PARTAGEABLE_APRES_ALIAS` | Remplacement des tenants realistes par `tenant-demo-sain`, `tenant-demo-warning`, `tenant-demo-critique`. |
| `docs/recette/SPRINT_31_PHASE_5_RECETTE_INTERNE.md` | `PARTAGEABLE_INTERNE` | Aucun nom reel detecte; conserver le statut de recette interne. |
| `docs/recette/SPRINT_31_PHASE_6_BACKLOG_RESERVES.md` | `PARTAGEABLE_INTERNE` | Les exigences d'anonymisation restent ouvertes dans `S31-R02`. |

## Regles de remplacement

| Donnee source | Remplacement partageable | Notes |
| --- | --- | --- |
| Nom, prenom, signataire reel | `<NOM_ROLE>` ou `ROLE-001` | Ne jamais publier une signature nominative dans un document partageable. |
| Email utilisateur | `role001@example.invalid` | Utiliser le domaine reserve `.invalid`. |
| Tenant ou hopital reel | `tenant-demo-sain`, `tenant-demo-warning`, `tenant-demo-critique` | Garder la stabilite de l'alias dans tout le dossier. |
| Service hospitalier identifiable | `SERVICE-PILOTE-A` | Eviter les specialites ou lieux qui identifient un etablissement. |
| Agent RH | `AGENT-001` | Remplacer aussi matricule, login, SSO et commentaire libre. |
| Patient | `PATIENT-A` ou exclusion du document | Ne pas conserver date de naissance complete, numero de dossier ou motif medical. |
| URL interne, Grafana, ticket prive | `URL_PREUVE_RESTREINTE` ou reference ticket restreinte | Ne pas exposer domaine, chemin, token ou query string. |
| Date/heure de planning reel | Date de session ou plage arrondie | Conserver seulement la precision utile a l'audit recette. |
| Capture brute | Capture floutee ou note de parcours signee | Stockage restreint si le floutage n'est pas verifie. |

## Checklist avant diffusion

1. Verifier qu'aucun nom reel, email, login, identifiant SSO ou matricule ne
   reste dans le Markdown.
2. Remplacer tout tenant ou hopital realiste par un alias stable.
3. Supprimer les URLs internes ou les remplacer par une reference de ticket
   restreinte.
4. Relire les captures rattachees: noms, commentaires libres, services,
   tenants, emails, donnees patient et details RH doivent etre masques.
5. Conserver les placeholders `<NOM_...>` uniquement comme champs a remplir,
   pas comme preuve de signature.
6. Mentionner explicitement si une preuve reste `RESTREINTE` au lieu de
   `PARTAGEABLE`.
7. Ne pas transformer une validation interne en `GO_UTILISATEUR_EXTERNE` sans
   pilote reel, donnees anonymisees et signature autorisee.

## Commandes de controle documentaire

```bash
TENANT_REAL_PATTERN="<motif-tenant-reel>"
rg -n "${TENANT_REAL_PATTERN}|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}|password|secret|token" docs/recette/SPRINT_29* docs/recette/SPRINT_30* docs/recette/SPRINT_31*
git diff --check docs/recette/SPRINT_29* docs/recette/SPRINT_30* docs/recette/SPRINT_31* docs/recette/SPRINT_32_PHASE_1_ANONYMISATION_RECETTE.md
```

Un resultat vide sur la premiere commande est attendu pour les marqueurs
sensibles explicites, hors exemples volontairement anonymises comme
`agent001@example.invalid`. Les placeholders `<NOM_...>` et `PATIENT-A` doivent
etre relus manuellement et acceptes uniquement s'ils servent de champs modele.

## Decision Phase 1

Decision documentaire: `GUIDE_ANONYMISATION_ACTIF`.

Les documents Sprint 29-31 peuvent servir de support de recette partageable
apres application de ce guide. Les preuves brutes, captures et exports restent
non partageables tant que leur anonymisation n'est pas verifiee.
