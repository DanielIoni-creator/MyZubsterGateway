const { AdminService, MemoryAdminStore } = require('../services/adminService');

const router = express.Router();

// Seeded so the dashboard is usable out of the box. Replace the store with a
// database-backed one before this touches real customers.
const service = new AdminService({
  store: new MemoryAdminStore({
    users: [
      { userId: 'root', email: 'root@myzubster.local', role: 'admin', state: 'ACTIVE' },
      { userId: 'ops', email: 'ops@myzubster.local', role: 'operator', state: 'ACTIVE' },
    ],
    payments: [],
  }),
});

/**
 * The acting admin comes from a header for now. This is the seam where the
 * gateway's real session middleware belongs — the service never reads an
 * ambient identity, so wiring one in is a one-line change here and nothing
 * downstream can forget to check it.
 */
const actorOf = (req) => req.get('x-actor-id') || req.query.actorId || null;

const fail = (res, error) => {
  const status = error.status || (error.message === 'User not found' ? 404 : 400);
  return res.status(status).json({ success: false, error: error.message });
};

router.get('/overview', async (req, res) => {
  try { return res.json({ success: true, data: await service.overview({ ...req.query, actorId: actorOf(req) }) }); }
  catch (error) { return fail(res, error); }
});

router.get('/payments', async (req, res) => {
  try { return res.json({ success: true, ...(await service.searchPayments({ ...req.query, actorId: actorOf(req) })) }); }
  catch (error) { return fail(res, error); }
});

router.get('/payments/export', async (req, res) => {
  try {
    const result = await service.exportPayments({ ...req.query, actorId: actorOf(req) });
    res.type('text/csv').attachment(result.filename);
    return res.send(result.csv);
  } catch (error) { return fail(res, error); }
});

router.get('/users', async (req, res) => {
  try { return res.json({ success: true, ...(await service.listUsers({ ...req.query, actorId: actorOf(req) })) }); }
  catch (error) { return fail(res, error); }
});

router.post('/users/:userId/role', async (req, res) => {
  try { return res.json({ success: true, data: await service.setRole({ actorId: actorOf(req), userId: req.params.userId, role: req.body?.role }) }); }
  catch (error) { return fail(res, error); }
});

router.post('/users/:userId/state', async (req, res) => {
  try {
    const data = await service.setState({ actorId: actorOf(req), userId: req.params.userId, state: req.body?.state, reason: req.body?.reason ?? null });
    return res.json({ success: true, data });
  } catch (error) { return fail(res, error); }
});

router.get('/audit', async (req, res) => {
  try { return res.json({ success: true, data: await service.auditTrail({ ...req.query, actorId: actorOf(req) }) }); }
  catch (error) { return fail(res, error); }
});

module.exports = router;
module.exports.service = service;
