const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const { Schema } = mongoose;

const userSchema = new Schema({
    // Credenziali di accesso
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        index: true
    },
    password: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        trim: true,
        default: null
    },

    // Monero (OPZIONALE)
    moneroAddress: {
        type: String,
        trim: true,
        required: false,
        default: null,
        index: true,
        sparse: true // Permette più utenti con null
    },

    // Profilo utente
    name: {
        type: String,
        trim: true,
        default: ''
    },
    bio: {
        type: String,
        trim: true,
        maxlength: 500,
        default: ''
    },
    location: {
        type: String,
        trim: true,
        default: ''
    },
    avatarUrl: {
        type: String,
        trim: true,
        default: null
    },

    // Competenze (offerte e richieste)
    skillsOffered: [{
        type: String,
        trim: true
    }],
    skillsWanted: [{
        type: String,
        trim: true
    }],

    // Reputazione e recensioni
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    reviewCount: {
        type: Number,
        default: 0,
        min: 0
    },

    // Firebase FCM token per notifiche
    fcmToken: {
        type: String,
        trim: true,
        default: null
    },
    fcmTokens: [{
        type: String,
        trim: true
    }],
    online: {
        type: Boolean,
        default: false
    },
    lastSeenAt: {
        type: Date,
        default: null
    },

    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }

}, {
    collection: 'users',
    versionKey: false,
    strict: false // Permette flessibilità per campi extra
});

// Indici per performance
userSchema.index({ username: 1, email: 1 });
userSchema.index({ rating: -1 });
userSchema.index({ createdAt: -1 });

// Middleware pre-save per hashare la password
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        this.updatedAt = new Date();
        next();
    } catch (error) {
        next(error);
    }
});

// Metodo per confrontare la password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Metodo statico per aggiornare il rating
userSchema.statics.updateRating = async function(userId) {
    const Review = mongoose.model('Review');
    const result = await Review.aggregate([
        { $match: { targetUserId: userId } },
        { $group: {
            _id: null,
            average: { $avg: '$rating' },
            count: { $sum: 1 }
        }}
    ]);

    const rating = result.length > 0 ? Math.round((result[0].average || 0) * 10) / 10 : 0;
    const reviewCount = result.length > 0 ? result[0].count : 0;

    await this.findByIdAndUpdate(userId, {
        rating,
        reviewCount,
        updatedAt: new Date()
    });
};

// Metodo per ottenere il profilo pubblico (senza dati sensibili)
userSchema.methods.getPublicProfile = function() {
    return {
        id: this._id,
        userId: this.userId,
        username: this.username,
        name: this.name,
        bio: this.bio,
        location: this.location,
        avatarUrl: this.avatarUrl,
        rating: this.rating,
        reviewCount: this.reviewCount,
        skillsOffered: this.skillsOffered,
        skillsWanted: this.skillsWanted,
        moneroAddress: this.moneroAddress,
        createdAt: this.createdAt
    };
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
