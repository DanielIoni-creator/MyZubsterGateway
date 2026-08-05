import { ChainableCommander } from "./utils/RedisCommander";
export interface Transaction<Mapping extends "resp2" | "resp3" = "resp2"> {
    pipeline(commands?: unknown[][]): ChainableCommander<Mapping>;
    multi(options: {
        pipeline: false;
    }): Promise<"OK">;
    multi(): ChainableCommander<Mapping>;
    multi(options: {
        pipeline: true;
    }): ChainableCommander<Mapping>;
    multi(commands?: unknown[][]): ChainableCommander<Mapping>;
}
export declare function addTransactionSupport(redis: any): void;
