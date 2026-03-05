/**
 * 配置 Schema 测试
 * 验证日程与天气默认配置值
 */

import { describe, expect, it } from 'vitest'
import { DEFAULT_SCHEDULE_CONFIG, DEFAULT_WEATHER_CONFIG } from '../src/schema'

describe('schema defaults', () => {
  it('provides expected schedule defaults', () => {
    expect(DEFAULT_SCHEDULE_CONFIG.enabled).toBe(true)
    expect(DEFAULT_SCHEDULE_CONFIG.variableName).toBe('schedule')
    expect(DEFAULT_SCHEDULE_CONFIG.currentVariableName).toBe('currentSchedule')
    expect(DEFAULT_SCHEDULE_CONFIG.outfitVariableName).toBe('outfit')
    expect(DEFAULT_SCHEDULE_CONFIG.currentOutfitVariableName).toBe('currentOutfit')
    expect(DEFAULT_SCHEDULE_CONFIG.toolName).toBe('daily_schedule')
  })

  it('provides expected weather defaults', () => {
    expect(DEFAULT_WEATHER_CONFIG.enabled).toBe(false)
    expect(DEFAULT_WEATHER_CONFIG.variableName).toBe('weather')
    expect(DEFAULT_WEATHER_CONFIG.hourlyRefresh).toBe(false)
    expect(DEFAULT_WEATHER_CONFIG.toolName).toBe('get_weather')
  })
})
