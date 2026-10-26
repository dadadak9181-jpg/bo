$ErrorActionPreference = 'Stop'
$repo = 'https://github.com/gotbaragi77-dot/bo.git'
$work = Join-Path $env:TEMP ('instory-logos-' + [guid]::NewGuid().ToString('N').Substring(0,10))
git clone --depth 1 $repo $work
if($LASTEXITCODE -ne 0){ throw 'Git clone failed' }
Push-Location $work
try {
  node scripts/download-insurer-originals.cjs
  if($LASTEXITCODE -ne 0){ throw 'At least one original logo failed to download; original site unchanged' }
  node scripts/activate-insurer-originals.cjs
  if($LASTEXITCODE -ne 0){ throw 'Logo activation validation failed; original site unchanged' }
  git add index.html assets/insurers-original
  git commit -m 'Import and activate 44 original insurer logos'
  if($LASTEXITCODE -ne 0){ throw 'Commit failed' }
  git push origin HEAD:main
  if($LASTEXITCODE -ne 0){ throw 'Push failed' }
  Write-Host 'SUCCESS: 44 original logos published. Vercel deployment triggered.'
} finally { Pop-Location }
