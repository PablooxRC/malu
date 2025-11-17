# Sistema de Polimorfismo de Usuarios - Malu

## Descripción General

El sistema implementa **polimorfismo de datos** usando Mongoose discriminators, permitiendo que un usuario se transforme en chofer manteniendo su identidad pero agregando datos específicos del rol.

## Arquitectura

### Modelo Base: User
```
User
├── username (string, unique)
├── password (string, hashed)
├── phone (string, unique)
├── role (enum: 'user', 'driver', 'admin')
├── active (boolean)
├── userType (discriminator key)
└── timestamps
```

### Modelo Derivado: Driver (Polimorfismo)
```
Driver extends User
├── car (object)
│   ├── plate (string, unique)
│   ├── color (string)
│   ├── model (string)
│   ├── year (number)
│   └── brand (string)
├── documents (object)
│   ├── idCardPath (string) - Ruta del archivo
│   └── idCardUploadedAt (date)
├── documentsVerified (boolean)
├── rating (number, 0-5)
├── completedTrips (number)
└── isAvailable (boolean)
```

## Flujo de Transformación Usuario → Chofer

### 1. Usuario Registrado
```json
{
  "_id": "user123",
  "username": "juan",
  "phone": "5491234567890",
  "role": "user",
  "userType": "user",
  "active": true
}
```

### 2. Se Registra como Chofer
- Usuario sube:
  - Datos del auto (placa, color, modelo, año, marca)
  - Foto del carnet de identidad

### 3. Sistema Procesa
- Valida todos los datos
- Guarda archivo en `/uploads/drivers/`
- Elimina documento de User
- Crea documento de Driver con mismo _id

### 4. Chofer Registrado
```json
{
  "_id": "user123",          // Mismo ID
  "username": "juan",
  "phone": "5491234567890",
  "role": "driver",
  "userType": "driver",      // Discriminador
  "active": true,
  "car": {
    "plate": "ABC123",
    "color": "Rojo",
    "model": "Civic",
    "year": 2022,
    "brand": "Honda"
  },
  "documents": {
    "idCardPath": "/uploads/drivers/idcard-1234567890-abc.jpg",
    "idCardUploadedAt": "2025-11-16T10:30:00.000Z"
  },
  "documentsVerified": false,
  "rating": 5,
  "completedTrips": 0,
  "isAvailable": false
}
```

## Estructura de Carpetas

```
malu/
├── app.js                                   # Aplicación principal
├── package.json
├── middleware/
│   ├── auth.middleware.js                   # Validación JWT
│   └── upload.middleware.js                 # Multer para archivos
├── models/
│   ├── user/
│   │   └── user.model.js                   # Modelo base User
│   └── driver/
│       └── driver.model.js                 # Modelo Driver (discriminador)
├── routes/
│   ├── users.routes.js                     # Rutas de usuario (login, perfil)
│   └── driver.routes.js                    # Rutas de chofer (registro, info)
├── uploads/
│   └── drivers/
│       ├── idcard-1234567890-abc.jpg
│       ├── idcard-1234567891-def.png
│       └── idcard-1234567892-ghi.pdf
├── API_DOCUMENTATION.md                    # Docs de rutas user
├── DRIVER_ROUTES_DOCUMENTATION.md          # Docs de rutas driver
├── FLUTTER_AUTH_INTEGRATION.dart           # Cliente Flutter - Login
└── FLUTTER_DRIVER_REGISTRATION.dart        # Cliente Flutter - Registro driver
```

## Cómo Funciona el Polimorfismo en Mongoose

### Definición del Modelo Base
```javascript
// models/user/user.model.js
const userSchema = new Schema({
  username: String,
  password: String,
  userType: {
    type: String,
    enum: ['user', 'driver'],
    default: 'user'
  }
}, { discriminatorKey: 'userType' });

const User = mongoose.model('User', userSchema);
```

### Creación del Discriminador
```javascript
// models/driver/driver.model.js
const driverSchema = new Schema({
  car: carSchema,
  documents: documentsSchema,
  rating: Number,
  // ... más campos específicos
});

const Driver = User.discriminator('driver', driverSchema);
```

### Beneficios del Polimorfismo

