import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as util from 'util';

import { HOOH_SCRIPT_START_TIMEOUT, TITLE } from "../../constants/Command";
import { getRotatelog, sleep, stringify } from './helper';
import { ChildProcess, SpawnOptions, execFileSync, spawn } from 'child_process';
import { Logger } from './logger';

let isReady = true;

export async function start(params: {
    command: 'node' | 'ts-node';
    baseDir: string;
    title: string;
    isDaemon: boolean;
    ignoreStdErr: boolean;
    workers: number;
    checkTimeout: number;
    logdir: string;
}, argvs: string[] = []) {
    const {
        command,
        baseDir,
        title,
        isDaemon,
        ignoreStdErr,
        workers,
        checkTimeout,
        logdir,
    } = params;

    const cwd = process.cwd();
    const serverTitle = title || TITLE;

    const env = { ...process.env, };
    const HOME = os.homedir();
    env.HOME = HOME;
    env.NODE_ENV = process.env.NODE_ENV || 'production';

    env.PATH = env.Path = [
        // for nodeinstall
        path.join(cwd, 'node_modules/.bin'),
        // support `.node/bin`, due to npm5 will remove `node_modules/.bin`
        path.join(cwd, '.node/bin'),
        // adjust env for win
        env.PATH || env.Path,
        // 加入全局的 PATH
        process.env.PATH
    ].filter(Boolean).join(path.delimiter);

    env.ENABLE_NODE_LOG = 'YES';

    const stdoutPath = path.join(logdir, `hooh-stdout.log`);
    const stderrPath = path.join(logdir, `hooh-stderr.log`);
    const serverBin = path.join(__dirname, '../ho-oh-start');
    const startOptions = stringify({
        baseDir,
        title: serverTitle,
        workers,
        checkTimeout,
        env,
        isDaemon,
    });

    const args = [ serverBin, startOptions, `--title="${serverTitle}"`, ...argvs ];

    if(isDaemon) {
        Logger.info(`Save log file to ${logdir}`);

        const [ stdout, stderr ] = [
            await getRotatelog(stdoutPath),
            await getRotatelog(stderrPath),
        ];

        const options: SpawnOptions = {
            env,
            stdio: [ 'ignore', stdout, stderr, 'ipc' ],
            detached: true,
        };

        Logger.info(`Run node ${args.join(' ')}`);
        const child: ChildProcess = spawn(command, args, options);
        isReady = false;

        child.on('message', (msg: any) => {
            if(msg && msg.action === 'hooh-ready') {
                isReady = true;

                Logger.info('hooh ready');

                child.unref();
                child.disconnect();
                process.exit(0);
            }
        });

        await checkStatus({ child, stderr: stderrPath, timeout: HOOH_SCRIPT_START_TIMEOUT, 'ignore-stderr': ignoreStdErr });
        Logger.info('hooh started');
    }
    else {
        Logger.info('ho-oh start application without daemon');
        const options: SpawnOptions = { env, stdio: [ 'inherit', 'inherit', 'inherit', 'ipc' ], detached: true };

        const child: ChildProcess = spawn(command, args, options);
        child.once('exit', code => {
            if (code !== 0) {
                child.emit('error', new Error(`spawn ${command} ${args.join(' ')} fail, exit code: ${code}`));
            }
        });

        child.on('error', err => {
            Logger.error(err);

            process.exit(0);
        });

        // attach master signal to child
        let signal;
        [ 'SIGINT', 'SIGQUIT', 'SIGTERM' ].forEach(event => {
            if(process.listenerCount(event) === 0)
                process.on(event, async() => {
                    signal = event;
                    process.exit(0);
                });
        });
        process.once('exit', () => {
            Logger.debug(util.format('Kill child %s with %s', child.pid, signal));
            child.kill(signal);
        });
    }
}

async function checkStatus({ stderr, timeout, 'ignore-stderr': ignoreStdErr, child }) {
    let count = 0;
    let hasError = false;
    let isSuccess = true;
    timeout = timeout / 1000;
    while (!isReady) {
        try {
            const stat = fs.statSync(stderr);
            if (stat && stat.size > 0) {
                hasError = true;
                break;
            }
        } catch (_) {
        // nothing
        }

        if (count >= timeout) {
            Logger.error(`Start failed, ${timeout}s timeout`);
            isSuccess = false;
            break;
        }

        await sleep(1000);
        Logger.info(`Wait Start: ${++count}...`);
    }

    if (hasError) {
        try {
            const args = [ '-n', '100', stderr ];
            Logger.error(`tail ${args.join(' ')}`);
            execFileSync('tail', args);
            Logger.error('Got error when startup: ');
        } catch (err) {
            Logger.error(`ignore tail error: ${err}`);
        }

        isSuccess = ignoreStdErr;
        Logger.error(`Start got error, see ${stderr}`);
        Logger.error('Or use `--ignore-stderr` to ignore stderr at startup.');
    }

    if (!isSuccess) {
        child.kill('SIGTERM');
        await sleep(1000);
        process.exit(1);
    }
}