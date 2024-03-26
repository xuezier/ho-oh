// 引入必要的模块
import { Master } from "./core/Master";
import { Worker } from "./core/Worker";
import { Messenger, MessengerMessage } from "./core/messenger/Messenger";
import { Message } from "./core/type/Message"
import { cluster } from "./util/cluster";
import { Logger } from "./util/logger";

// 定义一个异步函数 runApp，用于启动应用程序
export async function runApp(options: any) {
    // 从 options 中解构出必要的属性
    const { dispatch, baseDir, title, workers } = options;
    console.log(options);

    // 如果是主进程或主节点
    if (cluster.isPrimary || cluster.isMaster) {
        // 监听进程间通信消息
        process.on('message', (message: Message) => {
            const { event } = message;
            // 如果 Master.emitter 中有监听该事件的处理函数，则触发
            if (Master.emitter.listenerCount(event))
                Master.emitter.emit(event, message);
        });

        // 如果非守护进程，监听一次断开连接事件
        if (!options.isDaemon)
            process.once(<any>'disconnect', code => {
                Logger.warn(`master process disconnect with code ${code}, application exit...`);
                process.exit(0);
            });

        // 监听 'ipc' 事件，处理 MessengerMessage 消息
        Master.emitter.addListener('ipc', async(message: Message) => {
            const { msg } = message;
            Master.handleMessengerMessage(msg)
        });

        // 用于存储已准备就绪的 worker 进程
        let ready: any = [];
        // 监听 'ready' 事件，处理 worker 进程就绪消息
        Master.emitter.addListener('ready', (message: Message) => {
            const pid = message.msg as number;

            for (const id in cluster.workers) {
                const worker = cluster.workers[id];
                if (worker && worker.process.pid === pid) {
                    Logger.info(`Worker: ${pid} ready`);

                    if (Master.isReady)
                        Master.messenger.sendReady(worker.process);
                    else
                        ready.push(worker);
                    break;
                }
            }

            // 如果所有 worker 进程都就绪且 Master 进程尚未就绪，则触发 'hooh-ready' 事件
            if (!Master.isReady && ready.length === workers) {
                Master.clearCheck();

                process.send!({ action: 'hooh-ready' });
                ready = null;
            }
        });

        // 处理主进程的消息
        Master.handleMessage();

        // 设置检查定时器，确保 worker 进程正常运行
        Master.setCheck();
        // 启动应用程序的 worker 进程
        await Master.startAppWorkers();
    }
    // 如果是 worker 进程
    else {
        // 设置 Worker 类的选项
        Worker.options = {
            dispatch,
            baseDir,
            title,
        }

        // 监听进程间通信消息
        process.on('message', (message: Message) => {
            const { event } = message;
            // 如果 Worker.emitter 中有监听该事件的处理函数，则触发
            if (Worker.emitter.listenerCount(event))
                Worker.emitter.emit(event, message);
        });

        // 监听一次 SIGINT 信号（例如通过 Ctrl+C 发送的中断信号）
        process.once('SIGINT', async () => {
            // 在关闭之前运行 'beforeClose' 钩子
            await Worker.messenger.runHooks('beforeClose');
            process.exit(0);
        });

        // 监听 'ipc' 事件，处理 MessengerMessage 消息
        Worker.emitter.addListener('ipc', async(message: Message) => {
            const { msg } = message;
            // 解构 message.msg 对象
            const { event, msg: messengerMessage } = <MessengerMessage>msg;
            Worker.messenger.emit(event, messengerMessage);
        });

        // 启动 worker 进程
        await Worker.start();
    }
}

// 如果是主进程或主节点，使用 Master.messenger，否则使用 Worker.messenger
export const messenger: Messenger = (cluster.isPrimary || cluster.isMaster) ? Master.messenger : Worker.messenger;
