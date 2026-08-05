"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerbatimString = void 0;
/*
 * Portions adapted from node-redis:
 * https://github.com/redis/node-redis
 *
 * Copyright (c) 2022-2023, Redis, Inc.
 * Licensed under the MIT License.
 */
class VerbatimString extends String {
    constructor(format, value) {
        super(value);
        this.format = format;
    }
}
exports.VerbatimString = VerbatimString;
