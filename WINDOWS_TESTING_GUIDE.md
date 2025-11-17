# GUÍA DE PRUEBAS PARA WINDOWS

## Scripts Disponibles

Tu proyecto ahora tiene **3 scripts de prueba** optimizados para Windows:

### 1. TEST_API.ps1 (Script Original)
Prueba básica automática de todas las rutas.

**Cómo ejecutar:**
```powershell
cd e:\malu
.\TEST_API.ps1
```

---

### 2. TEST_API_WINDOWS.ps1 (Script Automatizado Completo)
Prueba completa con formateo bonito, manejo de errores y colores.

**Características:**
- ✅ Mejor formateo visual
- ✅ Manejo completo de errores
- ✅ Colores para facilitar lectura
- ✅ Ejemplos de próximos pasos
- ✅ Información detallada de respuestas

**Cómo ejecutar:**
```powershell
cd e:\malu
.\TEST_API_WINDOWS.ps1
```

**Qué prueba:**
1. Registra un usuario nuevo (con datos aleatorios)
2. Intenta login (con datos de prueba)
3. Obtiene perfil del usuario
4. Lista choferes disponibles
5. Obtiene información de un chofer
6. Verifica estado del servidor

---

### 3. TEST_API_INTERACTIVO.ps1 (Script Interactivo - RECOMENDADO)
Menú interactivo para probar rutas manualmente, paso a paso.

**Cómo ejecutar:**
```powershell
cd e:\malu
.\TEST_API_INTERACTIVO.ps1
```

**Opciones disponibles:**
```
1. Registrar usuario
2. Login (obtiene token)
3. Obtener perfil (requiere token)
4. Listar choferes disponibles
5. Obtener info de chofer específico
6. Actualizar disponibilidad (requiere token)
7. Ver token actual
8. Estado del servidor
9. Salir
```

---

## RECOMENDADO: Cómo Probar Completo

### Paso 1: Iniciar Servidor
```powershell
cd e:\malu
npm start
```

Espera a que veas:
```
CLIENTE DE WHATSAPP CONECTADO
Servidor API escuchando en http://localhost:3000
```

### Paso 2: Abre Nueva Ventana PowerShell
```powershell
cd e:\malu
```

### Paso 3: Ejecuta Script Interactivo
```powershell
.\TEST_API_INTERACTIVO.ps1
```

### Paso 4: Prueba Manualmente

**Opción 1: Prueba rápida automática**
- Selecciona 4 (Listar choferes disponibles)
- Selecciona 8 (Estado del servidor)
- Selecciona 9 (Salir)

**Opción 2: Prueba completa**
1. Selecciona 1 → Registra usuario
2. Selecciona 2 → Login con el usuario registrado
3. Selecciona 3 → Obtiene perfil
4. Selecciona 4 → Listra choferes disponibles
5. Selecciona 6 → Actualiza disponibilidad
6. Selecciona 9 → Salir

---

## CURL (Alternativa sin PowerShell)

Si prefieres usar curl directamente:

### Registrar Usuario
```cmd
curl -X POST http://localhost:3000/user/register ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"juan\",\"password\":\"password123\",\"phone\":\"5491234567890\"}"
```

### Login
```cmd
curl -X POST http://localhost:3000/user/login ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"juan\",\"password\":\"password123\"}"
```

### Listar Choferes Disponibles
```cmd
curl -X GET http://localhost:3000/driver/drivers/available
```

---

## POSTMAN

Si prefieres usar Postman:

1. **Abre Postman**
2. **Importa o crea solicitudes:**

### Collection Setup

Base URL: `http://localhost:3000`

#### Request 1: Login
- Método: POST
- URL: `{{base_url}}/user/login`
- Body (JSON):
```json
{
  "username": "test_user",
  "password": "password123"
}
```

#### Request 2: Get Profile
- Método: GET
- URL: `{{base_url}}/user/profile`
- Headers:
  - Authorization: `Bearer {{token}}`

#### Request 3: Get Available Drivers
- Método: GET
- URL: `{{base_url}}/driver/drivers/available`

#### Request 4: Register as Driver
- Método: POST
- URL: `{{base_url}}/driver/become-driver`
- Headers:
  - Authorization: `Bearer {{token}}`
- Body (form-data):
  - plate: ABC123
  - color: Rojo
  - model: Civic
  - year: 2022
  - brand: Honda
  - idCard: [selecciona un archivo JPG/PNG]

---

## RESULTADOS ESPERADOS

### Script Automático (TEST_API_WINDOWS.ps1)

Deberías ver:
```
✅ Registro exitoso
✅ Login exitoso
✅ Perfil obtenido
✅ Choferes disponibles
✅ Información del chofer
✅ Estado del servidor
```

### Script Interactivo (TEST_API_INTERACTIVO.ps1)

Cuando selecciones "4 - Listar choferes":
```
✅ Se encontraron 2 choferes

👤 juan_driver
📱 Teléfono: 5491234567890
🚗 Auto: Honda Civic (2022)
📍 Placa: ABC123 | Color: Rojo
⭐ Calificación: 5 | Viajes: 0

👤 maria_driver
📱 Teléfono: 5491987654321
🚗 Auto: Toyota Corolla (2021)
📍 Placa: XYZ789 | Color: Blanco
⭐ Calificación: 4.8 | Viajes: 15
```

---

## SOLUCIÓN DE PROBLEMAS

### Error: "No se puede conectar con el servidor"

**Solución:**
```powershell
# Verifica que npm start está corriendo
# Abre otra ventana PowerShell y ejecuta:
npm start

# Luego en otra ventana:
.\TEST_API_WINDOWS.ps1
```

### Error: "Token inválido"

**Solución:**
- Asegúrate de haber hecho login primero
- El token expira después de 7 días
- En script interactivo, selecciona opción 2 (Login) primero

### Error: "Usuario no encontrado"

**Solución:**
- Registra un usuario nuevo (opción 1)
- Usa credenciales correctas al hacer login

### Error: "Usuario no verificado"

**Solución:**
- El usuario debe estar verificado por teléfono
- En pruebas, usa usuarios pre-verificados
- En producción, usuarios reciben código por WhatsApp

---

## RECOMENDACIÓN

**Para empezar rápido:**
```powershell
# Terminal 1: Servidor
cd e:\malu
npm start

# Terminal 2: Pruebas
cd e:\malu
.\TEST_API_WINDOWS.ps1
```

**Para probar interactivamente:**
```powershell
# Terminal 1: Servidor
cd e:\malu
npm start

# Terminal 2: Pruebas interactivas
cd e:\malu
.\TEST_API_INTERACTIVO.ps1

# Selecciona opciones del menú
```

---

## NOTAS IMPORTANTES

✅ **Para registrarse como chofer:**
- Necesitas un archivo de imagen (carnet de identidad)
- Solo usuarios verificados pueden hacerlo
- El archivo debe ser JPG, PNG o PDF
- Máximo 5MB

✅ **Para ver documentos del chofer:**
- Solo admin o el mismo chofer pueden descargar
- Requiere autenticación (token JWT)

✅ **Base de datos:**
- MongoDB debe estar conectado
- Verifica MONGO_URI en .env

---

## COMANDOS ÚTILES WINDOWS

```powershell
# Ver procesos activos
Get-Process node

# Matar proceso Node.js
Stop-Process -Name node

# Ver archivos en carpeta uploads
Get-ChildItem e:\malu\uploads\drivers

# Borrar archivos de test
Remove-Item e:\malu\uploads\drivers\* -Force
```

---

Fecha: 16 de noviembre de 2025
Sistema: Listo para Windows ✅
