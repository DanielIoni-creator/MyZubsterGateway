const FabbricaLunare = require('../models/FabbricaLunare');
const crypto = require('crypto');
const mongoose = require('mongoose');

const DEFAULT_USER_ID = new mongoose.Types.ObjectId('000000000000000000000001');

const getUserId = (req) => {
  if (req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)) {
    return req.user._id;
  }
  return DEFAULT_USER_ID;
};

// ============ GESTIONE FABBRICA ============

// Registra fabbrica
exports.registraFabbrica = async (req, res) => {
  try {
    const fabbrica = new FabbricaLunare({
      ...req.body,
      proprietarioId: getUserId(req)
    });
    await fabbrica.save();
    res.status(201).json({ success: true, fabbrica });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lista fabbriche
exports.getFabbriche = async (req, res) => {
  try {
    const fabbriche = await FabbricaLunare.find({ proprietarioId: getUserId(req) });
    res.json({ success: true, count: fabbriche.length, fabbriche });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Dettaglio fabbrica
exports.getFabbricaDetails = async (req, res) => {
  try {
    const fabbrica = await FabbricaLunare.findById(req.params.id);
    if (!fabbrica) {
      return res.status(404).json({ error: 'Fabbrica non trovata' });
    }
    res.json({ success: true, fabbrica });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Aggiorna fabbrica
exports.updateFabbrica = async (req, res) => {
  try {
    const fabbrica = await FabbricaLunare.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!fabbrica) {
      return res.status(404).json({ error: 'Fabbrica non trovata' });
    }
    res.json({ success: true, fabbrica });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Elimina fabbrica
exports.deleteFabbrica = async (req, res) => {
  try {
    await FabbricaLunare.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Fabbrica eliminata' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ PRODOTTI ============

// Aggiungi prodotto
exports.aggiungiProdotto = async (req, res) => {
  try {
    const fabbrica = await FabbricaLunare.findById(req.params.id);
    if (!fabbrica) {
      return res.status(404).json({ error: 'Fabbrica non trovata' });
    }
    
    fabbrica.prodotti.push(req.body);
    fabbrica.updatedAt = Date.now();
    await fabbrica.save();
    
    res.status(201).json({
      success: true,
      prodotto: fabbrica.prodotti[fabbrica.prodotti.length - 1]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ ORDINI ============

// Crea ordine
exports.creaOrdine = async (req, res) => {
  try {
    const { prodottoId, quantita } = req.body;
    const fabbrica = await FabbricaLunare.findById(req.params.id);
    if (!fabbrica) {
      return res.status(404).json({ error: 'Fabbrica non trovata' });
    }
    
    const prodotto = fabbrica.prodotti.id(prodottoId);
    if (!prodotto) {
      return res.status(404).json({ error: 'Prodotto non trovato' });
    }
    
    // Verifica materiali disponibili
    const materiali = prodotto.materiali || {};
    if (fabbrica.magazzino.materiePrime.regolite < (materiali.regolite || 0) * quantita ||
        fabbrica.magazzino.materiePrime.acqua < (materiali.acqua || 0) * quantita ||
        fabbrica.magazzino.materiePrime.metalli < (materiali.metalli || 0) * quantita ||
        fabbrica.magazzino.materiePrime.polimeri < (materiali.polimeri || 0) * quantita) {
      return res.status(400).json({ error: 'Materiali insufficienti' });
    }
    
    // Consuma materiali
    fabbrica.magazzino.materiePrime.regolite -= (materiali.regolite || 0) * quantita;
    fabbrica.magazzino.materiePrime.acqua -= (materiali.acqua || 0) * quantita;
    fabbrica.magazzino.materiePrime.metalli -= (materiali.metalli || 0) * quantita;
    fabbrica.magazzino.materiePrime.polimeri -= (materiali.polimeri || 0) * quantita;
    
    const ordine = {
      prodottoId,
      quantita,
      dataInizio: new Date(),
      stato: 'in_produzione',
      costo: prodotto.costoProduzione * quantita,
      ricavo: prodotto.prezzoVendita * quantita
    };
    
    fabbrica.ordini.push(ordine);
    fabbrica.statistiche.ordiniTotali += 1;
    fabbrica.stato = 'produzione';
    await fabbrica.save();
    
    res.status(201).json({
      success: true,
      ordine: fabbrica.ordini[fabbrica.ordini.length - 1]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Completa ordine
exports.completaOrdine = async (req, res) => {
  try {
    const { valutazione } = req.body;
    const fabbrica = await FabbricaLunare.findById(req.params.id);
    if (!fabbrica) {
      return res.status(404).json({ error: 'Fabbrica non trovata' });
    }
    
    const ordine = fabbrica.ordini.id(req.params.ordineId);
    if (!ordine) {
      return res.status(404).json({ error: 'Ordine non trovato' });
    }
    
    ordine.stato = 'completato';
    ordine.dataFine = new Date();
    ordine.valutazione = valutazione || 5;
    
    // Aggiungi a magazzino prodotti finiti
    const prodotto = fabbrica.prodotti.id(ordine.prodottoId);
    if (prodotto) {
      const currentStock = fabbrica.magazzino.prodottiFiniti.get(prodotto.nome) || 0;
      fabbrica.magazzino.prodottiFiniti.set(prodotto.nome, currentStock + ordine.quantita);
    }
    
    fabbrica.statistiche.ordiniCompletati += 1;
    fabbrica.statistiche.prodottiProdotti += ordine.quantita;
    fabbrica.statistiche.ricaviTotali += ordine.ricavo || 0;
    fabbrica.stato = 'attiva';
    await fabbrica.save();
    
    res.json({
      success: true,
      ordine,
      ricavo: ordine.ricavo
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ MAGAZZINO ============

// Aggiungi materie prime
exports.aggiungiMateriePrime = async (req, res) => {
  try {
    const { materiale, quantita } = req.body;
    const fabbrica = await FabbricaLunare.findById(req.params.id);
    if (!fabbrica) {
      return res.status(404).json({ error: 'Fabbrica non trovata' });
    }
    
    if (fabbrica.magazzino.materiePrime[materiale] !== undefined) {
      fabbrica.magazzino.materiePrime[materiale] += quantita;
      await fabbrica.save();
      
      res.json({
        success: true,
        materiale: fabbrica.magazzino.materiePrime
      });
    } else {
      res.status(400).json({ error: 'Materiale non valido' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ STATISTICHE ============

// Statistiche fabbrica
exports.getStats = async (req, res) => {
  try {
    const fabbrica = await FabbricaLunare.findById(req.params.id);
    if (!fabbrica) {
      return res.status(404).json({ error: 'Fabbrica non trovata' });
    }
    
    res.json({
      success: true,
      stats: {
        ordiniTotali: fabbrica.statistiche.ordiniTotali,
        ordiniCompletati: fabbrica.statistiche.ordiniCompletati,
        prodottiProdotti: fabbrica.statistiche.prodottiProdotti,
        oreProduzione: fabbrica.statistiche.oreProduzione,
        ricaviTotali: fabbrica.statistiche.ricaviTotali,
        magazzino: fabbrica.magazzino,
        prodotti: fabbrica.prodotti
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
