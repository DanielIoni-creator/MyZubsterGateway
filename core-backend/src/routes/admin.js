const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Skill = require('../models/Skill');
const Review = require('../models/Review');
const Report = require('../models/Report');
const ModerationLog = require('../models/ModerationLog');
const { authenticate, authorize } = require('../middleware/auth');

// ============================================
// MIDDLEWARE DI AUTORIZZAZIONE
// ============================================
const requireAdmin = authorize('admin');
const requireModerator = authorize('moderator', 'admin');

// ============================================
// 1. GESTIONE SEGNALAZIONI
// ============================================

// GET /api/admin/reports - Lista tutte le segnalazioni con filtri e paginazione
router.get('/reports', authenticate, requireModerator, async (req, res) => {
    try {
        const { status, type, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (type) filter.type = type;

        const reports = await Report.find(filter)
            .populate('reporterId', 'username name avatarUrl')
            .populate('targetUserId', 'username name avatarUrl')
            .populate('targetSkillId', 'title category')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Report.countDocuments(filter);

        res.json({
            success: true,
            data: reports,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Errore nel recupero delle segnalazioni:', error);
        res.status(500).json({ success: false, error: 'Errore interno del server' });
    }
});

// POST /api/admin/reports - Crea una nuova segnalazione
router.post('/reports', authenticate, async (req, res) => {
    try {
        const { targetUserId, targetSkillId, type, reason, description } = req.body;
        const reporterId = req.user.id;

        // Validazione base
        if (!targetUserId && !targetSkillId) {
            return res.status(400).json({
                success: false,
                error: 'È necessario specificare targetUserId o targetSkillId'
            });
        }

        if (!type || !reason) {
            return res.status(400).json({
                success: false,
                error: 'Tipo e motivo della segnalazione sono obbligatori'
            });
        }

        // Verifica che il tipo sia valido
        const validTypes = ['user', 'skill', 'message'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                error: 'Tipo non valido. Usa: user, skill, message'
            });
        }

        // Verifica che l'utente non stia segnalando se stesso
        if (targetUserId && targetUserId === reporterId) {
            return res.status(400).json({
                success: false,
                error: 'Non puoi segnalare te stesso'
            });
        }

        // Verifica che l'utente target esista (se specificato)
        if (targetUserId) {
            const targetUser = await User.findById(targetUserId);
            if (!targetUser) {
                return res.status(404).json({
                    success: false,
                    error: 'Utente target non trovato'
                });
            }
        }

        // Verifica che la competenza target esista (se specificata)
        if (targetSkillId) {
            const targetSkill = await Skill.findById(targetSkillId);
            if (!targetSkill) {
                return res.status(404).json({
                    success: false,
                    error: 'Competenza target non trovata'
                });
            }
        }

        // Crea la segnalazione
        const report = new Report({
            reporterId,
            targetUserId: targetUserId || null,
            targetSkillId: targetSkillId || null,
            type,
            reason,
            description: description || '',
            status: 'pending'
        });

        await report.save();

        // Popola i dati dell'utente per la risposta
        await report.populate('reporterId', 'username name avatarUrl');
        if (targetUserId) {
            await report.populate('targetUserId', 'username name avatarUrl');
        }
        if (targetSkillId) {
            await report.populate('targetSkillId', 'title category');
        }

        // Log dell'azione
        console.log(`📢 Nuova segnalazione creata da ${req.user.username} (${type})`);

        res.status(201).json({
            success: true,
            data: report,
            message: 'Segnalazione creata con successo'
        });

    } catch (error) {
        console.error('Errore nella creazione della segnalazione:', error);
        res.status(500).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
});

// PUT /api/admin/reports/:id - Aggiorna lo stato di una segnalazione
router.put('/reports/:id', authenticate, requireModerator, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, moderationNote } = req.body;

        // Validazione: verifica che lo stato sia valido
        const validStatuses = ['pending', 'resolved', 'dismissed'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Stato non valido. Usa: pending, resolved, dismissed'
            });
        }

        // Verifica che la segnalazione esista
        const report = await Report.findById(id);
        if (!report) {
            return res.status(404).json({
                success: false,
                error: 'Segnalazione non trovata'
            });
        }

        // Salva lo stato precedente per il log
        const oldStatus = report.status;

        // Aggiorna i campi
        if (status) report.status = status;
        if (moderationNote) report.moderationNote = moderationNote;
        report.moderatedBy = req.user.id;
        report.moderatedAt = new Date();

        await report.save();

        // Popola i dati per la risposta
        await report.populate('reporterId', 'username name avatarUrl');
        await report.populate('targetUserId', 'username name avatarUrl');
        await report.populate('targetSkillId', 'title category');
        await report.populate('moderatedBy', 'username name');

        // Log dell'azione
        console.log(`📝 Segnalazione ${id} aggiornata da ${req.user.username}: ${oldStatus} → ${report.status}`);

        res.json({
            success: true,
            data: report,
            message: `Segnalazione ${status === 'resolved' ? 'risolta' : status === 'dismissed' ? 'archiviata' : 'aggiornata'} con successo`
        });

    } catch (error) {
        console.error('Errore nell\'aggiornamento della segnalazione:', error);
        res.status(500).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
});

