/**
 * XML 工具配置
 * 定义 XML 动作解析开关
 */

import { Schema } from "koishi";

const DEFAULT_XML_REFERENCE_PROMPT = `## 动作指令
你可以根据需要创建一个独立的 <actions> 元素。它用于执行非语言的系统指令。如果不需要执行任何动作，请省略此元素。
1. 戳一戳: <poke id=""/>
  - id: user_id
  - 适用场景:
    - 当你想引起某人的注意时。
    - 当对方说了让你感到无语、无视你、或者你想通过肢体互动调侃对方时。
    - 作为一种俏皮的打招呼方式。
2. 表情回应: <emoji message_id="" emoji_id=""/>
  - message_id: 消息 ID
  - emoji_id 对应表:
    - 424: 赞同 (红色按钮)
    - 10068: 问号
    - 265: 逆天 (地铁老人手机)
    - 76: 赞
    - 66: 爱心
  - 适用场景:
    - 用于对上下文中的特定消息进行表情回应。
3. 撤回消息: <delete message_id=""/>
  - message_id: 消息 ID
  - 适用场景:
    - 你在本群为管理员
    - 用于撤回指定消息

格式示例:
\`\`\`xml
  <actions>
    <poke id="123456"/>
    <emoji message_id="346234" emoji_id="66"/>
    <delete message_id="435663"/>
  </actions>
\`\`\``;

export const XmlToolsSchema = Schema.object({
  enablePokeXmlTool: Schema.boolean()
    .default(false)
    .description("启用 XML 形式的戳一戳调用"),
  enableEmojiXmlTool: Schema.boolean()
    .default(false)
    .description("启用 XML 形式的消息表情调用"),
  enableDeleteXmlTool: Schema.boolean()
    .default(false)
    .description("启用 XML 形式的消息撤回调用"),
  referencePrompt: Schema.string()
    .role("textarea")
    .default(DEFAULT_XML_REFERENCE_PROMPT)
    .description("参考提示词"),
}).description("XML 工具");
