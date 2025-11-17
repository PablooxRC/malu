var express = require('express');
var router = express.Router();

const Driver = require('../models/driver/driver.model');
const User = require('../models/user/user.model');
const upload = require('../middleware/upload.middleware');
const authMiddleware = require('../middleware/auth.middleware');
const { state } = require('../config/whatsapp.state');
const client = require('../config/whatsApp');
const generateCode = require('../utils/generate.code');
const path = require('path');

const VERIFICATION_CODE_EXPIRATION_MINUTES = 10;

let fetch;
try {
  // prefer the installed node-fetch (v2) which supports FormData from 'form-data'
  fetch = require('node-fetch');
} catch (err) {
  // fallback to global fetch if node-fetch is not available
  fetch = globalThis.fetch;
}
const FormData = require('form-data');
const fs = require('fs');

// Registrar usuario como chofer
// Acepta dos archivos: idCardFront e idCardBack
router.post('/become-driver', authMiddleware, upload.fields([
  { name: 'idCardFront', maxCount: 1 },
  { name: 'idCardBack', maxCount: 1 }
]), async (req, res) => {
  try {
    const { plate, color, model, year, brand } = req.body;

    // Validar que se subieron ambos archivos
    if (!req.files || !req.files['idCardFront'] || !req.files['idCardBack']) {
      return res.status(400).json({
        success: false,
        message: 'El anverso y reverso del carnet son obligatorios.'
      });
    }

    // Validar datos del auto
    if (!plate || !color || !model || !year || !brand) {
      // Eliminar archivos subidos si falta algún dato
      const fs = require('fs');
      if (req.files) {
        if (req.files['idCardFront'] && req.files['idCardFront'][0]) {
          try { fs.unlinkSync(req.files['idCardFront'][0].path); } catch(e){}
        }
        if (req.files['idCardBack'] && req.files['idCardBack'][0]) {
          try { fs.unlinkSync(req.files['idCardBack'][0].path); } catch(e){}
        }
      }
      
      return res.status(400).json({
        success: false,
        message: 'Todos los datos del auto son obligatorios: placa, color, modelo, año, marca.'
      });
    }

    // Verificar que el usuario existe
    const user = await User.findById(req.user.id);
    if (!user) {
      const fs = require('fs');
      if (req.files) {
        if (req.files['idCardFront'] && req.files['idCardFront'][0]) {
          try { fs.unlinkSync(req.files['idCardFront'][0].path); } catch(e){}
        }
        if (req.files['idCardBack'] && req.files['idCardBack'][0]) {
          try { fs.unlinkSync(req.files['idCardBack'][0].path); } catch(e){}
        }
      }
      
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado.'
      });
    }

    // Verificar que el usuario está activo
    if (!user.active) {
      const fs = require('fs');
      if (req.files) {
        if (req.files['idCardFront'] && req.files['idCardFront'][0]) {
          try { fs.unlinkSync(req.files['idCardFront'][0].path); } catch(e){}
        }
        if (req.files['idCardBack'] && req.files['idCardBack'][0]) {
          try { fs.unlinkSync(req.files['idCardBack'][0].path); } catch(e){}
        }
      }
      
      return res.status(403).json({
        success: false,
        message: 'Debes verificar tu teléfono antes de registrarte como chofer.'
      });
    }

    // Verificar si la placa ya está registrada
    const existingCar = await Driver.findOne({ 'car.plate': plate.toUpperCase() });
    if (existingCar) {
      const fs = require('fs');
      if (req.files) {
        if (req.files['idCardFront'] && req.files['idCardFront'][0]) {
          try { fs.unlinkSync(req.files['idCardFront'][0].path); } catch(e){}
        }
        if (req.files['idCardBack'] && req.files['idCardBack'][0]) {
          try { fs.unlinkSync(req.files['idCardBack'][0].path); } catch(e){}
        }
      }
      
      return res.status(409).json({
        success: false,
        message: 'Esta placa de auto ya está registrada.'
      });
    }

    // Convertir usuario existente a chofer
    const driver = new Driver({
      _id: user._id,
      username: user.username,
      password: user.password,
      phone: user.phone,
      role: 'driver',
      active: user.active,
      userType: 'driver',
      car: {
        plate: plate.toUpperCase(),
        color,
        model,
        year: parseInt(year),
        brand
      },
      documents: {
        idCardFrontPath: req.files['idCardFront'][0].path,
        idCardBackPath: req.files['idCardBack'][0].path,
        idCardUploadedAt: new Date()
      },
      documentsVerified: false,
      isAvailable: false,
      rating: 5,
      completedTrips: 0,
      createdAt: user.createdAt,
      updatedAt: new Date()
    });

    // Eliminar usuario anterior y guardar como driver
    await User.deleteOne({ _id: user._id });
    await driver.save();
    // Intentar verificación automática llamando al microservicio PoC
    try {
      const form = new FormData();
      const frontPath = req.files['idCardFront'][0].path;
      const backPath = req.files['idCardBack'][0].path;
      form.append('idCardFront', fs.createReadStream(frontPath));
      form.append('idCardBack', fs.createReadStream(backPath));
      // si el usuario tiene selfie subida en el request, incluirla (no en este flujo)
      const VERIFY_URL = process.env.VERIFY_SERVICE_URL || 'http://localhost:5001/verify';

      const verResp = await fetch(VERIFY_URL, { method: 'POST', body: form, headers: form.getHeaders() });
      if (verResp.ok) {
        const verResult = await verResp.json();
        driver.verification = driver.verification || {};
        driver.verification.status = verResult.verdict || (verResult.success ? 'manual_review' : 'manual_review');
        driver.verification.score = verResult.score || 0;
        driver.verification.details = verResult;
        if (driver.verification.status === 'probable_real') {
          driver.documentsVerified = true;
        }
        await driver.save();

        return res.status(201).json({
          success: true,
          message: 'Te has registrado como chofer. Verificación automática completada.',
          driver: {
            id: driver._id,
            username: driver.username,
            phone: driver.phone,
            role: driver.role,
            car: driver.car,
            documentsVerified: driver.documentsVerified,
            isAvailable: driver.isAvailable,
            rating: driver.rating,
            verification: driver.verification
          }
        });
      } else {
        // Microservicio devolvió error; intentar leer body para diagnóstico y marcar verificación pendiente
        let body = null;
        try {
          const text = await verResp.text();
          try { body = JSON.parse(text); } catch(e) { body = text; }
        } catch (e) {
          body = null;
        }

        driver.verification = driver.verification || {};
        driver.verification.status = 'pending';
        driver.verification.details = {
          error: 'verify_service_error',
          status: verResp.status,
          body: body
        };
        await driver.save();

        return res.status(201).json({
          success: true,
          message: 'Te has registrado como chofer. La verificación automática quedó pendiente.',
          driver: {
            id: driver._id,
            username: driver.username,
            phone: driver.phone,
            role: driver.role,
            car: driver.car,
            documentsVerified: driver.documentsVerified,
            isAvailable: driver.isAvailable,
            rating: driver.rating,
            verification: driver.verification
          }
        });
      }
    } catch (err) {
      console.error('Error llamando al servicio de verificación automático:', err);
      driver.verification = driver.verification || {};
      driver.verification.status = 'pending';
      driver.verification.details = { error: 'verify_service_unreachable', message: err.message };
      await driver.save();

      return res.status(201).json({
        success: true,
        message: 'Te has registrado como chofer. La verificación automática quedó pendiente (servicio inaccesible).',
        driver: {
          id: driver._id,
          username: driver.username,
          phone: driver.phone,
          role: driver.role,
          car: driver.car,
          documentsVerified: driver.documentsVerified,
          isAvailable: driver.isAvailable,
          rating: driver.rating,
          verification: driver.verification
        }
      });
    }

  } catch (error) {
    if (req.file) {
      const fs = require('fs');
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error('Error eliminando archivo:', err);
      }
    }

    console.error('Error al registrar chofer:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        success: false,
        message: `El ${field} ya está registrado.`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor.'
    });
  }
});