// ============================================
// 2. GESTIONE UTENTI
// ============================================

// GET /api/admin/users - Lista utenti con filtri, ricerca e paginazione
router.get('/users', authenticate, requireModerator, async (req, res) => {
    try {
        const { 
            search, 
            role, 
            status, 
            minRating, 
            page = 1, 
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Costruisci il filtro
        const filter = {};

        // Ricerca testuale
        if (search) {
            filter.$or = [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { name: { $regex: search, $options: 'i' } }
            ];
        }

        // Filtro per ruolo
        if (role) {
            filter.role = role;
        }

        // Filtro per stato (attivo/sospeso)
        if (status === 'active') {
            filter.active = true;
        } else if (status === 'suspended') {
            filter.active = false;
        }

        // Filtro per rating minimo
        if (minRating) {
            filter.rating = { $gte: parseFloat(minRating) };
        }

        // Costruisci l'ordinamento
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Esegui la query
        const users = await User.find(filter)
            .select('-password -fcmToken -fcmTokens')
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        // Conta il totale per la paginazione
        const total = await User.countDocuments(filter);

        // Calcola il numero di pagine
        const totalPages = Math.ceil(total / limit);

        // Popola statistiche aggiuntive per ogni utente (opzionale)
        const usersWithStats = await Promise.all(users.map(async (user) => {
            const userObj = user.toObject();
            
            // Conta le competenze dell'utente
            const skillCount = await Skill.countDocuments({ userId: user._id });
            userObj.skillCount = skillCount;

            // Conta le recensioni ricevute
            const reviewCount = await Review.countDocuments({ targetUserId: user._id });
            userObj.reviewCount = reviewCount;

            return userObj;
        }));

        res.json({
            success: true,
            data: usersWithStats,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            },
            filters: {
                search: search || null,
                role: role || null,
                status: status || null,
                minRating: minRating || null
            }
        });

    } catch (error) {
        console.error('Errore nel recupero degli utenti:', error);
        res.status(500).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
});

// PUT /api/admin/users/:id/status - Attiva o sospende un utente
router.put('/users/:id/status', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { active, reason } = req.body;

        // Validazione: il campo active è obbligatorio
        if (active === undefined || active === null) {
            return res.status(400).json({
                success: false,
                error: 'Il campo "active" è obbligatorio (true/false)'
            });
        }

        // Validazione: il campo active deve essere booleano
        if (typeof active !== 'boolean') {
            return res.status(400).json({
                success: false,
                error: 'Il campo "active" deve essere true o false'
            });
        }

        // Verifica che l'utente esista
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Utente non trovato'
            });
        }

        // Protezione: impedisci di disattivare se stesso
        if (user._id.toString() === req.user.id) {
            return res.status(403).json({
                success: false,
                error: 'Non puoi modificare lo stato del tuo stesso account'
            });
        }

        // Protezione: impedisci di disattivare l'ultimo admin
        if (active === false && user.role === 'admin') {
            const adminCount = await User.countDocuments({ role: 'admin', active: true });
            if (adminCount === 1) {
                return res.status(403).json({
                    success: false,
                    error: 'Non puoi sospendere l\'ultimo amministratore attivo'
                });
            }
        }

        // Salva lo stato precedente per il log
        const oldStatus = user.active;

        // Aggiorna lo stato
        user.active = active;
        user.suspensionReason = active ? null : (reason || 'Sospeso dall\'amministratore');
        user.suspendedAt = active ? null : new Date();
        user.updatedAt = new Date();

        await user.save();

        // Se l'utente è stato sospeso, invalida i suoi token (opzionale)
        if (!active) {
            // Potresti voler rimuovere i token FCM o invalidare i JWT
            // user.fcmTokens = [];
            // await user.save();
        }

        // Log dell'azione
        console.log(`🔒 Utente ${user.username} ${active ? 'riattivato' : 'sospeso'} da ${req.user.username}${reason ? ` (Motivo: ${reason})` : ''}`);

        // Restituisci i dati dell'utente (senza dati sensibili)
        const userData = user.getPublicProfile();

        res.json({
            success: true,
            data: {
                id: user._id,
                username: user.username,
                name: user.name,
                email: user.email,
                active: user.active,
                role: user.role,
                suspensionReason: user.suspensionReason,
                suspendedAt: user.suspendedAt,
                updatedAt: user.updatedAt
            },
            message: active ? 'Utente riattivato con successo' : 'Utente sospeso con successo'
        });

    } catch (error) {
        console.error('Errore nell\'aggiornamento dello stato utente:', error);
        res.status(500).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
});

