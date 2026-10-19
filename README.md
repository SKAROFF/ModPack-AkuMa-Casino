# AkuMa Launcher

Launcher Windows x64 0.2.2 pour Minecraft Java 1.21.1 / Fabric 0.19.5. Interface Royal AkuMa, modpack 1.0.0 avec manifestes signés et connexion Microsoft via le composant officiel Prism inclus.

## Jouer

Dans Releases, télécharger AKUMA-Launcher-Portable-0.2.2-Windows.zip, extraire tout le dossier puis ouvrir AKUMA Launcher.exe. Aucune installation séparée de Prism n’est nécessaire.

La première fois, cliquer sur Compte Microsoft, terminer la configuration de Prism, ajouter son compte Minecraft Java dans Paramètres → Comptes → Ajouter Microsoft, puis fermer Prism. Revenir dans AkuMa et cliquer sur Jouer sur AkuMa : le pack se synchronise avant le lancement direct de Minecraft.

Prism peut afficher une demande de connexion ou de téléchargement. Un compte Minecraft Java valide et Internet sont nécessaires. Le launcher est une préversion sans signature Authenticode ; le démarrage authentifié complet reste à valider avec le joueur. Le portable est fourni pour les essais ; l’installateur NSIS est compilé mais son installation n’a pas été validée sur l’ordinateur de préparation.

Serveur : `akuma-casino.mine.fun`. [Discord AkuMa](https://discord.gg/TNMHftawHw).

## Développement

Node.js 24 et pnpm : `pnpm install --frozen-lockfile`, `pnpm test`, `pnpm start`. Pour construire : `pnpm dist`. La construction télécharge et vérifie l’archive officielle Prism puis l’inclut dans la distribution.

Documentation : [Prism et parcours joueur](docs/AKUMA-PRISM.md), [installation](docs/AKUMA-INSTALLATION.md), [administration](docs/AKUMA-ADMIN.md), [publication GitHub](docs/AKUMA-GITHUB.md).

Les clés privées de signature, profils de compte, caches et données personnelles ne font pas partie du dépôt. Les fichiers HISTORIQUE-0.1 concernent l’ancien moteur.

## Attribution

Interface issue de Helios Launcher, Daniel Scalzi, sous MIT. helios-core 2.3.0 sous LGPL-3.0-only : sources correspondantes dans vendor-source/helios-core. Prism Launcher 11.1.1 officiel, non modifié, sous GPL-3.0 : [distribution et sources correspondantes](https://github.com/PrismLauncher/PrismLauncher/releases/tag/11.1.1). Les licences de Prism restent dans son archive originale. Aucun identifiant développeur Microsoft de Prism n’est copié dans AkuMa. Non affilié à Mojang ou Microsoft.
