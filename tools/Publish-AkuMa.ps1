param(
    [Parameter(Mandatory=$true)][string]$ReleaseDirectory,
    [Parameter(Mandatory=$true)][string]$Bucket,
    [Parameter(Mandatory=$true)][string]$Endpoint
)
$ErrorActionPreference = 'Stop'
$releaseRoot = (Resolve-Path -LiteralPath $ReleaseDirectory).Path
if (-not (Test-Path -LiteralPath (Join-Path $releaseRoot 'latest.json'))) { throw 'Publication non générée : latest.json absent.' }
if (-not $Endpoint.StartsWith('https://')) { throw 'Endpoint HTTPS requis.' }
if ($Bucket -notmatch '^[a-z0-9][a-z0-9.-]+$') { throw 'Nom de bucket invalide.' }
Get-Command aws -ErrorAction Stop | Out-Null
# Credentials are read by the official AWS CLI from its configured profile.
# Immutable content and version history are uploaded before changing the pointer.
& aws s3 sync (Join-Path $releaseRoot 'objects') "s3://$Bucket/objects" --endpoint-url $Endpoint --cache-control 'public,max-age=31536000,immutable'
if ($LASTEXITCODE -ne 0) { throw 'Échec du transfert des objets : version active inchangée.' }
& aws s3 sync (Join-Path $releaseRoot 'versions') "s3://$Bucket/versions" --endpoint-url $Endpoint --cache-control 'public,max-age=31536000,immutable'
if ($LASTEXITCODE -ne 0) { throw 'Échec du transfert des versions : version active inchangée.' }
& aws s3 cp (Join-Path $releaseRoot 'latest.json') "s3://$Bucket/latest.json" --endpoint-url $Endpoint --content-type 'application/json' --cache-control 'no-cache,no-store,must-revalidate'
if ($LASTEXITCODE -ne 0) { throw 'Échec de publication du manifeste actif.' }
Write-Host 'Publication terminée. Vérifiez le manifeste via son URL publique.'
