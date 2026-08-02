#!/usr/bin/env node

const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
  try {
    const repo = process.argv[2];
    const issueNumber = parseInt(process.argv[3], 10);
    const user = process.argv[4];

    console.log(`🤖 Issue Bot started`);
    console.log(`📌 Repository: ${repo}`);
    console.log(`📌 Issue: #${issueNumber}`);
    console.log(`📌 User: ${user}`);

    // Ottieni il token
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error('GITHUB_TOKEN is required');
    }

    const octokit = github.getOctokit(token);

    // Assegna l'issue all'utente
    await octokit.rest.issues.addAssignees({
      owner: 'DanielIoni-creator',
      repo: repo,
      issue_number: issueNumber,
      assignees: [user]
    });

    // Aggiungi un commento
    await octokit.rest.issues.createComment({
      owner: 'DanielIoni-creator',
      repo: repo,
      issue_number: issueNumber,
      body: `✅ Issue assegnata a @${user}!`
    });

    console.log(`✅ Issue #${issueNumber} assegnata a ${user}`);
  } catch (error) {
    core.setFailed(`❌ Error: ${error.message}`);
    console.error(error);
  }
}

run();
