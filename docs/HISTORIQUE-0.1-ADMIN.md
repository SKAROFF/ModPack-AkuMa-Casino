# Administration AkuMa Launcher

La préversion Windows 0.1.0 contient le launcher, le moteur Helios et le système de publication. La connexion Microsoft et la distribution publique restent fermées jusqu’à configuration de votre application Microsoft et de votre hébergement. Le serveur et Discord sont déjà renseignés.

## Hébergement nécessaire

L’hébergement retenu pour ce projet est désormais GitHub Releases sur `SKAROFF/ModPack-AkuMa-Casino`. Suivre d’abord `AKUMA-GITHUB.md`. L’option R2 ci-dessous reste une alternative ; aucun abonnement supplémentaire n’est nécessaire pour simplement utiliser les releases du dépôt public.

Un espace public HTTPS suffit : `latest.json`, `versions/` et `objects/`. Il ne contient aucune donnée de joueur ni clé privée. Aucun service permanent supplémentaire n’est nécessaire. Les mods identifiés sur Modrinth et les fichiers CurseForge autorisés sont téléchargés directement depuis leurs sources ; votre hébergement sert surtout vos composants AkuMa, configurations et ressources autorisées.

Cloudflare R2 Standard est une option adaptée, sous réserve de votre choix et de la création de votre compte. Le tarif publié inclut actuellement 10 Go-mois de stockage, un million d’opérations de classe A et dix millions de classe B par mois dans le palier gratuit, avec trafic sortant gratuit. Au-delà, stockage et opérations sont facturés. Un domaine personnalisé Cloudflare est conseillé pour la production ; l’adresse `r2.dev` est réservée au développement et soumise à des limites. Un domaine peut entraîner un coût distinct. Aucun compte payant ou abonnement n’a été ouvert pour vous.

