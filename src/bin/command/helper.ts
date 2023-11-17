import { exec, execSync } from 'child_process';
import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';

import { mkdirp } from 'mkdirp';

export const isWin = process.platform === 'win32';

export const sleep = async (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const timestamp = (date?: Date) => {
    if(!date) {
        date = new Date();
    }

    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const mins = date.getMinutes();
    const seconds = date.getSeconds();

    return `${year}-${month < 10 ? '0': ''}${month}-${day < 10 ? '0': ''}${day} ${hour < 10 ? '0': ''}${hour}:${mins < 10 ? '0': ''}${mins}:${seconds < 10 ? '0': ''}${seconds}`;
};

const REGEX = isWin ? /^(.*)\s+(\d+)\s*$/ : /^\s*(\d+)\s+(.*)/;
export const titleTemplate = isWin ? '\\"title\\":\\"%s\\"' : '"title":"%s"';
export const findNodeProcess = async function(filterFn) {
    const command = isWin ?
        'wmic Path win32_process Where "Name = \'node.exe\'" Get CommandLine,ProcessId' :
    // command, cmd are alias of args, not POSIX standard, so we use args
        'ps -eo "pid,args"';
    const stdio = execSync(command, { stdio: 'pipe' });
    const processList = stdio.toString().split('\n')
        .reduce((arr: {pid: string; cmd: string}[], line) => {
            if (!!line && !line.includes('/bin/sh') && line.includes('node')) {
                const m = line.match(REGEX);
                /* istanbul ignore else */
                if (m) {
                    const item = isWin ? { pid: m[2], cmd: m[1] } : { pid: m[1], cmd: m[2] };
                    if (!filterFn || filterFn(item)) {
                        arr.push(item);
                    }
                }
            }
            return arr;
        }, []);
    return processList;
};

export const kill = function(pids, signal = 'SIGTERM') {
    pids.forEach(pid => {
        try {
            process.kill(pid, signal);
        } catch (err: any) { /* istanbul ignore next */
            if (err.code !== 'ESRCH') {
                throw err;
            }
        }
    });
};

export const portInUse = async function(port: number, host = '127.0.0.1') {
    const result = await new Promise((resolve, reject) => {
        const server = net.createServer(function(socket) {
            socket.write('Echo server\r\n');
            socket.pipe(socket);
        });

        server.listen(port, host);

        server.on('error', e=> {
            if(['WSAEADDRINUSE', 'EADDRINUSE'].includes((e as any).code)) {
                resolve(true);
            }
            else {
                reject(e);
            }
        });

        server.on('listening', ()=> {
            server.close();
            resolve(false);
        });
    });

    return result;
};

// returns a Promise which fulfills with the result of a shell command
// rejects with stderr
export function run(command): Promise<string> {
    return new Promise((fulfill, reject) => {
        exec(command, (err, stdout, stderr) => {
            if (err) {
                reject(err);
                return;
            }

            if (stderr) {
                reject(new Error(stderr));
                return;
            }

            fulfill(stdout);
        });
    });
}

// returns Promise which fulfills with true if command exists
export function exists(cmd) {
    return run(`command -v ${cmd}`).then((stdout: string) => {
        if (stdout.trim().length === 0) {
            // maybe an empty command was supplied?
            // are we running on Windows??
            return Promise.resolve(false);
        }

        const rNotFound = /^[\w\-]+ not found/g;

        if (rNotFound.test(cmd)) {
            return Promise.resolve(false);
        }

        return Promise.resolve(true);
    }).catch((_) => false);
}

export function stringify(obj, ignore: string[] = []) {
    const result = {};
    Object.keys(obj).forEach(key => {
        if (!ignore.includes(key)) {
            result[key] = obj[key];
        }
    });

    return JSON.stringify(result);
}

export async function getRotatelog(logfile) {
    await mkdirp(path.dirname(logfile));

    if (fs.existsSync(logfile)) {
        // format style: .20150602.193100
        const times = `.${timestamp()}`;
        // Note: rename last log to next start time, not when last log file created
        fs.renameSync(logfile, logfile + times);
    }

    return fs.openSync(logfile, 'a');
}
