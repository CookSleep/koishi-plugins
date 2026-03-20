/**
 * 日程服务测试
 * 验证时间解析、文本组装与工具注册描述逻辑
 */

import type { Context } from "koishi";
import { describe, expect, it } from "vitest";
import { DEFAULT_SCHEDULE_CONFIG } from "../src/schema";
import {
  buildSummary,
  createScheduleService,
  derivePersonaTag,
  formatScheduleText,
  normalizeTime,
  type Schedule,
} from "../src/services/schedule-service";
import type { ToolRegistration } from "../src/types";

describe("schedule service utilities", () => {
  it("normalizes common time formats", () => {
    expect(normalizeTime("7:30")?.minutes).toBe(450);
    expect(normalizeTime("24:00")?.minutes).toBe(1440);
    expect(normalizeTime("")?.minutes).toBeUndefined();
  });

  it("builds schedule text with outfits and entries", () => {
    const schedule: Schedule = {
      source: "model",
      date: "2026年03月04日",
      title: "📅 今日日程",
      description: "测试描述",
      entries: [
        {
          start: "08:00",
          end: "09:00",
          startMinutes: 480,
          endMinutes: 540,
          summary: "晨间整理",
        },
      ],
      outfits: [
        {
          start: "08:00",
          end: "12:00",
          startMinutes: 480,
          endMinutes: 720,
          description: "基础通勤穿搭",
        },
      ],
      text: "",
    };

    const text = formatScheduleText(schedule);
    expect(text).toContain("📅 今日日程");
    expect(text).toContain("👗 今日穿搭");
    expect(text).toContain("⏰ 08:00-09:00  晨间整理");
  });

  it("builds summary and persona tag", () => {
    expect(buildSummary("学习", "整理今日计划")).toBe("学习。整理今日计划");
    expect(derivePersonaTag("小夏\n喜欢记录生活")).toBe("小夏");
  });
});

describe("schedule service tool registration", () => {
  function createService(options?: {
    toolName?: string;
    toolDescription?: string;
  }) {
    const registrations: Array<{ name: string; options: ToolRegistration }> =
      [];
    const service = createScheduleService({
      ctx: {} as Context,
      config: {
        schedule: {
          enabled: true,
          model: "",
          personaSource: "none",
          personaChatlunaPreset: "无",
          personaCustomPreset: "",
          timezone: "Asia/Shanghai",
          registerTool: true,
          renderAsImage: false,
          startDelay: 1000,
          toolName: options?.toolName ?? "daily_schedule",
          toolDescription: options?.toolDescription ?? "获取今日日程文本内容。",
          prompt: "test",
        },
        weather: {
          enabled: false,
          cityName: "",
          hourlyRefresh: false,
          registerTool: false,
          toolName: "get_weather",
          toolDescription: "天气工具描述",
        },
      },
      getModel: () => null,
      getMessageContent: () => "",
      resolvePersonaPreset: () => "",
      getWeatherText: async () => "",
      renderSchedule: async () => null,
      log: () => {},
    });
    const plugin = {
      registerTool: (name: string, options: ToolRegistration) => {
        registrations.push({ name, options });
      },
    };

    return { service, plugin, registrations };
  }

  it("uses custom tool description when registering tool", () => {
    const { service, plugin, registrations } = createService({
      toolDescription: "自定义日程工具描述",
    });

    service.registerTool(plugin);

    const tool = registrations[0].options.createTool() as {
      description: string;
      name: string;
    };

    expect(registrations[0].name).toBe("daily_schedule");
    expect(tool.name).toBe("daily_schedule");
    expect(tool.description).toBe("自定义日程工具描述");
  });

  it("falls back to default tool description when blank", () => {
    const { service, plugin, registrations } = createService({
      toolDescription: "   ",
    });

    service.registerTool(plugin);

    const tool = registrations[0].options.createTool() as {
      description: string;
    };

    expect(tool.description).toBe(DEFAULT_SCHEDULE_CONFIG.toolDescription);
  });

  it("falls back to default tool name when blank", () => {
    const { service, plugin, registrations } = createService({
      toolName: "   ",
    });

    const registeredName = service.registerTool(plugin);

    const tool = registrations[0].options.createTool() as {
      name: string;
    };

    expect(registeredName).toBe("daily_schedule");
    expect(registrations[0].name).toBe("daily_schedule");
    expect(tool.name).toBe("daily_schedule");
  });
});
