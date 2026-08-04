const { createRobot, assignRobot, executeJob, deliverJob, disputeJob } = require("../robot_brain");

describe("robot_brain", () => {
  test("should create robot idle", () => {
    const r = createRobot("r1", "Alpha", "cleaning");
    expect(r.status).toBe("idle");
  });
  test("should prevent duplicate", () => {
    createRobot("r2", "Beta", "delivery");
    expect(() => createRobot("r2", "Gamma", "cook")).toThrow();
  });
  test("should assign job", () => {
    createRobot("r3", "Delta", "repair");
    const r = assignRobot("r3", "job10");
    expect(r.status).toBe("working");
  });
  test("should execute job", () => {
    createRobot("r5", "Zeta", "delivery");
    assignRobot("r5", "job13");
    const r = executeJob("r5", "job13");
    expect(r.status).toBe("executing");
  });
  test("should complete delivery", () => {
    createRobot("r6", "Eta", "repair");
    assignRobot("r6", "job14");
    executeJob("r6", "job14");
    const r = deliverJob("r6");
    expect(r.status).toBe("idle");
  });
  test("should dispute job", () => {
    createRobot("r7", "Theta", "cooking");
    assignRobot("r7", "job15");
    const r = disputeJob("r7", "Burnt food");
    expect(r.status).toBe("dispute");
  });
});
