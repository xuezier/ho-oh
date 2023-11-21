import { EventEmitter } from 'events';
import { ChildProcess } from "child_process";

import { EnvLoader } from "../util/EnvLoader";
import { cluster } from "../util/cluster";
import { Logger } from '../bin/command/logger';
import { Message } from './type/Message';
import { MasterMessenger } from './messenger/MasterMessenger';
import { MessengerMessage } from './messenger/Messenger';

/**
 * Master 类用于管理主进程的操作，包括子进程的创建、消息处理等。
 */
export class Master {
    // 使用 EventEmitter 作为事件处理器
    static emitter = new EventEmitter();
    // 主进程的基础目录，默认为当前工作目录
    static baseDir = process.cwd();
    // 存放所有的子进程的容器
    static workerContainer: Map<number, ChildProcess> = new Map();

    // 定时检查子进程是否存在的定时器
    private static _startCheck: NodeJS.Timeout;
    // 主进程是否就绪
    private static _isReady = false;
    // 设置主进程就绪状态
    private static set isReady(ready: boolean) {
        if (this.isReady || !ready)
            return;

        this._isReady = true;
        // 广播 ready 消息给所有子进程
        this.messenger.broadcastReady([...this.workerContainer.values()]);

        Logger.info(`Master: ${process.pid} ready`);
    }
    // 获取主进程就绪状态
    static get isReady() {
        return this._isReady;
    }

    // 主进程的 Messenger 实例
    private static _messenger = new MasterMessenger(Logger);
    static get messenger() {
        return this._messenger;
    }

    /**
     * Master 类静态方法 - 处理从消息通道收到的 IPC 消息
     * @param message - 从消息通道收到的消息对象
     */
    static handleMessengerMessage(message: MessengerMessage) {
        // 解构出消息所需信息
        const { sender, msg, receiver, event } = message;
        // 获取该 Master 宿主的通信对象
        const { messenger } = this;

        // 根据接收者类型进行处理
        switch (receiver) {
            // 若接收者为 Worker 子进程
            case 'worker':
                // 向所有运行中的子进程广播消息
                messenger.broadcastChilds([...this.workerContainer.values()], msg, sender, event);
                break;
            // 若接收者为随机子进程
            case 'random': {
                // 取出所有子进程
                const workers = [...this.workerContainer.values()];
                // 生成一个随机索引值
                const randomIndex = ~~(Math.random() * workers.length);
                // 获取对应的随机子进程
                const worker = workers[randomIndex];

                // 向该子进程发送消息
                messenger.sendToChild(worker, msg, sender, event);
                break;
            }
            // 若接收者为指定 ID 的子进程
            default: {
                // 接收者 ID 不合法或者不存在于容器内
                if (isNaN(receiver) || !this.workerContainer.has(receiver)) {
                    // 输出警告日志
                    Logger.warn(`message receiver not exists`);
                    // 跳过该消息
                    break;
                }

                // 获取指定 ID 的子进程
                const worker = this.workerContainer.get(receiver);
                if (worker)
                    // 若获取子进程成功，则向该子进程发送消息
                    messenger.sendToChild(worker, msg, sender, event);
            }
        }
    }

    /**
     * 添加子进程到容器中
     * @param worker - 要添加的子进程
     */
    static addWorker(worker: ChildProcess) {
        if (!this.workerContainer.has(worker.pid!)) {
            this.workerContainer.set(worker.pid!, worker);
        }
    }

    /**
     * 从容器中移除指定的子进程
     * @param worker - 要移除的子进程
     */
    static removeWorker(worker: ChildProcess) {
        this.workerContainer.delete(worker.pid!);
    }

    /**
     * 设置检查主进程就绪状态的定时器
     */
    static setCheck() {
        const HOOH_START_CHECK_TIMEOUT = EnvLoader.getNumber('HOOH_START_CHECK_TIMEOUT') || 5000;
        this._startCheck = setTimeout(() => {
            Logger.error(`starting error with timeout over ${HOOH_START_CHECK_TIMEOUT}s, break process`);
        }, HOOH_START_CHECK_TIMEOUT);
    }

