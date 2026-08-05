/// <reference types="node" />
import { NetStream, CommandItem, ProtocolVersion, ReplyMappingMode } from "./types";
import Deque = require("denque");
import { EventEmitter } from "events";
import SubscriptionSet from "./SubscriptionSet";
export interface Condition {
    select: number;
    auth?: string | [string, string];
    subscriber: false | SubscriptionSet;
    protocol: ProtocolVersion;
    replyMapping: ReplyMappingMode;
    handshake: boolean;
}
export type FlushQueueOptions = {
    offlineQueue?: boolean;
    commandQueue?: boolean;
};
export interface DataHandledable extends EventEmitter {
    stream: NetStream;
    status: string;
    condition: Condition | null;
    commandQueue: Deque<CommandItem>;
    disconnect(reconnect: boolean): void;
    recoverFromFatalError(commandError: Error, err: Error, options: FlushQueueOptions): void;
    handleReconnection(err: Error, item: CommandItem): void;
}
interface ParserOptions {
    stringNumbers: boolean;
    replyMapping: ReplyMappingMode;
}
export default class DataHandler {
    private redis;
    constructor(redis: DataHandledable, parserOptions: ParserOptions);
    private dispatch;
    private returnFatalError;
    private returnError;
    private returnReply;
    private returnPush;
    private handleUnsolicitedUnsubscribe;
    private handleSubscriberReply;
    private handleMonitorReply;
    private shiftCommand;
}
export {};
