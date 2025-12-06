# run.ps1 - Inject .env into current PowerShell session
# Place in root/ and run with: ./run.ps1

if (Test-Path .env) {
    $loadedCount = 0
    Get-Content .env | ForEach-Object {
        if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)') {
            $name = $matches[1]
            # Remove surrounding quotes (single or double)
            $value = $matches[2] -replace '^["'']|["'']$'
            [System.Environment]::SetEnvironmentVariable($name, $value, 'Process')
            $loadedCount++
        }
    }
    Write-Host "Successfully loaded $loadedCount environment variable(s) from .env" -ForegroundColor Green
} else {
    Write-Host "Warning: .env file not found in current directory!" -ForegroundColor Yellow
}