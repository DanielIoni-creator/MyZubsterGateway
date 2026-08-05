"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _Decoder_instances, _a, _Decoder_cursor, _Decoder_next, _Decoder_pushTypeMapping, _Decoder_continueDecodeTypeValue, _Decoder_decodeTypeValue, _Decoder_handleDecodedValue, _Decoder_continueDecodeValue, _Decoder_decodeNull, _Decoder_decodeBoolean, _Decoder_decodeNumber, _Decoder_maybeDecodeNumberValue, _Decoder_decodeNumberValue, _Decoder_decodeUnsingedNumber, _Decoder_decodeBigNumber, _Decoder_maybeDecodeBigNumberValue, _Decoder_decodeBigNumberValue, _Decoder_decodeUnsingedBigNumber, _Decoder_decodeDouble, _Decoder_maybeDecodeDoubleInteger, _Decoder_decodeDoubleInteger, _Decoder_continueDecodeDoubleInteger, _Decoder_DOUBLE_DECIMAL_MULTIPLIERS, _Decoder_decodeDoubleDecimal, _Decoder_decodeDoubleExponent, _Decoder_continueDecodeDoubleExponent, _Decoder_findCRLF, _Decoder_decodeSimpleString, _Decoder_continueDecodeSimpleString, _Decoder_decodeBlobString, _Decoder_continueDecodeBlobStringLength, _Decoder_decodeStringWithLength, _Decoder_continueDecodeStringWithLength, _Decoder_decodeBlobStringWithLength, _Decoder_decodeVerbatimString, _Decoder_continueDecodeVerbatimStringLength, _Decoder_decodeVerbatimStringWithLength, _Decoder_decodeVerbatimStringFormat, _Decoder_continueDecodeVerbatimStringFormat, _Decoder_decodeVerbatimStringWithFormat, _Decoder_continueDecodeVerbatimStringWithFormat, _Decoder_decodeSimpleError, _Decoder_continueDecodeSimpleError, _Decoder_decodeBlobError, _Decoder_continueDecodeBlobError, _Decoder_decodeNestedType, _Decoder_decodeNestedTypeValue, _Decoder_decodeArray, _Decoder_decodeArrayWithLength, _Decoder_continueDecodeArrayLength, _Decoder_decodeArrayItems, _Decoder_continueDecodeArrayItems, _Decoder_decodeSet, _Decoder_continueDecodeSetLength, _Decoder_decodeSetItems, _Decoder_decodeSetAsSet, _Decoder_continueDecodeSetAsSet, _Decoder_decodeMap, _Decoder_continueDecodeMapLength, _Decoder_decodeMapItems, _Decoder_decodeMapAsMap, _Decoder_decodeMapKey, _Decoder_decodeMapKeyValue, _Decoder_continueDecodeMapKey, _Decoder_continueDecodeMapValue, _Decoder_decodeMapAsObject, _Decoder_continueDecodeMapAsObjectKey, _Decoder_continueDecodeMapAsObjectValue;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Decoder = exports.PUSH_TYPE_MAPPING = exports.RESP_TYPES = void 0;
/*
 * Portions adapted from node-redis:
 * https://github.com/redis/node-redis
 *
 * Copyright (c) 2022-2023, Redis, Inc.
 * Licensed under the MIT License.
 */
