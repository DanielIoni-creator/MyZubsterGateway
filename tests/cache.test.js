const { describe, it } = require("node:test");
const assert = require("node:assert");
describe("Cache Middleware", () => {
  it("should export cacheMiddleware, invalidateCache, autoInvalidate", () => {
    const mod = require("../middleware/cache");
    assert.strictEqual(typeof mod.cacheMiddleware, "function");
    assert.strictEqual(typeof mod.invalidateCache, "function");
    assert.strictEqual(typeof mod.autoInvalidate, "function");
  });
  it("cacheMiddleware should return a middleware function", () => {
    const { cacheMiddleware } = require("../middleware/cache");
    const mw = cacheMiddleware({ ttl: 10 });
    assert.strictEqual(typeof mw, "function");
    assert.strictEqual(mw.length, 3);
  });
});
