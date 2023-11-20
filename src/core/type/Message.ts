// 定义了 TypeScript 类型 "MessageEvents"，它是一个字符串字面量类型，只能取 `'kill'`、`'quit'`、`'closed'`、`'ready'` 和 `'ipc'` 这些值中的一个。
export type MessageEvents = 'kill' | 'quit' | 'closed' | 'ready' | 'ipc';

// 定义了 TypeScript 接口 "Message"，用于描述传递给另一个进程的消息。这些消息具有两个属性：事件和消息体。
export type Message = {
  // 这个属性表示将触发的事件的名称。
  event: MessageEvents;

  // 这个属性用来传递事件相关的信息。
  msg?: any;
}
