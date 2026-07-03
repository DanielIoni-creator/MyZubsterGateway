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

        // Log dell'azione (opzionale)
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