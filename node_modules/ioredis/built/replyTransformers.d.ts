import { ProtocolVersion, ReplyMappingMode } from "./types";
export interface ReplyTransformerContext {
    commandName: string;
    protocol: ProtocolVersion;
    replyMapping: ReplyMappingMode;
}
export interface ReplyContext {
    protocol?: ProtocolVersion;
    replyMapping?: ReplyMappingMode;
}
export type ReplyTransformer = (reply: any, context: ReplyTransformerContext) => any;
export declare const passthroughReplyTransformer: ReplyTransformer;
export declare const flattenNestedArrayItems: ReplyTransformer;
export declare const wrapStreamMapPairs: ReplyTransformer;
export declare const transformVsimReply: ReplyTransformer;
export declare const transformPairReply: ReplyTransformer;
export declare const transformStreamReadReply: ReplyTransformer;
export declare const sortedSetWithScorePairCommands: readonly ["zdiff", "zinter", "zpopmax", "zpopmin", "zunion", "zrandmember", "zrange", "zrangebyscore", "zrevrange", "zrevrangebyscore"];
