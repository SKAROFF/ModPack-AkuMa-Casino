# AkuMa Launcher

Préversion Windows x64 0.1.0. Serveur : akuma-casino.mine.fun. Discord : https://discord.gg/TNMHftawHw.

Le moteur installe Java 21, Minecraft 1.21.1 et Fabric, et synchronise les fichiers par manifeste signé Ed25519 avec contrôle SHA-256. Interface Electron isolée, authentification Microsoft externe PKCE et stockage chiffré de session.

La mise en service publique nécessite encore une application Microsoft approuvée, un hébergement HTTPS et la validation des fichiers privés. La connexion et le lancement authentifiés ne sont pas déclarés testés.

- Installation : docs/AKUMA-INSTALLATION.md
- Publication, Microsoft et hébergement : docs/AKUMA-ADMIN.md
- Hébergement choisi sur GitHub Releases : docs/AKUMA-GITHUB.md
- Résultats et limites : docs/AKUMA-TESTS-SECURITE.md
- Droits des fichiers : reports/publication-candidate.json
- Comparaison du pack fourni : reports/user-archive-audit.json

Développement : pnpm install --frozen-lockfile, puis pnpm start. Tests : pnpm test. Installateur : pnpm run dist.

La clé privée locale est exclue des archives de livraison. Ne distribuez jamais private-admin, qa ou private-pack-initial-audit. Le candidat PRIVE est destiné à votre revue locale ; sa présence ne vaut pas autorisation de diffusion publique de tous les fichiers.

Helios Launcher : MIT, Daniel Scalzi. helios-core : LGPL-3.0-only, sources fournies dans vendor-source/helios-core. Voir LICENSE.txt et reports/dependency-licenses.json.
