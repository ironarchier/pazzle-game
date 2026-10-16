$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$entries = Get-Content -LiteralPath 'assets/anime-sources.json' -Raw -Encoding UTF8 | ConvertFrom-Json
$columns = 5
$cell = 230
$rows = [int][Math]::Ceiling($entries.Count / $columns)
$sheet = [System.Drawing.Bitmap]::new($columns * $cell, $rows * ($cell + 30))
$graphics = [System.Drawing.Graphics]::FromImage($sheet)
$font = [System.Drawing.Font]::new('Arial', 12)
try {
  $graphics.Clear([System.Drawing.Color]::FromArgb(25, 30, 40))
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  for ($index = 0; $index -lt $entries.Count; $index++) {
    $entry = $entries[$index]
    $image = [System.Drawing.Image]::FromFile((Join-Path (Get-Location) $entry.output))
    $x = ($index % $columns) * $cell
    $y = [int][Math]::Floor($index / $columns) * ($cell + 30)
    try { $graphics.DrawImage($image, $x + 5, $y + 5, $cell - 10, $cell - 10) } finally { $image.Dispose() }
    $graphics.DrawString($entry.id, $font, [System.Drawing.Brushes]::White, $x + 8, $y + $cell)
  }
  [System.IO.Directory]::CreateDirectory((Join-Path (Get-Location) 'output')) | Out-Null
  $sheet.Save((Join-Path (Get-Location) 'output/anime-contact-sheet.jpg'), [System.Drawing.Imaging.ImageFormat]::Jpeg)
} finally { $font.Dispose(); $graphics.Dispose(); $sheet.Dispose() }
