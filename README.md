# AkuMa Launcher avec Prism officiel

Préversion Windows x64 0.2.0. Interface Royal AkuMa, synchronisation signée du modpack et connexion Microsoft déléguée au programme Prism officiel non modifié. Aucun compte Azure ou identifiant développeur Microsoft requis.

Serveur : akuma-casino.mine.fun. Discord : https://discord.gg/TNMHftawHw.

Commencer par docs/AKUMA-PRISM.md. Publication : docs/AKUMA-GITHUB.md et docs/AKUMA-ADMIN.md. Résultats : docs/AKUMA-TESTS-SECURITE.md.

Le dépôt public doit encore recevoir sa première release signée. Les sources autorisées des mods et les droits en attente sont dans reports/publication-candidate.json. Le démarrage authentifié dans le nouveau profil Prism reste à tester avec le joueur.

Développement : pnpm install --frozen-lockfile, puis pnpm start. Tests : pnpm test. Installateur : pnpm run dist.

Ne distribuez jamais private-admin, qa, les fichiers de comptes Prism ou les anciens caches. Les archives de livraison excluent les clés privées et les sessions. Les fichiers HISTORIQUE-0.1 décrivent le moteur précédent et ne constituent pas la procédure de la version actuelle.

Interface basée sur Helios Launcher sous MIT, Daniel Scalzi. La bibliothèque helios-core utilisée pour le statut du serveur reste sous LGPL-3.0-only ; sources correspondantes fournies dans vendor-source/helios-core. Prism officiel est téléchargé depuis sa distribution originale sous GPL-3 et reste séparé de notre programme. Aucun identifiant Microsoft Prism n’est intégré au code AkuMa.
