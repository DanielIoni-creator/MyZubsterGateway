import { ReplyError } from "redis-errors";
export type ErrorReply = ReplyError;
export declare class SimpleError extends ReplyError {
    get name(): string;
}
export declare class BlobError extends ReplyError {
    get name(): string;
}
