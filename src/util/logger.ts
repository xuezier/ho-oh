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