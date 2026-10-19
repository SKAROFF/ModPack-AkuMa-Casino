# AkuMa avec Prism officiel

La version 0.2.0 conserve l’interface Royal AkuMa et son système de mises à jour signé. Elle utilise le programme Prism Launcher officiel non modifié pour la connexion Microsoft, la licence, Java, Minecraft et Fabric. Aucun compte Azure, application Entra, abonnement ou identifiant Microsoft de développeur n’est demandé à l’administrateur. Chaque joueur doit disposer de son compte Minecraft Java valide.

## Première connexion

1. Installer la préversion AkuMa 0.2.0.
2. Cliquer sur **Compte Microsoft · Prism**. AkuMa télécharge le paquet Windows portable officiel Prism 11.1.1 et vérifie son empreinte SHA-256 fixée dans le programme.
3. Terminer les éventuelles étapes de bienvenue de Prism. Dans **Paramètres → Comptes**, choisir **Ajouter Microsoft** et effectuer soi-même la connexion Microsoft.
4. Fermer Prism, puis revenir dans AkuMa. AkuMa bloque les modifications tant que son processus Prism est ouvert, pour éviter d’écrire dans les mods pendant une partie.
5. Lorsque le pack a été publié sur GitHub, cliquer sur **Jouer sur AkuMa**. AkuMa synchronise les fichiers, prépare le profil et demande à Prism de démarrer le jeu et de rejoindre `akuma-casino.mine.fun`.

Prism peut rester visible pendant l’installation du jeu et la vérification du compte. Le bouton Déconnexion dans AkuMa ouvre la gestion du compte Prism : la suppression du compte se fait dans Prism. AkuMa n’affiche pas un nom de joueur supposé et ne lit pas le fichier de comptes de Prism.

## Isolation des données

Le profil se trouve par défaut sous `%APPDATA%\AkuMaLauncher\prism\instances\akuma\.minecraft`. Le moteur officiel est installé séparément sous `prism-engine\11.1.1`. Les installations Prism et CurseForge existantes ne sont pas utilisées ou modifiées. Les anciennes données AkuMa 0.1 restent à leur emplacement ; cette version crée un nouveau profil au lieu de déplacer des données personnelles.

Les paramètres RAM et résolution sont transmis au profil dédié. L’option plein écran change uniquement la ligne `fullscreen` dans `options.txt` ; les autres préférences restent conservées. Un profil existant sans marqueur de propriété AkuMa est refusé. La déconnexion et la conservation des comptes restent sous la responsabilité de Prism officiel.

## Mises à jour et sécurité

Les manifestes du pack restent signés en Ed25519 et les fichiers contrôlés en SHA-256. Le téléchargement et la transaction ont lieu avant le démarrage de Prism. Un contrôle local préalable au lancement, exécuté par AkuMa, refuse un manifeste inaccessible, une version dépassée, un fichier géré corrompu ou une transaction en cours/interrompue. Il n’exécute pas de commande fournie par le manifeste distant. Un lancement direct depuis Prism ne synchronise pas le pack : si une mise à jour est requise, revenir dans AkuMa.

Le programme Prism reste identifié comme Prism Launcher. Son identifiant Microsoft n’est pas copié dans AkuMa, et le binaire n’est ni recompilé ni rebaptisé. Les comptes, jetons et mots de passe ne sont jamais importés ou stockés par le code AkuMa 0.2. Les anciennes fonctions OAuth de la version 0.1 sont conservées dans les sources historiques mais exclues de l’application distribuée.

Le moteur téléchargé est épinglé à Prism 11.1.1 pour Windows x64, avec vérification de ses fichiers au démarrage. Une évolution de ce moteur se fera par une mise à jour AkuMa après vérification de la nouvelle distribution officielle. Si un moteur modifié ou corrompu est détecté, son utilisation est bloquée. Le programme téléchargé conserve ses licences et ses propres étapes d’acceptation ou de connexion.

## État de la recette

Le téléchargement officiel, le SHA-256, l’extraction et la commande `--version` de Prism ont été exécutés avec succès. Les trois métadonnées Minecraft 1.21.1, Intermediary 1.21.1 et Fabric Loader 0.19.5 ont été interrogées sur le service officiel de Prism. Huit tests automatisés couvrent notamment le profil, la conservation des préférences, les verrous et le contrôle préalable au lancement, en plus du cycle de mises à jour existant.

Une connexion Microsoft dans le nouveau profil, le téléchargement du jeu par Prism, le démarrage authentifié et l’entrée sur le serveur restent à exécuter avec le joueur. Les essais Minecraft/Java réalisés dans la version 0.1 concernaient le moteur précédent et ne sont pas présentés comme une validation du démarrage Prism. Le dépôt GitHub est public mais encore vide lors de cette adaptation : tant que la release signée du pack n’est pas publiée, le bouton Jouer doit refuser le lancement.

Le programme Windows compilé a été exécuté pour tester son contrôle préalable : il refuse le flux GitHub absent avec HTTP 404, comme attendu. L’installateur NSIS a été compilé, mais son exécution de test a reçu « Accès refusé » de Windows, sans installation validée pour 0.2. Aucun réglage de sécurité Windows n’a été modifié. Une archive de l’application portable est également fournie ; son ouverture graphique et la connexion restent à valider par le joueur. Cette préversion n’est pas signée Authenticode.

Sources : [Prism officiel](https://prismlauncher.org/), [interface de lancement](https://prismlauncher.org/wiki/getting-started/command-line-interface/), [commandes préalables](https://prismlauncher.org/wiki/help-pages/custom-commands/), [release 11.1.1](https://github.com/PrismLauncher/PrismLauncher/releases/tag/11.1.1).
