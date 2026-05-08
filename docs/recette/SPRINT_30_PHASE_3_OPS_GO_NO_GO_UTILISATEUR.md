# Sprint 30 Phase 3 - Checklist GO/NO-GO utilisateur Ops

## Objectif

Decider si le cockpit Ops peut etre accepte par un utilisateur exploitation
sans assistance developpeur.

La decision porte sur cinq capacites utilisateur:

- comprendre l'etat operationnel et la priorite;
- agir ou savoir qui doit agir;
- verifier l'audit et les preuves;
- utiliser le parcours avec une accessibilite suffisante;
- percevoir une interface reactive, sans blocage UX majeur.

Decision attendue:

- `GO UTILISATEUR OPS`: les criteres critiques sont valides;
- `GO UTILISATEUR OPS SOUS RESERVE`: seules des reserves mineures restent
  ouvertes, avec contournement documente;
- `NO-GO UTILISATEUR OPS`: au moins un critere bloquant empeche la recette ou
  l'exploitation.

## Perimetre

Inclus:

- route Ops `/ops`;
- cockpit multi-tenant;
- SLO/SLA;
- Action Center;
- runbooks;
- notifications;
- audit ops;
- etats de chargement, vide, erreur et succes;
- usage clavier, contraste, libelles et feedback utilisateur.

Exclus:

- correction backend hors contrat Ops deja expose;
- refonte visuelle globale;
- automatisation de nouveaux drills de resilience;
- commit, push ou publication de release.

## Point d'entree

La checklist reprend la recette Sprint 29:

- `docs/recette/SPRINT_29_OPS_UX_RECETTE.md`;
- parcours detection -> comprehension -> correction -> audit;
- decision Sprint 29 provisoire: `GO_TECHNIQUE_AUTOMATISE`.

Cette Phase 3 ajoute la validation utilisateur GO/NO-GO. Elle ne remplace pas
les tests automatises: elle verifie que les preuves techniques sont lisibles et
actionnables par Ops.

Limite Sprint 31 Phase 2: cette checklist reste un support de validation
interne tant qu'aucun signataire hospitalier externe n'est rattache. Le statut
courant est `VALIDATION_INTERNE`; le `GO_UTILISATEUR_EXTERNE` reste requis
avant tout deploiement client reel.

## Regles de decision

| Situation | Decision |
| --- | --- |
| Tous les criteres critiques sont `GO`, aucune reserve bloquante | `GO UTILISATEUR OPS` |
| Reserves mineures acceptees, contournement documente, owner et echeance | `GO UTILISATEUR OPS SOUS RESERVE` |
| Un utilisateur ne comprend pas l'etat critique ou la prochaine action | `NO-GO UTILISATEUR OPS` |
| Une action attendue est impossible ou sans feedback exploitable | `NO-GO UTILISATEUR OPS` |
| L'audit ne permet pas de reconstruire la decision | `NO-GO UTILISATEUR OPS` |
| Un defaut accessibilite bloque clavier, lecture ou comprehension | `NO-GO UTILISATEUR OPS` |
| Le parcours parait bloque, fige ou incoherent sans recuperation claire | `NO-GO UTILISATEUR OPS` |

## Checklist utilisateur

