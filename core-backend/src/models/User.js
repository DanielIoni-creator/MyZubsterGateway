const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const { Schema } = mongoose;

const userSchema = new Schema({
    // ========== CREDENZIALI ==========
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

    // ========== MONERO (OPZIONALE) ==========
    moneroAddress: {
        type: String,
        trim: true,
        required: false,
        default: null,
        index: true,
        sparse: true
    },

    // ========== PROFILO ==========
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

    // ========== COMPETENZE ==========
    skillsOffered: [{
        type: String,
        trim: true
    }],
    skillsWanted: [{
        type: String,
        trim: true
    }],

    // ========== RUOLI (PER IL PANNELLO ADMIN) ==========
    role: {
        type: String,
        enum: ['user', 'moderator', 'admin'],
        default: 'user',
        index: true
    },

    // ========== REPUTAZIONE AVANZATA ==========
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
    totalJobsCompleted: {
        type: Number,
        default: 0,
        min: 0
    },
    responseRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    isIdentityVerified: {
        type: Boolean,
        default: false
    },
    badges: [{
        type: String,
        trim: true
    }],
    skillsVerified: [{
        type: String,
        trim: true
    }],

    // ========== NOTIFICHE E STATO ==========
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

    // ========== TIMESTAMPS ==========
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

// ========== INDICI ==========
userSchema.index({ username: 1, email: 1 });
userSchema.index({ rating: -1 });
userSchema.index({ totalJobsCompleted: -1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ isIdentityVerified: 1 });
userSchema.index({ badges: 1 });
userSchema.index({ role: 1 });

// ========== MIDDLEWARE ==========
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

// ========== METODI DI AUTENTICAZIONE ==========
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// ========== METODI PER LA REPUTAZIONE ==========
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

userSchema.methods.incrementCompletedJobs = async function() {
    this.totalJobsCompleted = (this.totalJobsCompleted || 0) + 1;
    this.updatedAt = new Date();
    await this.save();
    return this.totalJobsCompleted;
};

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

// ========== METODI PER I BADGE ==========
userSchema.methods.addBadge = async function(badgeName) {
    if (!this.badges.includes(badgeName)) {
        this.badges.push(badgeName);
        this.updatedAt = new Date();
        await this.save();
    }
    return this.badges;
};

userSchema.methods.removeBadge = async function(badgeName) {
    this.badges = this.badges.filter(b => b !== badgeName);
    this.updatedAt = new Date();
    await this.save();
    return this.badges;
};

// ========== METODI PER LA VERIFICA ==========
userSchema.methods.verifyIdentity = async function() {
    this.isIdentityVerified = true;
    this.updatedAt = new Date();
    await this.save();
    return this.isIdentityVerified;
};

// ========== METODI PER I RUOLI ==========
userSchema.methods.isAdmin = function() {
    return this.role === 'admin';
};

userSchema.methods.isModerator = function() {
    return this.role === 'moderator' || this.role === 'admin';
};

userSchema.methods.setRole = async function(newRole) {
    if (!['user', 'moderator', 'admin'].includes(newRole)) {
        throw new Error('Ruolo non valido');
    }
    this.role = newRole;
    this.updatedAt = new Date();
    await this.save();
    return this.role;
};

// ========== METODI PER IL PROFILO ==========
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
        role: this.role,
        createdAt: this.createdAt
    };
};

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

// ========== ESPORTAZIONE ==========
module.exports = mongoose.models.User || mongoose.model('User', userSchema);
