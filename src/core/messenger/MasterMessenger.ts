import { ChildProcess } from "child_process";
import { Messenger, MessengerEvents, MessengerMessage } from "./Messenger";
import { Message } from "../type/Message";

export class MasterMessenger extends Messenger {
    constructor(logger) {
        super(logger);

        this._isReady = true;
    }

    private _sendTo(child: ChildProcess, message: MessengerMessage) {
        child.send(<Message>{
            event: 'ipc',
            msg: message,
        });
    }

    private _packetReadyMessage(pid: number) {
        const data = this._packageMessage(pid, 'success', 'ready', process.pid);
        return data;
    }

    private _packetCloseMessage(pid: number) {
        const data = this._packageMessage(pid, 'success', 'close', process.pid);
        return data;
    }

    broadcastReady(childs: ChildProcess[]) {
        for (const child of childs) {
            const data = this._packetReadyMessage(<number>child.pid);
            this._sendTo(child, data);
        }
    }

    broadcastClose(childs: ChildProcess[]) {
        for (const child of childs) {
            const data = this._packetCloseMessage(<number>child.pid);

            this._sendTo(child, data);
        }
    }

    sendReady(child: ChildProcess) {
        const data = this._packetReadyMessage(<number>child.pid);

        this._sendTo(child, data);
    }

    broadcastChilds(childs: ChildProcess[], message: MessengerMessage, sender = process.pid, event: MessengerEvents = 'message') {
        for (const child of childs)
            this.sendToChild(child, message, sender, event);
    }

    sendToChild(child: ChildProcess, message, sender = process.pid, event: MessengerEvents = 'message') {
        const data = this._packageMessage(<number>child.pid, message, event ,sender);

        this._sendTo(child, data);
    }
}
