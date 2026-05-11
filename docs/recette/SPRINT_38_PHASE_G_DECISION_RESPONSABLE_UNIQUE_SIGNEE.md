# Sprint 38 Phase G - Decision responsable unique signee

## Objectif

Lever la reserve "decision responsable unique pas encore signee" sans inventer
de signataire. Ce document est le PV a completer par la personne qui assume le
lancement production client.

## A completer avec informations reelles

| Champ | Valeur |
| --- | --- |
| Nom reel du responsable unique | `<A_COMPLETER>` |
| Fonction / qualite | `<A_COMPLETER>` |
| Date et heure de decision | `<A_COMPLETER>` |
| Commit ou tag vise | `<A_COMPLETER>` |
| Environnement cible | `<A_COMPLETER>` |
| Perimetre client autorise | `<A_COMPLETER>` |
| Reserves acceptees | `<A_COMPLETER>` |
| Reserves bloquees | `<A_COMPLETER>` |
| Decision | `PROD_CLIENT_GO` / `PROD_CLIENT_GO_SOUS_RESERVE` / `PROD_CLIENT_NO_GO` |

## Declaration

```text
Je soussigne(e) <NOM_REEL>, agissant comme responsable unique du lancement
Mediplan, confirme avoir relu les preuves Sprint 37/38, accepte les risques
residuels documentes, et autorise la decision suivante pour le commit
<COMMIT_OU_TAG>: <DECISION>.

Date:
Signature:
```

## Conditions minimales avant signature

- Environnement cible valide.
- Smoke HTTPS reel passe.
- Backup/restore reel prouve.
- Monitoring branche.
- Rollback teste ou accepte.
- Audits dependances connectes ou exceptions signees.

## Statut

`A_COMPLETER_PAR_PERSONNE_REELLE`.

Aucune signature n'est simulee dans ce fichier.
