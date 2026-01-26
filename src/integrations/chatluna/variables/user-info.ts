/**
 * 用户信息变量提供者
 * 为 ChatLuna 提供当前用户的详细信息
 */

import type { Session } from 'koishi'
import type { Config, MemberInfo, LogFn } from '../../../types'
import type { AffinityStore } from '../../../services/affinity/store'
import { renderMemberInfo, resolveUserInfo as resolveUserInfoHelper } from '../../../helpers/member'
import { DEFAULT_MEMBER_INFO_ITEMS } from '../../../constants'

interface ProviderConfigurable {
    session?: Session
}

export interface UserInfoProviderDeps {
    config: Config
    log?: LogFn
    fetchMember: (session: Session, userId: string) => Promise<MemberInfo | null>
    store: AffinityStore
}

export function createUserInfoProvider(deps: UserInfoProviderDeps) {
    const { config, log, fetchMember, store } = deps
    const defaultItems = DEFAULT_MEMBER_INFO_ITEMS

    return async (
        _args: unknown,
        _variables: unknown,
        configurable?: ProviderConfigurable
    ): Promise<string> => {
        const session = configurable?.session
        if (!session?.userId) return '未知用户'

        const userInfoConfig = config.userInfo || config.otherVariables?.userInfo || {
            variableName: 'userInfo',
            items: defaultItems
        }
        const items =
            Array.isArray(userInfoConfig.items) && userInfoConfig.items.length
                ? userInfoConfig.items
                : [...defaultItems]
        const includeChatCount = items.some((item) => String(item || '').trim() === 'chatCount')
        let chatCount: number | undefined
        if (includeChatCount && session.selfId) {
            try {
                const record = await store.load(session.selfId, session.userId)
                if (record?.chatCount !== null && record?.chatCount !== undefined) {
                    chatCount = Number(record.chatCount)
                }
            } catch (error) {
                if (config.debugLogging) {
                    log?.('warn', '获取聊天计数失败', error)
                }
            }
        }

        try {
            return await resolveUserInfoHelper(session, items, fetchMember, {
                defaultItems: [...defaultItems],
                logUnknown: config.debugLogging,
                log,
                chatCount
            })
        } catch {
            return `${session.username || session.userId || '未知用户'}`
        }
    }
}

export type UserInfoProvider = ReturnType<typeof createUserInfoProvider>
