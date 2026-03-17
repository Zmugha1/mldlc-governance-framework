# Organize flat client files into subfolders
# Handles filenames with spaces like:
# "Andrew Tait - ttsi.pdf" 
# → Active\Andrew_Tait\Andrew_Tait_-_ttsi.pdf

$sourcePath = "C:\Users\zumah\SandiBot\clients\Active"
$files = Get-ChildItem -Path $sourcePath -File

foreach ($file in $files) {
    $name = $file.BaseName

    # Extract client name (everything before " - ")
    if ($name -match "^(.+?)\s+-\s+(.+)$") {
        $clientName = $matches[1].Trim()
        $docType = $matches[2].Trim()

        # Create client subfolder
        $clientFolder = $clientName -replace ' ', '_'
        $targetFolder = Join-Path $sourcePath $clientFolder

        if (-not (Test-Path $targetFolder)) {
            New-Item -ItemType Directory -Path $targetFolder
            Write-Host "Created folder: $clientFolder"
        }

        # Move file to client subfolder
        $targetPath = Join-Path $targetFolder $file.Name
        Move-Item -Path $file.FullName -Destination $targetPath
        Write-Host "Moved: $($file.Name) → $clientFolder\"
    } else {
        Write-Host "Skipped (no dash pattern): $($file.Name)"
    }
}

Write-Host ""
Write-Host "Done. Files organized into client subfolders."
