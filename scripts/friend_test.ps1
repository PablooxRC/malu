# PowerShell helper script to test Friends endpoints
# Usage: Set $token variable first (obtained from login response)

$base = "http://localhost:3000"
$token = Read-Host "Pega tu token (Bearer)"
$headers = @{ Authorization = "Bearer $token" }

Write-Host "1) Listar mis solicitudes recibidas"
Invoke-RestMethod -Uri "$base/user/me/friend-requests" -Method GET -Headers $headers | ConvertTo-Json -Depth 5 | Write-Host

# Enviar solicitud a un usuario por username
$targetUser = Read-Host "Username objetivo para enviar solicitud (dejar vacío para omitir)"
if ($targetUser -ne "") {
    Write-Host "Enviando solicitud a $targetUser"
    Invoke-RestMethod -Uri "$base/user/friend-request-by-username" -Method POST -Headers @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" } -Body (ConvertTo-Json @{ username = $targetUser }) | ConvertTo-Json -Depth 5 | Write-Host
}

# Aceptar solicitud de un usuario (si procede)
$fromId = Read-Host "ID del remitente para aceptar (dejar vacío para omitir)"
if ($fromId -ne "") {
    Invoke-RestMethod -Uri "$base/user/friend-request/$fromId/accept" -Method POST -Headers $headers | ConvertTo-Json -Depth 5 | Write-Host
}

# Rechazar solicitud de un usuario (si procede)
$fromIdDecline = Read-Host "ID del remitente para rechazar (dejar vacío para omitir)"
if ($fromIdDecline -ne "") {
    Invoke-RestMethod -Uri "$base/user/friend-request/$fromIdDecline/decline" -Method POST -Headers $headers | ConvertTo-Json -Depth 5 | Write-Host
}

# Listar amigos
Write-Host "Listando amigos"
Invoke-RestMethod -Uri "$base/user/me/friends" -Method GET -Headers $headers | ConvertTo-Json -Depth 5 | Write-Host

# Eliminar amigo
$del = Read-Host "ID de amigo para eliminar (dejar vacío para omitir)"
if ($del -ne "") {
    Invoke-RestMethod -Uri "$base/user/friends/$del" -Method DELETE -Headers $headers | ConvertTo-Json -Depth 5 | Write-Host
}
