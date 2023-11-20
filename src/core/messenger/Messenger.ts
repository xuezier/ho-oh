import { EventEmitter } from "events";
import { Message } from "../type/Message";

export type MessengerEvents = 'message' | 'ready' | 'close';
export type MessengerListener<T extends MessengerEvents> =
    T extends 'message' ? (msg: any) => void | Promise<void> :
        T extends 'ready' | 'close' ? () => void :
            (...args: any[]) => void;

export type MessengerMessage = {
    event: MessengerEvents;
    msg: any;
    sender: number;
    receiver: MessageReceiver;
}

export type MessageReceiver = 'worker' | 'random' | number;
export type WorkerHook = 'beforeLoad' | 'beforeClose';


export class Messenger  {
    readonly emiter = new EventEmitter();

    protected _isReady = false;
    private _logger;

    protected _hookContainer: Map<string, (() => Promise<void> | void)[]> = new Map();
    addHook(hook: WorkerHook, handle: () => Promise<void> | void) {
        const functions = this._hookContainer.get(hook);

        if(!functions) this._hookContainer.set(hook, [handle]);
        else functions.push(handle);
    }

    get logger() {
        return this._logger;
    }

    set logger(logger) {
        if (!this._logger)
            this._logger = logger;
    }

    get isReady() {
        return this._isReady;
    }

    constructor(logger?) {
        logger && (this._logger = logger);

        this.once('ready', () => this._isReady = true);
        this.once('close', () => this._isReady = false);
    }

    once<T extends MessengerEvents>(event: T, listener: MessengerListener<T>) {
        this.emiter.once(event, listener);

        return this;
    }

    on<T extends MessengerEvents>(event: T, listener: MessengerListener<T>) {
        this.emiter.on(event, listener);

        return this;
    }

    addListener = this.on;

    emit<T extends MessengerEvents>(event: T, data?, ...args: any[]) {
        if(this.emiter.listenerCount(event))
            return this.emiter.emit(event, data, ...args);
    }

    protected _packageMessage(receiver: MessageReceiver, message, event: MessengerEvents = 'message', sender = process.pid) {
        return <MessengerMessage>{
            sender,
            event,
            receiver,
            msg: message
        };
    }

    private _send(message: MessengerMessage) {
        if (!this.isReady || !process.connected)
            return this.logger.warn(`pid: ${process.pid} messenger not ready`);

        (<any>process).send(<Message>{
            event: 'ipc',
            msg: message,
        });
    }

    broadcast(message) {
        const appData = this._packageMessage('worker', message);

        this._send(appData);
    }

    sendToWorker(message) {
        const data = this._packageMessage('worker', message);

        this._send(data);
    }

    sendToRandom(message) {
        const data = this._packageMessage('random', message);

        this._send(data);
    }

    sendTo(pid: number, message) {
        const data = this._packageMessage(pid, message);

        this._send(data);
    }
}
