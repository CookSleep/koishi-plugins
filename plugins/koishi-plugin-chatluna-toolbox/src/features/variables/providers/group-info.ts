/**
 * 群信息变量提供者
 * 输出当前群聊基础信息与管理成员信息
 */

import type { Session } from "koishi";
import { DEFAULT_GROUP_INFO_ITEMS } from "../../../constants";
import type { Config, GroupInfoItem, LogFn, MemberInfo } from "../../../types";

interface ProviderConfigurable {
  session?: Session;
}

interface GroupInfo {
  group_id?: string | number;
  groupId?: string | number;
  id?: string | number;
  group_name?: string;
  groupName?: string;
  name?: string;
  member_count?: number;
  memberCount?: number;
  max_member_count?: number;
  create_time?: number | string;
  createTime?: number | string;
}

export interface GroupInfoProviderDeps {
  config: Config;
  log?: LogFn;
}

async function fetchGroupInfo(session: Session): Promise<GroupInfo | null> {
  if (session.platform !== "onebot") return null;

  const bot = session.bot;
  const internal = (bot as unknown as { internal?: Record<string, unknown> })
    ?.internal;
  if (!internal) return null;

  const groupId = Number(session.guildId);
  if (!groupId || !Number.isFinite(groupId)) return null;

  try {
    if (typeof internal.getGroupInfo === "function") {
      return await (
        internal.getGroupInfo as (
          groupId: number,
          noCache?: boolean,
        ) => Promise<GroupInfo>
      )(groupId, false);
    }
    if (typeof internal._request === "function") {
      return await (
        internal._request as (
          action: string,
          params: unknown,
        ) => Promise<GroupInfo>
      )("get_group_info", {
        group_id: groupId,
        no_cache: false,
      });
    }
  } catch {
    return null;
  }

  return null;
}

async function fetchOwnersAndAdmins(
  session: Session,
  log?: LogFn,
): Promise<{ owners: string[]; admins: string[] } | null> {
  try {
    if (session.platform !== "onebot") return null;
    const guildId = session.guildId;
    if (!guildId) return null;

    const bot = session.bot;
    const internal = (bot as unknown as { internal?: Record<string, unknown> })
      ?.internal;

    let members: MemberInfo[] | null = null;
    if (internal) {
      if (typeof internal.getGroupMemberList === "function") {
        members = await (
          internal.getGroupMemberList as (
            groupId: string | number,
          ) => Promise<MemberInfo[]>
        )(guildId);
      } else if (typeof internal._request === "function") {
        members = await (
          internal._request as (
            action: string,
            params: unknown,
          ) => Promise<MemberInfo[]>
        )("get_group_member_list", {
          group_id: Number(guildId),
        });
      }
    }

    if (!members && typeof bot.getGuildMemberList === "function") {
      const list = await bot.getGuildMemberList(guildId);
      members = (list?.data as MemberInfo[]) || null;
    }

    if (!members || !Array.isArray(members) || members.length === 0)
      return null;

    const owners: string[] = [];
    const admins: string[] = [];

    for (const member of members) {
      const roleRaw =
        member.role ||
        member.roleName ||
        member.permission ||
        member.identity ||
        (Array.isArray(member.roles) ? member.roles[0] : "") ||
        "";
      const role = String(roleRaw || "").toLowerCase();
      const userId = String(
        member.user_id ||
          member.userId ||
          member.id ||
          member.qq ||
          member.uid ||
          "",
      );
      const candidates = [
        member.card,
        member.remark,
        member.displayName,
        member.nick,
        member.nickname,
        member.name,
      ].map((item) => (item ? String(item).trim() : ""));
      const name = candidates.find((item) => item) || userId;
      const label = userId ? `${name}(${userId})` : name;

      if (role === "owner" || role === "master" || role === "leader") {
        owners.push(label);
      } else if (
        role === "admin" ||
        role === "administrator" ||
        role === "manager"
      ) {
        admins.push(label);
      }
    }

    return { owners, admins };
  } catch (error) {
    log?.("debug", "获取群管理信息失败", error);
    return null;
  }
}

function formatDateOnly(value: unknown): string {
  if (value == null || value === "") return "";
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp)) return "";
  const date = new Date(timestamp < 1e11 ? timestamp * 1000 : timestamp);
  if (Number.isNaN(date.valueOf())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function renderGroupInfo(
  group: GroupInfo,
  items: GroupInfoItem[],
  roles: { owners: string[]; admins: string[] } | null,
): string {
  const values: string[] = [];
  const id = String(group.group_id ?? group.groupId ?? group.id ?? "").trim();
  const name = String(
    group.group_name ?? group.groupName ?? group.name ?? "",
  ).trim();
  const memberCount =
    group.member_count ?? group.memberCount ?? group.max_member_count;
  const createTime = formatDateOnly(group.create_time ?? group.createTime);

  for (const item of items) {
    switch (item) {
      case "groupName":
        if (name) values.push(`群名：${name}`);
        break;
      case "groupId":
        if (id) values.push(`群号：${id}`);
        break;
      case "memberCount":
        if (memberCount != null) values.push(`成员数量：${memberCount}`);
        break;
      case "createTime":
        if (createTime) values.push(`创建时间：${createTime}`);
        break;
      case "ownerList": {
        if (!roles) break;
        values.push(
          `群主：${roles.owners.length ? roles.owners.join("、") : "无"}`,
        );
        break;
      }
      case "adminList": {
        if (!roles) break;
        values.push(
          `管理员：${roles.admins.length ? roles.admins.join("、") : "无"}`,
        );
        break;
      }
      default:
        break;
    }
  }

  if (values.length === 0) return id || name || "未能获取当前群信息。";
  return values.join("\n");
}

export function createGroupInfoProvider(deps: GroupInfoProviderDeps) {
  const { config, log } = deps;

  return async (
    _args: unknown,
    _variables: unknown,
    configurable?: ProviderConfigurable,
  ): Promise<string> => {
    const session = configurable?.session;
    if (!session) return "暂无群信息。";
    if (!session.guildId) return "";
    if (session.platform !== "onebot") return "当前平台暂不支持查询群信息。";

    const items =
      Array.isArray(config.groupInfo?.items) && config.groupInfo.items.length
        ? config.groupInfo.items
        : DEFAULT_GROUP_INFO_ITEMS;

    try {
      const groupInfo = await fetchGroupInfo(session);
      if (!groupInfo) return "未能获取当前群信息。";

      const needRoles =
        items.includes("ownerList") || items.includes("adminList");
      const roles = needRoles ? await fetchOwnersAndAdmins(session, log) : null;

      return renderGroupInfo(groupInfo, items, roles);
    } catch (error) {
      log?.("debug", "群信息变量解析失败", error);
      return "获取群信息失败。";
    }
  };
}
