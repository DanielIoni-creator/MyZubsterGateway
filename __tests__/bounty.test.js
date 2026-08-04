const { createBounty, assignBounty, completeBounty, listBounties } = require("../bounty");

describe("bounty", () => {
  test("should create open bounty", () => {
    const b = createBounty("iss-1", 100);
    expect(b.status).toBe("open");
    expect(b.rewardMYZ).toBe(100);
  });
  test("should prevent duplicate", () => {
    createBounty("iss-2", 50);
    expect(() => createBounty("iss-2", 75)).toThrow();
  });
  test("should assign bounty", () => {
    createBounty("iss-3", 200);
    const b = assignBounty("iss-3", "dev1");
    expect(b.assignedTo).toBe("dev1");
  });
  test("should complete bounty", () => {
    createBounty("iss-4", 300);
    const r = completeBounty("iss-4", "wallet123");
    expect(r.rewardMYZ).toBe(300);
  });
  test("should list bounties", () => {
    createBounty("iss-5", 100);
    createBounty("iss-6", 200);
    const list = listBounties();
    expect(list.length).toBeGreaterThanOrEqual(2);
  });
  test("should fail complete twice", () => {
    createBounty("iss-4b", 100);
    completeBounty("iss-4b", "w1");
    expect(() => completeBounty("iss-4b", "w2")).toThrow();
  });
});
