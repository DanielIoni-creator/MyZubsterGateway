#!/usr/bin/env node
/**
 * publish-devto.js – Script per pubblicare/aggiornare il post su dev.to
 * Uso: node scripts/publish-devto.js [--publish]
 *   --publish  : Imposta published: true (default: false, salva come bozza)
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const readline = require('readline');

// Configurazione
const CONFIG = {
  apiKey: process.env.DEVTO_API_KEY || '',
  articleId: process.env.DEVTO_ARTICLE_ID || null, // per aggiornamenti
  filePath: path.join(__dirname, '..', 'devto-post.md'),
};

// Helper per fare domande all'utente
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer));
  });
}

// Legge il file markdown e separa frontmatter dal body
function readPostFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  // Cerca il frontmatter (---)
  let frontmatter = {};
  let bodyStart = 0;
  let inFrontmatter = false;
  let frontmatterLines = [];

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      if (!inFrontmatter) {
        inFrontmatter = true;
        continue;
      } else {
        inFrontmatter = false;
        bodyStart = i + 1;
        break;
      }
    }
    if (inFrontmatter) {
      frontmatterLines.push(lines[i]);
    }
  }

  // Parsing del frontmatter (YAML-like)
  frontmatterLines.forEach((line) => {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      // Rimuovi virgolette se presenti
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      if (key === 'tags') {
        frontmatter.tags = value.split(',').map(t => t.trim());
      } else {
        frontmatter[key] = value;
      }
    }
  });

  const body = lines.slice(bodyStart).join('\n').trim();

  return { frontmatter, body };
}

// Funzione principale
async function main() {
  // 1. Verifica l'API key
  let apiKey = CONFIG.apiKey;
  if (!apiKey) {
    apiKey = await ask('🔑 Inserisci la tua dev.to API key (da https://dev.to/settings/account): ');
    if (!apiKey) {
      console.error('❌ API key obbligatoria.');
      process.exit(1);
    }
  }

  // 2. Leggi il file
  const filePath = CONFIG.filePath;
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File ${filePath} non trovato.`);
    process.exit(1);
  }

  const { frontmatter, body } = readPostFile(filePath);
  console.log(`📝 Titolo: ${frontmatter.title || 'Non specificato'}`);
  console.log(`🏷️  Tag: ${frontmatter.tags?.join(', ') || 'Nessuno'}`);

  // 3. Determina se pubblicare o bozza
  const isPublished = process.argv.includes('--publish');
  console.log(`📌 Modalità: ${isPublished ? 'PUBBLICA' : 'BOZZA'}`);

  // 4. Costruisci il payload
  const payload = {
    article: {
      title: frontmatter.title || 'Untitled',
      body_markdown: body,
      published: isPublished,
      tags: frontmatter.tags || ['nodejs', 'blockchain'],
    },
  };

  // 5. Decide se creare o aggiornare
  const articleId = CONFIG.articleId || process.env.DEVTO_ARTICLE_ID || null;

  try {
    let response;
    if (articleId) {
      // UPDATE
      console.log(`🔄 Aggiornamento articolo ${articleId}...`);
      response = await axios.put(
        `https://dev.to/api/articles/${articleId}`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'api-key': apiKey,
          },
        }
      );
      console.log(`✅ Articolo aggiornato!`);
    } else {
      // CREATE
      console.log(`🚀 Creazione nuovo articolo...`);
      response = await axios.post(
        'https://dev.to/api/articles',
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'api-key': apiKey,
          },
        }
      );
      console.log(`✅ Articolo creato!`);
    }

    // 6. Mostra il risultato
    const data = response.data;
    console.log(`🔗 URL: https://dev.to/${data.user?.username || 'unknown'}/${data.slug || 'article'}`);
    console.log(`🆔 ID: ${data.id || 'N/A'}`);

    // Salva l'ID in un file .env per aggiornamenti futuri
    if (data.id && !articleId) {
      fs.appendFileSync('.env.devto', `\nDEVTO_ARTICLE_ID=${data.id}\n`);
      console.log(`💾 ID salvato in .env.devto`);
    }

  } catch (error) {
    console.error('❌ Errore:', error.response?.data || error.message);
    if (error.response?.data?.errors) {
      console.error('Dettaglio:', error.response.data.errors);
    }
    process.exit(1);
  }

  rl.close();
}

// Esegui
if (require.main === module) {
  main();
}

module.exports = { readPostFile };
