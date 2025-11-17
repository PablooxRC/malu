# GUÍA DE INICIO RÁPIDO - Sistema de Polimorfismo Usuario/Chofer

## 1️⃣ CONFIGURACIÓN INICIAL

### Instalar dependencias
```bash
cd e:\malu
npm install
```

### Crear archivo .env
```bash
cp .env.example .env
```

Editar `.env` con valores reales:
```
JWT_SECRET=tu-clave-muy-secreta-cambiar-en-produccion
JWT_EXPIRES_IN=7d
MONGO_URI=mongodb+srv://usuario:contraseña@cluster.mongodb.net/malu
PORT=3000
NODE_ENV=development
```

---

## 2️⃣ INICIAR SERVIDOR

```bash
npm start
```

Deberías ver:
```
CLIENTE DE WHATSAPP CONECTADO
Servidor API escuchando en http://localhost:3000
```

---

## 3️⃣ PROBAR API (PowerShell)

```powershell
# Ir a carpeta del proyecto
cd e:\malu

# Ejecutar script de pruebas
.\TEST_API.ps1
```

O ejecutar manualmente:

### a) Registrar Usuario
```powershell
$body = @{
    username = "juan_test"
    password = "password123"
    phone = "5491234567890"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/user/register" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"
```

### b) Verificar Teléfono
El usuario recibirá código por WhatsApp
```powershell
$body = @{
    phone = "5491234567890"
    code = "CÓDIGO_RECIBIDO"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/user/verifyphone" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"
```

### c) Login
```powershell
$body = @{
    username = "juan_test"
    password = "password123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/user/login" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"

$token = $loginResponse.token
Write-Host "Token: $token"
```

### d) Obtener Perfil
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/user/profile" `
    -Method GET `
    -Headers @{"Authorization" = "Bearer $token"}
```

### e) Registrarse como Chofer

Primero, crear tabla de parámetros de formulario:
```powershell
# Usar PowerShell 7+ o ajustar según versión
$form = @{
    plate = "ABC123"
    color = "Rojo"
    model = "Civic"
    year = "2022"
    brand = "Honda"
    idCard = Get-Item "C:\ruta\a\carnet.jpg"  # ← Cambiar ruta
}

Invoke-RestMethod -Uri "http://localhost:3000/driver/become-driver" `
    -Method POST `
    -Form $form `
    -Headers @{"Authorization" = "Bearer $token"}
```

### f) Listar Choferes Disponibles
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/driver/drivers/available" `
    -Method GET
