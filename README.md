
# Éducation CI

Plateforme éducative complète pour le partage et la consultation de documents pédagogiques.

## Stack Technique

- **Backend** : Node.js, Express.js, MongoDB, JWT
- **Frontend** : React.js, Tailwind CSS, React Router
- **Base de données** : MongoDB

## Fonctionnalités

### Utilisateurs invités
- Recherche multifiltre de documents (nom, université, département, niveau, semestre)
- Consultation et téléchargement de documents sans connexion

### Contributeurs
- Inscription et connexion sécurisées
- Espace personnel pour gérer ses documents
- Upload, modification et suppression de documents
- Suivi des statistiques de consultation

### Sous-administrateurs
- Validation des documents avant publication
- Gestion des contributeurs

### Administrateur principal
- Tableau de bord analytique complet
- Gestion globale des utilisateurs et des contenus
- Visualisation des données (graphiques)

## Installation

### Prérequis
- Node.js (v14+)
- MongoDB (local ou Atlas)
- npm ou yarn

### Configuration du Backend

1. Accédez au dossier backend :
```bash
cd backend
```

2. Installez les dépendances :
```bash
npm install
```

3. Créez un fichier `.env` à la racine du backend et configurez les variables d'environnement :
```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/education-ci
JWT_SECRET=votre_cle_secrete_jwt
JWT_EXPIRE=30d
JWT_REFRESH_SECRET=votre_cle_secrete_refresh
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=votre_email@example.com
EMAIL_PASS=votre_mot_de_passe_email
FRONTEND_URL=http://localhost:3000
```

4. Démarrez le serveur backend :
```bash
npm run dev
```

### Configuration du Frontend

1. Accédez au dossier frontend :
```bash
cd frontend
```

2. Installez les dépendances :
```bash
npm install
```

3. Démarrez le serveur frontend :
```bash
npm start
```

L'application sera accessible à l'adresse : http://localhost:3000

## Structure du Projet

```
education/
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── uploads/
│   ├── .env
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── App.js
│   │   └── index.js
│   ├── package.json
│   └── tailwind.config.js
└── README.md
```

## Utilisation

### Création d'un administrateur
Pour créer un compte administrateur, vous devrez modifier manuellement le rôle d'un utilisateur dans la base de données MongoDB :
```javascript
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "admin" } }
)
```

### Ajout de données de test
Vous pouvez ajouter des universités, départements, niveaux, semestres et catégories via l'API REST ou en utilisant un outil comme MongoDB Compass.

## Sécurité

- Authentification JWT avec tokens d'accès et de rafraîchissement
- Protection des routes par rôle
- Hashage des mots de passe avec bcrypt
- Validation des données entrantes

## Licence

MIT
