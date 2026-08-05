/// <reference types="node" />
/// <reference types="node" />
import Command from "../Command";
import type { HimportFieldset } from "./types";
type HimportConnectionRole = "standalone" | "cluster" | "master" | "replica";
export interface HimportConnection {
    sendCommand(command: Command): unknown;
}
interface HimportPipelineOwner extends HimportConnection {
    slots?: readonly (readonly string[])[];
    connectionPool?: {
        getInstanceByKey(key: string): HimportConnection | undefined;
        getSampleInstance(role: "master"): HimportConnection | undefined;
    };
}
interface HimportPipelineInterception {
    owner: HimportPipelineOwner;
    commands: readonly Command[];
    slot?: number;
    preferredNodeKey?: string;
    setDestination(connection: HimportConnection): void;
    resume(): void;
    reject(error: Error): void;
}
interface HimportDefinition {
    readonly canonicalName: string;
    readonly name: string | Buffer;
    readonly fields: readonly (string | Buffer)[];
}
interface ManagedSetContext {
    definition: HimportDefinition;
    lastConnection?: HimportConnection;
    resumeSend?: () => void;
    recoveryAttempts: number;
    recoveryInstalled: boolean;
    sendWithoutPreparationOn?: HimportConnection;
}
export interface HimportBinding {
    coordinator: HimportCoordinator;
    role: HimportConnectionRole;
}
export declare const hasHimportCoordinator: unique symbol;
export declare function cloneHimportFieldsets(fieldsets: readonly HimportFieldset[] | undefined): readonly HimportFieldset[] | undefined;
export default class HimportCoordinator {
    private readonly definitions;
    private readonly definitionsByName;
    private readonly sessions;
    private readonly managedSets;
    constructor(fieldsets: readonly HimportFieldset[]);
    get size(): number;
    beginSession(connection: HimportConnection): void;
    detach(connection: HimportConnection): void;
    invalidate(connection: HimportConnection): void;
    getDefinitions(): readonly HimportDefinition[];
    classify(command: Command): ManagedSetContext | undefined;
    prepareCommand(connection: HimportConnection, command: Command): Promise<void> | undefined;
    hasManagedSet(commands: readonly Command[]): boolean;
    prepareCommands(connection: HimportConnection, commands: readonly Command[]): Promise<void> | undefined;
    interceptCommand(connection: HimportConnection, command: Command, ready: boolean, resumeSend: () => void): boolean;
    allowNextSend(connection: HimportConnection, command: Command): void;
    consumeAllowedSend(connection: HimportConnection, command: Command): boolean;
    installRecovery(connection: HimportConnection, command: Command, resumeSend: () => void): void;
    ensurePrepared(connection: HimportConnection, definition: HimportDefinition): Promise<void> | undefined;
    private getSession;
    private markUnprepared;
}
export declare function bindHimportCoordinator(owner: object, coordinator: HimportCoordinator, role: HimportConnectionRole): void;
export declare function getHimportBinding(owner: object): HimportBinding | undefined;
export declare function interceptHimportCommand(connection: HimportConnection, command: Command, ready: boolean, resumeSend: () => void): boolean;
export declare function interceptHimportPipeline({ owner, commands, slot, preferredNodeKey, setDestination, resume, reject, }: HimportPipelineInterception): boolean;
export declare function setHimportRole(owner: object, role: HimportConnectionRole): void;
export declare function unbindHimportCoordinator(owner: object): void;
export declare function isInternalHimportCommand(command: Command): boolean;
export declare function isHimportControlCommand(command: Command): boolean;
export declare function interceptHimportControlCommand(connections: readonly HimportConnection[], command: Command): boolean;
export {};
