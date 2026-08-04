const { stake, unstake, getReputation, slash } = require("../stake_reputation");

describe("stake_reputation", () => {
  test("should stake tokens", () => {
    const r = stake("u1", 100);
    expect(r.amount).toBe(100);
  });
  test("should fail unstake with no stake", () => {
    expect(() => unstake("newuser", 999)).toThrow();
  });
  test("should get reputation", () => {
    stake("u5", 500);
    const rep = getReputation("u5");
    expect(rep).toBeGreaterThanOrEqual(0);
  });
  test("should slash for bad behavior", () => {
    stake("u6", 1000);
    const r = slash("u6", 200, "Bad");
    expect(r).toBeDefined();
  });
});
