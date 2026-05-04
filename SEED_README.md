# 🌱 Seed Data - Hôpital Général de Douala

## Vue d'ensemble

Ce document explique comment provisionner la base de données avec des données de test réalistes pour l'Hôpital Général de Douala.

## Données qui seront créées

### 📁 Services Hospitaliers (14 au total)

#### Services Principaux (Niveau 1)

1. **Urgences** (URG) - 15-25 agents
2. **Chirurgie** (CHIR) - 20-35 agents
3. **Médecine Interne** (MED) - 18-30 agents
4. **Pédiatrie** (PED) - 12-20 agents
5. **Maternité** (MAT) - 15-25 agents
6. **Radiologie & Imagerie** (RAD) - 8-15 agents
7. **Laboratoire** (LAB) - 10-18 agents
8. **Administration** (ADM) - 8-15 agents

#### Sous-Services (Niveau 2)

- **Chirurgie Viscérale** (sous Chirurgie)
- **Chirurgie Orthopédique** (sous Chirurgie)
- **Chirurgie Cardiaque** (sous Chirurgie)
- **Cardiologie** (sous Médecine Interne)
- **Pneumologie** (sous Médecine Interne)
- **Gastro-entérologie** (sous Médecine Interne)

### 👥 Agents (~30 au total)

#### Direction

- **NKOTTO EMANE Jean-Baptiste** - Directeur Général

#### Chirurgie

- **MBARGA ATANGANA Paul** - Chef de Service
- **NKOLO FOMO Marie-Claire** - Médecin Adjoint
- **ESSOMBA BELLE Françoise** - Major
- **ATEBA NANA Thomas** - Responsable Chirurgie Viscérale
- **NGUEMA OBIANG André** - Chirurgien
- **OWONA MBALLA Patrick** - Chirurgien Orthopédiste
- **BELLA EYOUM Catherine** - Infirmière
- **FOUDA MANI Jacques** - Chirurgien Cardiologue
- Et plus...

#### Urgences

- **ONDOA MEKONGO Sylvie** - Chef de Service
- **EBODE TALLA Martin** - Major
- **ZAMBO ANGUISSA Léon** - Médecin Urgentiste
- **MEKA BILONG Jeanne** - Infirmière
- **ABENA MANGA Robert** - Aide-soignant
- **NGONO EBOGO Pauline** - Infirmière

#### Autres Services

- **ETOA ABENA Bernard** - Chef Médecine Interne
- **MENDO ZE Christophe** - Cardiologue
- **NANGA MBARGA Hélène** - Chef Pédiatrie
- **BIKORO ASSIGA Monique** - Chef Maternité
- **MVONDO ASSAM Emmanuel** - Chef Radiologie
- **OLINGA OLINGA Thérèse** - Chef Laboratoire

## 🚀 Comment exécuter le seed

### Méthode 1: Via l'API (Recommandé)

Une fois que le backend NestJS est démarré, exécutez:

```bash
curl -X POST http://localhost:[PORT_BACKEND]/seed/hgd
```

Remplacez `[PORT_BACKEND]` par le port sur lequel tourne votre backend NestJS (vérifiez dans les logs de démarrage).

**Réponse attendue:**

```json
{
  "success": true,
  "message": "Seed completed successfully for Hôpital Général de Douala",
  "data": {
    "tenant": "HGD-DOUALA",
    "services": 14,
    "agents": 30,
    "credentials": {
      "password": "password123",
      "examples": [
        "directeur@hgd-douala.cm (Directeur Général)",
        "p.mbarga@hgd-douala.cm (Chef Chirurgie)",
        "s.ondoa@hgd-douala.cm (Chef Urgences)"
      ]
    }
  }
}
```

### Méthode 2: Via Postman/Insomnia

1. Créer une nouvelle requête
2. **Méthode**: POST
3. **URL**: `http://localhost:[PORT_BACKEND]/seed/hgd`
4. **Headers**: `Content-Type: application/json`
5. Cliquer sur "Send"

### Méthode 3: Depuis le frontend (si authentifié)

Vous pouvez également créer un bouton dans l'interface admin pour appeler cet endpoint.

## 🔐 Identifiants de connexion démo

**Mot de passe universel**: `password123`
**Tenant**: `HGD-DOUALA`

### Comptes de test