| Domaine | Critere utilisateur | Preuves attendues | GO | NO-GO | Reserve acceptable | Signataire |
| --- | --- | --- | --- | --- | --- | --- |
| Comprehension | L'utilisateur identifie en moins de 2 minutes le tenant le plus critique et pourquoi il est prioritaire. | Observation recette; tenant critique; statut; SLO; incident; backup; notification. | Priorite, cause et severite sont visibles sans outil externe. | Tenant critique invisible, statut incoherent ou cause non lisible. | Libelle a clarifier si la priorite reste evidente. | Referent Ops |
| Comprehension | Les etats `sain`, `degrade`, `critique`, `warning` et `failed` sont compris. | Capture ou PV; questions utilisateur; valeurs et seuils SLO. | L'utilisateur explique l'etat et le risque associe. | Etat ambigu, couleur seule necessaire, seuil absent. | Aide contextuelle incomplete si les valeurs restent visibles. | PO/UX |
| Action possible | L'utilisateur sait quelle action lancer depuis l'Action Center. | Item selectionne; CTA; assignation; commentaire; statut; resolution. | Action disponible, nommee, confirmee et rafraichie. | CTA absent, action critique impossible, feedback manquant. | Action secondaire perfectible si le contournement est documente. | Referent Ops |
| Action possible | Les actions sensibles demandent une justification ou une preuve quand necessaire. | Commentaire; preuve; resolution; audit associe. | Justification conservee et visible dans la sequence. | Resolution possible sans justification attendue. | Aucune reserve sur une action sensible non justifiee. | Ops + audit |
| Audit verifiable | La sequence detection -> runbook -> action -> notification -> resolution est reconstructible. | Journal audit filtre; horodatage; acteur; action; detail; reference item. | Timeline complete, sans donnee sensible inutile. | Trou de sequence, acteur absent, audit inexploitable. | Export brut accepte si l'auditeur valide le format. | Auditeur |
| Audit verifiable | Les preuves attendues par le runbook sont rattachees au traitement. | Runbook ouvert; preuves listees; commentaire ou piece de reference; decision. | Preuve attendue et preuve fournie sont comparables. | Runbook non relie a l'incident ou preuve impossible a verifier. | Preuve manuelle acceptee si referencee dans le ticket. | Auditeur + Ops |
| Accessibilite | Le parcours critique est utilisable au clavier. | Tabulation; focus visible; ouverture panneaux; actions; fermeture modale. | Aucun piege clavier, ordre de focus coherent. | Action critique inaccessible au clavier ou focus perdu. | Micro-ordre perfectible si aucune action critique n'est touchee. | PO/UX |
| Accessibilite | Les informations critiques ne dependent pas uniquement de la couleur. | Statuts; badges; texte; icones; messages d'erreur. | Texte ou icone nomme l'etat et la severite. | Couleur seule pour distinguer warning/critique/succes. | Ajustement visuel mineur si le texte explicite existe. | PO/UX |
| Accessibilite | Les messages d'erreur et de succes sont lisibles et utiles. | Erreur API simulee ou observee; mutation succes; empty state. | Message explique la situation et la prochaine action. | Message generique bloquant ou silence apres mutation. | Reformulation mineure si la recuperation reste claire. | PO/UX |
| Performance percue | Le chargement initial et les mutations donnent un retour visible. | Observation; etats loading; skeleton/spinner; toast; desactivation bouton. | L'utilisateur comprend que l'action est en cours puis terminee. | Impression de gel, double clic necessaire, absence de confirmation. | Latence acceptable si feedback continu et non bloquant. | Referent Ops |
| Performance percue | Les donnees critiques restent comparables sans deplacement inattendu. | Redimensionnement; rafraichissement; selection tenant; Action Center. | Layout stable, compteurs et details restent lisibles. | Saut de contenu, selection perdue, action impossible apres refresh. | Petit decalage visuel sans perte de contexte. | PO/UX |
| Blocage UX majeur | Les etats vide, erreur, non autorise et donnees partielles ont une issue claire. | Scenarios empty/error/403; guide ou runbook; action alternative. | L'utilisateur sait attendre, relancer, contacter ou escalader. | Ecran blanc, boucle de chargement, impasse sans contact. | Texte d'escalade a enrichir si le chemin existe. | Ops + PO/UX |
| Blocage UX majeur | Aucun parcours critique ne demande une connaissance interne du code ou de l'API. | Observation recette sans assistance developpeur. | Le vocabulaire, les CTA et les preuves suffisent au role Ops. | L'utilisateur doit demander une interpretation technique. | Glossaire ou aide a completer si l'action reste autonome. | Referent Ops |

## Scenarios minimaux a executer

### Scenario A - Detection et comprehension

1. Ouvrir `/ops`.
2. Identifier le tenant critique.
3. Expliquer la cause principale en s'appuyant sur SLO/SLA, incidents,
   notifications ou backup.
4. Nommer le risque metier ou operationnel.
5. Choisir l'item Action Center le plus prioritaire.

Resultat attendu: l'utilisateur formule la situation et la prochaine action
sans aide developpeur.

### Scenario B - Action et feedback

1. Assigner l'item critique.
2. Ajouter un commentaire de traitement.
3. Passer l'item en traitement.
4. Ouvrir le runbook associe.
5. Resoudre l'item avec justification et preuve.
6. Verifier le rafraichissement du cockpit.

