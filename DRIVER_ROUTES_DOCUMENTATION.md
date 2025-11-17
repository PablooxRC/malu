# API de Choferes - Documentación

## Modelos de Datos

### Driver (Chofer)
Extiende el modelo de User con polimorfismo discriminador.

**Estructura:**
```json
{
  "_id": "67123abc456def789",
  "username": "juan_driver",
  "password": "hasheada",
  "phone": "5491234567890",
  "role": "driver",
  "userType": "driver",
  "active": true,
  "car": {
    "plate": "ABC123",
    "color": "Rojo",
    "model": "Civic",
    "year": 2022,
    "brand": "Honda"
  },
  "documents": {
    "idCardPath": "/uploads/drivers/idcard-1234567890.jpg",
    "idCardUploadedAt": "2025-11-16T10:30:00.000Z"
  },
  "documentsVerified": false,
  "rating": 5,
  "completedTrips": 0,
  "isAvailable": false,
  "createdAt": "2025-11-16T10:30:00.000Z",
  "updatedAt": "2025-11-16T10:30:00.000Z"
}
```

---

## Rutas de Choferes

### 1. Registrarse como Chofer
**POST** `/driver/become-driver`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body (form-data):**
- `plate` (string, requerido) - Placa del vehículo (ej: ABC123)
- `color` (string, requerido) - Color del auto (ej: Rojo)
- `model` (string, requerido) - Modelo del auto (ej: Civic)
- `year` (number, requerido) - Año del auto (ej: 2022)
- `brand` (string, requerido) - Marca del auto (ej: Honda)
- `idCard` (file, requerido) - Foto del carnet de identidad (JPG, PNG, PDF, máx 5MB)

**Response (201 - Exitoso):**
```json
{
  "success": true,
  "message": "Te has registrado como chofer exitosamente. Tus documentos están pendientes de verificación.",
  "driver": {
    "id": "67123abc456def789",
    "username": "juan_driver",
    "phone": "5491234567890",
    "role": "driver",
    "car": {
      "plate": "ABC123",
      "color": "Rojo",
      "model": "Civic",
      "year": 2022,
      "brand": "Honda"
    },
    "documentsVerified": false,
    "isAvailable": false,
    "rating": 5
  }
}
```

**Errores Posibles:**
- `400` - Faltan datos del auto o no se subió archivo
- `403` - Usuario no verificado
- `404` - Usuario no encontrado
- `409` - Placa ya registrada
- `500` - Error interno

**Nota:** Solo usuarios con rol "user" verificados pueden registrarse como choferes.

---

### 2. Obtener Información del Chofer
**GET** `/driver/driver/:id`

**Response (200 - Exitoso):**
```json
{
  "success": true,
  "driver": {
    "id": "67123abc456def789",
    "username": "juan_driver",
    "phone": "5491234567890",
    "role": "driver",
    "active": true,
    "car": {
      "plate": "ABC123",
      "color": "Rojo",
      "model": "Civic",
      "year": 2022,
      "brand": "Honda"
    },
    "documentsVerified": false,
    "isAvailable": false,
    "rating": 5,
    "completedTrips": 0,
    "createdAt": "2025-11-16T10:30:00.000Z"
  }
}
```

---

### 3. Descargar Documento de Identidad
**GET** `/driver/driver/document/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
- Descarga el archivo del carnet de identidad

**Errores Posibles:**
- `403` - No tienes permiso
- `404` - Chofer o archivo no encontrado
- `401` - No autenticado

**Nota:** Solo el chofer o un admin pueden descargar el documento.

---

### 4. Actualizar Disponibilidad
**PATCH** `/driver/driver/availability`

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "isAvailable": true
}
```

**Response (200 - Exitoso):**
```json
{
  "success": true,
  "message": "Disponibilidad actualizada a disponible.",
  "driver": {
    "id": "67123abc456def789",
    "isAvailable": true
  }
}
```

**Nota:** Solo choferes con documentos verificados pueden marcar disponibilidad.

---

### 5. Listar Choferes Disponibles
**GET** `/driver/drivers/available`

**Response (200 - Exitoso):**
```json
{
  "success": true,
  "count": 5,
  "drivers": [
    {
      "id": "67123abc456def789",
      "username": "juan_driver",
      "phone": "5491234567890",
      "car": {
        "plate": "ABC123",
        "color": "Rojo",
        "model": "Civic",
        "year": 2022,
        "brand": "Honda"
      },
      "rating": 4.8,
      "completedTrips": 45,
      "isAvailable": true
    }
  ]
}
```

**Nota:** Solo muestra choferes con documentos verificados, activos y disponibles.

---

## Estructura de Carpetas de Uploads

```
uploads/
└── drivers/
    ├── idcard-1234567890-123456789.jpg
    ├── idcard-1234567891-987654321.png
    └── idcard-1234567892-555555555.pdf
```

---

## Flujo de Registro como Chofer

1. **Usuario Login**: Inicia sesión y obtiene token
2. **Datos Auto**: Completa datos del vehículo (placa, color, modelo, año, marca)
3. **Documento**: Sube foto del carnet de identidad
4. **Registro Driver**: Sistema convierte user a driver
5. **Pendiente Verificación**: Documentos pendientes de validación por admin
6. **Activación**: Admin verifica y marca como `documentsVerified: true`
7. **Disponibilidad**: Chofer puede marcar como disponible

---

## Validaciones

### Datos del Auto
- **Placa**: Requerida, única, convertida a mayúsculas
- **Color**: Requerido
- **Modelo**: Requerido
- **Año**: Número válido entre 1900 y año actual + 1
- **Marca**: Requerida

### Documentos
- **Formato**: JPG, PNG o PDF
- **Tamaño máximo**: 5MB
- **Nombre generado**: `idcard-{timestamp}-{random}.{ext}`

---

## Notas Importantes

⚠️ **Conversión de Usuario a Chofer:**
- El usuario debe estar verificado (activo)
- Se elimina el registro como usuario simple
- Se crea nuevo registro como driver
- Se mantiene el ID del usuario original

🔒 **Seguridad:**
- Documentos solo descargables por admin o el mismo chofer
- Placa única en el sistema
- Validación de tipo de archivo en servidor

📁 **Almacenamiento:**
- Archivos en `/uploads/drivers/`
- Ruta guardada en MongoDB
- Accesible vía GET `/uploads/drivers/filename`

✅ **Estados del Chofer:**
- `documentsVerified`: Validado por admin
- `isAvailable`: Disponible para viajes
- `rating`: Calificación (0-5)
- `completedTrips`: Número de viajes completados
