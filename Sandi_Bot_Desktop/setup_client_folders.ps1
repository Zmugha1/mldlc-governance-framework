$base = "C:\Users\zumah\SandiBot\clients"

$folders = @(
    "$base\Active",
    "$base\WIN",
    "$base\Paused",
    "$base\Various"
)

foreach ($folder in $folders) {
    if (-not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder -Force
        Write-Host "Created: $folder"
    } else {
        Write-Host "Already exists: $folder"
    }
}

$readme = @"
SANDI BOT - CLIENT FILES FOLDER
================================

FOLDER STRUCTURE:
  Active\[ClientName]\    - clients currently in pipeline
  WIN\[ClientName]\       - clients who bought a franchise
  Paused\[ClientName]\    - clients who went quiet
  Various\[ClientName]\   - mixed, needs manual review

CLIENT FOLDER NAMING RULE:
  Use the client's full name with underscores
  e.g. Andrew_Tait, Jeff_Dayton

FILE NAMING RULES:
  DISC report:      ClientName_-_ttsi.pdf
  TUMAY intake:     ClientName_-_TUMAY.pdf
  You 2.0 profile:  ClientName_-_You2_0.pdf
  Vision statement: ClientName_-_Vision_Statement.pptx
  Fathom session:   ClientName_-_Fathom_Session_1.pdf

EXAMPLE:
  Active\
    Andrew_Tait\
      Andrew_Tait_-_ttsi.pdf
      Andrew_Tait_-_TUMAY.pdf
      Andrew_Tait_-_You2_0.pdf
      Andrew_Tait_-_Vision_Statement.pptx
"@

Set-Content -Path "$base\README.txt" -Value $readme
Write-Host "Created: $base\README.txt"
Write-Host ""
Write-Host "Setup complete. Add client subfolders as:"
Write-Host "  $base\Active\Andrew_Tait\"
Write-Host "  $base\Active\Jeff_Dayton\"
