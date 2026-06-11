$ErrorActionPreference = 'Stop'
$baseUrl = 'https://raw.githubusercontent.com/gmlaks91-lgtm/worship-sync/main'
$destRoot = 'C:\Users\USER\Desktop\찰리\worship-sync'
$listFile = 'C:\Users\USER\Desktop\찰리\worship-sync\worship-sync-files.txt'

$binaryExtensions = @('.png', '.ico', '.jpg', '.jpeg', '.gif', '.webp', '.woff', '.woff2', '.ttf', '.eot')

$lines = Get-Content $listFile
$paths = $lines | Select-Object -Skip 1 | Where-Object { $_.Trim() -ne '' }

if (-not (Test-Path $destRoot)) {
    New-Item -ItemType Directory -Path $destRoot -Force | Out-Null
}

$failures = [System.Collections.Concurrent.ConcurrentBag[string]]::new()
$successCount = 0
$lock = [object]::new()

$jobs = $paths | ForEach-Object -Parallel {
    $path = $_
    $baseUrl = $using:baseUrl
    $destRoot = $using:destRoot
    $binaryExtensions = $using:binaryExtensions
    $failures = $using:failures

    $destPath = Join-Path $destRoot $path
    $destDir = Split-Path $destPath -Parent
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }

    $url = "$baseUrl/$($path -replace '\\', '/')"
    $ext = [System.IO.Path]::GetExtension($path).ToLowerInvariant()
    $isBinary = $binaryExtensions -contains $ext

    try {
        if ($isBinary) {
            curl.exe -sfL -o $destPath $url
            if ($LASTEXITCODE -ne 0) { throw "curl exit $LASTEXITCODE" }
        } else {
            $content = curl.exe -sfL $url
            if ($LASTEXITCODE -ne 0) { throw "curl exit $LASTEXITCODE" }
            [System.IO.File]::WriteAllText($destPath, $content, [System.Text.UTF8Encoding]::new($false))
        }
        [System.Threading.Interlocked]::Increment([ref]$using:successCount) | Out-Null
    } catch {
        $failures.Add("$path : $($_.Exception.Message)")
    }
} -ThrottleLimit 20

Write-Host "Downloaded: $successCount / $($paths.Count)"
if ($failures.Count -gt 0) {
    Write-Host "Failures ($($failures.Count)):"
    $failures | ForEach-Object { Write-Host "  $_" }
    exit 1
}
