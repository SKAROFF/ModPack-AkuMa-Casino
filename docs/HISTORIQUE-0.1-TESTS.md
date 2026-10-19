# Tests et sécurité AkuMa Launcher

Cette préversion a un installateur Windows et des tests locaux exécutés. Elle n’est pas une version de production validée : l’application Microsoft et l’hébergement public restent à configurer.

## Résultats exécutés

| Vérification | Résultat et portée |
| --- | --- |
| Instance CurseForge | Minecraft 1.21.1, Fabric 0.19.5, 25 JAR audités |
| Archive fournie par l’utilisateur | Comparaison SHA-256 de tous les JAR de premier niveau ; caches et bibliothèques générées exclus |
| Dépendances du candidat | 21 JAR, 129 mods avec dépendances embarquées ; aucun identifiant obligatoire manquant. Les contraintes de versions restent à confirmer par Fabric au lancement authentifié |
| Java existant | Java 21 reconnu et utilisé |
| Installation Java automatique | Téléchargement Adoptium Java 21, contrôle d’empreinte, extraction et validation exécutés dans un dossier de test |
| Minecraft réel | Installation 1.21.1 et nouvelle vérification complète des fichiers exécutées |
| Fabric réel | Profil officiel 0.19.5 et huit bibliothèques installés et contrôlés |
| Serveur public | Réponse à `akuma-casino.mine.fun`, Minecraft 1.21.1, protocole 767 |
| Installateur Windows | Installation silencieuse exécutée dans un dossier de test : code de sortie 0 et exécutable installé présent |
| Commande Minecraft | 55 entrées de classpath présentes, classe principale Fabric et connexion directe vérifiées ; création du processus simulée, aucun jeu sans licence lancé |
| Cycle V1 vers V2 | Publication locale signée, installation, mise à jour différentielle, mod obsolète retiré, configuration personnelle préservée, textures modifiées |
| Candidat réel | 23 fichiers installés localement ; V2 de test remplace un seul fichier de ressources et préserve `options.txt`. Le fichier V2 est une charge synthétique de test de transaction, pas un resource pack destiné à jouer |
| Pannes | Connexion coupée, reprise Range, fichier corrompu, distribution HTTP 503, signature falsifiée rejetée |
| Intégrité et conservation | Réparation depuis le cache vérifié, rollback, sauvegardes personnelles et préférences conservées |
| Fichiers | Traversée de chemins, noms Windows réservés, flux alternatifs et jonction Windows rejetés |
| Récupération | Journal de transaction interrompue restauré avant synchronisation |
| Dépendances du launcher | Audit de production enregistré ; les vulnérabilités ZIP signalées ont été corrigées par adm-zip 0.6.1 |

Résultats détaillés dans `reports/update-tests.txt`, `game-install.json`, `java-auto-install.json`, `real-pack-test.json`, `server-status.json`, `dependency-audit.json`, `dependency-check.json` et `user-archive-audit.json`.

## Recette restante

La connexion Microsoft, le renouvellement réel des jetons, le lancement Minecraft authentifié, l’entrée sur le serveur et le chargement du resource pack n’ont pas été validés. Aucun compte de test licencié ni identifiant d’application approuvé n’a été utilisé. La publication distante S3, la mise à jour du launcher via un hébergement public, la signature Authenticode et l’installation sur un Windows entièrement neuf restent à valider. Les tests locaux d’installation ne constituent pas une recette sur toutes les machines des joueurs.

## Architecture de sécurité

L’interface Electron n’a pas accès à Node.js : isolation du contexte, sandbox, passerelle limitée à une liste d’actions, contrôle de l’émetteur IPC et refus de navigation, fenêtres secondaires et permissions de navigateur. La politique CSP bloque scripts distants et connexions depuis l’interface. Le moteur Helios reste dans le processus principal ; sa fenêtre Electron historique avec Node intégré n’est pas utilisée.

