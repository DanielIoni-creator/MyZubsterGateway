const test = require('node:test');
const assert = require('node:assert/strict');

const { DisputeService, MemoryDisputeStore, HOUR_MS } = require('../services/disputeService');

const START = new Date('2026-08-07T00:00:00.000Z');
const PANEL = ['med-1', 'med-2', 'med-3'];

function build(options = {}) {
  const clock = { now: START };
  const resolved = [];
  const service = new DisputeService({
    store: new MemoryDisputeStore(),
    clock: () => clock.now,
    onResolved: async (payload) => { resolved.push(payload); },
    ...options,
  });
  return { service, clock, resolved };
}

const claim = (overrides = {}) => ({
  jobId: 'job-1',
  claimantId: 'client-1',
  respondentId: 'robot-1',
  reason: 'delivered work does not match the spec',
  amount: 100,
  currency: 'MYZ',
  ...overrides,
});

async function toVoting(service, clock, options = {}) {
  const dispute = await service.open(claim());
  await service.submitEvidence({ disputeId: dispute.disputeId, party: 'robot-1', evidence: 'logs' });
  await service.assignMediators({ disputeId: dispute.disputeId, mediators: options.mediators ?? PANEL });
  clock.now = new Date(START.getTime() + 73 * HOUR_MS);
  await service.tick();
  return service.get(dispute.disputeId);
}

test('opens a dispute in the evidence stage', async () => {
  const { service } = build();
  const dispute = await service.open(claim({ evidence: 'screenshots' }));

  assert.equal(dispute.state, 'EVIDENCE');
  assert.equal(dispute.evidence.length, 1);
  assert.equal(dispute.evidence[0].party, 'client-1');
  assert.equal(dispute.events[0].event, 'OPENED');
});

test('rejects malformed disputes', async () => {
  const { service } = build();
  await assert.rejects(service.open(claim({ jobId: null })), /jobId is required/);
  await assert.rejects(service.open(claim({ respondentId: null })), /claimantId and respondentId are required/);
  await assert.rejects(service.open(claim({ respondentId: 'client-1' })), /must differ/);
  await assert.rejects(service.open(claim({ reason: null })), /reason is required/);
});

test('refuses a second open dispute on the same job', async () => {
  const { service } = build();
  await service.open(claim());
  await assert.rejects(service.open(claim()), /already has an open dispute/);
});

test('accepts evidence only from the parties, only while the window is open', async () => {
  const { service } = build();
  const dispute = await service.open(claim());

  await assert.rejects(service.submitEvidence({ disputeId: dispute.disputeId, party: 'stranger', evidence: 'x' }), /Only the parties/);
  await assert.rejects(service.submitEvidence({ disputeId: dispute.disputeId, party: 'robot-1' }), /evidence is required/);

  const updated = await service.submitEvidence({ disputeId: dispute.disputeId, party: 'robot-1', evidence: 'delivery logs' });
  assert.equal(updated.evidence.length, 1);
  assert.equal(updated.events.at(-1).event, 'EVIDENCE_SUBMITTED');
});

test('refuses a party as their own mediator and enforces quorum', async () => {
  const { service } = build();
  const dispute = await service.open(claim());

  await assert.rejects(
    service.assignMediators({ disputeId: dispute.disputeId, mediators: ['med-1', 'client-1', 'med-2'] }),
    /cannot mediate their own dispute: client-1/,
  );
  await assert.rejects(
    service.assignMediators({ disputeId: dispute.disputeId, mediators: ['med-1'] }),
    /At least 2 mediators/,
  );
  await assert.rejects(service.assignMediators({ disputeId: dispute.disputeId, mediators: [] }), /non-empty array/);
});

test('assigning the panel does not cut the evidence window short', async () => {
  const { service, clock } = build();
  const dispute = await service.open(claim());
  const assigned = await service.assignMediators({ disputeId: dispute.disputeId, mediators: PANEL });

  // The parties keep their full window even once mediators are lined up.
  assert.equal(assigned.state, 'EVIDENCE');
  assert.equal(assigned.votingDeadline, null);

  await service.submitEvidence({ disputeId: dispute.disputeId, party: 'robot-1', evidence: 'logs' });
  clock.now = new Date(START.getTime() + 73 * HOUR_MS);
  await service.tick();

  const voting = await service.get(dispute.disputeId);
  assert.equal(voting.state, 'VOTING');
  assert.ok(voting.votingDeadline);
});

