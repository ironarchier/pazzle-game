$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$entries = @(Get-ChildItem -LiteralPath 'assets/expansion-sources' -Filter '*.json' | Sort-Object Name | ForEach-Object { Get-Content -LiteralPath $_.FullName -Raw -Encoding UTF8 | ConvertFrom-Json } | Where-Object { Test-Path -LiteralPath $_.output })
$columns = 6
$cell = 200
$pageSize = 24
[System.IO.Directory]::CreateDirectory((Join-Path (Get-Location) 'output/expansion-qa')) | Out-Null
for ($start = 0; $start -lt $entries.Count; $start += $pageSize) {
  $page = @($entries | Select-Object -Skip $start -First $pageSize)
  $rows = [int][Math]::Ceiling($page.Count / $columns)
  $sheet = [System.Drawing.Bitmap]::new($columns * $cell, $rows * ($cell + 28))
  $graphics = [System.Drawing.Graphics]::FromImage($sheet)
  $font = [System.Drawing.Font]::new('Arial', 11)
  try {
    $graphics.Clear([System.Drawing.Color]::FromArgb(25, 30, 40))
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    for ($index = 0; $index -lt $page.Count; $index++) {
      $entry = $page[$index]
      $image = [System.Drawing.Image]::FromFile((Join-Path (Get-Location) $entry.output))
      $x = ($index % $columns) * $cell
      $y = [int][Math]::Floor($index / $columns) * ($cell + 28)
      try { $graphics.DrawImage($image, $x + 5, $y + 5, $cell - 10, $cell - 10) } finally { $image.Dispose() }
      $graphics.DrawString($entry.id, $font, [System.Drawing.Brushes]::White, $x + 6, $y + $cell)
    }
    $path = Join-Path (Get-Location) ('output/expansion-qa/contact-' + (1 + [int]($start / $pageSize)) + '.jpg')
    $sheet.Save($path, [System.Drawing.Imaging.ImageFormat]::Jpeg)
    Write-Output $path
  } finally { $font.Dispose(); $graphics.Dispose(); $sheet.Dispose() }
}