// Obtener información del chofer
router.get('/driver/:id', async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Chofer no encontrado.'
      });
    }

    res.status(200).json({
      success: true,
      driver: {
        id: driver._id,
        username: driver.username,
        phone: driver.phone,
        role: driver.role,
        active: driver.active,
        car: driver.car,
        documentsVerified: driver.documentsVerified,
        isAvailable: driver.isAvailable,
        rating: driver.rating,
        completedTrips: driver.completedTrips,
        createdAt: driver.createdAt
      }
    });

  } catch (error) {
    console.error('Error al obtener chofer:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor.'
    });
  }
});

// Obtener documento de identidad (requiere autenticación)
// Query optional: ?side=front|back (default front)
router.get('/driver/document/:id', authMiddleware, async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Chofer no encontrado.'
      });
    }

    // Verificar que el usuario es admin o es el mismo chofer
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para ver este documento.'
      });
    }

    const fs = require('fs');
    const side = (req.query.side || 'front').toLowerCase();
    let filePath = null;
    if (side === 'back') filePath = driver.documents.idCardBackPath;
    else filePath = driver.documents.idCardFrontPath;

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Archivo de documento no encontrado.'
      });
    }

    // Descargar archivo solicitado
    res.download(filePath);

  } catch (error) {
    console.error('Error al descargar documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor.'
    });
  }
});

