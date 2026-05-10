# Sprint 35 Phase 4 - Contact et demande demo

Date: 2026-05-10
Statut cible: `SPEC_CONTACT_DEMO_PRETE`

## Objectif

Preparer le parcours public de demande de contact ou de demo commerciale sans
ajouter de surface applicative fragile tant que le backend de capture lead et
le routage operationnel ne sont pas confirmes.

L'inspection frontend Sprint 35 observe un parcours public existant limite a
`/sign/:token` via `PublicSignPage`. Aucun pattern public contact/demo dedie
n'est present dans `frontend/src`.

## Garde-fous

- Aucune migration destructive.
- Aucun reset DB, seed ou restauration.
- Aucun push.
- Aucune suppression massive.
- Aucun envoi email reel depuis la recette.
- Aucun lead nominatif invente dans les donnees de test.
- Aucun consentement pre-coche.

## Parcours cible

| Etape | Attendu UI | Critere de recette |
| --- | --- | --- |
| Acces | Page publique `/contact` ou `/demande-demo`, non protegee par login. | La route ne redirige pas vers `/login`. |
| Intention | Choix clair entre `Demander une demo` et `Nous contacter`. | Le type de demande est transmis dans le payload. |
| Saisie | Formulaire court, lisible mobile et desktop. | Les champs obligatoires sont explicites et valides cote client. |
| Consentement | Case RGPD non cochee par defaut avec texte de finalite. | Soumission bloquee sans consentement. |
| Anti-spam | Protection silencieuse et non intrusive. | Bot simple bloque sans exposer de detail technique. |
| Confirmation | Message de succes neutre, sans promettre de delai contractuel. | Aucun doublon visuel, aucune fuite de donnees saisies. |
| Erreur | Erreur actionnable et non technique. | L'utilisateur peut corriger ou reessayer. |

## Formulaire cible

Champs obligatoires:

| Champ | Type | Regle minimale |
| --- | --- | --- |
| `requestType` | enum | `DEMO` ou `CONTACT`. |
| `firstName` | texte | 2 a 80 caracteres. |
| `lastName` | texte | 2 a 80 caracteres. |
| `workEmail` | email | Email professionnel valide. |
| `organizationName` | texte | 2 a 160 caracteres. |
| `role` | texte | 2 a 120 caracteres. |
| `consent` | booleen | `true` requis, jamais pre-coche. |

Champs optionnels:

| Champ | Type | Usage |
| --- | --- | --- |
| `phone` | tel | Rappel commercial si fourni volontairement. |
| `organizationType` | enum | Hopital, GHT, clinique, cabinet conseil, autre. |
| `staffRange` | enum | Taille approximative pour qualifier le besoin. |
| `message` | texte | Besoin libre, limite a 1200 caracteres. |
| `preferredContactWindow` | texte | Disponibilite indicative, non contractuelle. |

Champs techniques non affiches:

| Champ | Source | Usage |
| --- | --- | --- |
| `sourcePath` | navigateur | Route d'origine de la demande. |
| `utmCampaign` | query string | Attribution marketing si presente. |
| `submittedAt` | serveur | Horodatage autoritaire. |
| `locale` | navigateur ou app | Langue de reponse. |
| `honeypot` | champ cache | Detection bot, doit rester vide. |

## Consentement et donnees

Le texte de consentement doit indiquer:

- finalite: recontacter la personne au sujet de Mediplan;
- donnees traitees: identite professionnelle, organisation, coordonnees et
  message saisi;
- absence d'inscription automatique a une newsletter;
- possibilite de demander la suppression ou correction des donnees;
- lien vers la politique de confidentialite quand elle existe.

La case de consentement reste distincte d'une eventuelle option marketing. Si
une newsletter est ajoutee plus tard, elle doit avoir une case separee, non
cochee par defaut.

## Anti-spam

Protection minimale attendue:

- champ honeypot cache aux utilisateurs;
- delai minimal de soumission cote client, par exemple 2 secondes apres
  affichage;
- limite de frequence cote serveur par IP et email;
- validation serveur stricte des longueurs et formats;
- journalisation des rejets avec payload masque;
- aucun message public permettant d'optimiser une attaque.

Protection a eviter en premiere intention:

- captcha bloquant sans besoin mesure;
- collecte de donnees personnelles supplementaires pour qualifier le spam;
- message d'erreur qui confirme l'existence d'un email ou d'une organisation.

## Routage lead

Routage fonctionnel cible:

| Cas | Destination | SLA indicatif |
| --- | --- | --- |
| `requestType=DEMO` avec organisation de sante | File commerciale demo. | Reponse sous 2 jours ouvrables, si capacite confirmee. |
| `requestType=CONTACT` support ou partenariat | File triage contact. | Reponse selon priorite manuelle. |
| Domaine email personnel | Qualification manuelle basse priorite. | Pas de promesse automatique. |
| Message suspect ou honeypot rempli | Quarantaine anti-spam. | Aucun envoi externe. |

Payload lead recommande:

```json
{
  "requestType": "DEMO",
  "firstName": "Prenom",
  "lastName": "Nom",
  "workEmail": "contact@example.org",
  "phone": null,
  "organizationName": "Etablissement demo",
  "organizationType": "HOSPITAL",
  "staffRange": "500_1999",
  "role": "Direction des operations",
  "message": "Souhaite une presentation de Mediplan.",
  "preferredContactWindow": "Matin",
  "consent": true,
  "sourcePath": "/demande-demo",
  "utmCampaign": null,
  "locale": "fr-FR"
}
```

## Contrat API minimal attendu

Endpoint candidat:

```text
POST /api/public/contact-requests
```

Reponses:

| Code | Sens | Corps attendu |
| --- | --- | --- |
| `201` | Demande acceptee. | `{ "id": "...", "status": "RECEIVED" }` |
| `400` | Validation invalide. | Erreurs par champ, sans detail technique. |
| `429` | Limite anti-spam atteinte. | Message generique. |
| `500` | Erreur serveur. | Message generique et correlation id. |

Le serveur reste source de verite pour `submittedAt`, statut, routage et
decision anti-spam.

## Tests de recette attendus

| Test | Commande ou support | Attendu |
| --- | --- | --- |
| UI formulaire | Test React cible quand la page existe. | Champs obligatoires, consentement et confirmation couverts. |
| Contrat payload | Test API frontend ou backend. | Payload conforme, pas de champ sensible inutile. |
| Anti-spam | Test serveur. | Honeypot et rate limit bloquent sans envoi. |
| Accessibilite | Verification manuelle ou test axe si disponible. | Labels, focus, erreurs reliees aux champs. |
| Non-regression | `git diff --check` | Aucun whitespace invalide. |

## Decision Sprint 35 Phase 4

Statut recommande: `SPEC_CONTACT_DEMO_PRETE`.

Motifs:

- aucun pattern public contact/demo existant n'a ete identifie dans
  `frontend/src`;
- le seul parcours public actuel concerne la signature documentaire;
- une implementation UI sans contrat backend ni routage lead serait prematuree;
- la specification ci-dessus permet de creer ensuite une page et un test cible
  sans migration destructive ni reset de donnees.
