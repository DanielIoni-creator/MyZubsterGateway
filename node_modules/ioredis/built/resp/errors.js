"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlobError = exports.SimpleError = void 0;
const redis_errors_1 = require("redis-errors");
class SimpleError extends redis_errors_1.ReplyError {
    get name() {
        return "ReplyError";
    }
}
exports.SimpleError = SimpleError;
class BlobError extends redis_errors_1.ReplyError {
    get name() {
        return "ReplyError";
    }
}
exports.BlobError = BlobError;
