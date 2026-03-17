# Connexion Cursor au serveur de dev et déploiement

Ce guide explique comment vous connecter à votre serveur de développement avec Cursor et y déployer le projet Sales Enablement.

---

## 1. Connexion SSH avec Cursor

### Option A : Remote - SSH (recommandé)

1. **Ouvrir la palette de commandes** : `Ctrl+Shift+P` (ou `Cmd+Shift+P` sur Mac)

2. **Taper** : `Remote-SSH: Connect to Host...`

3. **Ajouter votre serveur** :
   - Si c'est la première fois : `+ Add New SSH Host...`
   - Entrer : `ssh utilisateur@IP_DU_SERVEUR`
   - Exemple : `ssh ubuntu@192.168.1.100`

4. **Choisir le fichier de config** : `~/.ssh/config` (par défaut)

5. **Se connecter** : Cursor ouvre une nouvelle fenêtre connectée au serveur

### Option B : Configurer SSH (pour les connexions multiples)

Éditer `~/.ssh/config` sur votre machine locale :

```
Host sales-dev
    HostName 192.168.1.100
    User ubuntu
    IdentityFile ~/.ssh/id_rsa
```

Puis dans Cursor : `Remote-SSH: Connect to Host...` → choisir `sales-dev`

---

## 2. Déployer le projet sur le serveur

Une fois connecté au serveur via Cursor :

### Étape 1 : Cloner le dépôt (si pas déjà fait)

```bash
cd ~
git clone <URL_DU_REPO_SALES_ENABLEMENT> Sales-Enablement
cd Sales-Enablement
```

### Étape 2 : Configurer l'environnement

```bash
cp .env.example .env
```

Éditer `.env` avec les valeurs du serveur de dev :

```bash
# Remplacer par l'IP ou hostname du serveur de dev
VITE_API_URL=http://IP_SERVEUR:8001/api
CORS_ORIGINS=http://IP_SERVEUR:3003,http://localhost:3003
PLATFORM_URL=http://IP_SERVEUR:3003

# Générer une SECRET_KEY
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
# Puis coller la valeur dans .env
```

### Étape 3 : Lancer avec Docker

```bash
# Vérifier que Docker et Docker Compose sont installés
docker --version
docker-compose --version

# Lancer les services
docker-compose up -d
```

### Étape 4 : Vérifier le déploiement

```bash
# Voir les conteneurs
docker-compose ps

# Logs
docker-compose logs -f backend
```

---

## 3. Développement avec Cursor sur le serveur

Une fois connecté en Remote-SSH :

- **Ouvrir le dossier** : `File` → `Open Folder` → `/home/ubuntu/Sales-Enablement` (ou le chemin du projet)
- **Éditer** : Les fichiers sont modifiés directement sur le serveur
- **Terminal** : Le terminal intégré exécute les commandes sur le serveur

### Workflow typique

1. Modifier le code dans Cursor
2. Redémarrer les services si besoin :
   ```bash
   docker-compose restart backend
   # ou pour le frontend : docker-compose build frontend && docker-compose up -d frontend
   ```
3. Tester avec le navigateur : `http://IP_SERVEUR:3003`

---

## 4. Dépannage

### Connexion SSH refusée

- Vérifier que le serveur SSH écoute : `sudo systemctl status ssh`
- Vérifier la clé SSH : `ssh -v utilisateur@IP` pour debug

### Docker non trouvé

```bash
# Installer Docker (Ubuntu)
sudo apt update
sudo apt install -y docker.io docker-compose
sudo usermod -aG docker $USER
# Se déconnecter/reconnecter pour appliquer le groupe
```

### Ports déjà utilisés

Modifier les ports dans `.env` :

```
BACKEND_PORT=8002
FRONTEND_PORT=3004
```

### CORS / API inaccessible

Vérifier que `CORS_ORIGINS` dans `.env` inclut l’URL de votre frontend (IP ou hostname).

---

## 5. Accès à l'application

| Service | URL |
|---------|-----|
| Frontend | http://IP_SERVEUR:3003 |
| Backend API | http://IP_SERVEUR:8001 |
| API Docs | http://IP_SERVEUR:8001/docs |

---

## Résumé rapide

1. **Cursor** : `Ctrl+Shift+P` → `Remote-SSH: Connect to Host` → `ssh ubuntu@IP`
2. **Sur le serveur** : `git clone` → `cp .env.example .env` → éditer `.env` → `docker-compose up -d`
3. **Accès** : http://IP:3003
