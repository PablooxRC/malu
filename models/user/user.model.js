const mongoose = require('mongoose');
const { Schema } = mongoose
const bcrypt = require('bcrypt');

const userSchema = new Schema({
    username: {
        type: String,
        required: [true, 'EL NOMBRE DE USUARIO ES OBLIGATORIO'],
        unique: true,
        trim: true
    },
    password: {
        type: String,
        require: [true, 'LA PASSWORD ES OBLIGATORIA'],
        minlength: 6,
        select: false,
    },
    phone:{
        type: String,
        required: [true, 'EL NÚMERO DE TELÉFONO ES OBLIGATORIO'],
        unique: true,
        trim: true,
    },
    role:{
        type: String,
        enum:['user', 'driver', 'admin'],
        default:'user'
    },
    active:{
        type: Boolean,
        default: false
    },
    code:{
        type: String,
        select: false
    },
    expirationcode:{
        type: Date,
        select: false
    }
}, { timestamps: true });

userSchema.pre('save', async function (next) {
    if(this.isModified('password')){
        try{
            const salt = await bcrypt.genSalt(10);
            this.password = await bcrypt.hash(this.password, salt);
        } catch(error){next(error);}
    }
    
    if(this.isModified('code') && this.code){
        try{
            const salt = await bcrypt.genSalt(10);
            this.code = await bcrypt.hash(this.code, salt);
        } catch(error) { return next(error)}
    }

    next();
})

userSchema.methods.compareCode = async function (code) {
    if(!this.code) return false;
    return await bcrypt.compare(code, this.code); 
}

const User = mongoose.model('User', userSchema);

module.exports = User;