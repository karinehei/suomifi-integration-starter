# Simple JWT generator for Windows PowerShell
# Usage: .\scripts\generate-jwt.ps1 [subject]

param(
    [string]$Subject = "demo-user"
)

$Header = '{"alg":"HS256","typ":"JWT"}'
$Claims = @{
    sub = $Subject
    iss = "suomifi-stub"
    aud = "demo-client-id"
    exp = 9999999999
    iat = [int](Get-Date -UFormat %s)
} | ConvertTo-Json -Compress

$EncodedHeader = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($Header)) -replace '\+', '-' -replace '/', '_' -replace '='
$EncodedClaims = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($Claims)) -replace '\+', '-' -replace '/', '_' -replace '='

# For demo, we don't sign it (production would use HMAC or RSA)
$Token = "$EncodedHeader.$EncodedClaims.signature-placeholder"

Write-Host "Generated JWT token:"
Write-Host $Token
Write-Host ""
Write-Host "Use it with curl:"
Write-Host "curl -H 'Authorization: Bearer $Token' http://localhost:8080/api/v1/profile"
