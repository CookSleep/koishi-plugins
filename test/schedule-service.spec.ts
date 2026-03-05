/**
 * 日程服务测试
 * 验证时间解析与文本组装逻辑
 */

import { describe, expect, it } from 'vitest'
import {
  buildSummary,
  derivePersonaTag,
  formatScheduleText,
  normalizeTime,
  type Schedule,
} from '../src/services/schedule-service'

describe('schedule service utilities', () => {
  it('normalizes common time formats', () => {
    expect(normalizeTime('7:30')?.minutes).toBe(450)
    expect(normalizeTime('24:00')?.minutes).toBe(1440)
    expect(normalizeTime('')?.minutes).toBeUndefined()
  })

  it('builds schedule text with outfits and entries', () => {
    const schedule: Schedule = {
      source: 'model',
      date: '2026年03月04日',
      title: '📅 今日日程',
      description: '测试描述',
      entries: [
        {
          start: '08:00',
          end: '09:00',
          startMinutes: 480,
          endMinutes: 540,
          summary: '晨间整理',
        },
      ],
      outfits: [
        {
          start: '08:00',
          end: '12:00',
          startMinutes: 480,
          endMinutes: 720,
          description: '基础通勤穿搭',
        },
      ],
      text: '',
    }

    const text = formatScheduleText(schedule)
    expect(text).toContain('📅 今日日程')
    expect(text).toContain('👗 今日穿搭')
    expect(text).toContain('⏰ 08:00-09:00  晨间整理')
  })

  it('builds summary and persona tag', () => {
    expect(buildSummary('学习', '整理今日计划')).toBe('学习。整理今日计划')
    expect(derivePersonaTag('小夏\n喜欢记录生活')).toBe('小夏')
  })
})