    /**
     * 清除检查主进程就绪状态的定时器，同时设置主进程就绪状态
     */
    static clearCheck() {
        clearTimeout(this._startCheck);
        this.isReady = true;
    }

    /**
     * 处理从 Agent 进程发来的消息，并通知框架调用事件监听函数
     * @param _ - 空，无实际作用
     * @param message - 消息对象，包含了 event 和其他数据字段
     * @private
     */
    private static _handleMessage(_, message: Message) {
        const { event } = message;
        // 如果监听事件中有该事件对应的处理函数，则调用相应的处理函数
        if (this.emitter.listenerCount(event))
            this.emitter.emit(event, message);
    }

    /**
     * 开始监听从工作子进程和 Agent 进程发送的消息
     */
    static handleMessage() {
        // 监听所有 cluster 模块产生的消息，并将其传递给 _handleMessage 处理函数进行处理
        cluster.on('message', this._handleMessage.bind(this));
    }

    /**
     * 启动应用的工作子进程
     */
    static async startAppWorkers() {
        // 获取工作子进程的数量，默认为 1
        const HOOH_APP_WORKER_NUM = EnvLoader.getNumber('HOOH_APP_WORKER_NUM') || 1;
        // 根据数量创建工作子进程
        for (let i = 0; i < HOOH_APP_WORKER_NUM; i++)
            cluster.fork(process.env);

        // 监听 cluster 模块的 fork 事件，即子进程创建事件
        cluster.on('fork', worker => {
            // 将新创建的子进程添加到容器中
            this.addWorker(worker.process);

            // 监听子进程的错误事件
            worker.on('error', error => {
                Logger.error(`worker ${worker.process.pid} error: ${error.message}`);
            });

            // 监听子进程的断开连接事件
            worker.once('disconnect', () => {
                Logger.warn(`worker ${worker.process.pid} disconnect`);
                // 从容器中移除断开连接的子进程

                this.removeWorker(worker.process);

                // 如果当前已经没有可用的worker进程，那么杀死主进程
                if (!this.workerContainer.size) {
                    Logger.warn('all workers exits, kill master');
                    process.exit(0);
                }
            });

            // 监听子进程的退出事件
            worker.once('exit', (code?: number, signal?: NodeJS.Signals) => {
                if (signal)
                    Logger.warn(`worker: ${worker.id} was killed by signal: ${signal}`);
                else if (code !== 0)
                    Logger.warn(`worker: ${worker.id} exited with error code: ${code}`);
                else
                    Logger.info(`worker: ${worker.id} exit success!!`);

                // 从 cluster 的 workers 列表中删除该进程
                delete (<any>cluster.workers)[worker.id];
                this.removeWorker(worker.process);
                // 根据退出原因重启进程或者杀死主进程
                if (!['SIGINT', 'SIGTERM'].includes(signal!) && code !== 0) {
                    Logger.info('fork new worker');
                    cluster.fork(process.env);
                } else if (!(Object.keys(<any>cluster.workers).length) || !this.workerContainer.size) {
                    Logger.warn('all workers exits, kill master');
                    process.exit(0);
                }
            });
        });

        // 处理 SIGINT 和 SIGTERM 信号，发送 kill 指令给所有进程并杀死主进程
        const kill = async () => {
            // 杀死所有 worker 进程
            const { workers } = cluster;
            if (!workers)
                return;

            const workerIds = Object.keys(workers);
            for (const workerId of workerIds) {
                const worker = workers[workerId];
                if (worker?.isConnected)
                    process.kill(<number>worker.process.pid, 'SIGINT');
            }
        };

        process.on('SIGINT', kill);
        process.on('SIGTERM', kill);
    }
}