Sources : [tarifs R2](https://developers.cloudflare.com/r2/pricing/) et [accès public](https://developers.cloudflare.com/r2/buckets/public-buckets/). Une autre offre statique HTTPS compatible avec les téléchargements et les requêtes Range convient aussi. L’espace Minestrator n’est utilisable que s’il propose réellement ce service public : il n’a pas été supposé disponible.

Configurer un bucket avec lecture publique des seuls fichiers de distribution, écriture réservée à votre compte administrateur et un domaine tel que `launcher.votre-domaine.fr`. Les identifiants S3 restent dans le profil local AWS CLI. Dans `desktop/config.json`, renseigner `feedUrl` avec l’URL de `latest.json`, et ajouter uniquement le nom d’hôte du domaine dans `allowedHosts`. Conserver HTTPS et la clé publique embarquée.

## Application Microsoft

L’identifiant client est celui d’une application enregistrée, pas celui de votre compte de joueur. Aucun mot de passe ni secret Microsoft ne doit être placé dans le launcher.

1. Ouvrir [Microsoft Entra](https://entra.microsoft.com/) avec un compte autorisé à enregistrer une application dans un tenant.
2. Dans les inscriptions d’applications, créer **AkuMa Launcher**, en autorisant les comptes Microsoft personnels, éventuellement avec les comptes organisationnels.
3. Ajouter la plateforme application mobile et bureau, avec URI de retour `http://localhost/callback`. Le launcher utilise un port local éphémère, un état aléatoire et PKCE. Activer le flux client public si requis par votre configuration. Ne pas créer de secret pour ce client de bureau.
4. Copier l’**ID d’application client** public dans `desktop/config.json` sous `microsoftClientId`.
5. Faire une première tentative de connexion depuis le launcher, puis demander l’accès Minecraft pour cet identifiant via [le formulaire Microsoft indiqué par Helios](https://aka.ms/mce-reviewappid). Suivre les demandes de Microsoft ; l’enregistrement Entra seul ne garantit pas l’accès Minecraft. Le délai et l’acceptation relèvent de Microsoft.
6. Après approbation, effectuer un test avec un compte possédant Minecraft Java, puis tester renouvellement de session et déconnexion.

Références : [enregistrer une application](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app), [flux code et PKCE](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow), et `docs/MicrosoftAuth.md` pour les exigences propres à Helios/Minecraft. Notre flux externe PKCE remplace la fenêtre de connexion intégrée de Helios ; son URI de retour est différente.

## Préparer une version du pack

Le dossier `private-pack` contient le candidat local nettoyé. L’archive fournie a été comparée aux JAR locaux par SHA-256. Les caches Chromium MCEF, bibliothèques natives générées et anciens fichiers désactivés ne sont pas distribués. Les options graphiques, identités vocales et données personnelles ne sont pas importées.

`reports/publication-candidate.json` contient les droits et sources de chaque fichier. Les modes possibles sont `authorized-url` pour un téléchargement officiel autorisé et `redistribute` pour vos fichiers ou ceux dont la redistribution est autorisée. Le mode `pending` bloque la publication. Renseigner une preuve précise et une licence pour les fichiers privés ou non résolus. Les URLs Modrinth ont été retrouvées à partir des empreintes exactes ; EntityCulling utilise cette source, sans contourner sa restriction de distribution tierce CurseForge.

Les fichiers restant à traiter comprennent les trois mods Royal AkuMa, MCEF, la configuration Kirri et le resource pack. Pour MCEF, vérifier la version exacte, sa licence LGPL et les sources correspondantes ; ne pas déduire un droit de redistribution du seul fait qu’un JAR est présent. Pour vos propres composants, documenter votre autorisation. Pour le pack, vérifier les droits de toutes les ressources intégrées.

Depuis le dossier source, avec Node.js et pnpm :

```powershell
pnpm install --frozen-lockfile
node tools/publish.cjs build private-pack publication reports/publication-candidate.json private-admin/keys/private.pem
```

Avant la génération, définir un nouveau numéro `version`, la version Fabric et le `baseUrl` public dans la configuration de publication. Toute version publiée est immuable. Les empreintes SHA-256, tailles et fichiers sont générés depuis le contenu réel. Les configurations utilisent la politique `preserve` : une modification personnelle produit une proposition dans `.akuma/conflicts/<version>/` au lieu d’un écrasement.

Le dossier `publication` se prépare localement. Pour publier sur un stockage S3 compatible, installer l’AWS CLI officielle, configurer un profil à droits limités et utiliser :

```powershell
./tools/Publish-AkuMa.ps1 -ReleaseDirectory publication -Bucket NOM-DU-BUCKET -Endpoint https://ENDPOINT-S3
```

Ce script transfère les objets, puis les versions, puis `latest.json`. Il ne supprime pas les versions existantes. Pour un autre hébergeur, garder cet ordre et publier le pointeur en dernier. Ce transfert n’a pas été testé contre un hébergeur public faute de compte configuré.

## Clé de publication

La clé privée Ed25519 se trouve uniquement dans `private-admin/keys/private.pem`, hors des livrables distribuables. Sauvegardez-la hors ligne. La clé publique correspondante est embarquée dans `desktop/config.json`. Ne téléversez jamais `private-admin`, les dossiers `qa`, les caches ou les fichiers de session. Pour générer une nouvelle paire dans un autre dossier : `node tools/publish.cjs keygen DOSSIER`. Une rotation de clé publique nécessite une nouvelle version approuvée du launcher.

## Rollback

Pour restaurer la version publique :

```powershell
node tools/publish.cjs rollback publication 1.0.0
```

Téléverser ensuite uniquement `latest.json`. Les clients retrouvent cette version au prochain lancement. Ne modifier ni les objets ni les manifestes historiques. Le bouton local de restauration remet la transaction précédente ; une synchronisation suivante suit de nouveau la version publique active.

Après un arrêt brutal, le journal permet de restaurer la transaction avant une nouvelle mise à jour. Un verrou persistant bloque l’installation : fermer tous les launchers et Minecraft, sauvegarder le dossier de jeu, puis renommer `.akuma/lock` en `lock.stale`. Ne pas toucher au journal ou aux sauvegardes ; la prochaine synchronisation effectue la récupération. Un déverrouillage automatique n’est volontairement pas effectué pendant qu’un autre processus pourrait écrire.

## Mise à jour du launcher

Compiler l’installateur suivant, puis signer son manifeste :

```powershell
pnpm run dist
node tools/publish.cjs launcher dist-akuma/NOUVEL-INSTALLATEUR.exe 0.2.0 https://DOMAINE/NOUVEL-INSTALLATEUR.exe publication/launcher-latest.json private-admin/keys/private.pem
```

Renseigner `launcherFeedUrl` et le domaine autorisé. Le bouton de mise à jour vérifie signature, numéro croissant, taille et SHA-256, puis propose l’installateur. Une signature Authenticode de l’exécutable reste à ajouter avant diffusion large ; aucun certificat de signature Windows n’est disponible dans cette livraison. La signature Ed25519 du manifeste ne remplace pas Authenticode.

## Ressources et exploitation

Le resource pack est un fichier géré indépendant : changer sa version binaire dans une publication ne retélécharge pas les mods inchangés. Le launcher installe le ZIP sans réécrire `options.txt` ; son activation se fait dans les options Minecraft ou par la proposition du serveur, en respectant la validation du joueur.

MCEF télécharge ses bibliothèques Chromium au démarrage du mod. Ce téléchargement interne au mod doit être vérifié lors de la recette complète ; il n’est pas contrôlé par notre manifeste. Le serveur de production n’a reçu aucune modification. La compatibilité finale des contenus, paquets réseau et resource pack doit être testée après connexion Microsoft. Aucun mod supplémentaire n’est imposé pour un simple contrôle de version.
