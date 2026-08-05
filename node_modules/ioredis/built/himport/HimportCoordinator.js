"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.interceptHimportControlCommand = exports.isHimportControlCommand = exports.isInternalHimportCommand = exports.unbindHimportCoordinator = exports.setHimportRole = exports.interceptHimportPipeline = exports.interceptHimportCommand = exports.getHimportBinding = exports.bindHimportCoordinator = exports.cloneHimportFieldsets = exports.hasHimportCoordinator = void 0;
const Command_1 = require("../Command");
const utils_1 = require("../utils");
exports.hasHimportCoordinator = Symbol("hasHimportCoordinator");
const bindings = new WeakMap();
const internalCommands = new WeakSet();
const debug = (0, utils_1.Debug)("himport");
function copyValue(value) {
    return value instanceof Buffer ? Buffer.from(value) : value;
}
function canonicalize(value) {
    return Buffer.from(value).toString("base64");
}
function commandToken(value) {
    if (value === undefined) {
        return "";
    }
    return Buffer.isBuffer(value)
        ? value.toString("utf8").toUpperCase()
        : String(value).toUpperCase();
}
function cloneHimportFieldsets(fieldsets) {
    if (fieldsets === undefined) {
        return undefined;
    }
    if (!Array.isArray(fieldsets)) {
        throw new TypeError("himportFieldsets must be an array");
    }
    const names = new Set();
    const copied = fieldsets.map((fieldset) => {
        if (!fieldset || typeof fieldset !== "object") {
            throw new TypeError("Each HIMPORT fieldset must be an object");
        }
        if (typeof fieldset.name !== "string" && !Buffer.isBuffer(fieldset.name)) {
            throw new TypeError("Each HIMPORT fieldset name must be a string or Buffer");
        }
        if (!Array.isArray(fieldset.fields)) {
            throw new TypeError("Each HIMPORT fieldset fields value must be an array");
        }
        const name = copyValue(fieldset.name);
        const canonicalName = canonicalize(name);
        if (names.has(canonicalName)) {
            throw new TypeError("Duplicate HIMPORT fieldset name");
        }
        names.add(canonicalName);
        const fields = fieldset.fields.map((field) => {
            if (typeof field !== "string" && !Buffer.isBuffer(field)) {
                throw new TypeError("Each HIMPORT field must be a string or Buffer");
            }
            return copyValue(field);
        });
        return Object.freeze({
            name,
            fields: Object.freeze(fields),
        });
    });
    return Object.freeze(copied);
}
exports.cloneHimportFieldsets = cloneHimportFieldsets;
class HimportCoordinator {
    constructor(fieldsets) {
        this.definitionsByName = new Map();
        this.sessions = new WeakMap();
        this.managedSets = new WeakMap();
        this.definitions = fieldsets.map((fieldset) => {
            const definition = {
                canonicalName: canonicalize(fieldset.name),
                name: fieldset.name,
                fields: fieldset.fields,
            };
            this.definitionsByName.set(definition.canonicalName, definition);
            return definition;
        });
    }
    get size() {
        return this.definitions.length;
    }
    beginSession(connection) {
        this.sessions.set(connection, {
            fieldsets: new Map(),
        });
    }
    detach(connection) {
        this.sessions.delete(connection);
    }
    invalidate(connection) {
        const session = this.sessions.get(connection);
        if (session) {
            session.fieldsets.clear();
        }
    }
    getDefinitions() {
        return this.definitions;
    }
    classify(command) {
        const existing = this.managedSets.get(command);
        if (existing) {
            return existing;
        }
        if (command.name.toLowerCase() !== "himport" ||
            commandToken(command.args[0]) !== "SET") {
            return undefined;
        }
        const fieldsetName = command.args[2];
        if (typeof fieldsetName !== "string" && !Buffer.isBuffer(fieldsetName)) {
            return undefined;
        }
        const definition = this.definitionsByName.get(canonicalize(fieldsetName));
        if (!definition) {
            return undefined;
        }
        const context = {
            definition,
            recoveryAttempts: 0,
            recoveryInstalled: false,
        };
        this.managedSets.set(command, context);
        return context;
    }
    prepareCommand(connection, command) {
        const context = this.classify(command);
        if (!context) {
            return undefined;
        }
        return this.ensurePrepared(connection, context.definition);
    }
    hasManagedSet(commands) {
        return commands.some((command) => this.classify(command) !== undefined);
    }
    prepareCommands(connection, commands) {
        const preparations = new Set();
        for (const command of commands) {
            const preparation = this.prepareCommand(connection, command);
            if (preparation) {
                preparations.add(preparation);
            }
        }
        if (preparations.size === 0) {
            return undefined;
        }
        return Promise.all(preparations).then(() => undefined);
    }
    interceptCommand(connection, command, ready, resumeSend) {
        if (command.isSettled) {
            return true;
        }
        if (command.name.toLowerCase() === "reset") {
            this.invalidate(connection);
        }
        const managedSet = this.classify(command);
        if (!managedSet) {
            return false;
        }
        this.installRecovery(connection, command, resumeSend);
        const maySend = this.consumeAllowedSend(connection, command);
        if (!ready || maySend) {
            return false;
        }
        const preparation = this.prepareCommand(connection, command);
        if (!preparation) {
            return false;
        }
        preparation.then(() => {
            if (command.isSettled) {
                return;
            }
            try {
                this.allowNextSend(connection, command);
                resumeSend();
            }
            catch (error) {
                command.reject(error);
            }
        }, (error) => {
            if (!command.isSettled) {
                command.reject(error);
            }
        });
        return true;
    }
    allowNextSend(connection, command) {
        const context = this.classify(command);
        if (context) {
            context.sendWithoutPreparationOn = connection;
        }
    }
    consumeAllowedSend(connection, command) {
        const context = this.managedSets.get(command);
        if (context?.sendWithoutPreparationOn !== connection) {
            return false;
        }
        context.sendWithoutPreparationOn = undefined;
        return true;
    }
    installRecovery(connection, command, resumeSend) {
        const context = this.classify(command);
        if (!context) {
            return;
        }
        context.lastConnection = connection;
        context.resumeSend = resumeSend;
        if (context.recoveryInstalled) {
            return;
        }
        context.recoveryInstalled = true;
        const reject = command.reject;
        command.reject = (error) => {
            if (command.isSettled) {
                return;
            }
            const recoveryConnection = context.lastConnection;
            const recoverySend = context.resumeSend;
            if (context.recoveryAttempts > 0 ||
                !recoveryConnection ||
                !recoverySend ||
                !isMissingFieldsetError(error)) {
                reject.call(command, error);
                return;
            }
            context.recoveryAttempts += 1;
            this.markUnprepared(recoveryConnection, context.definition);
            const preparation = this.ensurePrepared(recoveryConnection, context.definition);
            Promise.resolve(preparation).then(() => {
                if (command.isSettled) {
                    return;
                }
                try {
                    this.allowNextSend(recoveryConnection, command);
                    recoverySend();
                }
                catch (sendError) {
                    reject.call(command, sendError);
                }
            }, (preparationError) => {
                if (!command.isSettled) {
                    reject.call(command, preparationError);
                }
            });
        };
    }
    ensurePrepared(connection, definition) {
        const session = this.getSession(connection);
        const current = session.fieldsets.get(definition.canonicalName);
        if (current?.status === "prepared") {
            return undefined;
        }
        if (current?.status === "preparing") {
            return current.promise;
        }
        const command = new Command_1.default("himport", [
            "PREPARE",
            definition.name,
            ...definition.fields,
        ]);
        internalCommands.add(command);
        const promise = Promise.resolve(connection.sendCommand(command)).then(() => {
            if (this.sessions.get(connection) !== session) {
                return (this.ensurePrepared(connection, definition) ?? Promise.resolve());
            }
            const latest = session.fieldsets.get(definition.canonicalName);
            if (latest?.status === "preparing" && latest.promise === promise) {
                session.fieldsets.set(definition.canonicalName, {
                    status: "prepared",
                });
            }
        }, (error) => {
            if (this.sessions.get(connection) !== session) {
                return (this.ensurePrepared(connection, definition) ?? Promise.resolve());
            }
            const latest = session.fieldsets.get(definition.canonicalName);
            if (latest?.status === "preparing" && latest.promise === promise) {
                session.fieldsets.delete(definition.canonicalName);
            }
            throw error;
        });
        session.fieldsets.set(definition.canonicalName, {
            status: "preparing",
            promise,
        });
        return promise;
    }
    getSession(connection) {
        let session = this.sessions.get(connection);
        if (!session) {
            session = {
                fieldsets: new Map(),
            };
            this.sessions.set(connection, session);
        }
        return session;
    }
    markUnprepared(connection, definition) {
        const fieldsets = this.getSession(connection).fieldsets;
        if (fieldsets.get(definition.canonicalName)?.status === "prepared") {
            fieldsets.delete(definition.canonicalName);
        }
    }
}
exports.default = HimportCoordinator;
function bindHimportCoordinator(owner, coordinator, role) {
    bindings.set(owner, { coordinator, role });
    owner[exports.hasHimportCoordinator] = true;
}
exports.bindHimportCoordinator = bindHimportCoordinator;
function getHimportBinding(owner) {
    return bindings.get(owner);
}
exports.getHimportBinding = getHimportBinding;
function interceptHimportCommand(connection, command, ready, resumeSend) {
    const binding = bindings.get(connection);
    if (!binding ||
        binding.role === "replica" ||
        isInternalHimportCommand(command)) {
        return false;
    }
    return binding.coordinator.interceptCommand(connection, command, ready, resumeSend);
}
exports.interceptHimportCommand = interceptHimportCommand;
function interceptHimportPipeline({ owner, commands, slot, preferredNodeKey, setDestination, resume, reject, }) {
    const binding = bindings.get(owner);
    if (!binding || !binding.coordinator.hasManagedSet(commands)) {
        return false;
    }
    let connection = owner;
    if (binding.role === "cluster") {
        const nodeKey = preferredNodeKey ?? owner.slots?.[slot]?.[0];
        const connectionPool = owner.connectionPool;
        const clusterConnection = (nodeKey && connectionPool?.getInstanceByKey(nodeKey)) ||
            connectionPool?.getSampleInstance("master");
        if (!clusterConnection) {
            reject(new Error("No master node is available for the pipeline"));
            return true;
        }
        connection = clusterConnection;
        setDestination(connection);
    }
    const preparation = binding.coordinator.prepareCommands(connection, commands);
    if (!preparation) {
        return false;
    }
    preparation.then(() => {
        try {
            resume();
        }
        catch (error) {
            reject(error);
        }
    }, (error) => {
        reject(error);
    });
    return true;
}
exports.interceptHimportPipeline = interceptHimportPipeline;
function setHimportRole(owner, role) {
    const binding = bindings.get(owner);
    if (binding) {
        binding.role = role;
    }
}
exports.setHimportRole = setHimportRole;
function unbindHimportCoordinator(owner) {
    const binding = bindings.get(owner);
    if (binding) {
        binding.coordinator.detach(owner);
        bindings.delete(owner);
    }
    owner[exports.hasHimportCoordinator] = false;
}
exports.unbindHimportCoordinator = unbindHimportCoordinator;
function isInternalHimportCommand(command) {
    return internalCommands.has(command);
}
exports.isInternalHimportCommand = isInternalHimportCommand;
function isHimportControlCommand(command) {
    if (command.name.toLowerCase() !== "himport") {
        return false;
    }
    return ["PREPARE", "DISCARD", "DISCARDALL"].includes(commandToken(command.args[0]));
}
exports.isHimportControlCommand = isHimportControlCommand;
function interceptHimportControlCommand(connections, command) {
    if (!isHimportControlCommand(command) || connections.length === 0) {
        return false;
    }
    const replies = connections.map((connection) => {
        const clone = new Command_1.default(command.name, command.args);
        connection.sendCommand(clone);
        return clone.promise;
    });
    Promise.allSettled(replies).then((results) => {
        let firstReply;
        let hasFirstReply = false;
        for (const result of results) {
            if (result.status === "rejected") {
                command.reject(result.reason);
                return;
            }
            if (!hasFirstReply) {
                firstReply = result.value;
                hasFirstReply = true;
            }
            else if (String(result.value) !== String(firstReply)) {
                debug("divergent HIMPORT reply across masters (%s != %s)", result.value, firstReply);
            }
        }
        command.resolve(firstReply);
    });
    return true;
}
exports.interceptHimportControlCommand = interceptHimportControlCommand;
function isMissingFieldsetError(error) {
    return error.message.toLowerCase().includes("no such fieldset");
}