Resultat attendu: chaque mutation donne un feedback clair et laisse une trace.

### Scenario C - Audit et controle

1. Ouvrir le journal audit ops.
2. Filtrer Action Center, Runbook et Notification.
3. Retrouver l'action faite pendant le Scenario B.
4. Verifier acteur, date, action, justification et reference.
5. Confirmer que la sequence est exportable ou copiable dans le PV.

Resultat attendu: l'auditeur peut reconstruire la decision sans information
orale.

### Scenario D - Accessibilite et etats degradables

1. Rejouer le Scenario A au clavier.
2. Verifier le focus visible sur les actions principales.
3. Controler que les statuts critiques ne dependent pas seulement de la
   couleur.
4. Simuler ou observer un etat erreur/non autorise/donnees partielles.
5. Verifier qu'une action de recuperation ou d'escalade est indiquee.

Resultat attendu: aucune impasse clavier, visuelle ou informationnelle sur le
parcours critique.

## Grille de notation

| Statut | Definition |
| --- | --- |
| `GO` | Critere satisfait, preuve rattachee au PV ou ticket de recette. |
| `RESERVE` | Critere utilisable avec limite mineure, owner, echeance et contournement. |
| `NO-GO` | Critere bloquant pour comprendre, agir, auditer, acceder ou continuer. |
| `N/A` | Critere hors perimetre, justification obligatoire. |

Un `NO-GO` sur comprehension, action possible, audit verifiable,
accessibilite bloquante ou impasse UX impose la decision globale
`NO-GO UTILISATEUR OPS`.

## PV de validation

```text
Date:
Version/commit:
Environnement:
Tenant(s) testes:
Profil(s) testes:
Navigateur(s):
Scenario A - Detection et comprehension: GO | RESERVE | NO-GO | N/A
Scenario B - Action et feedback: GO | RESERVE | NO-GO | N/A
Scenario C - Audit et controle: GO | RESERVE | NO-GO | N/A
Scenario D - Accessibilite et etats degradables: GO | RESERVE | NO-GO | N/A
Reserves acceptees:
Reserves refusees:
Contournements:
Owner(s):
Echeance(s):
Decision: GO UTILISATEUR OPS | GO UTILISATEUR OPS SOUS RESERVE | NO-GO UTILISATEUR OPS
Signataires:
```

## Preuves a conserver

| Preuve | Emplacement ou format attendu |
| --- | --- |
| PV de recette utilisateur | Ticket Sprint 30 Phase 3 ou annexe recette |
| Captures du cockpit Ops | Tenant critique, SLO, Action Center, runbook |
| Trace action utilisateur | Assignation, commentaire, statut, resolution |
| Trace audit | Filtre audit ou export correspondant au Scenario C |
| Notes accessibilite | Clavier, focus, contraste informationnel, messages |
| Notes performance percue | Chargement, feedback mutation, stabilite layout |
| Liste reserves | Owner, severite, contournement, echeance, decision |

## Synthese de decision

| Domaine | Statut | Commentaire | Preuve |
| --- | --- | --- | --- |
| Comprehension | A completer | A completer | A completer |
| Action possible | A completer | A completer | A completer |
| Audit verifiable | A completer | A completer | A completer |
| Accessibilite | A completer | A completer | A completer |
| Performance percue | A completer | A completer | A completer |
| Blocage UX majeur | A completer | A completer | A completer |

Decision recommandee avant execution utilisateur externe: `A COMPLETER`.

La decision finale interne doit etre signee par Ops, PO/UX et audit. Une
validation accessibilite peut etre signee par PO/UX si aucun referent
accessibilite dedie n'est disponible. Une decision externe distincte, signee par
un representant metier hospitalier reel, reste obligatoire avant deploiement
client reel.

## References

- `docs/recette/SPRINT_29_OPS_UX_RECETTE.md`
- `docs/ops/SPRINT_26_PHASE_6_RESILIENCE_DRILLS.md`
- `docs/ops/SPRINT_17_EXPLOITATION_RUNBOOK.md`
- `docs/SPRINT_12_GO_NO_GO_CHECKLIST.md`
- `docs/SPRINT_14_GO_NO_GO_METIER.md`
