/**
 * 随机数变量提供者
 * 生成配置范围内随机整数
 */

import type { Config } from '../../../types'

export interface RandomProviderDeps {
  config: Config
}

export function createRandomProvider(deps: RandomProviderDeps) {
  const { config } = deps

  return (): number => {
    const randomConfig = config.random || {
      min: 0,
      max: 100,
    }
    const randomMin = randomConfig.min ?? 0
    const randomMax = randomConfig.max ?? 100
    return Math.floor(Math.random() * (randomMax - randomMin + 1)) + randomMin
  }
}
