/// <reference types="node" />
/// <reference types="node" />
import { IpcNetConnectOpts, TcpNetConnectOpts } from "net";
import { ConnectionOptions } from "tls";
import { NetStream } from "../types";
import AbstractConnector, { ErrorEmitter } from "./AbstractConnector";
type TcpOptions = Pick<TcpNetConnectOpts, "port" | "host" | "family">;
type IpcOptions = Pick<IpcNetConnectOpts, "path">;
export type StandaloneConnectionOptions = Partial<TcpOptions & IpcOptions> & {
    disconnectTimeout?: number | undefined;
    tls?: ConnectionOptions | undefined;
};
export default class StandaloneConnector extends AbstractConnector {
    protected options: StandaloneConnectionOptions;
    constructor(options: StandaloneConnectionOptions);
    connect(_: ErrorEmitter): Promise<NetStream>;
}
export {};
