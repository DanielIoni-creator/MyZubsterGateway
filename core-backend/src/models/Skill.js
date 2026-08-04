const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: true 
    },
    description: { 
        type: String 
    },
    category: { 
        type: String, 
        required: true 
    },
    userId: { 
        type: String, 
        required: true 
    },
    price: { 
        type: Number, 
        default: 0 
    },
    status: { 
        type: String, 
        default: 'approved' 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    }
}, {
    collection: 'skills',
    versionKey: false
});

module.exports = mongoose.model('Skill', skillSchema);