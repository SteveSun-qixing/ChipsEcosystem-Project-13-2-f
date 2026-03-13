/**
 * 命令管理器
 * @module core/command-manager
 * @description 实现撤销/重做系统的命令模式管理器
 */

import { generateScopedId } from '../utils/id';
import { globalEventEmitter } from './event-emitter';

export interface CommandHistory {
    id: string;
    description: string;
    timestamp: number;
    undoable: boolean;
}

export interface Command {
    execute(): Promise<void>;
    undo(): Promise<void>;
    redo(): Promise<void>;
    description: string;
    canMergeWith?(other: Command): boolean;
    mergeWith?(other: Command): void;
}

export interface CommandManagerConfig {
    maxHistory: number;
    mergeWindow: number;
    debug: boolean;
}

export interface CommandManagerState {
    canUndo: boolean;
    canRedo: boolean;
    undoStackSize: number;
    redoStackSize: number;
    isExecuting: boolean;
}

let commandManagerInstance: CommandManager | null = null;

export class CommandManager {
    private undoStack: Array<{ command: Command; history: CommandHistory }> = [];
    private redoStack: Array<{ command: Command; history: CommandHistory }> = [];
    private config: CommandManagerConfig;
    private lastExecuteTime = 0;
    private isExecuting = false;

    constructor(config: Partial<CommandManagerConfig> = {}) {
        this.config = {
            maxHistory: config.maxHistory ?? 100,
            mergeWindow: config.mergeWindow ?? 500,
            debug: config.debug ?? false,
        };
    }

    getState(): CommandManagerState {
        return {
            canUndo: this.canUndo(),
            canRedo: this.canRedo(),
            undoStackSize: this.undoStack.length,
            redoStackSize: this.redoStack.length,
            isExecuting: this.isExecuting,
        };
    }

    subscribe(listener: (state: CommandManagerState) => void): () => void {
        const handler = (): void => listener(this.getState());
        globalEventEmitter.on('command:state-changed', handler);
        return () => globalEventEmitter.off('command:state-changed', handler);
    }

    private emitStateChange(): void {
        globalEventEmitter.emit('command:state-changed', this.getState());
    }

    private log(...args: unknown[]): void {
        if (this.config.debug) {
            console.warn('[CommandManager]', ...args);
        }
    }

    async execute(command: Command): Promise<void> {
        if (this.isExecuting) {
            this.log('Command execution skipped: another command is executing');
            return;
        }

        this.isExecuting = true;

        try {
            await command.execute();

            const merged = this.tryMergeWithLast(command);

            if (!merged) {
                const history: CommandHistory = {
                    id: generateScopedId('cmd'),
                    description: command.description,
                    timestamp: Date.now(),
                    undoable: true,
                };

                this.undoStack.push({ command, history });
                this.enforceHistoryLimit();
                this.redoStack = [];

                globalEventEmitter.emit('command:executed', { command, history });
            }

            this.lastExecuteTime = Date.now();
            this.emitStateChange();
        } catch (error) {
            this.log('Command execution failed:', error);
            throw error;
        } finally {
            this.isExecuting = false;
        }
    }

    async undo(): Promise<boolean> {
        if (!this.canUndo() || this.isExecuting) {
            return false;
        }

        this.isExecuting = true;

        try {
            const item = this.undoStack.pop();
            if (!item) return false;

            await item.command.undo();
            this.redoStack.push(item);

            globalEventEmitter.emit('command:undone', { command: item.command, history: item.history });
            this.emitStateChange();
            return true;
        } catch (error) {
            this.log('Undo failed:', error);
            throw error;
        } finally {
            this.isExecuting = false;
        }
    }

    async redo(): Promise<boolean> {
        if (!this.canRedo() || this.isExecuting) {
            return false;
        }

        this.isExecuting = true;

        try {
            const item = this.redoStack.pop();
            if (!item) return false;

            await item.command.redo();
            this.undoStack.push(item);

            globalEventEmitter.emit('command:redone', { command: item.command, history: item.history });
            this.emitStateChange();
            return true;
        } catch (error) {
            this.log('Redo failed:', error);
            throw error;
        } finally {
            this.isExecuting = false;
        }
    }

    canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    get undoStackSize(): number {
        return this.undoStack.length;
    }

    get redoStackSize(): number {
        return this.redoStack.length;
    }

    get executing(): boolean {
        return this.isExecuting;
    }

    getHistory(limit?: number): CommandHistory[] {
        const history = this.undoStack.map((item) => item.history).reverse();
        return limit ? history.slice(0, limit) : history;
    }

    getRedoHistory(): CommandHistory[] {
        return this.redoStack.map((item) => item.history).reverse();
    }

    async goToHistory(historyId: string): Promise<boolean> {
        const undoIndex = this.undoStack.findIndex((item) => item.history.id === historyId);
        if (undoIndex !== -1) {
            const stepsToUndo = this.undoStack.length - 1 - undoIndex;
            for (let i = 0; i < stepsToUndo; i++) {
                await this.undo();
            }
            return true;
        }

        const redoIndex = this.redoStack.findIndex((item) => item.history.id === historyId);
        if (redoIndex !== -1) {
            const stepsToRedo = this.redoStack.length - redoIndex;
            for (let i = 0; i < stepsToRedo; i++) {
                await this.redo();
            }
            return true;
        }

        return false;
    }

    clear(): void {
        this.undoStack = [];
        this.redoStack = [];
        globalEventEmitter.emit('history:cleared', {});
        this.emitStateChange();
    }

    getConfig(): Readonly<CommandManagerConfig> {
        return { ...this.config };
    }

    setConfig(config: Partial<CommandManagerConfig>): void {
        this.config = { ...this.config, ...config };
        this.enforceHistoryLimit();
    }

    setMaxHistory(maxHistory: number): void {
        this.config.maxHistory = maxHistory;
        this.enforceHistoryLimit();
    }

    private tryMergeWithLast(command: Command): boolean {
        if (this.undoStack.length === 0) return false;

        const now = Date.now();
        if (now - this.lastExecuteTime > this.config.mergeWindow) return false;

        const lastItem = this.undoStack[this.undoStack.length - 1];
        if (!lastItem) return false;

        if (command.canMergeWith && command.canMergeWith(lastItem.command)) {
            if (command.mergeWith) {
                command.mergeWith(lastItem.command);
                lastItem.history.timestamp = now;
                this.log(`Command merged: ${command.description}`);
                return true;
            }
        }

        return false;
    }

    private enforceHistoryLimit(): void {
        while (this.undoStack.length > this.config.maxHistory) {
            this.undoStack.shift();
        }
    }
}

export function createCommandManager(config?: Partial<CommandManagerConfig>): CommandManager {
    return new CommandManager(config);
}

export function useCommandManager(config?: Partial<CommandManagerConfig>): CommandManager {
    if (!commandManagerInstance) {
        commandManagerInstance = createCommandManager(config);
    }
    return commandManagerInstance;
}

export function getCommandManager(): CommandManager {
    return useCommandManager();
}

export function resetCommandManager(): void {
    if (commandManagerInstance) {
        commandManagerInstance.clear();
    }
    commandManagerInstance = null;
}
