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
        sparse: true
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

    // ========== SISTEMA DI REPUTAZIONE AVANZATO ==========
    // Rating base (stelle)
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

    // Lavori completati
    totalJobsCompleted: {
        type: Number,
        default: 0,
        min: 0
    },

    // Tasso di risposta (percentuale 0-100)
    responseRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },

    // Verifica identità (facoltativa)
    isIdentityVerified: {
        type: Boolean,
        default: false
    },

    // Badge e certificazioni
    badges: [{
        type: String,
        trim: true
    }],
    skillsVerified: [{
        type: String,
        trim: true
    }],

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
    strict: false
});

// Indici per performance
userSchema.index({ username: 1, email: 1 });
userSchema.index({ rating: -1 });
userSchema.index({ totalJobsCompleted: -1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ isIdentityVerified: 1 });
userSchema.index({ badges: 1 });

// Middleware pre-save per hashare la password e aggiornare updatedAt
userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        try {
            const salt = await bcrypt.genSalt(10);
            this.password = await bcrypt.hash(this.password, salt);
        } catch (error) {
            return next(error);
        }
    }
    this.updatedAt = new Date();
    next();
});

// Metodo per confrontare la password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// ========== METODI PER LA REPUTAZIONE ==========

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

// Metodo per incrementare i lavori completati
userSchema.methods.incrementCompletedJobs = async function() {
    this.totalJobsCompleted = (this.totalJobsCompleted || 0) + 1;
    this.updatedAt = new Date();
    await this.save();
    return this.totalJobsCompleted;
};

// Metodo per aggiornare il tasso di risposta
userSchema.methods.updateResponseRate = async function(responses, totalMessages) {
    if (totalMessages === 0) {
        this.responseRate = 0;
    } else {
        this.responseRate = Math.round((responses / totalMessages) * 100);
    }
    this.updatedAt = new Date();
    await this.save();
    return this.responseRate;
};

// Metodo per aggiungere un badge
userSchema.methods.addBadge = async function(badgeName) {
    if (!this.badges.includes(badgeName)) {
        this.badges.push(badgeName);
        this.updatedAt = new Date();
        await this.save();
    }
    return this.badges;
};

// Metodo per rimuovere un badge
userSchema.methods.removeBadge = async function(badgeName) {
    this.badges = this.badges.filter(b => b !== badgeName);
    this.updatedAt = new Date();
    await this.save();
    return this.badges;
};

// Metodo per verificare l'identità
userSchema.methods.verifyIdentity = async function() {
    this.isIdentityVerified = true;
    this.updatedAt = new Date();
    await this.save();
    return this.isIdentityVerified;
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
        totalJobsCompleted: this.totalJobsCompleted,
        responseRate: this.responseRate,
        isIdentityVerified: this.isIdentityVerified,
        badges: this.badges,
        skillsVerified: this.skillsVerified,
        skillsOffered: this.skillsOffered,
        skillsWanted: this.skillsWanted,
        moneroAddress: this.moneroAddress,
        createdAt: this.createdAt
    };
};

// Metodo per ottenere il profilo completo (solo per admin/utente stesso)
userSchema.methods.getFullProfile = function() {
    return {
        ...this.getPublicProfile(),
        email: this.email,
        phone: this.phone,
        fcmToken: this.fcmToken,
        online: this.online,
        lastSeenAt: this.lastSeenAt,
        updatedAt: this.updatedAt
    };
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
