const { exec } = require('child_process');
const fs = require('fs');

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

async function checkGitHubStatus() {
  let report = `📊 **MyZubster Ecosystem Status Report**\n`;
  report += `📅 ${new Date().toLocaleString()}\n\n`;

  let totalIssues = 0;
  let totalPRs = 0;
  let mergablePRs = 0;
  let pendingBounties = 0;
  let pendingAmount = 0;
  let bountyDetails = [];

  for (const repo of REPOS) {
    const repoFull = `${ORG}/${repo}`;
    
    const issueCount = parseInt(await runCommand(`gh issue list -R ${repoFull} --state open --limit 1000 | wc -l`)) || 0;
    totalIssues += issueCount;

    const prCount = parseInt(await runCommand(`gh pr list -R ${repoFull} --state open --limit 1000 | wc -l`)) || 0;
    totalPRs += prCount;

    const mergableCount = parseInt(await runCommand(`gh pr list -R ${repoFull} --state open --limit 1000 --json isDraft | grep -c '"isDraft":false' || echo "0"`)) || 0;
    mergablePRs += mergableCount;

    if (issueCount > 0 || prCount > 0) {
      report += `\n📂 **${repo}**\n`;
      if (issueCount > 0) report += `   - Issues: ${issueCount}\n`;
      if (prCount > 0) report += `   - PRs: ${prCount} (${mergableCount} ready to merge)\n`;
    }
  }

  try {
    const contributors = fs.readFileSync('/root/myzubster/CONTRIBUTORS.md', 'utf8');
    const pendingMatches = contributors.match(/⏳ Pending Payments.*?(?=\n##|$)/s);
    if (pendingMatches) {
      const lines = pendingMatches[0].split('\n');
      for (const line of lines) {
        if (line.includes('XMR')) {
          pendingBounties++;
          const amountMatch = line.match(/(\d+\.\d+)\s+XMR/);
          if (amountMatch) {
            pendingAmount += parseFloat(amountMatch[1]);
            
            const contributorMatch = line.match(/@([A-Za-z0-9_-]+)/);
            
            // Regex definitivo per trovare l'indirizzo Monero (lungo e alfanumerico)
            const addressMatch = line.match(/[A-Za-z0-9]{95,}/);
            const address = addressMatch ? addressMatch[0] : 'Not provided';

            bountyDetails.push({
              contributor: contributorMatch ? contributorMatch[1] : 'Unknown',
              amount: amountMatch[1],
              address: address
            });
          }
        }
      }
    }
  } catch (err) {
    report += `\n⚠️  Could not read CONTRIBUTORS.md\n`;
  }

  report += `\n📈 **Totals:**\n`;
  report += `   - Total Issues: ${totalIssues}\n`;
  report += `   - Total PRs: ${totalPRs}\n`;
  report += `   - PRs Ready to Merge: ${mergablePRs}\n`;
  report += `   - Pending Bounties: ${pendingBounties} issues\n`;
  report += `   - Total Pending XMR: ${pendingAmount.toFixed(3)} XMR\n`;

  if (bountyDetails.length > 0) {
    report += `\n🔗 **Pending Bounty Details:**\n`;
    for (const b of bountyDetails) {
      report += `   - @${b.contributor} → ${b.amount} XMR | Address: ${b.address}\n`;
    }
  }

  fs.writeFileSync('gateway_report.txt', report);
  console.log(report);
}

checkGitHubStatus();