test('rejects votes from outsiders, duplicates and unknown outcomes', async () => {
  const { service, clock } = build();
  const dispute = await toVoting(service, clock);

  await assert.rejects(service.vote({ disputeId: dispute.disputeId, mediatorId: 'stranger', outcome: 'RELEASE' }), /Only an assigned mediator/);
  await assert.rejects(service.vote({ disputeId: dispute.disputeId, mediatorId: 'med-1', outcome: 'MAYBE' }), /outcome must be one of/);

  await service.vote({ disputeId: dispute.disputeId, mediatorId: 'med-1', outcome: 'RELEASE' });
  await assert.rejects(service.vote({ disputeId: dispute.disputeId, mediatorId: 'med-1', outcome: 'REFUND' }), /already voted/);
});

test('resolves as soon as the result cannot be overturned', async () => {
  const { service, clock, resolved } = build();
  const dispute = await toVoting(service, clock);

  await service.vote({ disputeId: dispute.disputeId, mediatorId: 'med-1', outcome: 'REFUND' });
  const afterTwo = await service.vote({ disputeId: dispute.disputeId, mediatorId: 'med-2', outcome: 'REFUND' });

  // Two REFUND against one outstanding vote: the third cannot change it, so the
  // funds are freed now rather than after another 72 hours.
  assert.equal(afterTwo.state, 'RESOLVED');
  assert.equal(afterTwo.outcome, 'REFUND');
  assert.equal(afterTwo.resolution.reason, 'MAJORITY_REACHED');
  assert.equal(afterTwo.resolution.votesCast, 2);
  assert.deepEqual(resolved, [{ jobId: 'job-1', disputeId: dispute.disputeId, outcome: 'REFUND', reason: 'MAJORITY_REACHED' }]);
});

test('waits when the outcome is still reachable by the remaining voters', async () => {
  const { service, clock } = build({ quorum: 3 });
  const dispute = await toVoting(service, clock, { mediators: ['med-1', 'med-2', 'med-3', 'med-4', 'med-5'] });

  await service.vote({ disputeId: dispute.disputeId, mediatorId: 'med-1', outcome: 'RELEASE' });
  await service.vote({ disputeId: dispute.disputeId, mediatorId: 'med-2', outcome: 'REFUND' });
  const afterThree = await service.vote({ disputeId: dispute.disputeId, mediatorId: 'med-3', outcome: 'RELEASE' });

  // 2-1 with two votes outstanding is still reversible.
  assert.equal(afterThree.state, 'VOTING');

  const afterFour = await service.vote({ disputeId: dispute.disputeId, mediatorId: 'med-4', outcome: 'RELEASE' });
  assert.equal(afterFour.state, 'RESOLVED');
  assert.equal(afterFour.outcome, 'RELEASE');
});

test('a silent respondent forfeits when the evidence window closes', async () => {
  const { service, clock, resolved } = build();
  await service.open(claim());

  clock.now = new Date(START.getTime() + 73 * HOUR_MS);
  const [dispute] = await service.tick();

  assert.equal(dispute.state, 'RESOLVED');
  assert.equal(dispute.outcome, 'REFUND');
  assert.equal(dispute.resolution.reason, 'RESPONDENT_SILENT');
  assert.equal(resolved.length, 1);
});

test('a responding respondent moves to voting rather than forfeiting', async () => {
  const { service, clock } = build();
  const opened = await service.open(claim());
  await service.submitEvidence({ disputeId: opened.disputeId, party: 'robot-1', evidence: 'proof of delivery' });
  await service.assignMediators({ disputeId: opened.disputeId, mediators: PANEL });

  clock.now = new Date(START.getTime() + 73 * HOUR_MS);
  await service.tick();

  assert.equal((await service.get(opened.disputeId)).state, 'VOTING');
});

