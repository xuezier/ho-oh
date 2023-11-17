/**
 * 环境变量加载器类
 */
export class EnvLoader {
    // 私有静态成员变量，存储进程中的环境变量
    private static _env = process.env;

    /**
     * 获取所有环境变量
     * @return {NodeJS.ProcessEnv} 返回进程中的所有环境变量
     */
    static get env() {
        return this._env;
    }

    /**
     * 获取数值类型的环境变量
     * @param  {string} key 环境变量名
     * @return {number}     返回该环境变量对应的数值，如果没有找到则返回 0
     */
    static getNumber(key) {
        const value = Number(this.env[key]);

        if (value) {
            return value;
        }

        return 0;
    }

    /**
     * 获取字符串类型的环境变量
     * @param  {string} key 环境变量名
     * @return {string}     返回该环境变量对应的字符串，如果没有找到则返回一个空字符串
     */
    static getString(key) {
        const value = this.env[key];

        if (value) {
            return value;
        }

        return '';
    }

    /**
     * 获取布尔类型的环境变量
     * @param  {string} key 环境变量名
     * @return {boolean}    返回该环境变量对应的布尔值，如果没有找到则返回 false
     */
    static getBoolean(key) {
        const value = this.env[key];

        if (!value) {
            return false;
        }

        if (value === 'false') {
            return false;
        }

        return Boolean(value);
    }

    /**
     * 获取 JSON 类型的环境变量
     * @param  {string} key 环境变量名
     * @return {object}     返回该环境变量对应的 JSON 对象，如果没有找到则返回空对象
     */
    static getJSON(key) {
        const value = this.env[key];

        if (!value) {
            return {};
        }

        try {
            return JSON.parse(value);
        } catch (_) {
            return {};
        }
    }

    /**
     * 获取日期类型的环境变量
     * @param  {string} key 环境变量名
     * @return {Date}       返回该环境变量对应的日期对象，如果没有找到或解析失败则返回当前日期对象
     */
    static getDate(key) {
        const value = this.env[key];

        try {
            return new Date(value || Date.now());
        } catch (_) {
            return new Date();
        }
    }
  }
