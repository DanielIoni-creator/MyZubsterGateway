// robot_animal_assistance.js – Robot per assistenza animali abbandonati/feriti
const escrowRobot = require('./escrow_robot');
const { notifyUser, notifyRobot } = require('./notifications');

// Database in memoria (in produzione: MongoDB)
const animalReports = new Map();
const rescueHistory = new Map();

// Stati possibili
const STATUS = {
  REPORTED: 'REPORTED',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  RESCUED: 'RESCUED',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
};

// Crea una segnalazione animale
async function reportAnimal({
  reportId,
  clientId,
  robotId,
  animalType,
  location,
  description,
  severity = 'medium', // low, medium, high, critical
  photoUrl = null,
  amount = 50,
  currency = 'MYZ'
}) {
  // Crea escrow per il salvataggio
  const escrow = await escrowRobot.createEscrow({
    jobId: reportId,
    clientId,
    robotId,
    amount,
    currency
  });

  const report = {
    reportId,
    clientId,
    robotId,
    animalType,
    location,
    description,
    severity,
    photoUrl,
    status: STATUS.REPORTED,
    escrow,
    reportedAt: Date.now(),
    assignedAt: null,
    rescuedAt: null,
    completedAt: null,
    notes: [],
    vetContacted: false
  };

  animalReports.set(reportId, report);
  
  await notifyRobot(robotId, `🐾 Nuova segnalazione animale: ${animalType} a ${location}. Severità: ${severity}.`);
  await notifyUser(clientId, `✅ Segnalazione #${reportId} ricevuta. Un robot sta arrivando.`);

  return report;
}

// Assegna un robot alla segnalazione
async function assignRobot(reportId, robotId) {
  const report = animalReports.get(reportId);
  if (!report) throw new Error(`Segnalazione ${reportId} non trovata`);
  if (report.status !== STATUS.REPORTED) {
    throw new Error(`Segnalazione già in stato ${report.status}`);
  }

  report.robotId = robotId;
  report.status = STATUS.ASSIGNED;
  report.assignedAt = Date.now();

  await notifyRobot(robotId, `🚀 Sei stato assegnato alla segnalazione #${reportId}. ${report.animalType} a ${report.location}.`);
  await notifyUser(report.clientId, `🤖 Robot ${robotId} sta arrivando per ${report.animalType}.`);

  return report;
}

// Robot inizia il soccorso
async function startRescue(reportId) {
  const report = animalReports.get(reportId);
  if (!report) throw new Error(`Segnalazione ${reportId} non trovata`);
  if (report.status !== STATUS.ASSIGNED) {
    throw new Error(`Robot non ancora assegnato o già in corso`);
  }

  report.status = STATUS.IN_PROGRESS;
  report.notes.push({
    timestamp: Date.now(),
    message: `🚑 Robot arrivato sul posto. Inizio soccorso per ${report.animalType}.`
  });

  await notifyUser(report.clientId, `🚑 Robot sul posto. Sta aiutando l'animale.`);
  await notifyRobot(report.robotId, `🚑 Sei sul posto. Inizia il soccorso.`);

  return report;
}

// Completa il salvataggio (animale salvato)
async function completeRescue(reportId, notes = '') {
  const report = animalReports.get(reportId);
  if (!report) throw new Error(`Segnalazione ${reportId} non trovata`);
  if (report.status !== STATUS.IN_PROGRESS) {
    throw new Error(`Il soccorso non è iniziato o già completato`);
  }

  report.status = STATUS.RESCUED;
  report.rescuedAt = Date.now();
  report.notes.push({
    timestamp: Date.now(),
    message: `✅ Animale salvato! ${notes}`
  });

  // Marca l'escrow come consegnato
  await escrowRobot.markDelivered({ jobId: reportId });

  // Notifiche
  await notifyUser(report.clientId, `🐾 Animale salvato con successo! ${notes}`);
  await notifyRobot(report.robotId, `🏆 Animale salvato! Hai guadagnato ${report.escrow.amount} ${report.escrow.currency}.`);

  // Salva nello storico
  rescueHistory.set(reportId, {
    ...report,
    completedAt: Date.now()
  });

  return report;
}

// Fallisce il salvataggio (animale non salvato)
async function failRescue(reportId, reason) {
  const report = animalReports.get(reportId);
  if (!report) throw new Error(`Segnalazione ${reportId} non trovata`);

  report.status = STATUS.FAILED;
  report.notes.push({
    timestamp: Date.now(),
    message: `❌ Salvataggio fallito: ${reason}`
  });

  await notifyUser(report.clientId, `❌ Purtroppo il salvataggio è fallito. Motivo: ${reason}`);
  await notifyRobot(report.robotId, `❌ Salvataggio fallito per ${reportId}. Motivo: ${reason}`);

  return report;
}

// Aggiungi una nota al report
async function addNote(reportId, note) {
  const report = animalReports.get(reportId);
  if (!report) throw new Error(`Segnalazione ${reportId} non trovata`);
  
  report.notes.push({
    timestamp: Date.now(),
    message: note
  });

  return report;
}

// Ottieni stato di una segnalazione
function getReport(reportId) {
  return animalReports.get(reportId) || null;
}

// Lista tutte le segnalazioni attive
function listActiveReports() {
  const active = [];
  for (const [id, report] of animalReports) {
    if (![STATUS.COMPLETED, STATUS.FAILED].includes(report.status)) {
      active.push({ reportId: id, ...report });
    }
  }
  return active;
}

// Statistiche
function getStats() {
  const total = animalReports.size;
  let rescued = 0,
    failed = 0,
    inProgress = 0;

  for (const [, report] of animalReports) {
    if (report.status === STATUS.RESCUED || report.status === STATUS.COMPLETED) rescued++;
    else if (report.status === STATUS.FAILED) failed++;
    else if (report.status === STATUS.IN_PROGRESS) inProgress++;
  }

  return { total, rescued, failed, inProgress, active: total - rescued - failed };
}

module.exports = {
  reportAnimal,
  assignRobot,
  startRescue,
  completeRescue,
  failRescue,
  addNote,
  getReport,
  listActiveReports,
  getStats,
  STATUS
};