// Actualizar disponibilidad del chofer (requiere autenticación)
router.patch('/driver/availability', authMiddleware, async (req, res) => {
  try {
    const { isAvailable } = req.body;

    const driver = await Driver.findByIdAndUpdate(
      req.user.id,
      { isAvailable },
      { new: true }
    );

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Chofer no encontrado.'
      });
    }

    res.status(200).json({
      success: true,
      message: `Disponibilidad actualizada a ${isAvailable ? 'disponible' : 'no disponible'}.`,
      driver: {
        id: driver._id,
        isAvailable: driver.isAvailable
      }
    });

  } catch (error) {
    console.error('Error al actualizar disponibilidad:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor.'
    });
  }
});

// Listar todos los choferes disponibles
router.get('/drivers/available', async (req, res) => {
  try {
    const drivers = await Driver.find({ 
      isAvailable: true, 
      documentsVerified: true,
      active: true 
    }).select('-documents.idCardFrontPath -documents.idCardBackPath');

    res.status(200).json({
      success: true,
      count: drivers.length,
      drivers: drivers.map(driver => ({
        id: driver._id,
        username: driver.username,
        phone: driver.phone,
        car: driver.car,
        rating: driver.rating,
        completedTrips: driver.completedTrips,
        isAvailable: driver.isAvailable
      }))
    });

  } catch (error) {
    console.error('Error al listar choferes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor.'
    });
  }
});

// Enviar documentos al microservicio de verificación (PoC)
router.post('/verify-documents', authMiddleware, upload.fields([
  { name: 'idCardFront', maxCount: 1 },
  { name: 'idCardBack', maxCount: 1 },
  { name: 'selfie', maxCount: 1 }
]), async (req, res) => {
  try {
    // Asegurar que el chofer existe
    const driver = await Driver.findById(req.user.id);
    if (!driver) return res.status(404).json({ success: false, message: 'Chofer no encontrado.' });

    if (!req.files || !req.files['idCardFront'] || !req.files['idCardBack']) {
      return res.status(400).json({ success: false, message: 'Se requieren idCardFront e idCardBack.' });
    }

    // Construir form-data para microservicio
    const form = new FormData();
    const frontPath = req.files['idCardFront'][0].path;
    const backPath = req.files['idCardBack'][0].path;
    form.append('idCardFront', fs.createReadStream(frontPath));
    form.append('idCardBack', fs.createReadStream(backPath));
    if (req.files['selfie'] && req.files['selfie'][0]) {
      form.append('selfie', fs.createReadStream(req.files['selfie'][0].path));
    }

    // Endpoint del microservicio (asumimos en localhost:5001)
    const VERIFY_URL = process.env.VERIFY_SERVICE_URL || 'http://localhost:5001/verify';

    const response = await fetch(VERIFY_URL, { method: 'POST', body: form, headers: form.getHeaders() });
    let result = null;
    try {
      const text = await response.text();
      try { result = JSON.parse(text); } catch(e) { result = text; }
    } catch (e) {
      result = null;
    }

    // Guardar resultado en driver
    driver.verification = driver.verification || {};
    driver.verification.status = (result && result.verdict) || (response.ok ? 'manual_review' : 'manual_review');
    driver.verification.score = (result && result.score) || 0;
    driver.verification.details = {
      status: response.status,
      body: result
    };
    // Auto-aprobar si el veredicto es suficientemente claro
    if (driver.verification.status === 'probable_real') {
      driver.documentsVerified = true;
    }
    await driver.save();

    return res.status(200).json({ success: true, result });
  } catch (error) {
    console.error('Error verificando documentos:', error);
    return res.status(500).json({ success: false, message: 'Error al verificar documentos.' });
  }
});

// Rutas de administración: listar cola de verificaciones pendientes
router.get('/admin/verify-queue', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Acceso denegado' });

    const queue = await Driver.find({ 'verification.status': { $in: ['manual_review','probable_falso'] } })
      .select('username phone car documents verification createdAt');

    res.status(200).json({ success: true, count: queue.length, queue });
  } catch (error) {
    console.error('Error en admin/verify-queue:', error);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

// Admin: aprobar o rechazar una verificación manualmente
router.patch('/admin/verify/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Acceso denegado' });
    const { action, comment } = req.body; // action: 'approve'|'reject'
    if (!['approve','reject'].includes(action)) return res.status(400).json({ success: false, message: 'Acción inválida' });

    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ success: false, message: 'Chofer no encontrado' });

    driver.verification = driver.verification || {};
    driver.verification.admin = {
      by: req.user.username || req.user.id,
      at: new Date(),
      action,
      comment: comment || ''
    };

    if (action === 'approve') {
      driver.verification.status = 'probable_real';
      driver.documentsVerified = true;
    } else {
      driver.verification.status = 'probable_falso';
      driver.documentsVerified = false;
    }

    await driver.save();

    res.status(200).json({ success: true, message: `Chofer ${action}d`, driver: { id: driver._id, verification: driver.verification, documentsVerified: driver.documentsVerified } });
  } catch (error) {
    console.error('Error en admin/verify/:id', error);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

module.exports = router;




