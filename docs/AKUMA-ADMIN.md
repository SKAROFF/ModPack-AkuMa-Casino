# Administration AkuMa 0.2 avec Prism

AkuMa 0.2 utilise le programme Prism officiel pour les comptes Microsoft et le démarrage Minecraft/Fabric. La création d’une application Microsoft Entra et l’abonnement Azure ne sont plus nécessaires pour cette architecture. La première connexion du joueur se fait dans Prism, puis le joueur ferme Prism avant de revenir dans AkuMa.

La documentation active est AKUMA-PRISM.md pour les joueurs et AKUMA-GITHUB.md pour la publication. Les procédures HISTORIQUE-0.1 sont archivées : elles concernent uniquement l’ancien moteur autonome.

Le système de pack reste identique : latest.json signé Ed25519, objets SHA-256 et versions immuables. Le dépôt SKAROFF/ModPack-AkuMa-Casino est public ; il doit encore recevoir son premier commit et sa première release. Les outils de publication sont préparés localement et aucun accès en écriture GitHub n’est actuellement disponible dans cette conversation.

Avant de publier, terminer les preuves de droits dans reports/publication-candidate.json : les trois composants Royal AkuMa, MCEF, la configuration Kirri et les ressources du pack restent marqués pending. Dix-sept fichiers utilisent déjà une URL officielle autorisée. Ne pas publier les caches, bibliothèques natives générées ou anciennes sauvegardes présents dans l’archive d’origine.

La clé privée locale est dans private-admin/keys/private.pem, hors des archives distribuables. Sauvegarder cette clé hors ligne. Les joueurs ne reçoivent que la clé publique. Ne jamais publier de comptes Prism, de jetons, de mots de passe ou la clé privée.

Après validation des droits :

    node tools/publish.cjs build private-pack publication reports/publication-candidate.json private-admin/keys/private.pem
    ./tools/Publish-GitHub.ps1 -ReleaseDirectory publication -Version 1.0.0 -Installer dist-akuma/AKUMA-Launcher-Preview-0.2.0-Windows.exe

La version pack et la version launcher sont distinctes. Le script prépare un brouillon et publie seulement après les transferts. Pour un rollback public, redéfinir une ancienne release contenant latest.json comme dernière release. Ne pas effacer les fichiers historiques.

Pour signer la prochaine mise à jour du programme, utiliser la commande launcher de tools/publish.cjs, puis joindre launcher-latest.json signé à chaque release de pack. Son URL doit rester versionnée. La version actuelle du binaire Prism est épinglée ; sa mise à jour nécessite une nouvelle version AkuMa validée.

La réparation du pack se fait dans AkuMa ; la réparation des fichiers Minecraft/Java se fait dans Prism. Un lancement direct du profil via Prism vérifie le pack mais ne le synchronise pas : s’il est dépassé ou corrompu, fermer Prism puis utiliser AkuMa.

Aucune modification n’a été déployée sur le serveur Minestrator. Les tests finaux de connexion, protocoles des mods, resource pack et bibliothèques MCEF doivent encore être effectués avec un compte Java valide. Aucun abonnement supplémentaire d’hébergement n’est requis pour utiliser les GitHub Releases préparées ; les conditions GitHub restent applicables.

## Publier une nouvelle version du pack (n'importe quel admin)

Les sources du pack ne sont pas dans git : le pack publié sert de source. Il faut la clé de signature (`private-admin/keys/private.pem`) et une clé Backblaze limitée au bucket (`~/.b2/publication-akuma.txt`, ou `AKUMA_B2_KEY_FILE`).

1. Récupérer la version en ligne, dans un dossier vide hors du dépôt (lecture seule du bucket ; signature vérifiée) :

       node tools/publish.cjs pull ../pack-work private-admin/keys/private.pem 2.0.25-alpha

   On obtient `../pack-work/source/` (les fichiers des joueurs), `../pack-work/config.json` (réglages et droits, avec la nouvelle version) et `../pack-work/publie-<ancienne>.json` (le manifeste qui était en ligne).
2. Remplacer ou ajouter les fichiers dans `source/` (par exemple `mods/kanto-adventure-1.21.1-1.0.0.jar`). Un fichier nouveau doit recevoir sa ligne dans `config.json > rights` (mode, preuve, licence), sinon `build` refuse.
3. Construire et signer :

       node tools/publish.cjs build ../pack-work/source ../pack-work/dist ../pack-work/config.json private-admin/keys/private.pem

4. Publier (les objets d'abord, `latest.json` en dernier) : `node tools/publish.cjs upload ../pack-work/dist`.
5. Retour arrière : `pull` d'avant reste disponible (`publie-<ancienne>.json`) ; republier l'ancienne version avec `rollback` puis `upload`.

Contrôle fait le 07/11/2026 : `pull` puis `build` de la 2.0.24-alpha redonne le manifeste publié à l'identique (93 fichiers), hors date de création.
