// routes/publicDashboard.js - Dashboard pubblica dei robot (Bounty #384)
const express = require('express');
const router = express.Router();
const Robot = require('../models/Robot');
const Transaction = require('../models/Transaction');

router.get('/robots', async (req, res) => {
  try {
    const robots = await Robot.find({}, { robotId: 1, name: 1, status: 1, walletAddress: 1, reputation: 1, jobCount: 1, _id: 0 })
      .sort({ reputation: -1 }).limit(50);
    const active = robots.filter(r => r.status === 'working' || r.status === 'delivering').length;
    const idle = robots.filter(r => r.status === 'idle').length;
    res.json({ success: true, total: robots.length, active, idle, data: robots });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/stats', async (req, res) => {
  try {
    const [robotStats, paymentStats] = await Promise.all([
      Robot.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Transaction.aggregate([{ $match: { status: { $in: ['completed','released'] } } },
        { $group: { _id: '$currency', totale: { $sum: '$amount' }, count: { $sum: 1 } } }])
    ]);
    const topRobots = await Robot.find({}, { robotId: 1, name: 1, status: 1, reputation: 1, jobCount: 1, _id: 0 })
      .sort({ jobCount: -1 }).limit(5);
    const myzData = paymentStats.find(p => p._id === 'MYZ') || { totale: 0, count: 0 };
    const commissioni = (myzData.totale || 0) * 0.05;
    res.json({ success: true, data: {
      robotAttivi: robotStats.find(r => r._id === 'working')?.count || 0,
      robotTotali: robotStats.reduce((s,r) => s+r.count,0),
      myzSpeso: myzData.totale || 0,
      commissioniTotali: commissioni,
      transazioni: paymentStats.reduce((s,p) => s+p.count,0),
      topRobots
    }});
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/events', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'Access-Control-Allow-Origin': '*' });
  res.write('data: {"connected":true}

');
  const interval = setInterval(async () => {
    try { const c = await Robot.countDocuments(); const a = await Robot.countDocuments({ status: 'working' });
      res.write('data: '+JSON.stringify({ts:new Date().toISOString(),robotTotali:c,robotAttivi:a})+'

'); } catch(e){}
  }, 5000);
  req.on('close', () => clearInterval(interval));
});

router.get('/widget.js', (req, res) => {
  res.type('application/javascript');
  res.send('(function(){var c=document.getElementById("myzubster-widget");if(!c)return;var e=document.createElement("style");e.textContent=".mzw-widget{font-family:Arial;background:#1a1a2e;color:#fff;border-radius:12px;padding:16px;max-width:320px}.mzw-widget .stat{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.1)}.mzw-widget .val{font-weight:700;color:#2ecc71}.mzw-widget .footer{text-align:center;margin-top:10px;font-size:.75em;opacity:.6}";document.head.appendChild(e);c.className="mzw-widget";c.innerHTML="<h3>MyZubster</h3><div id=mzw-stats>Caricamento...</div><div class=footer>Powered by MyZubster</div>";var o=c.dataset.origin||"";function l(){fetch(o+"/api/public/stats").then(r=>r.json()).then(j=>{var d=document.getElementById("mzw-stats");d.innerHTML="<div class=stat><span>Robot attivi</span><span class=val>"+(j.data.robotAttivi||0)+"/"+(j.data.robotTotali||0)+"</span></div><div class=stat><span>MYZ speso</span><span class=val>"+(j.data.myzSpeso||0).toFixed(2)+" MYZ</span></div>"})}l();setInterval(l,60000)})();');
});

module.exports = router;
