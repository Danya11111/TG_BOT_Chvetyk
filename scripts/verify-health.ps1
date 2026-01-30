# Проверка health endpoint после деплоя.
# Использование:
#   $env:BASE_URL = "https://your-backend-domain.com"
#   .\scripts\verify-health.ps1
# Или задать BASE_URL в строке ниже по умолчанию.

$BaseUrl = if ($env:BASE_URL) { $env:BASE_URL.TrimEnd('/') } else { "https://your-backend-domain.com" }
$HealthUrl = "$BaseUrl/health"

Write-Host "Checking $HealthUrl ..."
try {
    $response = Invoke-RestMethod -Uri $HealthUrl -Method Get -TimeoutSec 15
    $ok = $response.database -eq $true -and $response.redis -eq $true
    if ($ok) {
        Write-Host "OK: database and redis are healthy." -ForegroundColor Green
        exit 0
    }
    Write-Host "Health check failed: $($response | ConvertTo-Json -Compress)" -ForegroundColor Red
    exit 1
} catch {
    Write-Host "Request failed: $_" -ForegroundColor Red
    exit 1
}
