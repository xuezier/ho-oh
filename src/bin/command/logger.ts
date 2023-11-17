import { timestamp } from "./helper";

export class Logger {
    private static disable = process.env.HOOH_DISABLE_DEBUG_LOG === 'true';

    private static _log(level: 'debug' | 'info' | 'warn' | 'error', ...args) {
        if(this.disable) return;

        console[level](`[${timestamp()}]`, ...args);
    }

    public static info(...args) {
        this._log('info', ...args);
    }

    public static debug(...args) {
        this._log('debug', ...args);
    }

    public static warn(...args) {
        this._log('warn', ...args);
    }

    public static error(...args) {
        this._log('error', ...args);
    }
}