```

### g) Actualizar Disponibilidad
```powershell
$body = @{
    isAvailable = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/driver/driver/availability" `
    -Method PATCH `
    -Body $body `
    -Headers @{"Authorization" = "Bearer $token"} `
    -ContentType "application/json"
```

---

## 4️⃣ ESTRUCTURA DE ARCHIVOS NUEVOS

```
malu/
├── middleware/
│   ├── auth.middleware.js         ← Validación JWT
│   └── upload.middleware.js       ← Multer para archivos
│
├── models/
│   ├── user/user.model.js         ← Modificado (discriminador)
│   └── driver/
│       └── driver.model.js        ← Nuevo (polimórfico)
│
├── routes/
│   ├── users.routes.js            ← Modificado (JWT, comparePassword)
│   └── driver.routes.js           ← Nuevo (rutas de chofer)
│
├── uploads/
│   └── drivers/                   ← Archivos de choferes
│
├── API_DOCUMENTATION.md           ← Rutas de usuario
├── DRIVER_ROUTES_DOCUMENTATION.md ← Rutas de chofer
├── POLYMORPHISM_GUIDE.md          ← Cómo funciona el polimorfismo
├── IMPLEMENTATION_SUMMARY.md      ← Resumen técnico
├── FLUTTER_AUTH_INTEGRATION.dart  ← Cliente Flutter (login)
└── FLUTTER_DRIVER_REGISTRATION.dart ← Cliente Flutter (chofer)
```

---

## 5️⃣ FLUJO TÍPICO DE USUARIO

```
1. Registrarse como usuario
   POST /user/register
   └─ Recibe código por WhatsApp

2. Verificar teléfono
   POST /user/verifyphone
   └─ Usuario se activa

3. Login
   POST /user/login
   └─ Recibe JWT token

4. Convertirse en chofer (NUEVO)
   POST /driver/become-driver
   └─ Sube datos auto + carnet

5. Admin verifica documentos
   (En DB, marca: documentsVerified = true)

6. Chofer se marca disponible
   PATCH /driver/driver/availability
   └─ isAvailable = true

7. Aparece en lista de choferes
   GET /driver/drivers/available
```

---

## 6️⃣ VARIABLES DE ENTORNO

```
JWT_SECRET              # Clave para firmar JWT
JWT_EXPIRES_IN          # Duración del token (ej: 7d)
MONGO_URI               # Conexión a MongoDB
PORT                    # Puerto del servidor
NODE_ENV                # development o production
WHATSAPP_NUMBER         # Número de WhatsApp
```

---

## 7️⃣ TIPOS DE USUARIO EN SISTEMA

```
USER (usuario normal)
├─ username
├─ password
├─ phone
├─ role: "user"
└─ userType: "user"

DRIVER (chofer)
├─ username (heredado)
├─ password (heredado)
├─ phone (heredado)
├─ role: "driver"
├─ userType: "driver"      ← Discriminador
├─ car: {...}              ← Datos del auto
├─ documents: {...}        ← Carnet
├─ rating: 5
├─ completedTrips: 0
└─ isAvailable: false
```

---

## 8️⃣ PUNTOS IMPORTANTES

⚠️ **Antes de Iniciar**
- Crear carpeta `uploads/drivers/` (se crea automáticamente)
- Configurar JWT_SECRET en .env (cambiar en producción)
- MongoDB debe estar conectado

⚠️ **Al Registrar Chofer**
- Usuario DEBE estar activo (verificado)
- Placa debe ser única
- Archivo de carnet es obligatorio
- Máximo 5MB

⚠️ **Seguridad**
- No exponer JWT_SECRET
- Usar HTTPS en producción
- Validar archivos en servidor
- Cambiar permisos de carpeta uploads

---

## 9️⃣ DEBUGGING

Si algo falla:

```javascript
// En Node.js, verificar logs
console.log('Error:', error);

// Ver token decodificado
jwt.decode(token, { complete: true })

// Ver archivos guardados
dir e:\malu\uploads\drivers

// Verificar BD
db.users.find({ userType: "driver" })
```

---

## 🔟 PRÓXIMOS PASOS

1. ✅ Configurar .env
2. ✅ Instalar dependencias
3. ✅ Iniciar servidor
4. ✅ Probar rutas con TEST_API.ps1
5. ⏭️ Integrar Flutter en tu app
6. ⏭️ Configurar admin para verificar documentos
7. ⏭️ Implementar historial de viajes
8. ⏭️ Agregar sistema de calificaciones

---

## 📞 RUTAS DISPONIBLES

**Usuarios:**
- POST `/user/register` - Registrar
- POST `/user/verifyphone` - Verificar
- POST `/user/login` - Login
- GET `/user/profile` - Perfil
- POST `/user/logout` - Logout

**Choferes:**
- POST `/driver/become-driver` - Convertir a chofer
- GET `/driver/driver/:id` - Información
- GET `/driver/driver/document/:id` - Descargar carnet
- PATCH `/driver/driver/availability` - Disponibilidad
- GET `/driver/drivers/available` - Listar disponibles

---

## ✨ TODO LISTO

¡Sistema completamente implementado y documentado! 

Documentación disponible en:
- `API_DOCUMENTATION.md` - Rutas de usuario
- `DRIVER_ROUTES_DOCUMENTATION.md` - Rutas de chofer
- `POLYMORPHISM_GUIDE.md` - Guía técnica
- `FLUTTER_AUTH_INTEGRATION.dart` - Cliente Flutter
- `FLUTTER_DRIVER_REGISTRATION.dart` - Registro Flutter

Fecha: 16 de noviembre de 2025
