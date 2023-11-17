import { ChildProcess } from "child_process";

import { EnvLoader } from "../util/EnvLoader";
import { cluster } from "../util/cluster";

export class Master {
    static workerContainer: Map<number, ChildProcess> = new Map(); // 存放所有的子进程

    private static _startCheck: NodeJS.Timeout; // 定时检查子进程是否存在

    static addWorker(worker: ChildProcess) {
        if(!this.workerContainer.has(worker.pid!)) {
            this.workerContainer.set(worker.pid!, worker);
        }
    }

    static removeWorker(worker: ChildProcess) {
        this.workerContainer.delete(worker.pid!);
    }

    static setCheck() {
        const HOOH_START_CHECK_TIMEOUT = EnvLoader.getNumber('HOOH_START_CHECK_TIMEOUT') || 5000;
        this._startCheck = setTimeout(() => {
            console.error(`starting error with timeout over ${HOOH_START_CHECK_TIMEOUT}s, break process`)
        }, HOOH_START_CHECK_TIMEOUT);
    }

    static clearCheck() {
        clearTimeout(this._startCheck);
    }

    static async startAppWorkers() {
        const HOOH_APP_WORKER_NUM = EnvLoader.getNumber('HOOH_APP_WORKER_NUM') || 1;
        for(let i = 0; i < HOOH_APP_WORKER_NUM; i++)
            cluster.fork(process.env);

        cluster.on('fork', worker => {
            this.addWorker(worker.process);

            worker.on('error', error => {
                console.error(`worker ${worker.process.pid} error: ${error.message}`);
            });

            worker.once('disconnect', () => {
                console.warn(`worker ${worker.process.pid} disconnect`);
            });

            worker.once('exit', (code?: number, signal?: NodeJS.Signals) => {
                if (signal)
                    console.warn(`worker: ${worker.id} was killed by signal: ${signal}`);
                else if (code !== 0)
                    console.warn(`worker: ${worker.id} exited with error code: ${code}`);
                else
                    console.info(`worker: ${worker.id} exit success!!`);

                // 从cluster的workers列表中删除该进程
                delete (<any>cluster.workers)[worker.id];
                this.removeWorker(worker.process);

                // 根据退出原因重启进程或者杀死主进程
                if (!['SIGINT', 'SIGTERM'].includes(signal!) && code !== 0) {
                    console.info('fork new worker');
                    cluster.fork();
                }

                else if (!(Object.keys(<any>cluster.workers).length) || !this.workerContainer.size) {
                    console.warn('all workers exits, kill master');
                    process.exit(0);
                }
            });
        });
    }
}