var express = require('express');
var router = express.Router();
const jwt = require('jsonwebtoken');

const {state} = require('../config/whatsapp.state');
const User = require('../models/user/user.model');
const generateCode = require('../utils/generate.code');
const client = require('../config/whatsApp');
const authMiddleware = require('../middleware/auth.middleware');

const VERIFICATION_CODE_EXPIRATION_MINUTES = 10;

router.post('/register', async (req,res)=>{
  try{
    let {username, password, phone} = req.body;
    console.log('📱 Registro - Teléfono recibido:', phone);

    // Validar que el teléfono sea válido
    if (!phone || phone.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'El teléfono debe tener al menos 10 dígitos.'
      });
    }

    // Remover espacios, guiones y caracteres especiales
    phone = phone.replace(/\D/g, '');
    console.log('📱 Teléfono limpio:', phone);

    if(state.status !== 'connected'){
      return res.status(503).json({
        success: false,
        message: 'Servicio de registro no disponible por el momento'
      })
    }

    const existinguser = await User.findOne({ $or: [{username}, {phone}]});

    if(existinguser){
      return res.status(409).json({
        success: false,
        message: 'El nombre de usuario o telefono ya se encuentran registrados'
      })
    }

    const code = generateCode();
    const expiration = new Date(Date.now() + VERIFICATION_CODE_EXPIRATION_MINUTES * 60 * 1000);

    const newuser = new User({
      username,
      password,
      phone,
      code,
      expirationcode: expiration
    });

    await newuser.save();

    const chatId = `${phone}@c.us`;
    const mensaje = `¡Bienvenido a Malu! 🚕\n\nTu código de verificación es: *${code}*\n\nExpira en ${VERIFICATION_CODE_EXPIRATION_MINUTES} minutos.`;    
    await client.sendMessage(chatId, mensaje);

    res.status(201).json({
      success:true,
      message: 'Usuario registrado. Se ha enviado un codigo de verificación al telefono registrado'
    })

  } catch(error){
    console.error('Error al registrar: ', error);
    res.status(500).json({ success: false, message:'Error interno'});
  }
})

router.post('/verifyphone', async(req,res)=>{
  try{
    const {phone, code} = req.body;

    if(!phone || !code) return res.status(400).json({ success: false, message: 'Faltan el teléfono o el código.' });

    const user = await User.findOne({phone}).select('+code +expirationcode +password');

    if(!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    if(user.active) return res.status(400).json({ success: false, message: 'Este usuario ya está verificado.' });
    if (new Date() > user.expirationcode) return res.status(400).json({ success: false, message: 'El código ha expirado. Solicita uno nuevo.' });

    const isMatch = await user.compareCode(code);
    if(!isMatch) return res.status(400).json({ success: false, message: 'Código incorrecto.' });

    user.active = true;
    user.code = undefined;
    user.expirationcode = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: '¡Usuario verificado exitosamente!',
    });
  }catch(error){
    console.error('Error en /verify:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
})

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de usuario y la contraseña son obligatorios.'
      });
    }

    const user = await User.findOne({ username }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Nombre de usuario o contraseña incorrectos.'
      });
    }

    if (!user.active) {
      return res.status(403).json({
        success: false,
        message: 'El usuario no está activo. Verifica tu teléfono primero.'
      });
    }

    const isPasswordMatch = await user.comparePassword(password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Nombre de usuario o contraseña incorrectos.'
      });
    }

    const token = jwt.sign(
      { 
        id: user._id, 
        username: user.username, 
        phone: user.phone,
        role: user.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      message: '¡Inicio de sesión exitoso!',
      token,
      user: {
        id: user._id,
        username: user.username,
        phone: user.phone,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Error en /login:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor.'
    });
  }
})

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado.'
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        phone: user.phone,
        role: user.role,
        active: user.active,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Error en /profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor.'
    });
  }

})

router.post('/logout', authMiddleware, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Sesión cerrada exitosamente.'
  });
})

