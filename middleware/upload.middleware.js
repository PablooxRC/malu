const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Directorio base para uploads de choferes
const uploadsBaseDir = path.join(__dirname, '../uploads/drivers');
if (!fs.existsSync(uploadsBaseDir)) {
  fs.mkdirSync(uploadsBaseDir, { recursive: true });
}

// Configurar almacenamiento
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Guardar en carpeta por nombre de usuario si está disponible
    let username = 'anonymous';
    try {
      if (req && req.user && req.user.username) username = req.user.username;
      // sanitize username: permitir letras, números, guiones y guiones bajos
      username = username.replace(/[^a-zA-Z0-9_-]/g, '_');
    } catch (e) {}

    const userDir = path.join(uploadsBaseDir, username);
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
    cb(null, userDir);
  },
  filename: function (req, file, cb) {
    // Generar nombre único con timestamp y extensión original
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'idcard-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Filtro para validar tipo de archivo
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos JPG, PNG o PDF'), false);
  }
};

// Crear middleware de multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB máximo
  }
});

module.exports = upload;
