"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sortedSetWithScorePairCommands = exports.transformStreamReadReply = exports.transformPairReply = exports.transformVsimReply = exports.wrapStreamMapPairs = exports.flattenNestedArrayItems = exports.passthroughReplyTransformer = void 0;
const passthroughReplyTransformer = function (result) {
    return result;
};
exports.passthroughReplyTransformer = passthroughReplyTransformer;
const flattenNestedArrayItems = function (result) {
    if (!Array.isArray(result)) {
        return result;
    }
    let flat = null;
    for (let i = 0; i < result.length; i++) {
        const item = result[i];
        if (Array.isArray(item)) {
            if (!flat) {
                flat = result.slice(0, i);
            }
            flat.push(...item);
        }
        else if (flat) {
            flat.push(item);
        }
    }
    return flat ?? result;
};
exports.flattenNestedArrayItems = flattenNestedArrayItems;
const flattenPairTransformers = {
    2: {
        legacy: exports.passthroughReplyTransformer,
        resp3: exports.passthroughReplyTransformer,
    },
    3: {
        legacy: exports.flattenNestedArrayItems,
        resp3: exports.passthroughReplyTransformer,
    },
};
const vsimTransformers = {
    2: {
        legacy: exports.flattenNestedArrayItems,
        resp3: exports.passthroughReplyTransformer,
    },
    3: {
        legacy: exports.flattenNestedArrayItems,
        resp3: exports.passthroughReplyTransformer,
    },
};
const wrapStreamMapPairs = function (result) {
    if (!Array.isArray(result)) {
        return result;
    }
    const wrapped = [];
    for (let i = 0; i < result.length; i += 2) {
        wrapped.push([result[i], result[i + 1]]);
    }
    return wrapped;
};
exports.wrapStreamMapPairs = wrapStreamMapPairs;
const streamReadTransformers = {
    2: {
        legacy: exports.passthroughReplyTransformer,
        resp3: exports.passthroughReplyTransformer,
    },
    3: {
        legacy: exports.wrapStreamMapPairs,
        resp3: exports.passthroughReplyTransformer,
    },
};
const transformVsimReply = function (result, context) {
    return vsimTransformers[context.protocol][context.replyMapping](result, context);
};
exports.transformVsimReply = transformVsimReply;
const transformPairReply = function (result, context) {
    return flattenPairTransformers[context.protocol][context.replyMapping](result, context);
};
exports.transformPairReply = transformPairReply;
const transformStreamReadReply = function (result, context) {
    return streamReadTransformers[context.protocol][context.replyMapping](result, context);
};
exports.transformStreamReadReply = transformStreamReadReply;
exports.sortedSetWithScorePairCommands = [
    "zdiff",
    "zinter",
    "zpopmax",
    "zpopmin",
    "zunion",
    "zrandmember",
    "zrange",
    "zrangebyscore",
    "zrevrange",
    "zrevrangebyscore",
];
