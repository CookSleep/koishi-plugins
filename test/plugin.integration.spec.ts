/**
 * 集成注册测试
 * 验证 ChatLuna 变量与工具注册流程
 */

import { describe, expect, it, vi } from 'vitest'
import type { Context } from 'koishi'
import { registerChatLunaIntegrations } from '../src/integrations/chatluna'

describe('chatluna integrations', () => {
  it('registers weather variable and tool', () => {
    const providers: string[] = []
    const tools: string[] = []

    const ctx = {
      chatluna: {
        promptRenderer: {
          registerFunctionProvider: (name: string) => {
            providers.push(name)
            return () => {}
          },
        },
      },
    } as unknown as Context

    const plugin = {
      registerTool: (name: string) => {
        tools.push(name)
      },
    }

    const result = registerChatLunaIntegrations({
      ctx,
      plugin,
      config: {
        schedule: {
          enabled: true,
          model: '',
          personaSource: 'none',
          personaChatlunaPreset: '无',
          personaCustomPreset: '',
          variableName: 'schedule',
          currentVariableName: 'currentSchedule',
          outfitVariableName: 'outfit',
          currentOutfitVariableName: 'currentOutfit',
          timezone: 'Asia/Shanghai',
          prompt: 'test',
          renderAsImage: false,
          startDelay: 1000,
          registerTool: true,
          toolName: 'daily_schedule',
        },
        weather: {
          enabled: true,
          variableName: 'weather',
          cityName: '上海',
          hourlyRefresh: false,
          registerTool: true,
          toolName: 'get_weather',
        },
      } as never,
      scheduleService: {
        registerVariables: vi.fn(() => ['schedule', 'currentSchedule', 'outfit', 'currentOutfit']),
        registerTool: vi.fn(() => 'daily_schedule'),
      } as never,
      weatherService: {
        getHourlyWeather: vi.fn(async () => '晴，21°C'),
        getWeatherText: vi.fn(async () => '天气文本'),
      } as never,
      log: () => {},
    })

    expect(result.variableNames).toContain('weather')
    expect(result.toolNames).toContain('get_weather')
    expect(providers).toContain('weather')
    expect(tools).toContain('get_weather')
  })
})