// Enviar solicitud de amistad al usuario :id
router.post('/:id/friend-request', authMiddleware, async (req, res) => {
  try {
    const targetId = req.params.id;
    const fromId = req.user.id;

    if (fromId === targetId) return res.status(400).json({ success: false, message: 'No puedes enviarte solicitud a ti mismo.' });

    const target = await User.findById(targetId);
    const fromUser = await User.findById(fromId);
    if (!target) return res.status(404).json({ success: false, message: 'Usuario destino no encontrado.' });

    // Ya son amigos?
    if (fromUser.friends && fromUser.friends.includes(target._id)) {
      return res.status(400).json({ success: false, message: 'Ya sois amigos.' });
    }

    // Existe solicitud pendiente ya en target?
    const existing = (target.friendRequests || []).find(r => r.from && r.from.toString() === fromId && r.status === 'pending');
    if (existing) return res.status(400).json({ success: false, message: 'Solicitud ya enviada y pendiente.' });

    // Añadir solicitud al usuario destino
    target.friendRequests = target.friendRequests || [];
    target.friendRequests.push({ from: fromUser._id, status: 'pending', createdAt: new Date() });
    await target.save();

    return res.status(200).json({ success: true, message: 'Solicitud de amistad enviada.' });
  } catch (error) {
    console.error('Error enviando solicitud de amistad:', error);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
});

// Enviar solicitud de amistad por nombre de usuario (body: { username })
router.post('/friend-request-by-username', authMiddleware, async (req, res) => {
  try {
    const { username } = req.body;
    const fromId = req.user.id;

    if (!username) return res.status(400).json({ success: false, message: 'Se requiere el nombre de usuario destino.' });

    const target = await User.findOne({ username: username.trim() });
    if (!target) return res.status(404).json({ success: false, message: 'Usuario destino no encontrado.' });

    const fromUser = await User.findById(fromId);
    if (!fromUser) return res.status(404).json({ success: false, message: 'Usuario remitente no encontrado.' });

    if (fromId === target._id.toString()) return res.status(400).json({ success: false, message: 'No puedes enviarte solicitud a ti mismo.' });

    // Ya son amigos?
    if (fromUser.friends && fromUser.friends.find(id => id.toString() === target._id.toString())) {
      return res.status(400).json({ success: false, message: 'Ya sois amigos.' });
    }

    // Existe solicitud pendiente ya en target?
    const existing = (target.friendRequests || []).find(r => r.from && r.from.toString() === fromId && r.status === 'pending');
    if (existing) return res.status(400).json({ success: false, message: 'Solicitud ya enviada y pendiente.' });

    // Añadir solicitud al usuario destino
    target.friendRequests = target.friendRequests || [];
    target.friendRequests.push({ from: fromUser._id, status: 'pending', createdAt: new Date() });
    await target.save();

    return res.status(200).json({ success: true, message: 'Solicitud de amistad enviada.' });
  } catch (error) {
    console.error('Error enviando solicitud por username:', error);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
});

// Aceptar solicitud de amistad (current user acepta solicitud enviada por :fromId)
router.post('/friend-request/:fromId/accept', authMiddleware, async (req, res) => {
  try {
    const meId = req.user.id;
    const fromId = req.params.fromId;

    if (meId === fromId) return res.status(400).json({ success: false, message: 'Operación inválida.' });

    const me = await User.findById(meId);
    const other = await User.findById(fromId);
    if (!me || !other) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });

    const reqIndex = (me.friendRequests || []).findIndex(r => r.from && r.from.toString() === fromId && r.status === 'pending');
    if (reqIndex === -1) return res.status(400).json({ success: false, message: 'No hay solicitud pendiente de ese usuario.' });

    // Marcar aceptada
    me.friendRequests[reqIndex].status = 'accepted';
    me.friendRequests[reqIndex].respondedAt = new Date();

    me.friends = me.friends || [];
    other.friends = other.friends || [];
    // añadir a ambos sets (sin duplicados)
    if (!me.friends.find(id => id.toString() === other._id.toString())) me.friends.push(other._id);
    if (!other.friends.find(id => id.toString() === me._id.toString())) other.friends.push(me._id);

    await me.save();
    await other.save();

    return res.status(200).json({ success: true, message: 'Solicitud aceptada.' });
  } catch (error) {
    console.error('Error aceptando solicitud:', error);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
});

// Rechazar solicitud de amistad
router.post('/friend-request/:fromId/decline', authMiddleware, async (req, res) => {
  try {
    const meId = req.user.id;
    const fromId = req.params.fromId;

    const me = await User.findById(meId);
    if (!me) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });

    const reqIndex = (me.friendRequests || []).findIndex(r => r.from && r.from.toString() === fromId && r.status === 'pending');
    if (reqIndex === -1) return res.status(400).json({ success: false, message: 'No hay solicitud pendiente de ese usuario.' });

    me.friendRequests[reqIndex].status = 'declined';
    me.friendRequests[reqIndex].respondedAt = new Date();
    await me.save();

    return res.status(200).json({ success: true, message: 'Solicitud rechazada.' });
  } catch (error) {
    console.error('Error rechazando solicitud:', error);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
});

// Eliminar amigo
router.delete('/friends/:id', authMiddleware, async (req, res) => {
  try {
    const meId = req.user.id;
    const otherId = req.params.id;

    if (meId === otherId) return res.status(400).json({ success: false, message: 'Operación inválida.' });

    const me = await User.findById(meId);
    const other = await User.findById(otherId);
    if (!me || !other) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });

    me.friends = (me.friends || []).filter(f => f.toString() !== otherId);
    other.friends = (other.friends || []).filter(f => f.toString() !== meId);

    await me.save();
    await other.save();

    return res.status(200).json({ success: true, message: 'Amigo eliminado.' });
  } catch (error) {
    console.error('Error eliminando amigo:', error);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
});

// Lista de amigos del usuario autenticado
router.get('/me/friends', authMiddleware, async (req, res) => {
  try {
    const me = await User.findById(req.user.id).populate('friends', 'username phone role');
    if (!me) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });

    return res.status(200).json({ success: true, count: (me.friends || []).length, friends: me.friends });
  } catch (error) {
    console.error('Error listando amigos:', error);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
});

// Lista de solicitudes pendientes recibidas por el usuario autenticado
router.get('/me/friend-requests', authMiddleware, async (req, res) => {
  try {
    const me = await User.findById(req.user.id).populate('friendRequests.from', 'username phone');
    if (!me) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });

    const pending = (me.friendRequests || []).filter(r => r.status === 'pending');
    return res.status(200).json({ success: true, count: pending.length, requests: pending });
  } catch (error) {
    console.error('Error listando solicitudes:', error);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
});

module.exports = router;
