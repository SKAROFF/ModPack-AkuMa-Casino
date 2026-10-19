# Héberger AkuMa sur GitHub

Le dépôt `SKAROFF/ModPack-AkuMa-Casino` est confirmé public, avec une branche par défaut `main`. Il est encore vide : il faut pousser un premier commit avant de créer sa première release. Aucun secret GitHub ne sera distribué aux joueurs. Le dossier local `github-distribution` contient la structure source préparée pour ce premier envoi.

GitHub Releases convient pour ce pack : les JAR volumineux et l’installateur sont des pièces jointes de release, tandis que les fichiers tiers autorisés restent sur leurs CDN officiels. Le Git classique bloque les fichiers de plus de 100 Mio ; le mod Royal Puff dépasse cette limite. Une pièce jointe de release peut atteindre 2 Gio. N’envoyez donc pas l’archive brute de 440 Mo dans le dépôt Git, ni les caches MCEF qu’elle contient.

Références : [fichiers volumineux](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github), [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases).

## Configuration

Pour publier la version 1.0.0, définir dans la configuration de publication :

```json
{
  "version": "1.0.0",
  "fabric": "0.19.5",
  "assetLayout": "github-release",
  "baseUrl": "https://github.com/SKAROFF/ModPack-AkuMa-Casino/releases/download/pack-1.0.0"
}
```

Conserver aussi le dictionnaire `rights`, après résolution de tous les éléments `pending`. Définir le flux du launcher à `https://github.com/SKAROFF/ModPack-AkuMa-Casino/releases/latest/download/latest.json`. Les hôtes `github.com` et `release-assets.githubusercontent.com` sont déjà autorisés ; ajouter un autre hôte uniquement si une redirection officielle observée le nécessite.

## Publication

Installer l’outil officiel [GitHub CLI](https://cli.github.com/), puis effectuer vous-même `gh auth login` avec le compte autorisé à publier. Le launcher ne demande aucun accès au compte GitHub du joueur.

```powershell
node tools/publish.cjs build private-pack publication reports/publication-candidate.json private-admin/keys/private.pem
./tools/Publish-GitHub.ps1 -ReleaseDirectory publication -Version 1.0.0 -Installer dist-akuma/AKUMA-Launcher-Preview-0.1.0-Windows.exe
```

Le script refuse un dépôt privé, prépare une release brouillon `pack-1.0.0`, transfère les fichiers puis la publie comme dernière release. Un échec de transfert laisse le brouillon non publié ; la version active reste la précédente. Le script ne remplace pas une release existante. Toutes les releases marquées comme dernière release doivent contenir `latest.json`, sinon les launchers bloquent leur synchronisation. Les URLs des objets restent attachées à leur version et les anciens fichiers ne sont pas supprimés.

Pour la mise à jour du launcher lui-même, inclure également `launcher-latest.json` signé dans chaque nouvelle release de pack, et définir `launcherFeedUrl` à l’adresse `/releases/latest/download/launcher-latest.json`. Le manifeste doit pointer vers l’URL versionnée de son installateur. Conserver le précédent manifeste si le launcher ne change pas.

Pour revenir à une version publiée, la définir à nouveau comme dernière release avec GitHub CLI ou l’interface GitHub. Son `latest.json` doit être présent et signé par la même clé. Ne pas modifier ni effacer les anciennes pièces jointes.

Cette procédure est préparée mais n’a pas été exécutée sur le dépôt distant. Il reste à établir l’accès en écriture GitHub, valider les fichiers privés et configurer l’application Microsoft.
