import { Messenger, WorkerHook } from "./Messenger";

/**
 * WorkerMessenger 类继承自 Messenger 类，用于子进程的通信和事件处理。
 */
export class WorkerMessenger extends Messenger {
    /**
     * 获取指定钩子类型的所有钩子函数。
     * @param hook - 钩子类型，如 'beforeLoad' 或 'beforeClose'。
     * @returns 返回指定钩子类型的钩子函数数组，如果不存在则返回空数组。
     */
    getHooks(hook: WorkerHook) {
        return this._hookContainer.get(hook) || [];
    }

    /**
     * 运行指定钩子类型的所有钩子函数。
     * @param hook - 钩子类型，如 'beforeLoad' 或 'beforeClose'。
     * @returns 返回一个 Promise，表示所有钩子函数执行完毕。
     */
    async runHooks(hook: WorkerHook) {
        // 获取指定钩子类型的所有钩子函数
        const hooks = this.getHooks(hook);

        // 依次执行每个钩子函数
        for (const handle of hooks) {
            await handle();
        }
    }
}
