import * as util from 'util';
import { findNodeProcess, kill, sleep, titleTemplate } from "./helper";
import { Logger } from "./logger";

export async function stop(params: { title: string }) {
    const { title } = params;

    Logger.info(`stopping ho-oh application ${title ? `with --title=${title}` : ''}`);

    const processList = await findNodeProcess(item => {
        const { cmd } = item;

        return (title?
            cmd.includes('ho-oh-start') && cmd.includes(util.format(titleTemplate, title)) :
            cmd.includes('ho-oh-start')) && (cmd.startsWith('node') || cmd.startsWith('node.exe') || cmd.startsWith('ts-node')
        );
    });

    const pids = processList.map(p => p.pid);
    if(pids.length) {
        Logger.info(`got master pids: ${pids}`);

        kill(pids);
        await sleep(5000);
    }
    else {
        Logger.warn('can\'t detect any running ho-oh process');
    }
    Logger.info('stopped');
}