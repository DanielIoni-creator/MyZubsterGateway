const { assignReward } = require("../services/rewardService");

describe("rewardService", () => {
  test("should assign reward", () => {
    const r = assignReward("u1", 50, "Job complete");
    expect(r.amount).toBe(50);
    expect(r.userId).toBe("u1");
  });
  test("should include timestamp", () => {
    const r = assignReward("u3", 100, "Test");
    expect(r.createdAt).toBeDefined();
  });
});
