# Tests et sécurité AkuMa 0.2

La version 0.2 utilise le programme Prism officiel non modifié, téléchargé depuis la release 11.1.1. Le code AkuMa ne réutilise pas ses identifiants Microsoft et ne lit pas ses comptes ou jetons. L’ancien moteur OAuth et Minecraft est exclu du paquet Windows ; ses sources sont conservées pour historique.

Tests exécutés : téléchargement officiel Windows portable, contrôle du SHA-256 épinglé, extraction contrôlée et commande Prism --version réussie. Les métadonnées officielles Minecraft 1.21.1, Intermediary 1.21.1 et Fabric Loader 0.19.5 répondent toutes HTTP 200. Les résultats sont dans reports/prism-engine-test.json et prism-metadata-test.json.

Huit tests automatisés passent : création du profil dédié, paramètres mémoire et résolution, conservation des options personnelles, blocage d’un profil non géré et d’un processus déjà actif, contrôle préalable du pack signé, refus des fichiers corrompus et des mises à jour incomplètes, refus hors connexion, chemins dangereux, jonction Windows et récupération de journal. Le cycle V1 → V2, la réparation, le rollback et la reprise réseau restent couverts par les tests du moteur de synchronisation. Voir reports/prism-bridge-tests.txt.

Les installations Java/Minecraft effectuées dans la version 0.1 validaient le moteur précédent. Elles ne prouvent pas le démarrage de Minecraft via Prism. Une connexion Microsoft dans le nouveau profil, le téléchargement du jeu par Prism, le démarrage authentifié et l’entrée sur le serveur restent à exécuter avec le joueur. Aucun jeu n’a été lancé avec une fausse identité de test.

La fenêtre Electron conserve nodeIntegration=false, contextIsolation=true et sandbox=true, une passerelle d’actions limitée, une CSP locale, le contrôle de l’émetteur et le refus des navigations et fenêtres secondaires. Le manifeste du pack ne contient aucune commande à exécuter. Les versions sont signées Ed25519 et leurs fichiers gérés contrôlés en SHA-256, via des hôtes HTTPS autorisés. Les scripts préalables de Prism sont définis localement par le programme AkuMa ; ils ne proviennent pas du manifeste distant.

Le contrôle préalable au lancement doit vérifier la version distante, l’intégrité des fichiers gérés et l’absence de journal ou verrou de transaction. Si la distribution est inaccessible, le lancement est refusé. Les préférences de configuration préservées peuvent différer de leur valeur publiée. Le programme Prism et Minecraft doivent être fermés avant toute synchronisation ou changement du profil ; un marqueur de processus persistant protège aussi les redémarrages du launcher.

Le dossier du moteur officiel possède un reçu d’intégrité. Une modification détectée bloque son utilisation. Un programme hostile sous le même compte Windows reste hors du modèle de protection : il peut agir sur les fichiers ou processus de cet utilisateur. Les téléchargements Chromium internes au mod MCEF restent à examiner dans la recette finale.

La licence du programme Prism reste GPL-3, ses ressources gardent leurs licences, et l’application est téléchargée séparément depuis la source officielle. Helios Launcher est sous MIT ; helios-core 2.3.0, encore utilisé pour l’état du serveur, est sous LGPL-3.0-only avec ses sources correspondantes fournies. Les notices et l’inventaire des dépendances sont conservés. L’audit de production précédent est dans reports/dependency-audit.json ; le refaire avant la diffusion générale.

Le dépôt est public mais sa publication initiale et six vérifications de droits restent à terminer. L’installateur de préversion n’a pas de certificat Authenticode. Ces limites empêchent de qualifier la version de production entièrement validée.

Sources : https://prismlauncher.org/ et https://prismlauncher.org/wiki/getting-started/command-line-interface/.
