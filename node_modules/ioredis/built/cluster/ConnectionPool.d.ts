/// <reference types="node" />
import { EventEmitter } from "events";
import { RedisOptions, NodeKey, NodeRole } from "./util";
import { ClusterOptions, ClusterNodeRetryStrategy } from "./ClusterOptions";
import Redis from "../Redis";
export interface ConnectionPoolHooks {
    onCreate?: (redis: Redis, readOnly: boolean) => void;
    onRoleChange?: (redis: Redis, key: NodeKey, readOnly: boolean) => void;
    onRemove?: (redis: Redis) => void;
}
export default class ConnectionPool extends EventEmitter {
    private redisOptions;
    private clusterNodeRetryStrategy;
    private hooks;
    private nodes;
    private specifiedOptions;
    constructor(redisOptions: NonNullable<ClusterOptions["redisOptions"]>, clusterNodeRetryStrategy?: ClusterNodeRetryStrategy, hooks?: ConnectionPoolHooks);
    getNodes(role?: NodeRole): Redis[];
    getInstanceByKey(key: NodeKey): Redis;
    getSampleInstance(role: NodeRole): Redis;
    /**
     * Add a master node to the pool
     * @param node
     */
    addMasterNode(node: RedisOptions): boolean;
    /**
     * Creates a Redis connection instance from the node options
     * @param node
     * @param readOnly
     */
    createRedisFromOptions(node: RedisOptions, readOnly: boolean): Redis<import("../types").ReplyMappingMode>;
    /**
     * Find or create a connection to the node
     */
    findOrCreate(node: RedisOptions, readOnly?: boolean): Redis;
    /**
     * Replace the connection to the node with a fresh one. Used when the
     * existing connection is known to be stale, e.g. after a MOVED redirect
     * that points back at the node it came from.
     */
    recreate(node: RedisOptions, readOnly?: boolean): Redis;
    /**
     * Reset the pool with a set of nodes.
     * The old node will be removed.
     */
    reset(nodes: RedisOptions[]): void;
    /**
     * Remove a node from the pool.
     */
    private removeNode;
}
