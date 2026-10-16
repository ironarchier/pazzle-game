param([string]$Manifest = 'assets/anime-sources.json')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$entries = Get-Content -LiteralPath $Manifest -Raw -Encoding UTF8 | ConvertFrom-Json
$encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$parameters = [System.Drawing.Imaging.EncoderParameters]::new(1)
$parameters.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, [long]90)
try {
  foreach ($entry in $entries) {
    if (Test-Path -LiteralPath $entry.output) { continue }
    $parent = Split-Path -Parent $entry.output
    [System.IO.Directory]::CreateDirectory((Join-Path (Get-Location) $parent)) | Out-Null
    $sourceImage = [System.Drawing.Image]::FromFile($entry.source)
    $bitmap = [System.Drawing.Bitmap]::new(1024, 1024)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.DrawImage($sourceImage, 0, 0, 1024, 1024)
      $bitmap.Save((Join-Path (Get-Location) $entry.output), $encoder, $parameters)
    } finally { $graphics.Dispose(); $bitmap.Dispose(); $sourceImage.Dispose() }
    Write-Output $entry.output
  }
} finally { $parameters.Dispose() }
