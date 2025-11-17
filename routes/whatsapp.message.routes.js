const express = require('express');
const router = express.Router();

const client = require('../config/whatsApp');
const { state } = require('../config/whatsapp.state');

router.get('/status', (req, res) => {
    res.json({
        status: state.status,
        qrData:state.qr,
        user: state.user
    })
});

router.post('/send', async(req, res) => {
    if(state.status !== 'connected'){
        return res.status(409).json({
            success: false,
            message: 'La sesión de WhatsApp no está activa. No se puede enviar el mensaje.'
        })
    }
    try {
        console.log(req.body);
        const {number, message} = req.body;

        if(!number || !message){
            return res.status(400).json({
                success: false,
                message: 'Faltan los campos "numero" o "mensaje" en el body',
            })
        }

        const chatId = `${number}@c.us`;
        await client.sendMessage(chatId, message);
        
        res.json({ success: true, message: 'Mensaje enviado exitosamente' });

    } catch (error) {
        console.error('Error enviando mensaje:', error);
        res.status(500).json({ success: false, message: 'Error interno al enviar mensaje' });
    }
})

router.get('/logout', async(req,res)=>{
    if (state.status !== 'connected') {
         return res.status(400).json({ 
             success: false, 
             message: 'No hay una sesión activa para cerrar.' 
         });
    }

    try {
        await client.logout();
        res.json({ success: true, message: 'Sesión cerrada exitosamente.' });
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        res.status(500).json({ success: false, message: 'Error interno al cerrar sesión' });
    }
})

module.exports = router;