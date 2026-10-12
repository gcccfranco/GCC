# Configuration Firebase Console

Ce guide configure Firebase pour GCCLouange. Il couvre Firebase Console,
les variables d'environnement, Vercel et le déploiement Docker.

## 0. Projet à utiliser

Le projet utilisé par l'application est celui indiqué par
`NEXT_PUBLIC_FIREBASE_PROJECT_ID`.

Dans l'environnement actuel, la valeur attendue est :

```text
hba-supporting
```

Toutes les étapes ci-dessous doivent être faites dans ce projet Firebase.
Ne pas publier les règles dans un autre projet, par exemple `gcclouange`.

## 1. Ouvrir le bon projet

1. Ouvrir [Firebase Console](https://console.firebase.google.com/).
2. Sélectionner le projet `hba-supporting`.
3. Vérifier dans **Project settings > General** que le project ID est bien
   `hba-supporting`.

## 2. Enregistrer l'application Web

À faire seulement si l'application Web n'existe pas encore :

1. Aller dans **Project settings > General**.
2. Dans **Your apps**, cliquer sur l'icône Web `</>`.
3. Donner un nom, par exemple `GCCLouange Web`.
4. Ne pas activer Firebase Hosting : le site est hébergé par Vercel ou Docker.
5. Copier la configuration affichée. Elle fournit les valeurs `apiKey`,
   `authDomain`, `projectId`, `storageBucket`, `messagingSenderId` et `appId`.

Renseigner ces valeurs dans `.env` pour Docker et dans `.env.local` pour un
développement local :

```dotenv
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
z=hba-supporting
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Les valeurs `NEXT_PUBLIC_*` peuvent être exposées au navigateur. Elles ne sont
pas des mots de passe.

## 3. Activer Firebase Authentication

1. Ouvrir **Build > Authentication**.
2. Cliquer sur **Get started** si nécessaire.
3. Ouvrir l'onglet **Sign-in method**.
4. Activer **Email/Password**.
5. Laisser désactivé **Email link** sauf demande explicite.
6. Enregistrer.

L'application utilise actuellement :

- inscription par email et mot de passe ;
- connexion par email et mot de passe ;
- déconnexion ;
- réinitialisation du mot de passe.

## 4. Autoriser les domaines de connexion

Dans **Authentication > Settings > Authorized domains**, ajouter les domaines
utilisés pour ouvrir l'application :

- `localhost` pour le développement ;
- le nom DNS ou l'adresse utilisée en local sur le réseau, si Firebase l'accepte
  dans la configuration courante ;
- le domaine Vercel de production ;
- le domaine personnalisé de production, s'il existe.

Ne pas ajouter de domaine inconnu. Après un changement, refaire une connexion
complète dans le navigateur.

## 5. Créer Firestore Database

1. Ouvrir **Build > Firestore Database**.
2. Cliquer sur **Create database**.
3. Choisir le mode **Production**.
4. Choisir la région définitive de la base.
5. Valider.

La région Firestore ne se change pas simplement après création. Elle doit être
choisie selon la région de déploiement principale et les contraintes de
l'équipe.

L'application utilise notamment les collections suivantes :

```text
users
setlists
evenements
annonces
programmes
equipes
plannings
planningReleases
reports
songProposals
surveyResponses
annotations
pushSubscriptions
notifications
```

Il n'est pas nécessaire de créer ces collections manuellement. Firestore crée
une collection au premier document écrit.

## 6. Publier les règles Firestore

Les règles versionnées sont dans [firestore.rules](../../firestore.rules).

1. Ouvrir **Firestore Database > Rules**.
2. Vérifier que le projet sélectionné est `hba-supporting`.
3. Remplacer le contenu par celui de `firestore.rules` du dépôt.
4. Cliquer sur **Publish**.
5. Vérifier que la date de publication est récente.

Les règles importantes pour le profil sont :

- un utilisateur connecté peut lire les profils ;
- un utilisateur peut créer son propre profil, sans s'attribuer de droits ;
- une fois le profil créé, sa modification est réservée aux admins ;
- les emails admins doivent rester synchronisés avec
  `ADMIN_EMAILS` dans `src/lib/access.ts`.

### Erreur `403 Missing or insufficient permissions`

Vérifier dans cet ordre :

1. Le navigateur appelle bien `projects/hba-supporting` dans l'onglet Network.
2. L'utilisateur est connecté à Firebase Authentication.
3. Les règles ont été publiées dans `hba-supporting`, pas dans un autre projet.
4. Le document `users/{uid}` n'existe pas encore si l'utilisateur fait sa
   première complétion de profil.
5. Si le document existe déjà, faire la modification avec un compte admin ou
   adapter explicitement la règle `allow update`.

Ne pas remplacer les règles par `allow read, write: if true` : cela ouvrirait
les données de l'église publiquement.

## 7. Créer la clé Firebase Admin

Cette étape est nécessaire pour les routes serveur : notifications push,
inscriptions aux événements, publication des plannings, rapports et cron.

1. Aller dans **Project settings > Service accounts**.
2. Sélectionner **Firebase Admin SDK**.
3. Cliquer sur **Generate new private key**.
4. Télécharger le fichier JSON dans un emplacement temporaire sécurisé.
5. Ne jamais ajouter ce fichier au dépôt Git.

Encoder la clé pour Vercel ou Docker :

```bash
base64 -w 0 serviceAccount.json
```

Sur macOS :

```bash
base64 serviceAccount.json | tr -d '\n'
```

Renseigner le résultat dans :

```dotenv
FIREBASE_SERVICE_ACCOUNT=<JSON_EN_BASE64>
```

Le fichier `src/lib/push/admin.ts` accepte le JSON brut ou le JSON encodé en
base64. La base64 est préférable pour Vercel.

## 8. Configurer Vercel

Dans **Vercel > Project > Settings > Environment Variables**, ajouter les
variables suivantes pour les environnements nécessaires :

```text
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
FIREBASE_SERVICE_ACCOUNT
VAPID_PRIVATE_KEY
VAPID_SUBJECT
NEXT_PUBLIC_VAPID_PUBLIC_KEY
CRON_SECRET
```

Ne pas mettre `FIREBASE_SERVICE_ACCOUNT`, `VAPID_PRIVATE_KEY` ou `CRON_SECRET`
en variable `NEXT_PUBLIC_*`.

Après modification des variables, lancer un nouveau déploiement. Les variables
`NEXT_PUBLIC_*` sont intégrées au bundle pendant le build.

## 9. Rebuild Docker local

Le `docker-compose.yml` utilise `.env` et construit une image de production.
Les fichiers source ne sont pas montés dans le conteneur. Après toute
modification du code ou de `.env`, faire :

```bash
docker compose down
docker compose up --build -d
```

Un simple `docker compose up` peut relancer une ancienne image et ne pas
intégrer la correction.

Vérifier ensuite :

```bash
docker compose ps
docker compose logs --tail=100 web
```

## 10. Vérification finale

Faire cette checklist dans l'ordre :

- [ ] Le projet Firebase actif est `hba-supporting`.
- [ ] L'application Web Firebase existe.
- [ ] Email/Password est activé dans Authentication.
- [ ] Le domaine utilisé est autorisé.
- [ ] Firestore Database existe en mode Production.
- [ ] `firestore.rules` est publié dans `hba-supporting`.
- [ ] `NEXT_PUBLIC_FIREBASE_PROJECT_ID=hba-supporting` est présent dans
      `.env`.
- [ ] La clé Admin est configurée côté serveur uniquement.
- [ ] Le conteneur a été reconstruit avec `--build`.
- [ ] Un nouvel utilisateur peut se connecter.
- [ ] La page `/profil/` permet de créer son profil.
- [ ] Dans Network, les requêtes Firestore vont vers
      `projects/hba-supporting` et répondent en `200`.

Pour le profil, le test minimal est :

1. créer ou utiliser un compte non admin ;
2. ouvrir `/profil/` ;
3. renseigner le prénom et le nom ;
4. cliquer sur **Enregistrer mon profil** ;
5. vérifier une réponse `200` ou `201` sur `users/{uid}` ;
6. recharger la page et vérifier que les valeurs sont conservées.

## Références dans le code

- Configuration Auth : `src/lib/firebase/config.ts`
- Authentification navigateur : `src/lib/firebase/auth.ts`
- REST Firestore navigateur : `src/lib/firebase/setlists.ts`
- Profils : `src/lib/firebase/users.ts`
- Firebase Admin serveur : `src/lib/push/admin.ts`
- Permissions client : `src/lib/access.ts`
- Permissions Firestore : `firestore.rules`