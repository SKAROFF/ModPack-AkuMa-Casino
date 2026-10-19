param(
    [Parameter(Mandatory=$true)][string]$ReleaseDirectory,
    [Parameter(Mandatory=$true)][string]$Version,
    [string]$Repository = 'SKAROFF/ModPack-AkuMa-Casino',
    [string]$Installer
)
$ErrorActionPreference = 'Stop'
if ($Version -notmatch '^\d+\.\d+\.\d+$') { throw 'Version invalide.' }
if ($Repository -notmatch '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$') { throw 'Dépôt invalide.' }
Get-Command gh -ErrorAction Stop | Out-Null
$releaseRoot = (Resolve-Path -LiteralPath $ReleaseDirectory).Path
$manifestPath = Join-Path $releaseRoot 'latest.json'
$envelope = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$manifest = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($envelope.payload)) | ConvertFrom-Json
if ($manifest.version -ne $Version) { throw 'La version demandée ne correspond pas au manifeste.' }
$tag = "pack-$Version"
$baseUrl = "https://github.com/$Repository/releases/download/$tag/"
foreach ($item in $manifest.files) {
    $objectPath = Join-Path (Join-Path $releaseRoot 'objects') $item.sha256
    if (Test-Path -LiteralPath $objectPath) {
        if ($item.url -ne ($baseUrl + $item.sha256)) { throw 'Regénérer avec assetLayout=github-release et le baseUrl de cette release.' }
        if ((Get-FileHash -LiteralPath $objectPath -Algorithm SHA256).Hash.ToLower() -ne $item.sha256) { throw 'Objet corrompu avant transfert.' }
    }
}
$visibility = & gh repo view $Repository --json visibility --jq '.visibility'
if ($LASTEXITCODE -ne 0 -or $visibility.Trim() -ne 'PUBLIC') { throw 'Le dépôt doit être public et accessible. Lancez gh auth login vous-même si nécessaire.' }
$notesPath = Join-Path $releaseRoot 'release-notes.txt'
Set-Content -LiteralPath $notesPath -Value "AkuMa Modpack $Version. Minecraft 1.21.1 / Fabric $($manifest.fabric). Publication signée Ed25519 et fichiers SHA-256."
& gh release create $tag --repo $Repository --draft --title "AkuMa Modpack $Version" --notes-file $notesPath
if ($LASTEXITCODE -ne 0) { throw 'Création du brouillon impossible. Aucune release existante ne sera remplacée.' }
foreach ($object in Get-ChildItem -LiteralPath (Join-Path $releaseRoot 'objects') -File) {
    & gh release upload $tag $object.FullName --repo $Repository
    if ($LASTEXITCODE -ne 0) { throw 'Transfert incomplet : le brouillon reste non publié.' }
}
& gh release upload $tag $manifestPath --repo $Repository
if ($LASTEXITCODE -ne 0) { throw 'Manifeste non transféré : brouillon non publié.' }
if ($Installer) {
    & gh release upload $tag (Resolve-Path -LiteralPath $Installer).Path --repo $Repository
    if ($LASTEXITCODE -ne 0) { throw 'Installateur non transféré : brouillon non publié.' }
}
$launcherManifest = Join-Path $releaseRoot 'launcher-latest.json'
if (Test-Path -LiteralPath $launcherManifest) {
    & gh release upload $tag $launcherManifest --repo $Repository
    if ($LASTEXITCODE -ne 0) { throw 'Manifeste du launcher non transféré : brouillon non publié.' }
}
& gh release edit $tag --repo $Repository --draft=false --latest
if ($LASTEXITCODE -ne 0) { throw 'Le brouillon est complet mais sa publication a échoué.' }
Write-Host "Publication terminée. Flux public : https://github.com/$Repository/releases/latest/download/latest.json"
