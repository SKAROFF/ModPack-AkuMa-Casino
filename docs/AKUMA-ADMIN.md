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
