# Build Android

Ce projet mobile est configure pour generer un APK Android de production avec EAS Build.

## Premier lancement

```bash
cd fatafalta
npx eas-cli login
```

Si EAS demande de creer ou lier le projet Expo, accepte la creation avec le slug `fatafalta`.

## APK de production

```bash
npm run build:android:apk
```

Le profil `production` dans `eas.json` utilise `android.buildType: "apk"`, donc l'artefact final est un fichier `.apk` installable sur un appareil Android.

## AAB pour Google Play

```bash
npm run build:android:aab
```

Google Play prefere un fichier `.aab`. Le profil `production-aab` est garde pour ce cas.

## Build local

```bash
npm run build:android:apk:local
```

Cette commande demande Android Studio, le SDK Android, Java et les variables d'environnement Android configurees sur la machine.
