param([Parameter(Mandatory=$true)][string]$Record)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$entry = Get-Content -LiteralPath $Record -Raw -Encoding UTF8 | ConvertFrom-Json
$target = Join-Path (Get-Location) $entry.output
[System.IO.Directory]::CreateDirectory((Split-Path -Parent $target)) | Out-Null
$sourceImage = [System.Drawing.Image]::FromFile($entry.source)
$bitmap = [System.Drawing.Bitmap]::new(1024, 1024)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$parameters = [System.Drawing.Imaging.EncoderParameters]::new(1)
$parameters.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, [long]84)
try {
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.DrawImage($sourceImage, 0, 0, 1024, 1024)
  $bitmap.Save($target, $encoder, $parameters)
} finally { $parameters.Dispose(); $graphics.Dispose(); $bitmap.Dispose(); $sourceImage.Dispose() }
