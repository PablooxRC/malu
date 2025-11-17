var express = require('express');
var router = express.Router();

const {state} = require('../config/whatsapp.state');
const User = require('../models/user/user.model');
const generateCode = require('../utils/generate.code');
const client = require('../config/whatsApp');

const VERIFICATION_CODE_EXPIRATION_MINUTES = 10;

router.post('/register', async (req,res)=>{
  try{
    const {username, password, phone} = req.body;

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

module.exports = router;
