const { exec } = require('child_process');
const fs = require('fs');

// Configurazione
const ORG = "MyZubster-Ecosystem";
const REPOS = [
  "MyZubster-Marketplace",
  "myzubster",
  "MyZubsterGateway",
  "myzubster-docs",
  "ai-automation",
  "MyZubster-App",
  "myzubster-animals"
];

// Funzione per eseguire comandi shell e restituire il risultato
function runCommand(cmd) {
  return new Promise((resolve) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`Errore: ${error.message}`);
        resolve("0");
        return;
      }
      resolve(stdout.trim());
    });
  });
}

// Funzione principale
async function checkGitHubStatus() {
  let report = `📊 **MyZubster Ecosystem Status Report**\n`;
  report += `📅 ${new Date().toLocaleString()}\n\n`;

  let totalIssues = 0;
  let totalPRs = 0;
  let mergablePRs = 0;

  for (const repo of REPOS) {
    const repoFull = `${ORG}/${repo}`;
    
    // 1. Conta le issue aperte
    const issueCountCmd = `gh issue list -R ${repoFull} --state open --limit 1000 | wc -l`;
    const issueCount = parseInt(await runCommand(issueCountCmd)) || 0;
    totalIssues += issueCount;

    // 2. Conta le PR aperte
    const prCountCmd = `gh pr list -R ${repoFull} --state open --limit 1000 | wc -l`;
    const prCount = parseInt(await runCommand(prCountCmd)) || 0;
    totalPRs += prCount;

    // 3. Conta le PR mergiabili (non draft e con status check passato)
    // Nota: questo comando è più complesso, per ora contiamo tutte le PR non draft
    const mergableCmd = `gh pr list -R ${repoFull} --state open --limit 1000 --json isDraft | grep -c '"isDraft":false' || echo "0"`;
    const mergableCount = parseInt(await runCommand(mergableCmd)) || 0;
    mergablePRs += mergableCount;

    if (issueCount > 0 || prCount > 0) {
      report += `\n📂 **${repo}**\n`;
      if (issueCount > 0) report += `   - Issues: ${issueCount}\n`;
      if (prCount > 0) report += `   - PRs: ${prCount} (${mergableCount} ready to merge)\n`;
    }
  }

  report += `\n📈 **Totals:**\n`;
  report += `   - Total Issues: ${totalIssues}\n`;
  report += `   - Total PRs: ${totalPRs}\n`;
  report += `   - PRs Ready to Merge: ${mergablePRs}\n`;

  // Salva il report in un file
  fs.writeFileSync('gateway_report.txt', report);
  console.log(report);
}

// Esegui il controllo
checkGitHubStatus();
