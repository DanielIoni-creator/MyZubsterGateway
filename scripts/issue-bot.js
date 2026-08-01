#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configurazione
const ORG = 'MyZubster-Ecosystem';
const REPOS = [
  'MyZubsterGateway',
  'MyZubster-App',
  'MyZubster-Marketplace'
];

// Funzione per eseguire comandi shell
function runCommand(cmd) {
  return new Promise((resolve) => {
    exec(cmd, (error, stdout, stderr) => {
      resolve(stdout.trim());
    });
  });
}

// Funzione per aggiornare PENDING_PAYMENTS.md
async function updatePendingPayments(issueNumber, repo, contributor) {
  const filePath = path.join(__dirname, '../PENDING_PAYMENTS.md');
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Cerca la riga della tabella
  const newRow = `| #${issueNumber} | ${contributor} | 0.06 | [Pending] | ${new Date().toISOString().split('T')[0]} | ⏳ Awaiting payment |\n`;
  
  // Inserisci la nuova riga dopo l'intestazione
  const lines = content.split('\n');
  const insertIndex = lines.findIndex(line => line.startsWith('| ---')) + 1;
  lines.splice(insertIndex, 0, newRow);
  
  fs.writeFileSync(filePath, lines.join('\n'));
  console.log(`✅ Pending payment added for issue #${issueNumber}`);
}

// Funzione per rispondere a un commento
async function handleIssueComment(repo, issueNumber, commenter) {
  console.log(`📝 Issue #${issueNumber} in ${repo} claimed by ${commenter}`);
  
  // 1. Assegna l'issue
  await runCommand(`gh issue edit ${issueNumber} --add-assignee ${commenter} -R ${ORG}/${repo}`);
  
  // 2. Aggiungi il label "claimed"
  await runCommand(`gh issue edit ${issueNumber} --add-label claimed -R ${ORG}/${repo}`);
  
  // 3. Aggiorna PENDING_PAYMENTS.md (solo per MyZubsterGateway)
  if (repo === 'MyZubsterGateway') {
    await updatePendingPayments(issueNumber, repo, commenter);
  }
  
  // 4. Commenta automaticamente
  const comment = `@${commenter} Grazie per esserti offerto! 🚀

**Confermo:**
- La ricompensa è **0.06 XMR** (≈ €12.00)
- Il payment rail è **Monero (XMR)** sulla rete Monero (mainnet)
- Indirizzi validi iniziano con \`4\` o \`8\`

**Termini:**
- Hai **24 ore** per aprire una PR
- La PR deve referenziare l'issue: \`Closes #${issueNumber}\`
- Includi il tuo indirizzo XMR nella descrizione della PR

**⚠️ NOTA SUL PAGAMENTO:**
- Il fondo bounty è attualmente in fase di ricarica
- Il pagamento verrà effettuato **entro 30 giorni** dal merge della PR
- Tutti i pagamenti in sospeso sono tracciati in [PENDING_PAYMENTS.md](https://github.com/MyZubster-Ecosystem/MyZubsterGateway/blob/main/PENDING_PAYMENTS.md)

Buon lavoro! 🙏🌱`;

  await runCommand(`gh issue comment ${issueNumber} --body "${comment}" -R ${ORG}/${repo}`);
  console.log(`✅ Comment added to issue #${issueNumber}`);
}

// Funzione principale
async function main() {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.log('Usage: node issue-bot.js <repo> <issue-number> <commenter>');
    console.log('Example: node issue-bot.js MyZubster-App 54 foxxx009');
    process.exit(1);
  }

  const [repo, issueNumber, commenter] = args;
  await handleIssueComment(repo, issueNumber, commenter);
}

// Esegui lo script
main().catch(console.error);
