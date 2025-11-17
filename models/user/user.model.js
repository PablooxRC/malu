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
    },
    userType: {
        type: String,
        enum: ['user', 'driver'],
        default: 'user'
    }
}, { timestamps: true, discriminatorKey: 'userType' });

// Amigos y solicitudes de amistad
userSchema.add({
    friends: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    friendRequests: [{
        from: { type: Schema.Types.ObjectId, ref: 'User' },
        status: { type: String, enum: ['pending','accepted','declined'], default: 'pending' },
        createdAt: { type: Date, default: Date.now },
        respondedAt: { type: Date }
    }]
});

userSchema.pre('save', async function (next) {
    // Solo hashear password si es una cadena de texto nueva (no está hasheada)
    if(this.isModified('password') && this.password && !this.password.startsWith('$2')){
        try{
            const salt = await bcrypt.genSalt(10);
            this.password = await bcrypt.hash(this.password, salt);
        } catch(error){next(error);}
    }
    
    // Solo hashear code si es una cadena de texto nueva
    if(this.isModified('code') && this.code && !this.code.startsWith('$2')){
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

userSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
}

const User = mongoose.model('User', userSchema);

module.exports = User;