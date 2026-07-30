const i18next = require("../index");
describe("i18n", () => {
  beforeAll(async () => { await i18next.init(); });
  test("has 5 languages", () => {
    expect(i18next.options.supportedLngs).toEqual(["en", "zh", "ms", "ta", "it"]);
  });
});