L’authentification utilise le navigateur système, un code OAuth avec PKCE, un état aléatoire et une écoute limitée à la boucle locale. Le coffre `safeStorage` chiffre le jeton de renouvellement avec la protection Windows. Aucun mot de passe n’est demandé ou stocké. Le jeton Minecraft reste en mémoire et n’est pas exposé à l’interface. Les arguments du lancement contenant le jeton ne sont pas journalisés par le launcher. Les erreurs d’authentification n’impriment pas les objets de requête contenant des jetons.

Chaque publication de pack est signée en Ed25519 et chaque fichier géré contrôlé en SHA-256. Les URLs et redirections doivent rester sur les hôtes HTTPS autorisés. HTTP local n’est accepté que par les tests explicitement lancés en mode développement, jamais par le launcher distribué. Le manifeste ne peut définir que des fichiers sous `mods`, `config` et `resourcepacks`, sans commande, script d’installation ou option JVM. Des mods Java restent du code exécutable : signer une publication implique la confiance de l’administrateur dans les mods sélectionnés. Les opérateurs ne doivent pas publier un JAR simplement parce que son hash est calculé correctement.

Les téléchargements terminent avant la transaction. Les fichiers gérés obsolètes sont supprimés uniquement s’ils correspondent encore à leur empreinte précédente. Les fichiers inconnus ne sont pas supprimés. Les mondes, captures, options et autres données hors manifeste ne sont pas touchés. Les propositions de configuration sont conservées dans un dossier séparé et peuvent demander une décision administrateur si une nouvelle configuration obligatoire est incompatible avec l’ancienne.

Minecraft et Fabric suivent leurs métadonnées officielles et leurs empreintes natives, notamment SHA-1 pour certains artefacts de leur écosystème. Java utilise l’empreinte de son fournisseur. Ces empreintes ne doivent pas être présentées comme des signatures de publication AkuMa. Les téléchargements internes à MCEF et les risques du Chromium embarqué dans ce mod nécessitent une revue distincte.

Le verrou empêche deux mises à jour simultanées. Le launcher garde la main sur le processus Minecraft et refuse une autre opération pendant le jeu. Une application locale hostile exécutée sous le même compte Windows peut toujours modifier les fichiers, lire les arguments des processus ou agir sur les données de l’utilisateur : cette préversion ne prétend pas résister à une machine déjà compromise.

## Licences et maintenance

Helios Launcher est sous MIT, source de référence `86e4316b963b54ff052be9ec80f316b8f842cf87`. Le constructeur de commande Minecraft a été adapté pour le nouveau processus principal. `helios-core` 2.3.0 est sous **LGPL-3.0-only**, et ses sources correspondantes sont fournies dans `vendor-source/helios-core` au tag v2.3.0. Cette distinction est importante : la licence MIT du launcher ne couvre pas toutes ses dépendances. La reconstruction permet de remplacer la bibliothèque et de modifier le launcher. Conserver les notices des dépendances et l’accès aux sources correspondantes dans les distributions.

Electron 44.9.0, helios-core 2.3.0, helios-distribution-types 1.3.0, adm-zip 0.6.1, fs-extra 11.4.1 et semver 7.8.5 sont verrouillés dans la configuration et le lockfile. L’inventaire détaillé des licences figure dans `reports/dependency-licenses.json`. Un audit sans vulnérabilité connue n’est pas une preuve d’absence de défaut. Refaire l’audit et la recette avant chaque diffusion.

Helios a été retenu pour son moteur Java/Minecraft/Fabric et sa personnalisation. Packwiz (MIT) est pertinent pour l’édition de packs et l’installation via un outil compagnon, mais ne fournit pas seul l’application AkuMa ni son authentification. Prism (GPL-3.0) est une base native mature, au prix d’un fork C++/Qt et d’un travail de personnalisation plus lourd pour cette livraison. Aucun code Prism ou Packwiz n’est incorporé.

Sources : [Helios](https://github.com/dscalzi/HeliosLauncher), [helios-core v2.3.0](https://github.com/dscalzi/helios-core/tree/v2.3.0), [Packwiz](https://packwiz.infra.link/), [Prism](https://github.com/PrismLauncher/PrismLauncher), [sécurité Electron](https://www.electronjs.org/docs/latest/tutorial/security).
