# Installer AkuMa Launcher

Cette livraison est une préversion Windows x64. Vous pouvez installer et examiner l’interface ; le jeu nécessite encore la configuration Microsoft et la publication du pack par l’administrateur.

1. Lancer `AKUMA-Launcher-Preview-0.1.0-Windows.exe` et choisir un dossier d’installation.
2. Ouvrir AkuMa Launcher. Le serveur configuré est `akuma-casino.mine.fun` et le bouton Discord mène à la communauté AkuMa.
3. Lorsque la distribution est ouverte, cliquer sur Connexion Microsoft. La connexion s’effectue sur le site Microsoft dans le navigateur, jamais dans un formulaire AkuMa.
4. Cliquer sur Jouer sur AkuMa. Le launcher synchronise le pack, prépare Java 21, Minecraft et Fabric, vérifie les fichiers et lance le jeu avec connexion directe.

Une connexion Internet est requise pour vérifier la publication et la licence avant de jouer. Une distribution indisponible bloque le lancement, afin d’éviter de démarrer avec une version partiellement installée ou obsolète. Les téléchargements validés sont réutilisés et seuls les fichiers nécessaires sont repris.

Les paramètres permettent de régler la RAM dans les limites de la machine, la résolution et le plein écran. Changer le dossier crée une installation séparée sous `AkuMaMinecraft` dans le dossier choisi ; les anciennes données ne sont pas déplacées ou effacées. Les sessions restent dans le coffre de l’utilisateur Windows. La langue disponible dans cette préversion est le français ; le nombre de téléchargements simultanés n’est pas réglable dans l’interface.

Réparer vérifie le pack et les fichiers du jeu. Restaurer remet la transaction précédente, puis la prochaine synchronisation suit la version publiée par l’administrateur. Les configurations personnelles en conflit sont conservées ; leur mise à jour proposée se trouve dans `.akuma/conflicts` du dossier du jeu.

Les resource packs sont installés sous `resourcepacks` sans écraser vos préférences Minecraft. Activez le pack dans Minecraft ou acceptez la proposition du serveur. Les validations obligatoires du jeu restent visibles.

L’installateur de préversion n’est pas signé avec un certificat Authenticode. Une diffusion générale doit attendre la configuration externe, la signature de distribution et la recette complète décrite dans le rapport de tests. Ne transmettez pas de mots de passe ou de jetons à un administrateur pour terminer ces étapes.
