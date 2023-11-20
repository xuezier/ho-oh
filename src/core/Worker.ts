import EventEmitter = require("events");
import { Options } from "./type/Options";
import { WorkerMessenger } from "./messenger/WorkerMessenger";
import { Logger } from "../bin/command/logger";

export class Worker {
    static emitter = new EventEmitter();

    static baseDir = process.cwd();

    static options: Options;

    private static _messenger = new WorkerMessenger(Logger);
    static get messenger() {
        return this._messenger;
    }


    static async start() {
        const { dispatch } = this.options;

        await this.messenger.runHooks('beforeLoad');
        const r = await import(dispatch);
        if(typeof r === 'function')
            await r();

        if(process.connected)
            process.send!({ event: 'ready', msg: process.pid });
    }
}