// PUT /api/admin/users/:id/role - Cambia il ruolo di un utente
router.put('/users/:id/role', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        // Validazione: ruolo obbligatorio
        if (!role) {
            return res.status(400).json({
                success: false,
                error: 'Il campo "role" è obbligatorio'
            });
        }

        // Validazione: ruoli consentiti
        const validRoles = ['user', 'moderator', 'admin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                error: 'Ruolo non valido. Usa: user, moderator, admin'
            });
        }

        // Verifica che l'utente esista
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Utente non trovato'
            });
        }

        // Protezione: impedisci di cambiare il ruolo dell'ultimo admin
        if (role !== 'admin' && user.role === 'admin') {
            const adminCount = await User.countDocuments({ role: 'admin' });
            if (adminCount === 1) {
                return res.status(403).json({
                    success: false,
                    error: 'Non puoi rimuovere l\'ultimo amministratore'
                });
            }
        }

        // Protezione: impedisci di auto-degradarsi
        if (user._id.toString() === req.user.id) {
            return res.status(403).json({
                success: false,
                error: 'Non puoi cambiare il tuo stesso ruolo'
            });
        }

        // Salva il ruolo precedente per il log
        const oldRole = user.role;

        // Aggiorna il ruolo
        user.role = role;
        user.updatedAt = new Date();
        await user.save();

        // Log dell'azione
        console.log(`🔄 Ruolo di ${user.username} cambiato da ${oldRole} a ${role} da ${req.user.username}`);

        res.json({
            success: true,
            data: {
                id: user._id,
                username: user.username,
                role: user.role,
                updatedAt: user.updatedAt
            },
            message: `Ruolo aggiornato a ${role} con successo`
        });

    } catch (error) {
        console.error('Errore nel cambio di ruolo:', error);
        res.status(500).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
});

// ============================================
// 3. MODERAZIONE COMPETENZE
// ============================================

