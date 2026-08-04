
// ===== MULTI-AGENT SYSTEM =====
const { Orchestrator } = require('./agents/orchestrator');
const { InvestorAgent } = require('./agents/investor-agent');
const { LegalAgent } = require('./agents/legal-agent');
const { TechnicalAgent } = require('./agents/technical-agent');

// Initialize orchestrator
const orchestrator = new Orchestrator();

// Register agents
orchestrator.registerAgent('Investor Agent', new InvestorAgent());
orchestrator.registerAgent('Legal Agent', new LegalAgent());
orchestrator.registerAgent('Technical Agent', new TechnicalAgent());

// Agent routes
app.post('/api/agents/task', async (req, res) => {
  try {
    const result = await orchestrator.executeTask(req.body);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/agents/status', async (req, res) => {
  try {
    const status = await orchestrator.getStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/agents/history', async (req, res) => {
  try {
    const history = orchestrator.getHistory(50);
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
