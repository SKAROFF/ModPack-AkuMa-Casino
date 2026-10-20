# Installation AkuMa 0.2.3

Extraire le portable AkuMa dans un dossier et ouvrir AKUMA Launcher.exe. Le composant officiel Prism est fourni avec AkuMa : aucune installation séparée de Prism n’est nécessaire.

Pour la première connexion, ouvrir Compte Microsoft, terminer la configuration de Prism puis ajouter le compte dans Paramètres → Comptes → Ajouter Microsoft. Fermer ensuite cette fenêtre et revenir dans AkuMa.

Pour les parties suivantes, cliquer sur Jouer sur AkuMa. AkuMa vérifie et met à jour le pack, puis démarre Minecraft directement avec le compte conservé par Prism. Une demande Microsoft peut réapparaître si la session a expiré. Les téléchargements initiaux de Java et Minecraft nécessitent Internet.

Le pack signé doit être publié sur GitHub avant de pouvoir jouer. Une erreur HTTP 404 sur le flux de distribution signifie que cette publication manque ; l’installation de Prism séparément ne résout pas cette erreur.

Le portable est fourni pour les essais. L’installateur NSIS est compilé, mais son installation n’a pas été validée sur cet ordinateur (accès refusé lors de l’essai précédent).

## Installation verrouillée après un arrêt brutal

Fermer Minecraft, Prism et toutes les anciennes fenêtres AkuMa. Extraire le portable 0.2.3 dans un nouveau dossier, puis ouvrir AKUMA Launcher.exe. Le profil existant reste dans AppData et est réutilisé.

Dans Paramètres, cliquer sur Récupérer une installation bloquée. Confirmer seulement après avoir fermé les autres launchers utilisant le dossier. AkuMa conserve l’ancien verrou en sauvegarde et restaure la transaction interrompue depuis son journal. Revenir dans Accueil et cliquer sur Jouer sur AkuMa.

Ne pas effacer le dossier du jeu, les comptes ou les sauvegardes. La récupération refuse les verrous identifiés comme actifs ou appartenant à un autre ordinateur. Elle n’efface pas automatiquement les verrous anciens sans confirmation, car la version 0.2.2 ne conservait aucun identifiant de propriétaire.
