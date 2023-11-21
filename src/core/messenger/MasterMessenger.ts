import { ChildProcess } from "child_process";
import { Messenger, MessengerEvents, MessengerMessage } from "./Messenger";
import { Message } from "../type/Message";

/**
 * MasterMessenger 类继承自 Messenger 类，用于主进程和子进程间的通信。
 */
export class MasterMessenger extends Messenger {
    /**
     * 构造函数。
     * @param logger - 日志记录器实例。
     */
    constructor(logger) {
        // 调用父类构造函数，传入日志记录器实例
        super(logger);

        // 主进程的 Messenger 实例默认为就绪状态
        this._isReady = true;
    }

    /**
     * 将消息发送给指定子进程。
     * @param child - 目标子进程。
     * @param message - 要发送的消息。
     * @private
     */
    private _sendTo(child: ChildProcess, message: MessengerMessage) {
        // 发送消息到子进程
        child.send(<Message>{
            event: 'ipc',
            msg: message,
        });
    }

    /**
     * 封装 ready 消息。
     * @param pid - 子进程的进程 ID。
     * @private
     */
    private _packetReadyMessage(pid: number) {
        // 封装 ready 消息
        const data = this._packageMessage(pid, 'success', 'ready', process.pid);
        return data;
    }

    /**
     * 封装 close 消息。
     * @param pid - 子进程的进程 ID。
     * @private
     */
    private _packetCloseMessage(pid: number) {
        // 封装 close 消息
        const data = this._packageMessage(pid, 'success', 'close', process.pid);
        return data;
    }

    /**
     * 广播 ready 消息给所有子进程。
     * @param childs - 所有子进程的数组。
     */
    broadcastReady(childs: ChildProcess[]) {
        for (const child of childs) {
            // 封装 ready 消息并发送给每个子进程
            const data = this._packetReadyMessage(<number>child.pid);
            this._sendTo(child, data);
        }
    }

    /**
     * 广播 close 消息给所有子进程。
     * @param childs - 所有子进程的数组。
     */
    broadcastClose(childs: ChildProcess[]) {
        for (const child of childs) {
            // 封装 close 消息并发送给每个子进程
            const data = this._packetCloseMessage(<number>child.pid);
            this._sendTo(child, data);
        }
    }

    /**
     * 向指定子进程发送 ready 消息。
     * @param child - 目标子进程。
     */
    sendReady(child: ChildProcess) {
        // 封装 ready 消息并发送给指定子进程
        const data = this._packetReadyMessage(<number>child.pid);
        this._sendTo(child, data);
    }

    /**
     * 广播消息给所有子进程。
     * @param childs - 所有子进程的数组。
     * @param message - 要广播的消息。
     * @param sender - 消息发送者的进程 ID，默认为当前进程的进程 ID。
     * @param event - 消息事件类型，默认为 'message'。
     */
    broadcastChilds(childs: ChildProcess[], message: MessengerMessage, sender = process.pid, event: MessengerEvents = 'message') {
        for (const child of childs)
            this.sendToChild(child, message, sender, event);
    }

    /**
     * 向指定子进程发送消息。
     * @param child - 目标子进程。
     * @param message - 要发送的消息。
     * @param sender - 消息发送者的进程 ID，默认为当前进程的进程 ID。
     * @param event - 消息事件类型，默认为 'message'。
     */
    sendToChild(child: ChildProcess, message, sender = process.pid, event: MessengerEvents = 'message') {
        // 封装消息并发送给指定子进程
        const data = this._packageMessage(<number>child.pid, message, event, sender);
        this._sendTo(child, data);
    }
}
