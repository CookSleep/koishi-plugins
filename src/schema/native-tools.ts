/**
 * 原生工具配置
 * 定义 OneBot 原生工具相关 Schema
 */

import { Schema } from 'koishi'

export const NativeToolsSchema = Schema.object({
  enableNapCatProtocol: Schema.boolean().default(true).description('启用 NapCat OneBot 协议（与 LLBot 二选一）'),
  enableLlbotProtocol: Schema.boolean().default(false).description('启用 LLBot OneBot 协议（与 NapCat 二选一）'),
  enablePokeTool: Schema.boolean().default(false).description('注册 ChatLuna 工具：戳一戳（与 XML工具 二选一）'),
  pokeToolName: Schema.string().default('poke_user').description('ChatLuna 工具名称：戳一戳'),
  enableSetSelfProfileTool: Schema.boolean().default(false).description('注册 ChatLuna 工具：修改自身账户信息'),
  setSelfProfileToolName: Schema.string().default('set_self_profile').description('ChatLuna 工具名称：修改自身账户信息（支持昵称/签名/性别）'),
  enableSetGroupCardTool: Schema.boolean().default(false).description('注册 ChatLuna 工具：修改群成员昵称'),
  setGroupCardToolName: Schema.string().default('set_group_card').description('ChatLuna 工具名称：修改群成员昵称'),
  enableSetMsgEmojiTool: Schema.boolean().default(false).description('注册 ChatLuna 工具：给消息添加表情（需 chatluna-character 开启 enableMessageId，与 XML工具 二选一，表情对照表：https://bot.q.qq.com/wiki/develop/pythonsdk/model/emoji.html ）'),
  setMsgEmojiToolName: Schema.string().default('set_msg_emoji').description('ChatLuna 工具名称：给消息添加表情'),
  enableDeleteMessageTool: Schema.boolean().default(false).description('注册 ChatLuna 工具：撤回消息（需 chatluna-character 开启 enableMessageId，与 XML工具 二选一）'),
  deleteMessageToolName: Schema.string().default('delete_msg').description('ChatLuna 工具名称：撤回消息'),
}).description('原生工具')
