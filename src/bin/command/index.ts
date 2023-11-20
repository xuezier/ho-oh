import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import * as assert from 'assert';

import { Command, program } from 'commander';

import * as helper from './helper';

import { CHECK_TIMEOUT, TITLE } from '../../constants/Command';
import { start } from './start';
import { stop } from './stop';
const pkg = require(path.resolve(__dirname, '../../../package.json'));

export class Program {
    program = program.version(pkg.version);

    private _cwd = process.cwd();
    get cwd() {
        return this._cwd;
    }

    private _command: 'node' | 'ts-node' = 'node';
    get command() {
        return this._command;
    }

    private _baseDir = process.cwd();
    get baseDir() {
        return this._baseDir;
    }

    private _title = TITLE;
    get title() {
        return this._title;
    }

    private _isDaemon = false;
    get isDaemon() {
        return this._isDaemon;
    }

    private _ignoreStdErr = false;
    get ignoreStdErr() {
        return this._ignoreStdErr;
    }

    private _workers = 1;
    get workers() {
        return this._workers;
    }

    private _checkTimeout = CHECK_TIMEOUT;
    get checkTimeout() {
        return this._checkTimeout;
    }

    private _logDir = `${os.homedir()}/.hooh/logs`;
    get logDir() {
        return this._logDir;
    }

    private _dispatch = `${process.cwd()}/dispatch`;
    get dispatch() {
        return this._dispatch;
    }

    get pro_args() {
        return {
            command: this.command,
            baseDir: this.baseDir,
            title: this.title,
            isDaemon: this.isDaemon,
            ignoreStdErr: this.ignoreStdErr,
            workers: this.workers,
            checkTimeout: this.checkTimeout,
            logdir: this.logDir,
            dispatch: this.dispatch,
        };
    }

    readonly helper = helper;

    constructor() {
        this.start();
        this.stop();
    }

    private start() {
        const command = this.program.command('start')
            .description('run application');

        this.setTimeout(command)
            .setIsDaemon(command)
            .setWorkers(command)
            .setTitle(command)
            .setBaseDir(command)
            .setIgnoreStdErr(command)
            .setLogDir(command)
            .setDispatch(command);

        command.action(async () => {
            const argvs = process.argv;
            const nodeOptions = argvs.filter(argv => argv.startsWith('--node-options--')).map(argv => argv.replace(/^--node-options/, ''));

            await start(this.pro_args, nodeOptions);
        })

        return command;
    }

    private stop() {
        const command = this.program.command('stop')
            .description('stop running application');

        this.setTitle(command);

        command.action(() => {
            stop({title: this.title});
        });
    }

    private setIsDaemon(command) {
        command.option('-d, --daemon', 'open daemon', () => {
            this._isDaemon = true;
        });

        return this;
    }

    private setTimeout(command: Command) {
        command.option('-t, --timeout <timeout>', 'timeout for check process', timeout => {
            this._checkTimeout = (+timeout) || CHECK_TIMEOUT;
        });

        return this;
    }

    private setWorkers(command: Command) {
        command.option('-w, --workers <workers>', 'number of workers', workers => {
            this._workers = (+workers) || 1;
        });

        return this;
    }

    private setTitle(command: Command) {
        command.option('-T, --title <title>', 'title of process', title => {
            this._title = title;
        });

        return this;
    }

    private setBaseDir(command: Command) {
        command.option('-b, --baseDir <baseDir>', 'base directory of application', baseDir => {
            this._baseDir = baseDir;
        });

        return this;
    }

    private setIgnoreStdErr(command: Command) {
        command.option('--ignoreStdErr', 'ignore stderr', () => {
            this._ignoreStdErr = true;
        });

        return this;
    }

    private setLogDir(command: Command) {
        command.option('-l, --logdir <logDir>', 'log directory', logdir => {
            const isExists = fs.existsSync(logdir);
            assert(isExists, new TypeError(`logdir ${logdir} is not exists`));

            this._logDir = logdir;
        });

        return this;
    }

    private setDispatch(command: Command) {
        command.option('--dispatch <dispatch>', 'Application dispatch file path', dispatch => {
            this._dispatch = dispatch;
        });

        return this;
    }

    run() {
        this.program.parse(process.argv);
    }
}

