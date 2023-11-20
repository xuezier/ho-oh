# Ho-oh
https://bulbapedia.bulbagarden.net/wiki/Ho-Oh_(Pok%C3%A9mon)

deploy tool for Node.js project.

auto restart application worker process when process crash.

runnint hook support.

# Installation
```bash
npm install @gaoding/ho-oh
```

# Usage
ho-oh is a command line script tool for Node.js project.

## Command
ho-oh
```bash
ho-oh
Commands:
  start [options]           启动
        -b, --basedir <d>   应用启动目录, 默认值 process.cwd()
        -T, --title <t>     应用运行时名称，会添加到启动的终端命令中，可通过 grep 查找到
        -d, --daemon        是否为进程守护模式运行，默认 false, 开启后应用启动后会退到后台运行
        -l, --logdir <d>    日志输出地址, 默认值 /home/log
        --ignore-stderr     忽略错误，会忽略启动时产生的 warn 或 error 日志，默认 false
        -w, --workers <n>   worker 进程数，默认值：1
        -t, --timeout <t>   应用启动超时，单位：秒，默认: 120
        --dispatch          应用启动入口文件，默认 `${process.cwd()}/dispatch.js`

  stop [options]            关闭
        -t, --title <t>     应用运行时名称, 不传会销毁所有 ho-oh 启动的服务进程

  help [command]            display help for command
```

## Example
a Node.js Application include files like

```bash
- package.json
- index.js
```
package.json
```json
{
    "name": "hooh-test",
    "version": "1.0.0",
    "description": "",
    "dependencies": {
        "ho-oh": "1.0.0",
        "koa": "^2.14.2"
    },
    "scripts": {
        "start": "ho-oh start --dispatch=index.js --workers=2",
        "stop": "ho-oh stop"
    },
    "author": ""
}
```

index.js
```js
const koa = require('koa');

const app = new koa();

app.listen(2022, () => { console.log(`server started`) });
```

run *`npm start`* will got the command result
```bash
npm start

> hooh-test@1.0.0 start
> ho-oh start --dispatch=index.js --workers=2

[2023-11-20 18:08:18] ho-oh start application without daemon
[2023-11-20 18:08:18] Worker: 60255 ready
[2023-11-20 18:08:18] Worker: 60256 ready
[2023-11-20 18:08:18] Master: 60254 ready
server started
server started
```

## Messenger And Hooks
ho-oh support messenger and hooks.

messenger support to send message to other worker.

you can add hook function when dispatch before load and server before close;

### Messenger
```js
const koa = require('koa');
const { messenger } = require('ho-oh');

const app = new koa();

messenger.once('ready', () => {
    messenger.sendToWorker('i am: ' + process.pid);
});

messenger.on('message', message => {
    console.log(message);
});

app.listen(2022);
```

run app will send process pid to all workers
```bash
npm start

> hooh-test@1.0.0 start
> ho-oh start --dispatch=index.js --workers=2

[2023-11-20 18:14:12] ho-oh start application without daemon
[2023-11-20 18:14:12] Worker: 60432 ready
[2023-11-20 18:14:12] Worker: 60431 ready
[2023-11-20 18:14:12] Master: 60430 ready
i am: 60432
i am: 60432
i am: 60431
i am: 60431
```

### Hook
messenger has two hook function, `beforeLoad` and `beforeClose`.

```js
const koa = require('koa');
const { messenger } = require('ho-oh');

const app = new koa();
app.status = 'runing';

messenger.addHook('beforeClose', async () => {
    app.status = 'closed';
    await new Promise(resolve => setTimeout(resolve, 5000));
});;

app.listen(2022);
```

if add `beforeClose` hook function, worker will run all hooks before close if you run *`npm stop`*.
