import { Messenger, WorkerHook } from "./Messenger";

export class WorkerMessenger extends Messenger {
    getHooks(hook: WorkerHook) {
        return this._hookContainer.get(hook) || [];
    }

    async runHooks(hook: WorkerHook) {
        const hooks = this.getHooks(hook);

        for(const handle of hooks) {
            await handle();
        }
    }
}
