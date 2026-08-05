/**
 * Helper per lo scenario Artillery - Bounty P5 (#269)
 *
 * Ogni utente virtuale ha bisogno di id univoci: il gateway rifiuta i robotId
 * duplicati (`Robot X già esiste`), quindi riusare gli id falserebbe i risultati
 * trasformando le richieste in errori 400.
 */

let counter = 0;

function uid(prefix) {
  counter += 1;
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${process.pid}-${counter}-${random}`;
}

function generateIds(context, events, done) {
  context.vars.robotId = uid('lt-robot');
  context.vars.jobId = uid('lt-job');
  context.vars.clientId = uid('lt-client');
  context.vars.escrowId = uid('lt-escrow');
  context.vars.currency = counter % 2 === 0 ? 'MYZ' : 'XMR';
  return done();
}

module.exports = { generateIds };
