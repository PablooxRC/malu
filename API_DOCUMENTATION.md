# API de Malu - Documentación de Rutas

## Rutas de Autenticación

### 1. Registro de Usuario
**POST** `/users/register`

**Body:**
```json
{
  "username": "juan_doe",
  "password": "micontraseña123",
  "phone": "5491234567890"
}
```

**Response (201 - Exitoso):**
```json
{
  "success": true,
  "message": "Usuario registrado. Se ha enviado un codigo de verificación al telefono registrado"
}
```

---

### 2. Verificar Teléfono
**POST** `/users/verifyphone`

**Body:**
```json
{
  "phone": "5491234567890",
  "code": "123456"
}
```

**Response (200 - Exitoso):**
```json
{
  "success": true,
  "message": "¡Usuario verificado exitosamente!"
}
```

---

### 3. Login (Inicio de Sesión)
**POST** `/users/login`

**Body:**
```json
{
  "username": "juan_doe",
  "password": "micontraseña123"
}
```

**Response (200 - Exitoso):**
```json
{
  "success": true,
  "message": "¡Inicio de sesión exitoso!",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "67123abc456def789",
    "username": "juan_doe",
    "phone": "5491234567890",
    "role": "user"
  }
}
```

**Errores Posibles:**
- `401` - Credenciales incorrectas
- `403` - Usuario no verificado (no activo)
- `400` - Faltan credenciales

---

### 4. Obtener Perfil (Requiere Autenticación)
**GET** `/users/profile`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 - Exitoso):**
```json
{
  "success": true,
  "user": {
    "id": "67123abc456def789",
    "username": "juan_doe",
    "phone": "5491234567890",
    "role": "user",
    "active": true,
    "createdAt": "2025-11-16T10:30:00.000Z"
  }
}
```

**Errores Posibles:**
- `401` - Token no proporcionado o inválido
- `401` - Token expirado

---

### 5. Logout (Cerrar Sesión)
**POST** `/users/logout`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 - Exitoso):**
```json
{
  "success": true,
  "message": "Sesión cerrada exitosamente."
}
```

---

## Configuración Requerida

### Variables de Entorno (.env)
```
JWT_SECRET=tu-clave-secreta-muy-segura
JWT_EXPIRES_IN=7d
MONGO_URI=tu-conexion-mongodb
```

---

## Integración con Flutter

Ver archivo `FLUTTER_AUTH_INTEGRATION.dart` para:
- Servicio de autenticación completo
- Almacenamiento seguro con `flutter_secure_storage`
- Ejemplos de uso

### Instalación de dependencias Flutter:
```bash
flutter pub add flutter_secure_storage http
```

---

## Flujo de Autenticación

1. **Registro**: Usuario se registra con username, password y teléfono
2. **Verificación**: Usuario recibe código por WhatsApp y lo verifica
3. **Login**: Usuario inicia sesión con username y password
4. **Token JWT**: Servidor devuelve token válido por 7 días
5. **Almacenamiento**: Flutter guarda token en secure storage
6. **Requests Autenticados**: Flutter envía token en header Authorization
7. **Logout**: Usuario cierra sesión y token se elimina

---

## Middleware de Autenticación

Todas las rutas que usen `authMiddleware` requerirán:

```javascript
router.get('/ruta-protegida', authMiddleware, (req, res) => {
  // req.user contiene los datos decodificados del token
  console.log(req.user.id, req.user.username);
});
```

---

## Seguridad

- ✅ Contraseñas hasheadas con bcrypt
- ✅ Códigos de verificación hasheados
- ✅ Tokens JWT con expiración
- ✅ Flutter: Tokens en secure storage (encriptados por el SO)
- ⚠️ IMPORTANTE: Cambiar `JWT_SECRET` en producción

---

## Códigos de Estado HTTP

| Código | Significado |
|--------|------------|
| 200 | Exitoso |
| 201 | Recurso creado |
| 400 | Solicitud inválida |
| 401 | No autenticado |
| 403 | No autorizado |
| 404 | No encontrado |
| 500 | Error del servidor |
| 503 | Servicio no disponible |
