const express = require('express');
const router = express.Router();
const axios = require('axios');

// Endpoint per gli sviluppatori attivi (basato su GitHub Issues)
router.get('/active', async (req, res) => {
  try {
    // Fetch tutte le issue aperte con label bounty
    const response = await axios.get(
      'https://api.github.com/repos/MyZubster-Ecosystem/MyZubsterGateway/issues',
      {
        params: {
          state: 'open',
          labels: 'bounty',
          per_page: 100
        },
        headers: {
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    const issues = response.data;
    
    // Filtra le issue assegnate
    const assignedIssues = issues.filter(issue => 
      issue.assignees && issue.assignees.length > 0
    );

    // Crea la lista degli sviluppatori attivi
    const developers = assignedIssues.map(issue => ({
      developer: issue.assignees[0].login,
      developerUrl: issue.assignees[0].html_url,
      issue: {
        number: issue.number,
        title: issue.title,
        url: issue.html_url,
        labels: issue.labels.map(l => l.name),
        createdAt: issue.created_at,
        updatedAt: issue.updated_at
      }
    }));

    // Raggruppa per sviluppatore
    const developerMap = new Map();
    developers.forEach(d => {
      if (developerMap.has(d.developer)) {
        developerMap.get(d.developer).issues.push(d.issue);
      } else {
        developerMap.set(d.developer, {
          developer: d.developer,
          developerUrl: d.developerUrl,
          issues: [d.issue],
          totalIssues: 0
        });
      }
    });

    // Calcola totali e ordina
    const result = Array.from(developerMap.values()).map(d => ({
      ...d,
      totalIssues: d.issues.length
    })).sort((a, b) => b.totalIssues - a.totalIssues);

    res.json({
      success: true,
      data: {
        totalActiveDevelopers: result.length,
        totalAssignedIssues: assignedIssues.length,
        developers: result,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Errore fetching developers:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;
