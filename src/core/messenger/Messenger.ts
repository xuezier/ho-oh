// 引入必要的模块
import { EventEmitter } from "events";
import { Message } from "../type/Message";

// 定义 Messenger 事件类型
export type MessengerEvents = 'message' | 'ready' | 'close';
// 定义 Messenger 事件监听器类型
export type MessengerListener<T extends MessengerEvents> =
    T extends 'message' ? (msg: any) => void | Promise<void> :
    T extends 'ready' | 'close' ? () => void :
    (...args: any[]) => void;

// 定义 Messenger 消息类型
export type MessengerMessage = {
    event: MessengerEvents;
    msg: any;
    sender: number;
    receiver: MessageReceiver;
}

// 定义消息接收者类型
export type MessageReceiver = 'worker' | 'random' | number;
// 定义 Worker 钩子类型
export type WorkerHook = 'beforeLoad' | 'beforeClose';

/**
 * Messenger 类用于进程间通信和事件处理。
 */
export class Messenger {
    // 使用 Node.js 的 EventEmitter 作为事件处理器
    readonly emiter = new EventEmitter();

    // 是否就绪状态
    protected _isReady = false;
    // 日志记录器
    private _logger;

    // 钩子函数容器，用于存储不同类型的钩子函数数组
    protected _hookContainer: Map<string, (() => Promise<void> | void)[]> = new Map();

    /**
     * 添加钩子函数。
     * @param hook - 钩子类型，如 'beforeLoad' 或 'beforeClose'。
     * @param handle - 钩子函数，返回 Promise<void> 或 void。
     */
    addHook(hook: WorkerHook, handle: () => Promise<void> | void) {
        const functions = this._hookContainer.get(hook);

        if (!functions) this._hookContainer.set(hook, [handle]);
        else functions.push(handle);
    }

    /**
     * 获取日志记录器。
     */
    get logger() {
        return this._logger;
    }

    /**
     * 设置日志记录器。
     * @param logger - 日志记录器实例。
     */
    set logger(logger) {
        if (!this._logger)
            this._logger = logger;
    }

    /**
     * 获取是否就绪状态。
     */
    get isReady() {
        return this._isReady;
    }

    /**
     * 构造函数。
     * @param logger - 日志记录器实例。
     */
    constructor(logger?) {
        logger && (this._logger = logger);

        this.once('ready', () => this._isReady = true);
        this.once('close', () => this._isReady = false);
    }

    /**
     * 注册一次性事件监听器。
     * @param event - 事件类型，如 'message'、'ready' 或 'close'。
     * @param listener - 事件监听器回调函数。
     * @returns 返回 Messenger 实例。
     */
    once<T extends MessengerEvents>(event: T, listener: MessengerListener<T>) {
        this.emiter.once(event, listener);

        return this;
    }

    /**
     * 注册事件监听器。
     * @param event - 事件类型，如 'message'、'ready' 或 'close'。
     * @param listener - 事件监听器回调函数。
     * @returns 返回 Messenger 实例。
     */
    on<T extends MessengerEvents>(event: T, listener: MessengerListener<T>) {
        this.emiter.on(event, listener);

        return this;
    }

    // 添加事件监听器
    addListener = this.on;

    /**
     * 触发事件。
     * @param event - 事件类型，如 'message'、'ready' 或 'close'。
     * @param data - 传递给事件监听器的数据。
     * @param args - 其他参数。
     * @returns 返回是否成功触发事件。
     */
    emit<T extends MessengerEvents>(event: T, data?, ...args: any[]) {
        if (this.emiter.listenerCount(event))
            return this.emiter.emit(event, data, ...args);
    }

    /**
     * 封装消息，准备发送。
     * @param receiver - 消息接收者，如 'worker'、'random' 或具体的进程 ID。
     * @param message - 要发送的消息数据。
     * @param event - 消息事件类型，默认为 'message'。
     * @param sender - 消息发送者的进程 ID，默认为当前进程的进程 ID。
     * @returns 返回封装后的消息对象。
     */
    protected _packageMessage(receiver: MessageReceiver, message, event: MessengerEvents = 'message', sender = process.pid) {
        return <MessengerMessage>{
            sender,
            event,
            receiver,
            msg: message
        };
    }

    /**
     * 发送消息。
     * @param message - 要发送的消息数据。
     * @returns 返回是否成功发送消息。
     */
    private _send(message: MessengerMessage) {
        if (!this.isReady || !process.connected)
            return this.logger.warn(`pid: ${process.pid} messenger not ready`);

        (<any>process).send(<Message>{
            event: 'ipc',
            msg: message,
        });
    }

    /**
     * 广播消息给所有 worker 进程。
     * @param message - 要广播的消息数据。
     */
    broadcast(message) {
        const appData = this._packageMessage('worker', message);

        this._send(appData);
    }

    /**
     * 发送消息给指定的 worker 进程。
     * @param message - 要发送的消息数据。
     */
    sendToWorker(message) {
        const data = this._packageMessage('worker', message);

        this._send(data);
    }

    /**
     * 发送消息给随机选择的 worker 进程。
     * @param message - 要发送的消息数据。
     */
    sendToRandom(message) {
        const data = this._packageMessage('random', message);

        this._send(data);
    }

    /**
     * 发送消息给指定 pid 的进程。
     * @param pid - 目标进程的进程 ID。
     * @param message - 要发送的消息数据。
     */
    sendTo(pid: number, message) {
        const data = this._packageMessage(pid, message);

        this._send(data);
    }
}
