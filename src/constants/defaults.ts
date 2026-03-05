/**
 * 默认常量
 * 提供变量与工具配置默认值
 */

import type { MemberInfoItem } from '../types'

export const DEFAULT_MEMBER_INFO_ITEMS: MemberInfoItem[] = [
  'nickname',
  'userId',
  'role',
  'level',
  'title',
  'gender',
  'age',
  'area',
  'joinTime',
  'lastSentTime',
]

export const RAW_INTERCEPTOR_TAG = '__chatlunaToolboxRawInterceptor'
