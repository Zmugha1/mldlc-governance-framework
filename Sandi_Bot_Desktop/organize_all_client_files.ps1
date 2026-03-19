$base = "C:\Users\zumah\SandiBot\clients"

$clientNames = @{
    "Active" = @(
        "Alex Raiyn",
        "Andrew Tait",
        "Bigith Pattar Veetil",
        "Dena Sauer",
        "Garrett Auwae",
        "Jeff Dayton",
        "Matthew Pierce",
        "Miles Martin",
        "Stan Stabner",
        "Vito Sciscioli"
    )
    "WIN" = @(
        "David Van Abbema",
        "Kevin Lynch",
        "Mike Cain"
    )
    "Paused" = @(
        "Elizabeth Jikiemi",
        "Mark Neff",
        "Mike Brooks",
        "Nathan Stiers"
    )
    "Various" = @()
}

function Get-ClientNameFromFile {
    param($fileName, $knownClients)
    $baseName = [System.IO.Path]::GetFileNameWithoutExtension($fileName)
    foreach ($client in $knownClients) {
        $nc = $client.ToLower() -replace '[\s\-_®.]+', ''
        $nf = $baseName.ToLower() -replace '[\s\-_®.]+', ''
        if ($nf.StartsWith($nc)) { return $client }
    }
    if ($baseName -match "^(.+?)\s+-\s+") {
        return $matches[1].Trim()
    }
    if ($baseName -match "^(.+?)\s*-") {
        return $matches[1].Trim()
    }
    return $null
}

$totalMoved = 0
$totalSkipped = 0
$errors = @()

foreach ($bucket in @("Active","WIN","Paused","Various")) {
    $bucketPath = Join-Path $base $bucket
    if (-not (Test-Path $bucketPath)) { continue }
    $files = Get-ChildItem -Path $bucketPath -File
    if ($files.Count -eq 0) {
        Write-Host "$bucket - no flat files"
        continue
    }
    Write-Host ""
    $fc = $files.Count
    Write-Host "Processing $bucket - $fc flat files"
    $known = $clientNames[$bucket]
    foreach ($file in $files) {
        $clientName = Get-ClientNameFromFile `
            -fileName $file.Name `
            -knownClients $known
        if (-not $clientName) {
            Write-Host "  SKIPPED: $($file.Name)"
            $totalSkipped++
            continue
        }
        $folderName = $clientName -replace ' ','_'
        $targetFolder = Join-Path $bucketPath $folderName
        if (-not (Test-Path $targetFolder)) {
            New-Item -ItemType Directory `
                -Path $targetFolder | Out-Null
            Write-Host "  Created: $folderName"
        }
        $targetPath = Join-Path $targetFolder $file.Name
        try {
            Move-Item -Path $file.FullName `
                -Destination $targetPath -Force
            Write-Host "  Moved: $($file.Name) -> $folderName\"
            $totalMoved++
        } catch {
            Write-Host "  ERROR: $($file.Name): $_"
            $errors += $file.Name
        }
    }
}

Write-Host ""
Write-Host "================================"
Write-Host "Files moved:   $totalMoved"
Write-Host "Files skipped: $totalSkipped"
if ($errors.Count -gt 0) {
    Write-Host "Errors:"
    $errors | ForEach-Object { Write-Host "  - $_" }
}
Write-Host 'Ready for bulk import.'
