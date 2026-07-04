# Education CI

Plateforme de partage et de consultation de documents pedagogiques avec frontend React et backend Express/MongoDB.

## Stack technique

- Backend: Node.js, Express.js, MongoDB, JWT
- Frontend: React.js, Tailwind CSS, React Router
- Stockage de fichiers: Cloudflare R2 ou Backblaze B2 via une abstraction unique

## Fonctionnalites principales

- Recherche publique de documents approuves avec filtres dynamiques
- Dashboard contributeur pour uploader et gerer ses documents
- Validation des documents par sous-administrateur ou administrateur
- Analytique globale pour administrateur
- Upload securise en stockage objet avec URL signee temporaire au telechargement

## Configuration du backend

1. Installer les dependances:
```bash
cd backend
npm install
```

2. Copier le fichier d'exemple:
```bash
cp .env.example .env
```

3. Renseigner au minimum:
- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `STORAGE_PROVIDER`
- les variables du fournisseur choisi (`R2_*` ou `B2_*`)

4. Demarrer le serveur:
```bash
npm run dev
```

## Variables d'environnement backend

- `PORT`: port HTTP du backend
- `FRONTEND_URL`: liste d'origines autorisees separees par des virgules
- `RATE_LIMIT_MAX`: nombre maximum de requetes par fenetre de 15 minutes
- `JWT_SECRET`: secret du token d'acces
- `JWT_EXPIRE`: duree de vie du token d'acces
- `JWT_REFRESH_SECRET`: secret du refresh token
- `JWT_REFRESH_EXPIRE`: duree de vie du refresh token
- `JWT_COOKIE_EXPIRE`: duree de vie du cookie d'authentification en jours
- `STORAGE_PROVIDER`: `r2` ou `b2`
- `STORAGE_FOLDER`: prefixe de rangement des objets dans le bucket
- `DOWNLOAD_URL_EXPIRATION`: duree de validite d'une URL signee en secondes
- `MAX_FILE_SIZE`: taille maximale des uploads en octets
- `ALLOWED_FILE_EXTENSIONS`: extensions autorisees separees par des virgules
- `ALLOWED_FILE_MIME_TYPES`: types MIME autorises separes par des virgules
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_ENDPOINT`: configuration Cloudflare R2
- `B2_APPLICATION_KEY_ID`, `B2_APPLICATION_KEY`, `B2_BUCKET_NAME`, `B2_REGION`, `B2_ENDPOINT`: configuration Backblaze B2

## Contrats API utilises par le frontend

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/documents`
- `POST /api/documents`
- `GET /api/documents/my`
- `GET /api/documents/pending`
- `GET /api/documents/analytics`
- `GET /api/universities`
- `POST /api/universities`
- `GET /api/departments`
- `POST /api/departments`
- `GET /api/levels`
- `POST /api/levels`
- `GET /api/semesters`
- `POST /api/semesters`
- `GET /api/categories`
- `POST /api/categories`
- `GET /uploads/:fileName`: passerelle de compatibilite qui verifie les droits puis redirige vers une URL signee temporaire

## Notes d'architecture

- Les fichiers ne sont plus exposes par dossier statique public.
- Le backend stocke les metadonnees de chaque document en base.
- Le provider de stockage est entierement interchangeable via `.env`.
- Les listes utilisees par les selects du frontend proviennent toutes de la base de donnees.