// GET /api/admin/skills - Lista competenze con filtri
router.get('/skills', authenticate, requireModerator, async (req, res) => {
    try {
        const { 
            status, 
            category, 
            type,
            search,
            page = 1, 
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Costruisci il filtro
        const filter = {};

        if (status) filter.status = status;
        if (category) filter.category = category;
        if (type) filter.type = type;

        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Costruisci l'ordinamento
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Esegui la query
        const skills = await Skill.find(filter)
            .populate('userId', 'username name avatarUrl')
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Skill.countDocuments(filter);

        res.json({
            success: true,
            data: skills,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit),
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1
            },
            filters: { status, category, type, search }
        });

    } catch (error) {
        console.error('Errore nel recupero delle competenze:', error);
        res.status(500).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
});

// PUT /api/admin/skills/:id/status - Approva/rifiuta una competenza
router.put('/skills/:id/status', authenticate, requireModerator, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, moderationNote } = req.body;

        // Validazione: stato obbligatorio
        if (!status) {
            return res.status(400).json({
                success: false,
                error: 'Il campo "status" è obbligatorio'
            });
        }

        // Validazione: stati consentiti
        const validStatuses = ['pending', 'approved', 'rejected'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Stato non valido. Usa: pending, approved, rejected'
            });
        }

        // Verifica che la competenza esista
        const skill = await Skill.findById(id);
        if (!skill) {
            return res.status(404).json({
                success: false,
                error: 'Competenza non trovata'
            });
        }

        // Salva lo stato precedente per il log
        const oldStatus = skill.status;

        // Aggiorna la competenza
        skill.status = status;
        skill.moderationNote = moderationNote || skill.moderationNote;
        skill.moderatedBy = req.user.id;
        skill.moderatedAt = new Date();
        skill.updatedAt = new Date();

        await skill.save();

        // Log dell'azione
        console.log(`📋 Competenza "${skill.title}" (${skill._id}) ${status === 'approved' ? 'approvata' : 'rifiutata'} da ${req.user.username}`);

        res.json({
            success: true,
            data: skill,
            message: `Competenza ${status === 'approved' ? 'approvata' : 'rifiutata'} con successo`
        });

    } catch (error) {
        console.error('Errore nella moderazione della competenza:', error);
        res.status(500).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
});

// ============================================
// 4. STATISTICHE E LOG
// ============================================

// GET /api/admin/stats - Statistiche generali
router.get('/stats', authenticate, requireModerator, async (req, res) => {
    try {
        const [users, skills, reviews, reports] = await Promise.all([
            User.countDocuments(),
            Skill.countDocuments(),
            Review.countDocuments(),
            Report.countDocuments()
        ]);

        const pendingReports = await Report.countDocuments({ status: 'pending' });
        const pendingSkills = await Skill.countDocuments({ status: 'pending' });

        res.json({
            success: true,
            data: {
                users,
                skills,
                reviews,
                reports,
                pendingReports,
                pendingSkills
            }
        });
    } catch (error) {
        console.error('Errore nel recupero delle statistiche:', error);
        res.status(500).json({ success: false, error: 'Errore interno del server' });
    }
});

// GET /api/admin/logs - Log delle attività di moderazione
router.get('/logs', authenticate, requireAdmin, async (req, res) => {
    try {
        const { 
            action, 
            userId,
            startDate,
            endDate,
            page = 1, 
            limit = 50,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Costruisci il filtro
        const filter = {};

        if (action) filter.action = action;
        if (userId) filter.userId = userId;

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        // Costruisci l'ordinamento
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Esegui la query
        const logs = await ModerationLog.find(filter)
            .populate('userId', 'username name')
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await ModerationLog.countDocuments(filter);

        res.json({
            success: true,
            data: logs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Errore nel recupero dei log:', error);
        res.status(500).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
});

// ============================================
// ESPORTAZIONE
// ============================================
module.exports = router;