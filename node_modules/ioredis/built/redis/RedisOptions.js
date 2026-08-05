"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_REDIS_OPTIONS = void 0;
exports.DEFAULT_REDIS_OPTIONS = {
    // Connection
    port: 6379,
    host: "localhost",
    family: 0,
    connectTimeout: 10000,
    disconnectTimeout: 2000,
    retryStrategy: function (times) {
        const jitter = Math.floor(Math.random() * 200);
        // `times` is one-based, so the first retry uses an exponent of zero.
        const delay = Math.min(Math.pow(2, times - 1) * 50, 5000);
        return delay + jitter;
    },
    keepAlive: 30000,
    noDelay: true,
    connectionName: null,
    disableClientInfo: false,
    clientInfoTag: undefined,
    // Sentinel
    sentinels: null,
    name: null,
    role: "master",
    sentinelRetryStrategy: function (times) {
        return Math.min(times * 10, 1000);
    },
    sentinelReconnectStrategy: function () {
        // This strategy only applies when sentinels are used for detecting
        // a failover, not during initial master resolution.
        // The deployment can still function when some of the sentinels are down
        // for a long period of time, so we may not want to attempt reconnection
        // very often. Therefore the default interval is fairly long (1 minute).
        return 60000;
    },
    natMap: null,
    enableTLSForSentinelMode: false,
    updateSentinels: true,
    failoverDetector: false,
    // Status
    username: null,
    password: null,
    db: 0,
    // Others
    enableOfflineQueue: true,
    enableReadyCheck: true,
    autoResubscribe: true,
    autoResendUnfulfilledCommands: true,
    lazyConnect: false,
    keyPrefix: "",
    reconnectOnError: null,
    readOnly: false,
    stringNumbers: false,
    protocol: 3,
    replyMapping: "legacy",
    maxRetriesPerRequest: 20,
    maxLoadingRetryTime: 10000,
    enableAutoPipelining: false,
    autoPipeliningIgnoredCommands: [],
    sentinelMaxConnections: 10,
    blockingTimeoutGrace: 100,
};
