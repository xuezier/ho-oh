import { Logger } from "./bin/command/logger";
import { Master } from "./core/Master";
import { Worker } from "./core/Worker";
import { Messenger, MessengerMessage } from "./core/messenger/Messenger";
import { Message } from "./core/type/Message"
import { cluster } from "./util/cluster";

export async function runApp(options: any) {
    const { dispatch, baseDir, title, workers } = options;

    if(cluster.isPrimary || cluster.isMaster) {
        process.on('message', (message: Message) => {
            const { event } = message;
            if(Master.emitter.listenerCount(event))
                Master.emitter.emit(event, message);
        });

        if (!options.isDaemon)
            process.once(<any>'disconnect', code => {
                Logger.warn(`master process disconnect with code ${code}, application exit...`);
                process.exit(0);
            });

        Master.emitter.addListener('ipc', async(message: Message) => {
            const { msg } = message;
            Master.handleMessengerMessage(msg)
        });

        let ready: any = [];
        Master.emitter.addListener('ready', (message: Message) => {
            const pid = message.msg as number;

            for(const id in cluster.workers) {
                const worker = cluster.workers[id];
                if(worker && worker.process.pid === pid) {
                    Logger.info(`Worker: ${pid} ready`);

                    if (Master.isReady)
                        Master.messenger.sendReady(worker.process);

                    ready.push(worker);
                    break;
                }
            }

            if(ready.length === workers && !Master.isReady) {
                Master.clearCheck();

                process.send!({ action: 'hooh-ready' });
                ready = null;
            }
        });

        Master.handleMessage();

        Master.setCheck();
        await Master.startAppWorkers();
    }
    else {
        Worker.options = {
            dispatch,
            baseDir,
            title,
        }

        process.on('message', (message: Message) => {
            const { event } = message;
            if(Worker.emitter.listenerCount(event))
                Worker.emitter.emit(event, message);
        });

        process.once('SIGINT', async () => {
            await Worker.messenger.runHooks('beforeClose');
            process.exit(0);
        });

        Worker.emitter.addListener('ipc', async(message: Message) => {
            const { msg } = message;
        // 解构 message.msg 对象
        const { event, msg: messengerMessage } = <MessengerMessage>msg;
            Worker.messenger.emit(event, messengerMessage);
        });

        await Worker.start();
    }
}

export const messenger: Messenger = (cluster.isPrimary || cluster.isMaster) ? Master.messenger : Worker.messenger;
