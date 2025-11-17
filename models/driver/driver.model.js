const mongoose = require('mongoose');
const { Schema } = mongoose;

// Schema para datos del auto
const carSchema = new Schema({
  plate: {
    type: String,
    required: [true, 'LA PLACA DEL AUTO ES OBLIGATORIA'],
    unique: true,
    trim: true,
    uppercase: true
  },
  color: {
    type: String,
    required: [true, 'EL COLOR DEL AUTO ES OBLIGATORIO'],
    trim: true
  },
  model: {
    type: String,
    required: [true, 'EL MODELO DEL AUTO ES OBLIGATORIO'],
    trim: true
  },
  year: {
    type: Number,
    required: [true, 'EL AÑO DEL AUTO ES OBLIGATORIO'],
    min: 1900,
    max: new Date().getFullYear() + 1
  },
  brand: {
    type: String,
    required: [true, 'LA MARCA DEL AUTO ES OBLIGATORIA'],
    trim: true
  }
}, { _id: false });

// Schema para documentos del chofer
const driverDocumentsSchema = new Schema({
  idCardFrontPath: {
    type: String,
    required: [true, 'LA FOTO DEL CARNET (ANVERSO) ES OBLIGATORIA'],
  },
  idCardBackPath: {
    type: String,
    required: [true, 'LA FOTO DEL CARNET (REVERSO) ES OBLIGATORIA'],
  },
  idCardUploadedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

// Schema del Driver - Hereda de User
const driverSchema = new Schema({
  // Información del auto
  car: {
    type: carSchema,
    required: [true, 'LOS DATOS DEL AUTO SON OBLIGATORIOS']
  },
  
  // Documentos
  documents: {
    type: driverDocumentsSchema,
    required: true
  },
  
  // Estado de verificación de documentos
  documentsVerified: {
    type: Boolean,
    default: false
  },

  // Resultado de verificación por IA/PoC
  verification: {
    status: { type: String, enum: ['pending','probable_real','probable_falso','manual_review'], default: 'pending' },
    score: { type: Number, default: 0 },
    details: { type: Object }
  },
  
  // Calificación del chofer
  rating: {
    type: Number,
    default: 5,
    min: 0,
    max: 5
  },
  
  // Cantidad de viajes completados
  completedTrips: {
    type: Number,
    default: 0
  },
  
  // Estado de disponibilidad
  isAvailable: {
    type: Boolean,
    default: false
  }
}, { discriminatorKey: 'userType', timestamps: true });

// Obtener modelo User base
const User = require("../user/user.model");



// Crear modelo Driver como discriminador de User
const Driver = User.discriminator('driver', driverSchema);

module.exports = Driver;