test('an unfinished vote falls back to a refund, not a payout', async () => {
  const { service, clock } = build();
  const dispute = await toVoting(service, clock);
  await service.vote({ disputeId: dispute.disputeId, mediatorId: 'med-1', outcome: 'RELEASE' });

  clock.now = new Date(START.getTime() + 200 * HOUR_MS);
  const [resolvedDispute] = await service.tick();

  // One vote is below quorum. Paying out a contested job on a single opinion
  // would be worse than returning the money.
  assert.equal(resolvedDispute.outcome, 'REFUND');
  assert.equal(resolvedDispute.resolution.reason, 'NO_MAJORITY');
});

test('a tied panel falls back to a refund', async () => {
  const { service, clock } = build({ quorum: 2 });
  const dispute = await toVoting(service, clock, { mediators: ['med-1', 'med-2', 'med-3', 'med-4'] });
  await service.vote({ disputeId: dispute.disputeId, mediatorId: 'med-1', outcome: 'RELEASE' });
  await service.vote({ disputeId: dispute.disputeId, mediatorId: 'med-2', outcome: 'REFUND' });

  clock.now = new Date(START.getTime() + 200 * HOUR_MS);
  const [resolvedDispute] = await service.tick();

  assert.equal(resolvedDispute.outcome, 'REFUND');
  assert.equal(resolvedDispute.resolution.reason, 'NO_MAJORITY');
});

test('a majority reached before the deadline is honoured by the tick', async () => {
  const { service, clock } = build({ quorum: 2 });
  const dispute = await toVoting(service, clock, { mediators: ['med-1', 'med-2', 'med-3', 'med-4'] });
  await service.vote({ disputeId: dispute.disputeId, mediatorId: 'med-1', outcome: 'RELEASE' });
  await service.vote({ disputeId: dispute.disputeId, mediatorId: 'med-2', outcome: 'RELEASE' });
  await service.vote({ disputeId: dispute.disputeId, mediatorId: 'med-3', outcome: 'REFUND' });

  clock.now = new Date(START.getTime() + 200 * HOUR_MS);
  const state = await service.get(dispute.disputeId);
  if (state.state === 'VOTING') await service.tick();

  const finished = await service.get(dispute.disputeId);
  assert.equal(finished.outcome, 'RELEASE');
});

test('the verdict stands even if the escrow callback fails', async () => {
  const { service, clock } = build({ onResolved: async () => { throw new Error('escrow unreachable'); } });
  const dispute = await toVoting(service, clock);

  await service.vote({ disputeId: dispute.disputeId, mediatorId: 'med-1', outcome: 'RELEASE' });
  const settled = await service.vote({ disputeId: dispute.disputeId, mediatorId: 'med-2', outcome: 'RELEASE' });

  assert.equal(settled.state, 'RESOLVED');
  assert.equal(settled.outcome, 'RELEASE');
  assert.ok(settled.events.some((e) => e.event === 'ESCROW_NOTIFY_FAILED'));
});

test('tick leaves resolved disputes alone', async () => {
  const { service, clock, resolved } = build();
  const dispute = await toVoting(service, clock);
  await service.vote({ disputeId: dispute.disputeId, mediatorId: 'med-1', outcome: 'REFUND' });
  await service.vote({ disputeId: dispute.disputeId, mediatorId: 'med-2', outcome: 'REFUND' });

  clock.now = new Date(START.getTime() + 500 * HOUR_MS);
  await service.tick();
  await service.tick();

  assert.equal(resolved.length, 1);
});

test('summarises the docket', async () => {
  const { service, clock } = build();
  const dispute = await toVoting(service, clock);
  await service.vote({ disputeId: dispute.disputeId, mediatorId: 'med-1', outcome: 'RELEASE' });
  await service.vote({ disputeId: dispute.disputeId, mediatorId: 'med-2', outcome: 'RELEASE' });
  await service.open(claim({ jobId: 'job-2' }));

  const summary = await service.summary();
  assert.equal(summary.total, 2);
  assert.equal(summary.byState.RESOLVED, 1);
  assert.equal(summary.byState.EVIDENCE, 1);
  assert.equal(summary.byOutcome.RELEASE, 1);

  assert.equal((await service.listByJob('job-2')).length, 1);
  await assert.rejects(service.get('nope'), /Dispute not found/);
});
