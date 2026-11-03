# verify.ps1 -Target vulnerable|bad-patch|patched
# Native-Windows twin of verify.sh. Builds the target in Docker and runs the
# PoC with no network. Exit 0 = TRIGGERED, 1 = SAFE, 2 = error.
param([ValidateSet('vulnerable','bad-patch','patched')][string]$Target='vulnerable')
$ErrorActionPreference = 'Stop'
$df = "docker/Dockerfile.$Target"
if (-not (Test-Path $df)) { Write-Error "no such target '$Target'"; exit 2 }
Write-Host ">>> building $Target ..." -ForegroundColor Cyan
docker build -q -f $df -t "embargo-$Target" . | Out-Null
Write-Host ">>> running PoC (no network) ..." -ForegroundColor Cyan
$out = docker run --rm --network none "embargo-$Target"
$code = $LASTEXITCODE
Write-Host $out
exit $code
