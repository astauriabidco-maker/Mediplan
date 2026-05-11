# Sprint 37 Phase 7 - Signoff responsable unique

## Objectif

Formaliser le dernier cas possible avant vraie production client lorsque
Mediplan n'a pas encore de comite de validation externe: une decision assume
par un responsable unique.

Ce document ne cree pas de faux signataires. Il remplace uniquement la matrice
multi-role par une acceptation explicite, personnelle et datee du responsable
du lancement.

## Principe

La production client reelle ne peut pas etre declaree `PROD_READY` par defaut
tant que les roles RH, securite, exploitation, technique et direction ne sont
pas representes par de vraies personnes.

Si une seule personne porte tous ces roles au demarrage, elle doit l'assumer
explicitement comme responsable unique.

## Informations a renseigner

| Champ | Valeur |
| --- | --- |
| Responsable unique | `<NOM_REEL_RESPONSABLE_UNIQUE>` |
| Role legal ou operationnel | `<ROLE_REEL>` |
| Date decision | `<DATE_ISO>` |
| Version / commit | `<COMMIT_OU_TAG>` |
| Environnement cible | `<URL_OU_ALIAS_ENVIRONNEMENT>` |
| Perimetre autorise | `<PERIMETRE_PRODUCTION_CLIENT>` |
| Donnees autorisees | `<DONNEES_AUTORISEES>` |
| Donnees interdites | Donnees patient/RH reelles hors contrat et hors controles valides |
| Acceptation du risque | `<GO_NO_GO_ET_MOTIF>` |

## Conditions minimales avant signature unique

- Environnement cible valide.
- Backup/restore prouve.
- Smoke cible passe.
- Monitoring branche.
- Rollback teste ou accepte formellement.
- Securite dependances finale revue.
- Support lancement identifie.
- Registre des reserves ouvert et accepte.

## Formule de decision

```text
Je, <NOM_REEL_RESPONSABLE_UNIQUE>, assume les roles RH, securite,
exploitation, technique et direction pour cette premiere mise en production
client. J'accepte les reserves documentees, les limites d'usage, le plan de
rollback et les risques residuels rattaches au commit <COMMIT_OU_TAG>.

Decision: PROD_READY_RESPONSABLE_UNIQUE / PROD_NOT_READY
Date:
Signature:
```

## Limites

`PROD_READY_RESPONSABLE_UNIQUE` ne doit pas masquer l'absence de signataires
externes. C'est une decision de lancement initial assumee par le porteur du
projet, pas une validation institutionnelle hospitaliere.

## Decision Phase 7

Statut: `A_SIGNER_PAR_RESPONSABLE_UNIQUE`.

Le document est pret, mais aucune signature reelle n'est inventee.