✅ **Un solo documento en MongoDB**
- Mismo _id y datos base de User
- Información adicional del Driver

✅ **Herencia automática**
- Driver hereda todos los campos de User
- Puede extender con nuevos campos

✅ **Queries específicas**
```javascript
// Obtener solo Users
User.find({ userType: 'user' })

// Obtener solo Drivers
Driver.find()
// o
User.find({ userType: 'driver' })

// Obtener todos (Users y Drivers)
User.find()
```

✅ **Reutilización de código**
- Métodos compartidos (comparePassword, compareCode)
- Validaciones comunes (username, phone)

✅ **Mantenimiento simplificado**
- Un solo esquema base
- Extensiones claras y específicas

## Rutas Principales

### Usuarios (Users)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/user/register` | Registrar nuevo usuario |
| POST | `/user/verifyphone` | Verificar teléfono |
| POST | `/user/login` | Iniciar sesión |
| GET | `/user/profile` | Obtener perfil |
| POST | `/user/logout` | Cerrar sesión |

### Choferes (Drivers)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/driver/become-driver` | Registrarse como chofer |
| GET | `/driver/driver/:id` | Obtener info del chofer |
| GET | `/driver/driver/document/:id` | Descargar carnet |
| PATCH | `/driver/driver/availability` | Actualizar disponibilidad |
| GET | `/driver/drivers/available` | Listar choferes disponibles |

## Manejo de Archivos

### Almacenamiento
- **Ubicación**: `/uploads/drivers/`
- **Nombre generado**: `idcard-{timestamp}-{random}.{ext}`
- **Formatos**: JPG, PNG, PDF
- **Tamaño máx**: 5MB

### Acceso
```
GET /uploads/drivers/idcard-1234567890-abc.jpg
```

### En MongoDB
```json
{
  "documents": {
    "idCardPath": "/uploads/drivers/idcard-1234567890-abc.jpg",
    "idCardUploadedAt": "2025-11-16T10:30:00.000Z"
  }
}
```

## Validaciones

### Al Registrarse como Chofer
1. ✅ Usuario debe estar activo (verificado)
2. ✅ Todos los datos del auto son requeridos
3. ✅ Placa debe ser única
4. ✅ Año debe ser válido
5. ✅ Archivo de carnet requerido
6. ✅ Archivo debe ser JPG/PNG/PDF
7. ✅ Archivo máximo 5MB

### Al Actualizar Disponibilidad
- Solo si documentos están verificados
- Solo si usuario está activo

## Seguridad

🔒 **Autenticación**
- JWT con expiración de 7 días
- Token en header `Authorization: Bearer <token>`

🔒 **Almacenamiento**
- Archivos en servidor (no expuestos directamente)
- Acceso controlado por middleware
- Solo admin o el mismo chofer pueden descargar

🔒 **Validaciones**
- Validación de tipos MIME en servidor
- Límite de tamaño de archivo
- Nombres generados aleatoriamente

🔒 **Base de datos**
- Campos únicos: username, phone, placa
- Contraseñas hasheadas con bcrypt
- Códigos de verificación hasheados

## Ejemplo de Consultas MongoDB

```javascript
// Encontrar usuario específico
db.users.findOne({ username: "juan" })

// Encontrar solo choferes
db.users.find({ userType: "driver" })

// Encontrar choferes disponibles
db.users.find({ 
  userType: "driver", 
  isAvailable: true,
  documentsVerified: true 
})

// Encontrar auto por placa
db.users.findOne({ "car.plate": "ABC123" })

// Actualizar disponibilidad
db.users.updateOne(
  { _id: ObjectId("...") },
  { $set: { isAvailable: true } }
)

// Contar choferes totales
db.users.countDocuments({ userType: "driver" })

// Contar choferes disponibles
db.users.countDocuments({ 
  userType: "driver", 
  isAvailable: true 
})
```

## Próximas Mejoras

- [ ] Admin panel para verificar documentos
- [ ] Historial de viajes
- [ ] Sistema de calificaciones
- [ ] Notificaciones en tiempo real
- [ ] Geolocalización de choferes
- [ ] Integración de pagos

---

**Versión**: 1.0  
**Fecha**: 16 de noviembre de 2025  
**Estado**: Implementado
