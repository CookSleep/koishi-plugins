/**
 * 日程图片渲染器
 * 将日程与穿搭数据渲染为图片
 */

import type { Context } from 'koishi'
import type { LogFn, OutfitEntry, ScheduleEntry } from '../types'
import { renderHtml, escapeHtmlForRender } from './base'

const COMMON_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700&display=swap');
  @import url('https://fonts.googleapis.com/css?family=Noto+Color+Emoji');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: "Noto Sans SC", "Noto Color Emoji", "Segoe UI", "Microsoft YaHei", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif;
    background: #f0f2f5;
    color: #1f2937;
  }
  .container {
    padding: 32px;
    width: 600px;
    background: #f0f2f5;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .header { margin-bottom: 8px; padding: 0 8px; }
  h1 { font-size: 24px; font-weight: 700; color: #111827; }
  h2 { font-size: 16px; font-weight: 500; color: #6b7280; margin-top: 4px; }
  .card {
    background: #ffffff;
    border-radius: 12px;
    padding: 16px;
    display: flex;
    align-items: center;
    gap: 16px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
`

const SCHEDULE_STYLE = `
  ${COMMON_STYLE}
  .time-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding-right: 16px;
    border-right: 2px solid #f3f4f6;
    margin-right: 16px;
    min-width: 100px;
  }
  .time-start { font-size: 18px; font-weight: 700; color: #4f46e5; }
  .time-end { font-size: 14px; color: #9ca3af; }
  .summary { font-size: 16px; color: #374151; line-height: 1.5; }
  .description {
    font-size: 14px;
    color: #6b7280;
    margin-bottom: 16px;
    padding: 0 8px;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .outfit-card {
    background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%);
    border: 2px dashed #ec4899;
    border-radius: 12px;
    padding: 12px 16px;
    margin: 8px 0 16px 0;
  }
  .outfit-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  .outfit-time { font-size: 14px; font-weight: 600; color: #db2777; }
  .outfit-label {
    font-size: 13px;
    color: #be185d;
    background: #fbcfe8;
    padding: 2px 8px;
    border-radius: 4px;
  }
  .outfit-desc {
    font-size: 14px;
    color: #831843;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
  }
`

export interface ScheduleRenderData {
  title: string
  description: string
  entries: ScheduleEntry[]
  outfits?: OutfitEntry[]
  date: string
}

interface TimelineItem {
  type: 'entry' | 'outfit'
  startMinutes: number
  entry?: ScheduleEntry
  outfit?: OutfitEntry
}

function buildTimeline(entries: ScheduleEntry[], outfits: OutfitEntry[]): TimelineItem[] {
  const items: TimelineItem[] = []
  for (const entry of entries) items.push({ type: 'entry', startMinutes: entry.startMinutes, entry })
  for (const outfit of outfits) items.push({ type: 'outfit', startMinutes: outfit.startMinutes, outfit })

  return items.sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes
    return a.type === 'outfit' ? -1 : 1
  })
}

function renderTimelineItem(item: TimelineItem): string {
  if (item.type === 'outfit' && item.outfit) {
    return `
<div class="outfit-card">
  <div class="outfit-header">
    <span>👗</span>
    <span class="outfit-time">${escapeHtmlForRender(item.outfit.start)}</span>
    <span class="outfit-label">换装</span>
  </div>
  <div class="outfit-desc">${escapeHtmlForRender(item.outfit.description)}</div>
</div>`
  }

  if (item.type === 'entry' && item.entry) {
    return `
<div class="card">
  <div class="time-col">
    <div class="time-start">${escapeHtmlForRender(item.entry.start)}</div>
    <div class="time-end">${escapeHtmlForRender(item.entry.end)}</div>
  </div>
  <div class="info">
    <div class="summary">${escapeHtmlForRender(item.entry.summary)}</div>
  </div>
</div>`
  }

  return ''
}

function buildScheduleHtml(data: ScheduleRenderData): string {
  const timeline = buildTimeline(data.entries, data.outfits || [])

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <style>${SCHEDULE_STYLE}</style>
</head>
<body>
  <div class="container" id="schedule-root">
    <div class="header">
      <h1>${escapeHtmlForRender(data.title)}</h1>
      <h2>${escapeHtmlForRender(data.date)}</h2>
    </div>
    ${data.description ? `<div class="description">${escapeHtmlForRender(data.description)}</div>` : ''}
    ${timeline.map(renderTimelineItem).join('')}
  </div>
</body>
</html>`
}

export function createScheduleRenderer(ctx: Context, log?: LogFn) {
  return async (data: ScheduleRenderData): Promise<Buffer | null> => {
    const html = buildScheduleHtml(data)
    return renderHtml(
      ctx,
      html,
      {
        width: 600,
        height: 150 + data.entries.length * 100 + (data.outfits?.length || 0) * 90,
        selector: '#schedule-root',
      },
      log,
    )
  }
}