// @ts-nocheck
const verbatim_string_1 = require("./verbatim-string");
const errors_1 = require("./errors");
// https://github.com/redis/redis-specifications/blob/master/protocol/RESP3.md
exports.RESP_TYPES = {
    NULL: 95, // _
    BOOLEAN: 35, // #
    NUMBER: 58, // :
    BIG_NUMBER: 40, // (
    DOUBLE: 44, // ,
    SIMPLE_STRING: 43, // +
    BLOB_STRING: 36, // $
    VERBATIM_STRING: 61, // =
    SIMPLE_ERROR: 45, // -
    BLOB_ERROR: 33, // !
    ARRAY: 42, // *
    SET: 126, // ~
    MAP: 37, // %
    PUSH: 62, // >
};
const ASCII = {
    "\r": 13,
    t: 116,
    "+": 43,
    "-": 45,
    "0": 48,
    ".": 46,
    i: 105,
    n: 110,
    E: 69,
    e: 101,
};
exports.PUSH_TYPE_MAPPING = {
    [exports.RESP_TYPES.BLOB_STRING]: Buffer,
};
class Decoder {
    constructor(config) {
        _Decoder_instances.add(this);
        _Decoder_cursor.set(this, 0);
        _Decoder_next.set(this, void 0);
        _Decoder_pushTypeMapping.set(this, void 0);
        this.onReply = config.onReply;
        this.onErrorReply = config.onErrorReply;
        this.onPush = config.onPush;
        this.getTypeMapping = config.getTypeMapping;
        __classPrivateFieldSet(this, _Decoder_pushTypeMapping, {
            ...config.getTypeMapping(),
            ...exports.PUSH_TYPE_MAPPING,
        }, "f");
    }
    reset() {
        __classPrivateFieldSet(this, _Decoder_cursor, 0, "f");
        __classPrivateFieldSet(this, _Decoder_next, undefined, "f");
    }
    write(chunk) {
        var _b;
        if (__classPrivateFieldGet(this, _Decoder_cursor, "f") >= chunk.length) {
            __classPrivateFieldSet(this, _Decoder_cursor, __classPrivateFieldGet(this, _Decoder_cursor, "f") - chunk.length, "f");
            return;
        }
        if (__classPrivateFieldGet(this, _Decoder_next, "f")) {
            if (__classPrivateFieldGet(this, _Decoder_next, "f").call(this, chunk) || __classPrivateFieldGet(this, _Decoder_cursor, "f") >= chunk.length) {
                __classPrivateFieldSet(this, _Decoder_cursor, __classPrivateFieldGet(this, _Decoder_cursor, "f") - chunk.length, "f");
                return;
            }
        }
        do {
            const type = chunk[__classPrivateFieldGet(this, _Decoder_cursor, "f")];
            if (__classPrivateFieldSet(this, _Decoder_cursor, (_b = __classPrivateFieldGet(this, _Decoder_cursor, "f"), ++_b), "f") === chunk.length) {
                __classPrivateFieldSet(this, _Decoder_next, __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeTypeValue).bind(this, type), "f");
                break;
            }
            if (__classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeTypeValue).call(this, type, chunk)) {
                break;
            }
        } while (__classPrivateFieldGet(this, _Decoder_cursor, "f") < chunk.length);
        __classPrivateFieldSet(this, _Decoder_cursor, __classPrivateFieldGet(this, _Decoder_cursor, "f") - chunk.length, "f");
    }
}
exports.Decoder = Decoder;
_a = Decoder, _Decoder_cursor = new WeakMap(), _Decoder_next = new WeakMap(), _Decoder_pushTypeMapping = new WeakMap(), _Decoder_instances = new WeakSet(), _Decoder_continueDecodeTypeValue = function _Decoder_continueDecodeTypeValue(type, chunk) {
    __classPrivateFieldSet(this, _Decoder_next, undefined, "f");
    return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeTypeValue).call(this, type, chunk);
}, _Decoder_decodeTypeValue = function _Decoder_decodeTypeValue(type, chunk) {
    switch (type) {
        case exports.RESP_TYPES.NULL:
            this.onReply(__classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeNull).call(this));
            return false;
        case exports.RESP_TYPES.BOOLEAN:
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_handleDecodedValue).call(this, this.onReply, __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeBoolean).call(this, this.getTypeMapping()[exports.RESP_TYPES.BOOLEAN], chunk));
        case exports.RESP_TYPES.NUMBER:
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_handleDecodedValue).call(this, this.onReply, __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeNumber).call(this, this.getTypeMapping()[exports.RESP_TYPES.NUMBER], chunk));
        case exports.RESP_TYPES.BIG_NUMBER:
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_handleDecodedValue).call(this, this.onReply, __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeBigNumber).call(this, this.getTypeMapping()[exports.RESP_TYPES.BIG_NUMBER], chunk));
        case exports.RESP_TYPES.DOUBLE:
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_handleDecodedValue).call(this, this.onReply, __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeDouble).call(this, this.getTypeMapping()[exports.RESP_TYPES.DOUBLE], chunk));
        case exports.RESP_TYPES.SIMPLE_STRING:
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_handleDecodedValue).call(this, this.onReply, __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeSimpleString).call(this, this.getTypeMapping()[exports.RESP_TYPES.SIMPLE_STRING], chunk));
        case exports.RESP_TYPES.BLOB_STRING:
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_handleDecodedValue).call(this, this.onReply, __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeBlobString).call(this, this.getTypeMapping()[exports.RESP_TYPES.BLOB_STRING], chunk));
        case exports.RESP_TYPES.VERBATIM_STRING:
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_handleDecodedValue).call(this, this.onReply, __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeVerbatimString).call(this, this.getTypeMapping()[exports.RESP_TYPES.VERBATIM_STRING], chunk));
        case exports.RESP_TYPES.SIMPLE_ERROR:
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_handleDecodedValue).call(this, this.onErrorReply, __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeSimpleError).call(this, chunk));
        case exports.RESP_TYPES.BLOB_ERROR:
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_handleDecodedValue).call(this, this.onErrorReply, __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeBlobError).call(this, chunk));
        case exports.RESP_TYPES.ARRAY:
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_handleDecodedValue).call(this, this.onReply, __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeArray).call(this, this.getTypeMapping(), chunk));
        case exports.RESP_TYPES.SET:
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_handleDecodedValue).call(this, this.onReply, __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeSet).call(this, this.getTypeMapping(), chunk));
        case exports.RESP_TYPES.MAP:
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_handleDecodedValue).call(this, this.onReply, __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeMap).call(this, this.getTypeMapping(), chunk));
        case exports.RESP_TYPES.PUSH:
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_handleDecodedValue).call(this, this.onPush, __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeArray).call(this, __classPrivateFieldGet(this, _Decoder_pushTypeMapping, "f"), chunk));
        default:
            throw new Error(`Unknown RESP type ${type} "${String.fromCharCode(type)}"`);
    }
}, _Decoder_handleDecodedValue = function _Decoder_handleDecodedValue(cb, value) {
    if (typeof value === "function") {
        __classPrivateFieldSet(this, _Decoder_next, __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeValue).bind(this, cb, value), "f");
        return true;
    }
    cb(value);
    return false;
}, _Decoder_continueDecodeValue = function _Decoder_continueDecodeValue(cb, next, chunk) {
    __classPrivateFieldSet(this, _Decoder_next, undefined, "f");
    return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_handleDecodedValue).call(this, cb, next(chunk));
}, _Decoder_decodeNull = function _Decoder_decodeNull() {
    __classPrivateFieldSet(this, _Decoder_cursor, __classPrivateFieldGet(this, _Decoder_cursor, "f") + 2, "f"); // skip \r\n
    return null;
}, _Decoder_decodeBoolean = function _Decoder_decodeBoolean(type, chunk) {
    const boolean = chunk[__classPrivateFieldGet(this, _Decoder_cursor, "f")] === ASCII.t;
    __classPrivateFieldSet(this, _Decoder_cursor, __classPrivateFieldGet(this, _Decoder_cursor, "f") + 3, "f"); // skip {t | f}\r\n
    // RESP2 had no boolean type: commands now answering `#t`/`#f` returned
    // integer `1`/`0`. The legacy mapping requests Number here to stay
    // wire-compatible; resp3 mapping leaves the value as a JS boolean.
    return type === Number ? (boolean ? 1 : 0) : boolean;
}, _Decoder_decodeNumber = function _Decoder_decodeNumber(type, chunk) {
    if (type === String) {
        return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeSimpleString).call(this, String, chunk);
    }
    switch (chunk[__classPrivateFieldGet(this, _Decoder_cursor, "f")]) {
        case ASCII["+"]:
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_maybeDecodeNumberValue).call(this, false, chunk);
        case ASCII["-"]:
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_maybeDecodeNumberValue).call(this, true, chunk);
        default:
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeNumberValue).call(this, false, __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeUnsingedNumber).bind(this, 0), chunk);
    }
}, _Decoder_maybeDecodeNumberValue = function _Decoder_maybeDecodeNumberValue(isNegative, chunk) {
    var _b;
    const cb = __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeUnsingedNumber).bind(this, 0);
    return __classPrivateFieldSet(this, _Decoder_cursor, (_b = __classPrivateFieldGet(this, _Decoder_cursor, "f"), ++_b), "f") === chunk.length
        ? __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeNumberValue).bind(this, isNegative, cb)
        : __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeNumberValue).call(this, isNegative, cb, chunk);
}, _Decoder_decodeNumberValue = function _Decoder_decodeNumberValue(isNegative, numberCb, chunk) {
    const number = numberCb(chunk);
    return typeof number === "function"
        ? __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeNumberValue).bind(this, isNegative, number)
        : isNegative
            ? -number
            : number;
}, _Decoder_decodeUnsingedNumber = function _Decoder_decodeUnsingedNumber(number, chunk) {
    let cursor = __classPrivateFieldGet(this, _Decoder_cursor, "f");
    do {
        const byte = chunk[cursor];
        if (byte === ASCII["\r"]) {
            __classPrivateFieldSet(this, _Decoder_cursor, cursor + 2, "f"); // skip \r\n
            return number;
        }
        number = number * 10 + byte - ASCII["0"];
    } while (++cursor < chunk.length);
    __classPrivateFieldSet(this, _Decoder_cursor, cursor, "f");
    return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeUnsingedNumber).bind(this, number);
}, _Decoder_decodeBigNumber = function _Decoder_decodeBigNumber(type, chunk) {
    if (type === String) {
        return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeSimpleString).call(this, String, chunk);
    }
    switch (chunk[__classPrivateFieldGet(this, _Decoder_cursor, "f")]) {
        case ASCII["+"]:
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_maybeDecodeBigNumberValue).call(this, false, chunk);
        case ASCII["-"]:
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_maybeDecodeBigNumberValue).call(this, true, chunk);
        default:
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeBigNumberValue).call(this, false, __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeUnsingedBigNumber).bind(this, 0n), chunk);
    }
}, _Decoder_maybeDecodeBigNumberValue = function _Decoder_maybeDecodeBigNumberValue(isNegative, chunk) {
    var _b;
    const cb = __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeUnsingedBigNumber).bind(this, 0n);
    return __classPrivateFieldSet(this, _Decoder_cursor, (_b = __classPrivateFieldGet(this, _Decoder_cursor, "f"), ++_b), "f") === chunk.length
        ? __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeBigNumberValue).bind(this, isNegative, cb)
        : __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeBigNumberValue).call(this, isNegative, cb, chunk);
}, _Decoder_decodeBigNumberValue = function _Decoder_decodeBigNumberValue(isNegative, bigNumberCb, chunk) {
    const bigNumber = bigNumberCb(chunk);
    return typeof bigNumber === "function"
        ? __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeBigNumberValue).bind(this, isNegative, bigNumber)
        : isNegative
            ? -bigNumber
            : bigNumber;
}, _Decoder_decodeUnsingedBigNumber = function _Decoder_decodeUnsingedBigNumber(bigNumber, chunk) {
    let cursor = __classPrivateFieldGet(this, _Decoder_cursor, "f");
    do {
        const byte = chunk[cursor];
        if (byte === ASCII["\r"]) {
            __classPrivateFieldSet(this, _Decoder_cursor, cursor + 2, "f"); // skip \r\n
            return bigNumber;
        }
        bigNumber = bigNumber * 10n + BigInt(byte - ASCII["0"]);
    } while (++cursor < chunk.length);
    __classPrivateFieldSet(this, _Decoder_cursor, cursor, "f");
    return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeUnsingedBigNumber).bind(this, bigNumber);
}, _Decoder_decodeDouble = function _Decoder_decodeDouble(type, chunk) {
    // RESP2 sent doubles as bulk strings, so the legacy mapping decodes the
    // raw textual form (Buffer or String) and lets `replyEncoding` decide the
    // final shape per command. resp3 mapping leaves `type` unset -> JS number.
    if (type === String || type === Buffer) {
        return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeSimpleString).call(this, type, chunk);
    }
    switch (chunk[__classPrivateFieldGet(this, _Decoder_cursor, "f")]) {
        case ASCII.n:
            __classPrivateFieldSet(this, _Decoder_cursor, __classPrivateFieldGet(this, _Decoder_cursor, "f") + 5, "f"); // skip nan\r\n
            return NaN;
        case ASCII["+"]:
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_maybeDecodeDoubleInteger).call(this, false, chunk);
        case ASCII["-"]:
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_maybeDecodeDoubleInteger).call(this, true, chunk);
        default:
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeDoubleInteger).call(this, false, 0, chunk);
    }
}, _Decoder_maybeDecodeDoubleInteger = function _Decoder_maybeDecodeDoubleInteger(isNegative, chunk) {
    var _b;
    return __classPrivateFieldSet(this, _Decoder_cursor, (_b = __classPrivateFieldGet(this, _Decoder_cursor, "f"), ++_b), "f") === chunk.length
        ? __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeDoubleInteger).bind(this, isNegative, 0)
        : __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeDoubleInteger).call(this, isNegative, 0, chunk);
}, _Decoder_decodeDoubleInteger = function _Decoder_decodeDoubleInteger(isNegative, integer, chunk) {
    if (chunk[__classPrivateFieldGet(this, _Decoder_cursor, "f")] === ASCII.i) {
        __classPrivateFieldSet(this, _Decoder_cursor, __classPrivateFieldGet(this, _Decoder_cursor, "f") + 5, "f"); // skip inf\r\n
        return isNegative ? -Infinity : Infinity;
    }
    return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeDoubleInteger).call(this, isNegative, integer, chunk);
}, _Decoder_continueDecodeDoubleInteger = function _Decoder_continueDecodeDoubleInteger(isNegative, integer, chunk) {
    let cursor = __classPrivateFieldGet(this, _Decoder_cursor, "f");
    do {
        const byte = chunk[cursor];
        switch (byte) {
            case ASCII["."]:
                __classPrivateFieldSet(this, _Decoder_cursor, cursor + 1, "f"); // skip .
                return __classPrivateFieldGet(this, _Decoder_cursor, "f") < chunk.length
                    ? __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeDoubleDecimal).call(this, isNegative, 0, integer, chunk)
                    : __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeDoubleDecimal).bind(this, isNegative, 0, integer);
            case ASCII.E:
            case ASCII.e: {
                __classPrivateFieldSet(this, _Decoder_cursor, cursor + 1, "f"); // skip E/e
                const i = isNegative ? -integer : integer;
                return __classPrivateFieldGet(this, _Decoder_cursor, "f") < chunk.length
                    ? __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeDoubleExponent).call(this, i, chunk)
                    : __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeDoubleExponent).bind(this, i);
            }
            case ASCII["\r"]:
                __classPrivateFieldSet(this, _Decoder_cursor, cursor + 2, "f"); // skip \r\n
                return isNegative ? -integer : integer;
            default:
                integer = integer * 10 + byte - ASCII["0"];
        }
    } while (++cursor < chunk.length);
    __classPrivateFieldSet(this, _Decoder_cursor, cursor, "f");
    return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeDoubleInteger).bind(this, isNegative, integer);
}, _Decoder_decodeDoubleDecimal = function _Decoder_decodeDoubleDecimal(isNegative, decimalIndex, double, chunk) {
    let cursor = __classPrivateFieldGet(this, _Decoder_cursor, "f");
    do {
        const byte = chunk[cursor];
        switch (byte) {
            case ASCII.E:
            case ASCII.e: {
                __classPrivateFieldSet(this, _Decoder_cursor, cursor + 1, "f"); // skip E/e
                const d = isNegative ? -double : double;
                return __classPrivateFieldGet(this, _Decoder_cursor, "f") === chunk.length
                    ? __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeDoubleExponent).bind(this, d)
                    : __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeDoubleExponent).call(this, d, chunk);
            }
            case ASCII["\r"]:
                __classPrivateFieldSet(this, _Decoder_cursor, cursor + 2, "f"); // skip \r\n
                return isNegative ? -double : double;
        }
        if (decimalIndex < __classPrivateFieldGet(_a, _a, "f", _Decoder_DOUBLE_DECIMAL_MULTIPLIERS).length) {
            double +=
                (byte - ASCII["0"]) *
                    __classPrivateFieldGet(_a, _a, "f", _Decoder_DOUBLE_DECIMAL_MULTIPLIERS)[decimalIndex++];
        }
    } while (++cursor < chunk.length);
    __classPrivateFieldSet(this, _Decoder_cursor, cursor, "f");
    return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeDoubleDecimal).bind(this, isNegative, decimalIndex, double);
}, _Decoder_decodeDoubleExponent = function _Decoder_decodeDoubleExponent(double, chunk) {
    var _b, _c;
    switch (chunk[__classPrivateFieldGet(this, _Decoder_cursor, "f")]) {
        case ASCII["+"]:
            return __classPrivateFieldSet(this, _Decoder_cursor, (_b = __classPrivateFieldGet(this, _Decoder_cursor, "f"), ++_b), "f") === chunk.length
                ? __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeDoubleExponent).bind(this, false, double, 0)
                : __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeDoubleExponent).call(this, false, double, 0, chunk);
        case ASCII["-"]:
            return __classPrivateFieldSet(this, _Decoder_cursor, (_c = __classPrivateFieldGet(this, _Decoder_cursor, "f"), ++_c), "f") === chunk.length
                ? __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeDoubleExponent).bind(this, true, double, 0)
                : __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeDoubleExponent).call(this, true, double, 0, chunk);
    }
    return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeDoubleExponent).call(this, false, double, 0, chunk);
}, _Decoder_continueDecodeDoubleExponent = function _Decoder_continueDecodeDoubleExponent(isNegative, double, exponent, chunk) {
    let cursor = __classPrivateFieldGet(this, _Decoder_cursor, "f");
    do {
        const byte = chunk[cursor];
        if (byte === ASCII["\r"]) {
            __classPrivateFieldSet(this, _Decoder_cursor, cursor + 2, "f"); // skip \r\n
            return double * 10 ** (isNegative ? -exponent : exponent);
        }
        exponent = exponent * 10 + byte - ASCII["0"];
    } while (++cursor < chunk.length);
    __classPrivateFieldSet(this, _Decoder_cursor, cursor, "f");
    return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeDoubleExponent).bind(this, isNegative, double, exponent);
}, _Decoder_findCRLF = function _Decoder_findCRLF(chunk, cursor) {
    while (chunk[cursor] !== ASCII["\r"]) {
        if (++cursor === chunk.length) {
            __classPrivateFieldSet(this, _Decoder_cursor, chunk.length, "f");
            return -1;
        }
    }
    __classPrivateFieldSet(this, _Decoder_cursor, cursor + 2, "f"); // skip \r\n
    return cursor;
}, _Decoder_decodeSimpleString = function _Decoder_decodeSimpleString(type, chunk) {
    const start = __classPrivateFieldGet(this, _Decoder_cursor, "f"), crlfIndex = __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_findCRLF).call(this, chunk, start);
    if (crlfIndex === -1) {
        return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeSimpleString).bind(this, [chunk.subarray(start)], type);
    }
    const slice = chunk.subarray(start, crlfIndex);
    return type === Buffer ? slice : slice.toString();
}, _Decoder_continueDecodeSimpleString = function _Decoder_continueDecodeSimpleString(chunks, type, chunk) {
    const start = __classPrivateFieldGet(this, _Decoder_cursor, "f"), crlfIndex = __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_findCRLF).call(this, chunk, start);
    if (crlfIndex === -1) {
        chunks.push(chunk.subarray(start));
        return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeSimpleString).bind(this, chunks, type);
    }
    chunks.push(chunk.subarray(start, crlfIndex));
    const buffer = Buffer.concat(chunks);
    return type === Buffer ? buffer : buffer.toString();
}, _Decoder_decodeBlobString = function _Decoder_decodeBlobString(type, chunk) {
    // RESP 2 bulk string null
    // https://github.com/redis/redis-specifications/blob/master/protocol/RESP2.md#resp-bulk-strings
    if (chunk[__classPrivateFieldGet(this, _Decoder_cursor, "f")] === ASCII["-"]) {
        __classPrivateFieldSet(this, _Decoder_cursor, __classPrivateFieldGet(this, _Decoder_cursor, "f") + 4, "f"); // skip -1\r\n
        return null;
    }
    const length = __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeUnsingedNumber).call(this, 0, chunk);
    if (typeof length === "function") {
        return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeBlobStringLength).bind(this, length, type);
    }
    else if (__classPrivateFieldGet(this, _Decoder_cursor, "f") >= chunk.length) {
        return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeBlobStringWithLength).bind(this, length, type);
    }
    return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeBlobStringWithLength).call(this, length, type, chunk);
}, _Decoder_continueDecodeBlobStringLength = function _Decoder_continueDecodeBlobStringLength(lengthCb, type, chunk) {
    const length = lengthCb(chunk);
    if (typeof length === "function") {
        return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeBlobStringLength).bind(this, length, type);
    }
    else if (__classPrivateFieldGet(this, _Decoder_cursor, "f") >= chunk.length) {
        return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeBlobStringWithLength).bind(this, length, type);
    }
    return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeBlobStringWithLength).call(this, length, type, chunk);
}, _Decoder_decodeStringWithLength = function _Decoder_decodeStringWithLength(length, skip, type, chunk) {
    const end = __classPrivateFieldGet(this, _Decoder_cursor, "f") + length;
    if (end >= chunk.length) {
        const slice = chunk.subarray(__classPrivateFieldGet(this, _Decoder_cursor, "f"));
        __classPrivateFieldSet(this, _Decoder_cursor, chunk.length, "f");
        return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeStringWithLength).bind(this, length - slice.length, [slice], skip, type);
    }
    const slice = chunk.subarray(__classPrivateFieldGet(this, _Decoder_cursor, "f"), end);
    __classPrivateFieldSet(this, _Decoder_cursor, end + skip, "f");
    return type === Buffer ? slice : slice.toString();
}, _Decoder_continueDecodeStringWithLength = function _Decoder_continueDecodeStringWithLength(length, chunks, skip, type, chunk) {
    const end = __classPrivateFieldGet(this, _Decoder_cursor, "f") + length;
    if (end >= chunk.length) {
        const slice = chunk.subarray(__classPrivateFieldGet(this, _Decoder_cursor, "f"));
        chunks.push(slice);
        __classPrivateFieldSet(this, _Decoder_cursor, chunk.length, "f");
        return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeStringWithLength).bind(this, length - slice.length, chunks, skip, type);
    }
    chunks.push(chunk.subarray(__classPrivateFieldGet(this, _Decoder_cursor, "f"), end));
    __classPrivateFieldSet(this, _Decoder_cursor, end + skip, "f");
    const buffer = Buffer.concat(chunks);
    return type === Buffer ? buffer : buffer.toString();
}, _Decoder_decodeBlobStringWithLength = function _Decoder_decodeBlobStringWithLength(length, type, chunk) {
    return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeStringWithLength).call(this, length, 2, type, chunk);
}, _Decoder_decodeVerbatimString = function _Decoder_decodeVerbatimString(type, chunk) {
    return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeVerbatimStringLength).call(this, __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeUnsingedNumber).bind(this, 0), type, chunk);
}, _Decoder_continueDecodeVerbatimStringLength = function _Decoder_continueDecodeVerbatimStringLength(lengthCb, type, chunk) {
    const length = lengthCb(chunk);
    return typeof length === "function"
        ? __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeVerbatimStringLength).bind(this, length, type)
        : __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeVerbatimStringWithLength).call(this, length, type, chunk);
}, _Decoder_decodeVerbatimStringWithLength = function _Decoder_decodeVerbatimStringWithLength(length, type, chunk) {
    const stringLength = length - 4; // skip <format>:
    if (type === verbatim_string_1.VerbatimString) {
        return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeVerbatimStringFormat).call(this, stringLength, chunk);
    }
    __classPrivateFieldSet(this, _Decoder_cursor, __classPrivateFieldGet(this, _Decoder_cursor, "f") + 4, "f"); // skip <format>:
    return __classPrivateFieldGet(this, _Decoder_cursor, "f") >= chunk.length
        ? __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeBlobStringWithLength).bind(this, stringLength, type)
        : __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeBlobStringWithLength).call(this, stringLength, type, chunk);
}, _Decoder_decodeVerbatimStringFormat = function _Decoder_decodeVerbatimStringFormat(stringLength, chunk) {
    const formatCb = __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeStringWithLength).bind(this, 3, 1, String);
    return __classPrivateFieldGet(this, _Decoder_cursor, "f") >= chunk.length
        ? __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeVerbatimStringFormat).bind(this, stringLength, formatCb)
        : __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeVerbatimStringFormat).call(this, stringLength, formatCb, chunk);
}, _Decoder_continueDecodeVerbatimStringFormat = function _Decoder_continueDecodeVerbatimStringFormat(stringLength, formatCb, chunk) {
    const format = formatCb(chunk);
    return typeof format === "function"
        ? __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeVerbatimStringFormat).bind(this, stringLength, format)
        : __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeVerbatimStringWithFormat).call(this, stringLength, format, chunk);
}, _Decoder_decodeVerbatimStringWithFormat = function _Decoder_decodeVerbatimStringWithFormat(stringLength, format, chunk) {
    return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeVerbatimStringWithFormat).call(this, format, __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeBlobStringWithLength).bind(this, stringLength, String), chunk);
}, _Decoder_continueDecodeVerbatimStringWithFormat = function _Decoder_continueDecodeVerbatimStringWithFormat(format, stringCb, chunk) {
    const string = stringCb(chunk);
    return typeof string === "function"
        ? __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeVerbatimStringWithFormat).bind(this, format, string)
        : new verbatim_string_1.VerbatimString(format, string);
}, _Decoder_decodeSimpleError = function _Decoder_decodeSimpleError(chunk) {
    const string = __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeSimpleString).call(this, String, chunk);
    return typeof string === "function"
        ? __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeSimpleError).bind(this, string)
        : new errors_1.SimpleError(string);
}, _Decoder_continueDecodeSimpleError = function _Decoder_continueDecodeSimpleError(stringCb, chunk) {
    const string = stringCb(chunk);
    return typeof string === "function"
        ? __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeSimpleError).bind(this, string)
        : new errors_1.SimpleError(string);
}, _Decoder_decodeBlobError = function _Decoder_decodeBlobError(chunk) {
    const string = __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeBlobString).call(this, String, chunk);
    return typeof string === "function"
        ? __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeBlobError).bind(this, string)
        : new errors_1.BlobError(string);
}, _Decoder_continueDecodeBlobError = function _Decoder_continueDecodeBlobError(stringCb, chunk) {
    const string = stringCb(chunk);
    return typeof string === "function"
        ? __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeBlobError).bind(this, string)
        : new errors_1.BlobError(string);
}, _Decoder_decodeNestedType = function _Decoder_decodeNestedType(typeMapping, chunk) {
    var _b;
    const type = chunk[__classPrivateFieldGet(this, _Decoder_cursor, "f")];
    return __classPrivateFieldSet(this, _Decoder_cursor, (_b = __classPrivateFieldGet(this, _Decoder_cursor, "f"), ++_b), "f") === chunk.length
        ? __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeNestedTypeValue).bind(this, type, typeMapping)
        : __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeNestedTypeValue).call(this, type, typeMapping, chunk);
}, _Decoder_decodeNestedTypeValue = function _Decoder_decodeNestedTypeValue(type, typeMapping, chunk) {
    switch (type) {
        case exports.RESP_TYPES.NULL:
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeNull).call(this);
        case exports.RESP_TYPES.BOOLEAN:
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeBoolean).call(this, typeMapping[exports.RESP_TYPES.BOOLEAN], chunk);
        case exports.RESP_TYPES.NUMBER:
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeNumber).call(this, typeMapping[exports.RESP_TYPES.NUMBER], chunk);
        case exports.RESP_TYPES.BIG_NUMBER:
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeBigNumber).call(this, typeMapping[exports.RESP_TYPES.BIG_NUMBER], chunk);
        case exports.RESP_TYPES.DOUBLE:
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeDouble).call(this, typeMapping[exports.RESP_TYPES.DOUBLE], chunk);
        case exports.RESP_TYPES.SIMPLE_STRING:
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeSimpleString).call(this, typeMapping[exports.RESP_TYPES.SIMPLE_STRING], chunk);
        case exports.RESP_TYPES.BLOB_STRING:
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeBlobString).call(this, typeMapping[exports.RESP_TYPES.BLOB_STRING], chunk);
        case exports.RESP_TYPES.VERBATIM_STRING:
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeVerbatimString).call(this, typeMapping[exports.RESP_TYPES.VERBATIM_STRING], chunk);
        case exports.RESP_TYPES.SIMPLE_ERROR:
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeSimpleError).call(this, chunk);
        case exports.RESP_TYPES.BLOB_ERROR:
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeBlobError).call(this, chunk);
        case exports.RESP_TYPES.ARRAY:
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeArray).call(this, typeMapping, chunk);
        case exports.RESP_TYPES.SET:
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeSet).call(this, typeMapping, chunk);
        case exports.RESP_TYPES.MAP:
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeMap).call(this, typeMapping, chunk);
        default:
            throw new Error(`Unknown RESP type ${type} "${String.fromCharCode(type)}"`);
    }
}, _Decoder_decodeArray = function _Decoder_decodeArray(typeMapping, chunk) {
    // RESP 2 null
    // https://github.com/redis/redis-specifications/blob/master/protocol/RESP2.md#resp-arrays
    if (chunk[__classPrivateFieldGet(this, _Decoder_cursor, "f")] === ASCII["-"]) {
        __classPrivateFieldSet(this, _Decoder_cursor, __classPrivateFieldGet(this, _Decoder_cursor, "f") + 4, "f"); // skip -1\r\n
        return null;
    }
    return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeArrayWithLength).call(this, __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeUnsingedNumber).call(this, 0, chunk), typeMapping, chunk);
}, _Decoder_decodeArrayWithLength = function _Decoder_decodeArrayWithLength(length, typeMapping, chunk) {
    return typeof length === "function"
        ? __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeArrayLength).bind(this, length, typeMapping)
        : __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeArrayItems).call(this, new Array(length), 0, typeMapping, chunk);
}, _Decoder_continueDecodeArrayLength = function _Decoder_continueDecodeArrayLength(lengthCb, typeMapping, chunk) {
    return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeArrayWithLength).call(this, lengthCb(chunk), typeMapping, chunk);
}, _Decoder_decodeArrayItems = function _Decoder_decodeArrayItems(array, filled, typeMapping, chunk) {
    for (let i = filled; i < array.length; i++) {
        if (__classPrivateFieldGet(this, _Decoder_cursor, "f") >= chunk.length) {
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeArrayItems).bind(this, array, i, typeMapping);
        }
        const item = __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeNestedType).call(this, typeMapping, chunk);
        if (typeof item === "function") {
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeArrayItems).bind(this, array, i, item, typeMapping);
        }
        array[i] = item;
    }
    return array;
}, _Decoder_continueDecodeArrayItems = function _Decoder_continueDecodeArrayItems(array, filled, itemCb, typeMapping, chunk) {
    const item = itemCb(chunk);
    if (typeof item === "function") {
        return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeArrayItems).bind(this, array, filled, item, typeMapping);
    }
    array[filled++] = item;
    return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeArrayItems).call(this, array, filled, typeMapping, chunk);
}, _Decoder_decodeSet = function _Decoder_decodeSet(typeMapping, chunk) {
    const length = __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeUnsingedNumber).call(this, 0, chunk);
    if (typeof length === "function") {
        return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeSetLength).bind(this, length, typeMapping);
    }
    return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeSetItems).call(this, length, typeMapping, chunk);
}, _Decoder_continueDecodeSetLength = function _Decoder_continueDecodeSetLength(lengthCb, typeMapping, chunk) {
    const length = lengthCb(chunk);
    return typeof length === "function"
        ? __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeSetLength).bind(this, length, typeMapping)
        : __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeSetItems).call(this, length, typeMapping, chunk);
}, _Decoder_decodeSetItems = function _Decoder_decodeSetItems(length, typeMapping, chunk) {
    return typeMapping[exports.RESP_TYPES.SET] === Set
        ? __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeSetAsSet).call(this, new Set(), length, typeMapping, chunk)
        : __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeArrayItems).call(this, new Array(length), 0, typeMapping, chunk);
}, _Decoder_decodeSetAsSet = function _Decoder_decodeSetAsSet(set, remaining, typeMapping, chunk) {
    // using `remaining` instead of `length` & `set.size` to make it work even if the set contains duplicates
    while (remaining > 0) {
        if (__classPrivateFieldGet(this, _Decoder_cursor, "f") >= chunk.length) {
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeSetAsSet).bind(this, set, remaining, typeMapping);
        }
        const item = __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeNestedType).call(this, typeMapping, chunk);
        if (typeof item === "function") {
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeSetAsSet).bind(this, set, remaining, item, typeMapping);
        }
        set.add(item);
        --remaining;
    }
    return set;
}, _Decoder_continueDecodeSetAsSet = function _Decoder_continueDecodeSetAsSet(set, remaining, itemCb, typeMapping, chunk) {
    const item = itemCb(chunk);
    if (typeof item === "function") {
        return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeSetAsSet).bind(this, set, remaining, item, typeMapping);
    }
    set.add(item);
    return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeSetAsSet).call(this, set, remaining - 1, typeMapping, chunk);
}, _Decoder_decodeMap = function _Decoder_decodeMap(typeMapping, chunk) {
    const length = __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeUnsingedNumber).call(this, 0, chunk);
    if (typeof length === "function") {
        return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeMapLength).bind(this, length, typeMapping);
    }
    return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeMapItems).call(this, length, typeMapping, chunk);
}, _Decoder_continueDecodeMapLength = function _Decoder_continueDecodeMapLength(lengthCb, typeMapping, chunk) {
    const length = lengthCb(chunk);
    return typeof length === "function"
        ? __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeMapLength).bind(this, length, typeMapping)
        : __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeMapItems).call(this, length, typeMapping, chunk);
}, _Decoder_decodeMapItems = function _Decoder_decodeMapItems(length, typeMapping, chunk) {
    switch (typeMapping[exports.RESP_TYPES.MAP]) {
        case Map:
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeMapAsMap).call(this, new Map(), length, typeMapping, chunk);
        case Array:
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeArrayItems).call(this, new Array(length * 2), 0, typeMapping, chunk);
        default:
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeMapAsObject).call(this, {}, length, typeMapping, chunk);
    }
}, _Decoder_decodeMapAsMap = function _Decoder_decodeMapAsMap(map, remaining, typeMapping, chunk) {
    // using `remaining` instead of `length` & `map.size` to make it work even if the map contains duplicate keys
    while (remaining > 0) {
        if (__classPrivateFieldGet(this, _Decoder_cursor, "f") >= chunk.length) {
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeMapAsMap).bind(this, map, remaining, typeMapping);
        }
        const key = __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeMapKey).call(this, typeMapping, chunk);
        if (typeof key === "function") {
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeMapKey).bind(this, map, remaining, key, typeMapping);
        }
        if (__classPrivateFieldGet(this, _Decoder_cursor, "f") >= chunk.length) {
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeMapValue).bind(this, map, remaining, key, __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeNestedType).bind(this, typeMapping), typeMapping);
        }
        const value = __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeNestedType).call(this, typeMapping, chunk);
        if (typeof value === "function") {
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeMapValue).bind(this, map, remaining, key, value, typeMapping);
        }
        map.set(key, value);
        --remaining;
    }
    return map;
}, _Decoder_decodeMapKey = function _Decoder_decodeMapKey(typeMapping, chunk) {
    var _b;
    const type = chunk[__classPrivateFieldGet(this, _Decoder_cursor, "f")];
    return __classPrivateFieldSet(this, _Decoder_cursor, (_b = __classPrivateFieldGet(this, _Decoder_cursor, "f"), ++_b), "f") === chunk.length
        ? __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeMapKeyValue).bind(this, type, typeMapping)
        : __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeMapKeyValue).call(this, type, typeMapping, chunk);
}, _Decoder_decodeMapKeyValue = function _Decoder_decodeMapKeyValue(type, typeMapping, chunk) {
    switch (type) {
        // decode simple string map key as string (and not as buffer)
        case exports.RESP_TYPES.SIMPLE_STRING:
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeSimpleString).call(this, String, chunk);
        // decode blob string map key as string (and not as buffer)
        case exports.RESP_TYPES.BLOB_STRING:
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeBlobString).call(this, String, chunk);
        default:
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeNestedTypeValue).call(this, type, typeMapping, chunk);
    }
}, _Decoder_continueDecodeMapKey = function _Decoder_continueDecodeMapKey(map, remaining, keyCb, typeMapping, chunk) {
    const key = keyCb(chunk);
    if (typeof key === "function") {
        return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeMapKey).bind(this, map, remaining, key, typeMapping);
    }
    if (__classPrivateFieldGet(this, _Decoder_cursor, "f") >= chunk.length) {
        return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeMapValue).bind(this, map, remaining, key, __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeNestedType).bind(this, typeMapping), typeMapping);
    }
    const value = __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeNestedType).call(this, typeMapping, chunk);
    if (typeof value === "function") {
        return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeMapValue).bind(this, map, remaining, key, value, typeMapping);
    }
    map.set(key, value);
    return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeMapAsMap).call(this, map, remaining - 1, typeMapping, chunk);
}, _Decoder_continueDecodeMapValue = function _Decoder_continueDecodeMapValue(map, remaining, key, valueCb, typeMapping, chunk) {
    const value = valueCb(chunk);
    if (typeof value === "function") {
        return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeMapValue).bind(this, map, remaining, key, value, typeMapping);
    }
    map.set(key, value);
    return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeMapAsMap).call(this, map, remaining - 1, typeMapping, chunk);
}, _Decoder_decodeMapAsObject = function _Decoder_decodeMapAsObject(object, remaining, typeMapping, chunk) {
    while (remaining > 0) {
        if (__classPrivateFieldGet(this, _Decoder_cursor, "f") >= chunk.length) {
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeMapAsObject).bind(this, object, remaining, typeMapping);
        }
        const key = __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeMapKey).call(this, typeMapping, chunk);
        if (typeof key === "function") {
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeMapAsObjectKey).bind(this, object, remaining, key, typeMapping);
        }
        if (__classPrivateFieldGet(this, _Decoder_cursor, "f") >= chunk.length) {
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeMapAsObjectValue).bind(this, object, remaining, key, __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeNestedType).bind(this, typeMapping), typeMapping);
        }
        const value = __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeNestedType).call(this, typeMapping, chunk);
        if (typeof value === "function") {
            return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeMapAsObjectValue).bind(this, object, remaining, key, value, typeMapping);
        }
        // Guard "__proto__"/"constructor" via defineProperty, where a bare
        // assignment would tamper with the object. Issue #1267. Normal keys take
        // the fast plain-assignment path.
        if (key === "__proto__" || key === "constructor") {
            Object.defineProperty(object, key, {
                value,
                configurable: true,
                enumerable: true,
                writable: true,
            });
        }
        else {
            object[key] = value;
        }
        --remaining;
    }
    return object;
}, _Decoder_continueDecodeMapAsObjectKey = function _Decoder_continueDecodeMapAsObjectKey(object, remaining, keyCb, typeMapping, chunk) {
    const key = keyCb(chunk);
    if (typeof key === "function") {
        return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeMapAsObjectKey).bind(this, object, remaining, key, typeMapping);
    }
    if (__classPrivateFieldGet(this, _Decoder_cursor, "f") >= chunk.length) {
        return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeMapAsObjectValue).bind(this, object, remaining, key, __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeNestedType).bind(this, typeMapping), typeMapping);
    }
    const value = __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeNestedType).call(this, typeMapping, chunk);
    if (typeof value === "function") {
        return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeMapAsObjectValue).bind(this, object, remaining, key, value, typeMapping);
    }
    // Guard "__proto__"/"constructor" via defineProperty, where a bare
    // assignment would tamper with the object. Issue #1267. Normal keys take
    // the fast plain-assignment path.
    if (key === "__proto__" || key === "constructor") {
        Object.defineProperty(object, key, {
            value,
            configurable: true,
            enumerable: true,
            writable: true,
        });
    }
    else {
        object[key] = value;
    }
    return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeMapAsObject).call(this, object, remaining - 1, typeMapping, chunk);
}, _Decoder_continueDecodeMapAsObjectValue = function _Decoder_continueDecodeMapAsObjectValue(object, remaining, key, valueCb, typeMapping, chunk) {
    const value = valueCb(chunk);
    if (typeof value === "function") {
        return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_continueDecodeMapAsObjectValue).bind(this, object, remaining, key, value, typeMapping);
    }
    // Guard "__proto__"/"constructor" via defineProperty, where a bare
    // assignment would tamper with the object. Issue #1267. Normal keys take
    // the fast plain-assignment path.
    if (key === "__proto__" || key === "constructor") {
        Object.defineProperty(object, key, {
            value,
            configurable: true,
            enumerable: true,
            writable: true,
        });
    }
    else {
        object[key] = value;
    }
    return __classPrivateFieldGet(this, _Decoder_instances, "m", _Decoder_decodeMapAsObject).call(this, object, remaining - 1, typeMapping, chunk);
};
// Precalculated multipliers for decimal points to improve performance
// "... about 15 to 17 decimal places ..."
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number#:~:text=about%2015%20to%2017%20decimal%20places
_Decoder_DOUBLE_DECIMAL_MULTIPLIERS = { value: [
        1e-1, 1e-2, 1e-3, 1e-4, 1e-5, 1e-6, 1e-7, 1e-8, 1e-9, 1e-10, 1e-11, 1e-12,
        1e-13, 1e-14, 1e-15, 1e-16, 1e-17,
    ] };
