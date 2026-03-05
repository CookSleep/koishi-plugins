/**
 * 机器人信息变量提供者
 * 输出当前机器人在会话中的信息
 */

import type { Session } from "koishi";
import type { Config, MemberInfo } from "../../../types";

interface ProviderConfigurable {
  session?: Session;
}

function pickFirst(...values: unknown[]): string | number | null {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (!text) continue;
    return value as string | number;
  }
  return null;
}

function normalizeTimestamp(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return null;
  return numeric < 1e11 ? numeric * 1000 : numeric;
}

function formatDateOnly(value: number | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDateTime(value: number | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function translateGender(value: unknown): string {
  if (value == null) return "";
  const text = String(value).trim().toLowerCase();
  if (!text) return "";
  if (["male", "man", "m", "1", "boy"].includes(text)) return "男";
  if (["female", "woman", "f", "2", "girl"].includes(text)) return "女";
  if (["未知", "unknown", "0", "secret"].includes(text)) return "";
  return String(value);
}

function normalizeRole(value: unknown): string {
  if (value == null) return "群员";
  const raw = String(value).trim();
  const text = raw.toLowerCase();
  if (!text) return "群员";
  if (["owner", "group_owner", "群主"].includes(text)) return "群主";
  if (["admin", "administrator", "group_admin", "管理员"].includes(text))
    return "管理员";
  if (["member", "normal", "群员"].includes(text)) return "群员";
  return raw;
}

async function fetchMember(
  session: Session,
  userId: string,
): Promise<MemberInfo | null> {
  try {
    const guildId =
      session.guildId ||
      (session as unknown as { event?: { guild?: { id?: string } } })?.event
        ?.guild?.id;
    if (!guildId) return null;

    const bot = session.bot;
    if (!bot) return null;

    if (session.platform === "onebot") {
      const internal = (
        bot as unknown as { internal?: Record<string, unknown> }
      )?.internal;
      if (internal) {
        if (typeof internal.getGroupMemberInfo === "function") {
          const result = await (
            internal.getGroupMemberInfo as (
              groupId: string | number,
              userId: string | number,
              noCache?: boolean,
            ) => Promise<MemberInfo>
          )(Number(guildId), Number(userId), false);
          if (result) return result;
        }
        if (typeof internal._request === "function") {
          const result = await (
            internal._request as (
              action: string,
              params: unknown,
            ) => Promise<MemberInfo>
          )("get_group_member_info", {
            group_id: Number(guildId),
            user_id: Number(userId),
            no_cache: false,
          });
          if (result) return result;
        }
      }
    }

    if (typeof bot.getGuildMember === "function") {
      return (await bot.getGuildMember(guildId, userId)) as MemberInfo;
    }
    return null;
  } catch {
    return null;
  }
}

function renderBotInfo(
  session: Session,
  member: MemberInfo | null,
  items: string[],
): string {
  const botId = String(
    session.selfId ||
      (session as unknown as { bot?: { selfId?: string } }).bot?.selfId ||
      "",
  ).trim();
  const values: string[] = [];

  for (const item of items) {
    switch (item) {
      case "nickname": {
        const name = String(
          pickFirst(
            member?.card,
            member?.remark,
            member?.displayName,
            member?.nick,
            member?.nickname,
            member?.name,
            botId,
          ) || "",
        ).trim();
        if (name) values.push(`name:${name}`);
        break;
      }
      case "userId":
        if (botId) values.push(`id:${botId}`);
        break;
      case "role": {
        const role = normalizeRole(
          pickFirst(
            member?.role,
            member?.roleName,
            member?.permission,
            member?.identity,
          ),
        );
        values.push(`群内身份:${role}`);
        break;
      }
      case "level": {
        const level = pickFirst(
          member?.level,
          member?.levelName,
          member?.level_name,
          member?.level_info?.current_level,
        );
        if (level !== null) values.push(`群等级:${level}`);
        break;
      }
      case "title": {
        const title = pickFirst(
          member?.title,
          member?.specialTitle,
          member?.special_title,
        );
        if (title !== null) values.push(`头衔:${title}`);
        break;
      }
      case "gender": {
        const gender = translateGender(member?.sex ?? member?.gender);
        if (gender) values.push(`性别:${gender}`);
        break;
      }
      case "age": {
        const age = Number(member?.age);
        if (Number.isFinite(age) && age > 0) values.push(`年龄:${age}`);
        break;
      }
      case "area": {
        const area = pickFirst(member?.area, member?.region, member?.location);
        if (area !== null) values.push(`地区:${area}`);
        break;
      }
      case "joinTime": {
        const joinTime = formatDateOnly(
          normalizeTimestamp(
            pickFirst(
              member?.join_time,
              member?.joined_at,
              member?.joinTime,
              member?.joinedAt,
            ),
          ),
        );
        if (joinTime) values.push(`入群:${joinTime}`);
        break;
      }
      case "lastSentTime": {
        const lastSentTime = formatDateTime(
          normalizeTimestamp(
            pickFirst(
              member?.last_sent_time,
              member?.lastSentTime,
              member?.lastSpeakTimestamp,
            ),
          ),
        );
        if (lastSentTime) values.push(`活跃:${lastSentTime}`);
        break;
      }
      default:
        break;
    }
  }

  if (values.length === 0) return botId || "未知机器人";
  return values.join(", ");
}

export interface BotInfoProviderDeps {
  config: Config;
}

export function createBotInfoProvider(deps: BotInfoProviderDeps) {
  const { config } = deps;

  return async (
    _args: unknown,
    _variables: unknown,
    configurable?: ProviderConfigurable,
  ): Promise<string> => {
    const session = configurable?.session;
    if (!session) return "未知机器人";

    const items =
      Array.isArray(config.botInfo?.items) && config.botInfo.items.length
        ? config.botInfo.items
        : ["nickname", "userId"];

    const botId = String(
      session.selfId ||
        (session as unknown as { bot?: { selfId?: string } }).bot?.selfId ||
        "",
    ).trim();
    if (!botId) return "未知机器人";

    const member = await fetchMember(session, botId);
    return renderBotInfo(session, member, items);
  };
}
