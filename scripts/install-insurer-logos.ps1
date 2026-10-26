$ErrorActionPreference = 'Stop'
$repo = 'https://github.com/gotbaragi77-dot/bo.git'
$work = Join-Path $env:TEMP ('instory-logos-' + [guid]::NewGuid().ToString('N').Substring(0,10))
git clone --depth 1 $repo $work
if($LASTEXITCODE -ne 0){throw 'Git clone failed'}
$manifest = @(Get-Content (Join-Path $work 'assets\insurer-logo-sources.json') -Raw -Encoding UTF8 | ConvertFrom-Json)
if($manifest.Count -ne 44){throw "Expected 44 images, got $($manifest.Count)"}
$target = Join-Path $work 'assets\insurers-original'
New-Item -ItemType Directory -Path $target -Force | Out-Null
$map = [ordered]@{}
$failed = @()
$i = 0
foreach($entry in $manifest){
  $i++
  $uri = [uri]$entry.url
  $ext = [System.IO.Path]::GetExtension($uri.AbsolutePath).ToLowerInvariant()
  if($ext -notin @('.png','.jpg','.jpeg','.webp','.gif')){$ext='.jpg'}
  $filename = ('{0:D2}' -f $i) + $ext
  $dest = Join-Path $target $filename
  try {
    Invoke-WebRequest -Uri $entry.url -OutFile $dest -TimeoutSec 25 -Headers @{'Referer'='https://iga.pe.kr/index.php';'User-Agent'='Mozilla/5.0'}
    $bytes = [IO.File]::ReadAllBytes($dest)
    if($bytes.Length -lt 300){throw 'Empty or invalid image'}
    $isPng = $bytes[0] -eq 137 -and $bytes[1] -eq 80
    $isJpeg = $bytes[0] -eq 255 -and $bytes[1] -eq 216
    $isWebp = [Text.Encoding]::ASCII.GetString($bytes,0,4) -eq 'RIFF'
    $isGif = [Text.Encoding]::ASCII.GetString($bytes,0,3) -eq 'GIF'
    if(-not ($isPng -or $isJpeg -or $isWebp -or $isGif)){throw 'Not an image'}
    $map[$entry.name] = 'insurers-original/' + $filename
    Write-Host "$i/44 $($entry.name) OK"
  } catch {
    $failed += "$($entry.name): $($_.Exception.Message)"
    Remove-Item $dest -ErrorAction SilentlyContinue
    Write-Host "$i/44 $($entry.name) FAILED"
  }
}
if($failed.Count){$failed | ForEach-Object {Write-Host $_};throw "Not all logos downloaded ($($map.Count)/44); site unchanged."}
$indexFile = Join-Path $work 'index.html'
$html = [IO.File]::ReadAllText($indexFile,[Text.Encoding]::UTF8)
$marker = "const insurerTabs=['바로가기'"
if(-not $html.Contains($marker)){throw 'Unexpected site structure, no changes made'}
$mapJson = ConvertTo-Json -InputObject $map -Depth 3 -Compress
$html = $html.Replace($marker,('Object.assign(insurerLogoMap, ' + $mapJson + ');' + [Environment]::NewLine + $marker))
[IO.File]::WriteAllText($indexFile,$html,(New-Object System.Text.UTF8Encoding($false)))
Push-Location $work
try {
  git add index.html assets/insurers-original
  git commit -m 'Import all 44 original insurer logos'
  if($LASTEXITCODE -ne 0){throw 'Commit failed'}
  git push origin HEAD:main
  if($LASTEXITCODE -ne 0){throw 'Push failed; check GitHub authentication'}
  Write-Host 'SUCCESS: 44 original insurer logos committed. Vercel redeploy triggered.'
} finally { Pop-Location }
