const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const User = require('../models/User');
const Skill = require('../models/Skill');

// ============================================
// GET /api/bookings/history/:userId
// Recupera lo storico prenotazioni di un utente
// ============================================
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      page = 1, 
      limit = 10, 
      category, 
      status, 
      startDate, 
      endDate 
    } = req.query;

    // Validazione userId
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'ID utente non fornito'
      });
    }

    // Verifica che l'utente esista
    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.status(404).json({
        success: false,
        error: 'Utente non trovato'
      });
    }

    // Costruisci il filtro per le prenotazioni
    let filter = {
      $or: [
        { clientId: userId },
        { professionalId: userId }
      ]
    };

    // Filtro per status
    if (status) {
      const validStatuses = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Status non valido'
        });
      }
      filter.status = status;
    }

    // Filtro per categoria
    if (category) {
      const skills = await Skill.find({ 
        category: { $regex: category, $options: 'i' } 
      });
      const skillIds = skills.map(s => s._id);
      if (skillIds.length > 0) {
        filter.skillId = { $in: skillIds };
      } else {
        // Nessuna skill trovata per questa categoria
        return res.json({
          success: true,
          data: [],
          pagination: {
            total: 0,
            page: parseInt(page),
            limit: parseInt(limit)
          }
        });
      }
    }

    // Filtro per data
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) {
          filter.date.$gte = start;
        }
      }
      if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          filter.date.$lte = end;
        }
      }
      if (Object.keys(filter.date).length === 0) {
        delete filter.date;
      }
    }

    // Calcola il totale per la paginazione
    const total = await Booking.countDocuments(filter);

    // Recupera le prenotazioni con paginazione e popolamento
    const bookings = await Booking.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .populate('clientId', 'name avatar email')
      .populate('professionalId', 'name avatar email')
      .populate('skillId', 'title category description price');

    // Formatta la risposta
    const formattedBookings = bookings.map(booking => ({
      id: booking._id,
      skillId: booking.skillId?._id || null,
      skillTitle: booking.skillId?.title || 'Skill non disponibile',
      skillCategory: booking.skillId?.category || null,
      clientId: booking.clientId?._id || null,
      clientName: booking.clientId?.name || 'Utente non disponibile',
      clientAvatar: booking.clientId?.avatar || null,
      professionalId: booking.professionalId?._id || null,
      professionalName: booking.professionalId?.name || 'Professionista non disponibile',
      professionalAvatar: booking.professionalId?.avatar || null,
      date: booking.date ? booking.date.toISOString().split('T')[0] : null,
      timeSlot: booking.timeSlot,
      amount: booking.amount,
      status: booking.status || 'pending',
      completedAt: booking.completedAt ? booking.completedAt.toISOString() : null,
      createdAt: booking.createdAt ? booking.createdAt.toISOString() : null
    }));

    res.json({
      success: true,
      data: formattedBookings,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('❌ Errore nel recupero dello storico prenotazioni:', error);
    res.status(500).json({
      success: false,
      error: 'Errore nel recupero dello storico prenotazioni',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================
// GET /api/bookings/history/:userId/stats
// Recupera le statistiche delle prenotazioni
// ============================================
router.get('/history/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params;

    // Verifica che l'utente esista
    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.status(404).json({
        success: false,
        error: 'Utente non trovato'
      });
    }

    // Statistiche per tutte le prenotazioni dell'utente
    const stats = await Booking.aggregate([
      {
        $match: {
          $or: [
            { clientId: new mongoose.Types.ObjectId(userId) },
            { professionalId: new mongoose.Types.ObjectId(userId) }
          ]
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    // Formatta le statistiche
    const formattedStats = {
      total: 0,
      pending: 0,
      confirmed: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
      totalAmount: 0,
      completedAmount: 0
    };

    stats.forEach(stat => {
      formattedStats[stat._id] = stat.count;
      formattedStats.total += stat.count;
      if (stat._id === 'completed') {
        formattedStats.completedAmount = stat.totalAmount;
      }
      formattedStats.totalAmount += stat.totalAmount;
    });

    res.json({
      success: true,
      data: formattedStats
    });

  } catch (error) {
    console.error('❌ Errore nel recupero delle statistiche:', error);
    res.status(500).json({
      success: false,
      error: 'Errore nel recupero delle statistiche'
    });
  }
});

module.exports = router;