/**
 * 插件入口导出
 * 导出元信息、配置与应用函数
 */

export { name, inject, ConfigSchema as Config } from './schema'
export { apply } from './plugin'

export * from './types'
export * from './constants'
export * from './schema'
export * from './services/schedule-service'
export * from './services/weather-service'
