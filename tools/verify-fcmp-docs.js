'use strict';
//
// verify-fcmp-docs.js -- standalone, dependency-free verifier for the FCMP++
// research deliverables of issue #56 (MyZubsterGateway).
//
// Run:   node tools/verify-fcmp-docs.js
// Exit:  0 = PASS, 1 = FAIL
//
// It asserts:
//   - the three required .md files exist and are non-trivial in length;
//   - the research doc contains the required sections;
//   - the testnet guide contains the required sections;
//   - the index maps issue #56 deliverables;
//   - every doc references issue #56;
//   - no doc leaks mainnet keys / seeds / mnemonics / private keys.
//
// No network access, no wallet, no signing. Pure text assertions.

const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.resolve(__dirname, '..', 'docs');
const FILES = {
  research: path.join(DOCS_DIR, 'fcmp-plus-plus-research.md'),
  guide: path.join(DOCS_DIR, 'fcmp-plus-plus-testnet-guide.md'),
  index: path.join(DOCS_DIR, 'fcmp-plus-plus-index.md'),
};

const failures = [];
function ok(cond, msg) {
  if (cond) {
    console.log('  PASS  ' + msg);
  } else {
    console.log('  FAIL  ' + msg);
    failures.push(msg);
  }
}

function read(p) {
  const buf = fs.readFileSync(p, 'utf8');
  return buf;
}

// Required markdown headings (case-insensitive substring of any heading line).
// A heading line starts with one or more '#'.
function headings(text) {
  return text.split(/\r?\n/).filter(l => /^#{1,6}\s/.test(l)).join('\n').toLowerCase();
}

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

// Patterns that would indicate leakage of real secrets. We only forbid
// real-looking private material, not the words "key"/"seed" in prose.
const SECRET_PATTERNS = [
  /-----BEGIN.*PRIVATE KEY-----/i,
  /\bmnemonic\b.*\b(word|seed|phrase)\b/i,
  /\b(25|24|25)\s+word\b/i,
  /\bview\s+key\s*[:=]\s*[0-9A-Fa-f]{32,}/i,
  /\bspend\s+key\s*[:=]\s*[0-9A-Fa-f]{32,}/i,
  /\bseed\s*[:=]\s*[0-9A-Fa-f]{16,}/i,
  /\b4[A-Za-z0-9]{80,}\b/, // a Monero address (starts with 4, long base58)
  /\b83[A-Za-z0-9]{90,}/,  // a Monero stagenet/secondary address
];

function findSecrets(text) {
  const hits = [];
  for (const re of SECRET_PATTERNS) {
    const m = text.match(re);
    if (m) hits.push(m[0].slice(0, 60));
  }
  return hits;
}

function main() {
  console.log('Verifying FCMP++ docs for issue #56...\n');

  // Existence + read
  let research, guide, index;
  try { research = read(FILES.research); ok(true, 'research doc exists: ' + FILES.research); }
  catch (e) { ok(false, 'research doc exists: ' + FILES.research); return finish(); }
  try { guide = read(FILES.guide); ok(true, 'testnet guide exists: ' + FILES.guide); }
  catch (e) { ok(false, 'testnet guide exists: ' + FILES.guide); return finish(); }
  try { index = read(FILES.index); ok(true, 'index doc exists: ' + FILES.index); }
  catch (e) { ok(false, 'index doc exists: ' + FILES.index); return finish(); }

  const allText = research + '\n' + guide + '\n' + index;

  // Word counts (substance check)
  ok(wordCount(research) >= 700, 'research doc word count >= 700 (got ' + wordCount(research) + ')');
  ok(wordCount(guide) >= 500, 'testnet guide word count >= 500 (got ' + wordCount(guide) + ')');
  ok(wordCount(index) >= 150, 'index doc word count >= 150 (got ' + wordCount(index) + ')');

  // Issue #56 reference everywhere
  ok(/#56\b/.test(research), 'research doc references issue #56');
  ok(/#56\b/.test(guide) || /issue #56\b/i.test(guide), 'testnet guide references issue #56');
  ok(/#56\b/.test(index), 'index doc references issue #56');

  // Research doc required sections
  const rh = headings(research);
  ok(/executive summary/.test(rh), 'research: Executive Summary section');
  ok(/how fcmp\+\+ works/.test(rh), 'research: How FCMP++ Works section');
  ok(/fcmp\+\+ vs ring signatures/.test(rh), 'research: FCMP++ vs Ring Signatures section');
  ok(/benefits for myzubster/.test(rh), 'research: Benefits for MyZubster section');
  ok(/integration requirements/.test(rh), 'research: Integration Requirements section');
  ok(/current status/.test(rh), 'research: Current Status section');
  ok(/references/.test(rh), 'research: References section');

  // Testnet guide required sections
  const gh = headings(guide);
  ok(/scope and preconditions/.test(gh), 'guide: Scope and Preconditions section');
  ok(/prepare an isolated testnet node/.test(gh), 'guide: Prepare node section');
  ok(/run a seraphis-capable wallet/.test(gh), 'guide: Wallet section');
  ok(/fund the testnet wallet from a faucet/.test(gh), 'guide: Faucet funding section');
  ok(/fetch the eligible output set/.test(gh), 'guide: Eligible set section');
  ok(/create and submit an fcmp\+\+ transaction/.test(gh), 'guide: Create tx section');
  ok(/verify privacy improvements/.test(gh), 'guide: Verify section');
  ok(/rollback and cleanup/.test(gh), 'guide: Cleanup section');

  // Index mapping deliverables
  ok(/deliverable mapping/i.test(index), 'index: Deliverable mapping table');
  ok(/fcmp-plus-plus-research\.md/.test(index), 'index: links research doc');
  ok(/fcmp-plus-plus-testnet-guide\.md/.test(index), 'index: links testnet guide');
  ok(/verify-fcmp-docs\.js/.test(index), 'index: references the verifier');

  // Secret leakage scan across all docs
  const sr = findSecrets(research);
  const sg = findSecrets(guide);
  const si = findSecrets(index);
  ok(sr.length === 0, 'research doc has no mainnet key/seed material' + (sr.length ? ' (' + JSON.stringify(sr) + ')' : ''));
  ok(sg.length === 0, 'testnet guide has no mainnet key/seed material' + (sg.length ? ' (' + JSON.stringify(sg) + ')' : ''));
  ok(si.length === 0, 'index doc has no mainnet key/seed material' + (si.length ? ' (' + JSON.stringify(si) + ')' : ''));

  // Honest-status: research must state FCMP++ is not activated
  ok(/not activated/.test(research.toLowerCase()), 'research: states FCMP++ not activated (honest status)');

  return finish();
}

function finish() {
  console.log('\n' + (failures.length === 0 ? 'PASS: all FCMP++ doc checks succeeded.' : ('FAIL: ' + failures.length + ' check(s) failed.')));
  process.exit(failures.length === 0 ? 0 : 1);
}

main();
