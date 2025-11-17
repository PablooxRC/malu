var createError = require('http-errors');
var express = require('express');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

const qrcode = require('qrcode-terminal');
const connectBD = require("./config/database");
const client = require('./config/whatsApp');

const whatsappRoutes = require('./routes/whatsapp.message.routes');
const userRoutes = require('./routes/users.routes');
const whatsappState = require('./config/whatsapp.state');

const setupMcpServer = require('./mcp/server');
const mcpHandler = setupMcpServer();

var app = express();

connectBD();

client.on('qr', qr => {
    console.log('ESCANEA EL QR EN LA CONSOLA');
    qrcode.generate(qr, { small: true }); 
    whatsappState.setQrPending(qr); 
});

client.on('ready', () => {
    console.log('CLIENTE DE WHATSAPP CONECTADO');
    
    whatsappState.setConnected({
        number: client.info.wid.user,
        name: client.info.pushname
    });
});

client.on('disconnected', (reason) => {
    console.log('Cliente desconectado: ', reason);
    whatsappState.clearState();
});

client.on('message_create', message => {
  console.log('SE RECIBIO UN MENSAJE', message)
})

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());


app.post('/mcp', mcpHandler);
app.use('/whatsapp', whatsappRoutes);
app.use('/user', userRoutes);

app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString()
  });
});


app.use(function(req, res, next) {
  next(createError(404, 'Endpoint no encontrado'));
});

app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.json({
    error: {
      message: err.message,
      status: err.status || 500,
      stack: req.app.get('env') === 'development' ? err.stack : undefined
    }
  });
});


client.initialize();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor API escuchando en http://localhost:${PORT}`);
});
