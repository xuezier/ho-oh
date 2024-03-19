import EventEmitter = require("events");
import { Options } from "./type/Options";
import { WorkerMessenger } from "./messenger/WorkerMessenger";
import { Logger } from "../bin/command/logger";
import * as esm from 'esm';
/**
 * Worker 类用于管理工作子进程的操作，包括消息处理、钩子函数运行等。
 */
export class Worker {
    // 使用 EventEmitter 作为事件处理器
    static emitter = new EventEmitter();
    // 工作子进程的基础目录，默认为当前工作目录
    static baseDir = process.cwd();
    // 工作子进程的配置选项
    static options: Options;

    // 工作子进程的 Messenger 实例
    private static _messenger = new WorkerMessenger(Logger);
    static get messenger() {
        return this._messenger;
    }

    /**
     * 启动工作子进程，执行钩子函数和导入指定的模块
     */
    static async start() {
        const { dispatch } = this.options;

        // 运行工作子进程启动前的钩子函数
        await this.messenger.runHooks('beforeLoad');
        // 导入指定的模块
        let r: any;
        try {
            r = await import(dispatch);
        }
        catch (e) {
            if(e.code === 'ERR_REQUIRE_ESM'){
                const esmRequire = esm(module);
                r = await esmRequire(dispatch);

            }
        }

        // 如果导入的模块是一个函数，则执行该函数
        if (typeof r === 'function')
            await r();

        // 如果与主进程有连接，则向主进程发送 ready 事件
        if (process.connected)
            process.send!({ event: 'ready', msg: process.pid });
    }
}
