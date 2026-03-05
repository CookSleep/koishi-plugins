/**
 * XML 解析器
 * 解析模型输出中的动作标签
 */

export interface ParsedXmlActions {
  pokeUserIds: string[]
  emojis: Array<{ messageId: string; emojiId: string }>
  deleteMessageIds: string[]
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)))
}

export function parseXmlActions(response: string): ParsedXmlActions {
  const pokeMatches = Array.from(response.matchAll(/<poke\s+id="([^"]+)"\s*\/>/gi))
  const emojiMatches = Array.from(
    response.matchAll(/<emoji\s+message_id="([^"]+)"\s+emoji_id="([^"]+)"\s*\/>/gi),
  )
  const deleteMatches = Array.from(response.matchAll(/<delete\s+message_id="([^"]+)"\s*\/?>/gi))

  return {
    pokeUserIds: unique(pokeMatches.map((match) => String(match[1] || ''))),
    emojis: emojiMatches
      .map((match) => ({
        messageId: String(match[1] || '').trim(),
        emojiId: String(match[2] || '').trim(),
      }))
      .filter((item) => item.messageId && item.emojiId),
    deleteMessageIds: unique(deleteMatches.map((match) => String(match[1] || ''))),
  }
}
