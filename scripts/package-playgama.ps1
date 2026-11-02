$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$buildRoot = Join-Path $projectRoot 'dist-playgama'
if (!(Test-Path -LiteralPath (Join-Path $buildRoot 'index.html') -PathType Leaf)) { throw 'Run npm run build:playgama first.' }
$artifactRoot = Join-Path $projectRoot 'output/playgama'
New-Item -ItemType Directory -Path $artifactRoot -Force | Out-Null
$archiveName = 'pazzle-game-playgama-' + [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss') + '-' + [Guid]::NewGuid().ToString('N').Substring(0, 6) + '.zip'
$archivePath = Join-Path $artifactRoot $archiveName
$files = @(Get-ChildItem -LiteralPath $buildRoot -Recurse -File -Force)
$totalBytes = ($files | Measure-Object -Property Length -Sum).Sum
if ($totalBytes -gt 300MB) { throw 'Uncompressed build exceeds 300 MB.' }
$archive = [IO.Compression.ZipFile]::Open($archivePath, [IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($file in $files) {
    $entryName = $file.FullName.Substring($buildRoot.Length + 1).Replace('\', '/')
    if ($entryName -match '[^\x20-\x7E]') { throw "Non-Latin archive path: $entryName" }
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $file.FullName, $entryName, [IO.Compression.CompressionLevel]::Optimal) | Out-Null
  }
} finally { $archive.Dispose() }
$check = [IO.Compression.ZipFile]::OpenRead($archivePath)
try {
  foreach ($required in @('index.html', 'playgama-bridge.js', 'playgama-bridge-config.json', 'PLAYGAMA-BRIDGE-LICENSE.txt')) {
    if (!$check.GetEntry($required)) { throw "Missing archive root entry: $required" }
  }
  if ($check.Entries.Count -ne $files.Count) { throw 'Archive file count mismatch.' }
} finally { $check.Dispose() }
Write-Output "ZIP: $archivePath"
Write-Output "Files: $($files.Count); uncompressed bytes: $totalBytes"
$sha = [System.Security.Cryptography.SHA256]::Create()
$stream = [System.IO.File]::OpenRead($archivePath)
try {
  $digest = [BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-', '')
  Write-Output "SHA256: $digest"
} finally { $stream.Dispose(); $sha.Dispose() }
