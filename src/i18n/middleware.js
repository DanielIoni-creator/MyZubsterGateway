const i18next = require("./index");
const mw = require("i18next-http-middleware");
module.exports = mw.handle(i18next);
