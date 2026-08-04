const { createRobotEscrow, deliverRobotJob, disputeRobotJob, autoRelease } = require("../escrow_robot");

describe("escrow_robot", () => {
  test("should create escrow", () => {
    const escrow = createRobotEscrow("job1", "user1", "robot1", 100);
    expect(escrow.jobId).toBe("job1");
    expect(escrow.status).toBe("locked");
  });
  test("should prevent duplicate", () => {
    createRobotEscrow("job2", "user1", "robot1", 50);
    expect(() => createRobotEscrow("job2", "u2", "r2", 75)).toThrow();
  });
  test("should deliver job", () => {
    createRobotEscrow("job3", "user1", "robot1", 200);
    const r = deliverRobotJob("job3");
    expect(r.status).toBe("delivered");
  });
  test("should dispute", () => {
    createRobotEscrow("job4", "user1", "robot1", 150);
    const r = disputeRobotJob("job4", "issue");
    expect(r.status).toBe("disputed");
  });
  test("should auto-release", () => {
    createRobotEscrow("job5", "user1", "robot1", 100);
    deliverRobotJob("job5");
    const r = autoRelease("job5");
    expect(r.status).toBe("released");
  });
});
