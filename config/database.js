const mongoose = require('mongoose');
require("dotenv").config();

const connectBD = async ()=>{
    try{
        await mongoose.connect(process.env.MONGO_URI);
        console.log("CONECTADO A LA BASE DE DATOS");
    } catch(error){
        console.log("ERROR AL CONECTAR A LA BASE DE DATOS");
        process.exit(1);
    }
}

module.exports = connectBD;