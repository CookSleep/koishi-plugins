/**
 * 集成注册测试
 * 验证 ChatLuna 变量与工具注册流程
 */

import { describe, expect, it, vi } from "vitest";
import type { Context } from "koishi";
import { DEFAULT_WEATHER_CONFIG } from "../src/schema";
import { registerChatLunaIntegrations } from "../src/integrations/chatluna";
import type { ToolRegistration } from "../src/types";

describe("chatluna integrations", () => {
  it("registers weather variable and custom tool description", () => {
    const providers: string[] = [];
    const registrations: Array<{ name: string; options: ToolRegistration }> =
      [];

    const ctx = {
      chatluna: {
        promptRenderer: {
          registerFunctionProvider: (name: string) => {
            providers.push(name);
            return () => {};
          },
        },
      },
    } as unknown as Context;

    const plugin = {
      registerTool: (name: string, options: ToolRegistration) => {
        registrations.push({ name, options });
      },
    };

    const result = registerChatLunaIntegrations({
      ctx,
      plugin,
      config: {
        schedule: {
          enabled: true,
          model: "",
          personaSource: "none",
          personaChatlunaPreset: "无",
          personaCustomPreset: "",
          timezone: "Asia/Shanghai",
          prompt: "test",
          renderAsImage: false,
          startDelay: 1000,
          registerTool: true,
          toolName: "daily_schedule",
          toolDescription: "获取今日日程文本内容。",
        },
        weather: {
          enabled: true,
          cityName: "上海",
          hourlyRefresh: false,
          registerTool: true,
          toolName: "get_weather",
          toolDescription: "自定义天气工具描述",
        },
        variables: {
          schedule: "schedule",
          currentSchedule: "currentSchedule",
          outfit: "outfit",
          currentOutfit: "currentOutfit",
          weather: "weather",
        },
      } as never,
      scheduleService: {
        registerVariables: vi.fn(() => [
          "schedule",
          "currentSchedule",
          "outfit",
          "currentOutfit",
        ]),
        registerTool: vi.fn(() => "daily_schedule"),
      } as never,
      weatherService: {
        getHourlyWeather: vi.fn(async () => "晴，21°C"),
        getWeatherText: vi.fn(async () => "天气文本"),
      } as never,
      log: () => {},
    });

    const weatherTool = registrations[0].options.createTool() as {
      description: string;
      name: string;
    };

    expect(result.variableNames).toContain("weather");
    expect(result.toolNames).toContain("get_weather");
    expect(providers).toContain("weather");
    expect(registrations[0].name).toBe("get_weather");
    expect(weatherTool.name).toBe("get_weather");
    expect(weatherTool.description).toBe("自定义天气工具描述");
  });

  it("falls back to default weather tool description when blank", () => {
    const registrations: Array<{ name: string; options: ToolRegistration }> =
      [];

    registerChatLunaIntegrations({
      ctx: {
        chatluna: {
          promptRenderer: {
            registerFunctionProvider: vi.fn(() => () => {}),
          },
        },
      } as unknown as Context,
      plugin: {
        registerTool: (name: string, options: ToolRegistration) => {
          registrations.push({ name, options });
        },
      },
      config: {
        schedule: {
          enabled: false,
          model: "",
          personaSource: "none",
          personaChatlunaPreset: "无",
          personaCustomPreset: "",
          timezone: "Asia/Shanghai",
          prompt: "test",
          renderAsImage: false,
          startDelay: 1000,
          registerTool: true,
          toolName: "daily_schedule",
          toolDescription: "获取今日日程文本内容。",
        },
        weather: {
          enabled: true,
          cityName: "上海",
          hourlyRefresh: false,
          registerTool: true,
          toolName: "get_weather",
          toolDescription: "   ",
        },
      } as never,
      scheduleService: {
        registerVariables: vi.fn(() => []),
        registerTool: vi.fn(() => null),
      } as never,
      weatherService: {
        getHourlyWeather: vi.fn(async () => "晴，21°C"),
        getWeatherText: vi.fn(async () => "天气文本"),
        getEffectiveCityName: vi.fn(() => "上海"),
      } as never,
      log: () => {},
    });

    const weatherTool = registrations[0].options.createTool() as {
      description: string;
    };

    expect(weatherTool.description).toBe(
      DEFAULT_WEATHER_CONFIG.toolDescription,
    );
  });

  it("falls back to legacy weather variable when variables are missing", () => {
    const providers: string[] = [];

    registerChatLunaIntegrations({
      ctx: {
        chatluna: {
          promptRenderer: {
            registerFunctionProvider: (name: string) => {
              providers.push(name);
              return () => {};
            },
          },
        },
      } as unknown as Context,
      plugin: {
        registerTool: vi.fn(),
      } as never,
      config: {
        schedule: {
          enabled: false,
          timezone: "Asia/Shanghai",
          prompt: "test",
          renderAsImage: false,
          startDelay: 1000,
          registerTool: true,
          toolName: "daily_schedule",
          toolDescription: "获取今日日程文本内容。",
        },
        weather: {
          enabled: true,
          cityName: "上海",
          hourlyRefresh: false,
          registerTool: false,
          toolName: "get_weather",
          toolDescription: DEFAULT_WEATHER_CONFIG.toolDescription,
          variableName: "legacyWeather",
        },
      } as never,
      scheduleService: {
        registerVariables: vi.fn(() => []),
        registerTool: vi.fn(() => null),
      } as never,
      weatherService: {
        getHourlyWeather: vi.fn(async () => "晴，21°C"),
        getWeatherText: vi.fn(async () => "天气文本"),
        getEffectiveCityName: vi.fn(() => "上海"),
      } as never,
      log: () => {},
    });

    expect(providers).toContain("legacyWeather");
  });
});