| Email                      | Rôle applicatif | Parcours recommandé                                   |
| -------------------------- | --------------- | ----------------------------------------------------- |
| `superadmin@mediplan.demo` | `SUPER_ADMIN`   | Administration plateforme et accès multi-tenant       |
| `directeur@hgd-douala.cm`  | `DIRECTION`     | Dashboard, analytics, audit et pilotage établissement |
| `p.mbarga@hgd-douala.cm`   | `MANAGER`       | Planning et équipe Chirurgie                          |
| `s.ondoa@hgd-douala.cm`    | `MANAGER`       | Planning et équipe Urgences                           |
| `rh@hgd-douala.cm`         | `HR_MANAGER`    | Agents, contrats, congés, paie et politiques RH       |
| `audit@hgd-douala.cm`      | `AUDITOR`       | Journaux d'audit et conformité                        |

Les comptes RH, audit et direction utilisent les rôles dynamiques de la table `role`; les comptes manager/superadmin gardent aussi un rôle legacy compatible avec les guards existants.

## 🔁 Reset démo / préprod

Le seed HGD est réinitialisable: il supprime les données du tenant `HGD-DOUALA`, recrée les rôles système, les services, les agents, les contrats, les congés, les compétences et les documents de démonstration.

```bash
npm run demo:reset
```

Alias disponibles:

```bash
npm run seed:demo
npm run seed:hgd
```

Le script `demo:reset` appelle le même contrôleur que `POST /seed/hgd`, afin de garder un seul scénario de données pour l'API et la CLI.

## 📊 Structure hiérarchique

```
Directeur Général (NKOTTO EMANE)
├── Chef Chirurgie (MBARGA)
│   ├── Adjoint (NKOLO)
│   ├── Major (ESSOMBA)
│   ├── Resp. Chirurgie Viscérale (ATEBA)
│   ├── Resp. Chirurgie Orthopédique (OWONA)
│   └── Resp. Chirurgie Cardiaque (FOUDA)
├── Chef Urgences (ONDOA)
│   ├── Major (EBODE)
│   └── Équipe (ZAMBO, MEKA, ABENA, NGONO)
├── Chef Médecine Interne (ETOA)
│   └── Cardiologue (MENDO)
├── Chef Pédiatrie (NANGA)
├── Chef Maternité (BIKORO)
├── Chef Radiologie (MVONDO)
└── Chef Laboratoire (OLINGA)
```

## ⚠️ Important

- **Tenant ID**: Toutes les données sont créées avec `tenantId = "HGD-DOUALA"`
- **Nettoyage**: Le script supprime d'abord toutes les données existantes pour ce tenant avant d'insérer les nouvelles
- **Rôles démo**: `SUPER_ADMIN`, `DIRECTION`, `MANAGER`, `HR_MANAGER` et `AUDITOR` sont recréés à chaque reset
- **Mot de passe**: Le hash utilisé correspond à `password123`
- **Emails**: Format `prenom.nom@hgd-douala.cm`

## 🔧 Dépannage

### Le endpoint retourne 404

- Vérifiez que le backend est bien démarré
- Vérifiez que le `SeedModule` est bien importé dans `AppModule`
- Vérifiez les logs du backend pour voir si le module est chargé

### Erreur de connexion à la base de données

- Vérifiez que PostgreSQL est démarré
- Vérifiez les variables d'environnement dans `.env`
- Vérifiez que la base de données existe

### Les données ne s'affichent pas

- Vérifiez que vous êtes connecté avec le bon tenant (`HGD-DOUALA`)
- Vérifiez que les filtres de l'interface ne cachent pas les données
- Vérifiez directement dans la base de données:
  ```sql
  SELECT COUNT(*) FROM agent WHERE "tenantId" = 'HGD-DOUALA';
  SELECT COUNT(*) FROM hospital_service WHERE "tenantId" = 'HGD-DOUALA';
  ```

## 📝 Fichiers concernés

- **Controller**: `src/seed/seed.controller.ts`
- **Module**: `src/seed/seed.module.ts`
- **App Module**: `src/app.module.ts` (import du SeedModule)

## 🎯 Prochaines étapes

Après avoir exécuté le seed, vous pourrez:

1. Vous connecter avec n'importe quel compte de test
2. Explorer la hiérarchie des services
3. Voir les agents assignés à chaque service
4. Tester les filtres et la recherche
5. Visualiser l'organigramme

---

**Créé le**: 31 décembre 2024  
**Tenant**: HGD-DOUALA  
**Version**: 1.0
