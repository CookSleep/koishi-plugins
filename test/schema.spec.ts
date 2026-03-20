/**
 * 配置 Schema 测试
 * 验证日程、天气与变量默认配置值
 */

import { describe, expect, it } from "vitest";
import {
  DEFAULT_SCHEDULE_CONFIG,
  DEFAULT_VARIABLES_CONFIG,
  DEFAULT_WEATHER_CONFIG,
} from "../src/schema";

describe("schema defaults", () => {
  it("provides expected schedule defaults", () => {
    expect(DEFAULT_SCHEDULE_CONFIG.enabled).toBe(true);
    expect(DEFAULT_SCHEDULE_CONFIG.toolName).toBe("daily_schedule");
    expect(DEFAULT_SCHEDULE_CONFIG.toolDescription).toBe(
      "获取今日日程文本内容。",
    );
  });

  it("provides expected weather defaults", () => {
    expect(DEFAULT_WEATHER_CONFIG.enabled).toBe(false);
    expect(DEFAULT_WEATHER_CONFIG.hourlyRefresh).toBe(false);
    expect(DEFAULT_WEATHER_CONFIG.toolName).toBe("get_weather");
    expect(DEFAULT_WEATHER_CONFIG.toolDescription).toBe(
      "获取当前天气信息，可返回详细文本或当前时段天气。",
    );
  });

  it("provides expected variable defaults", () => {
    expect(DEFAULT_VARIABLES_CONFIG.schedule).toBe("schedule");
    expect(DEFAULT_VARIABLES_CONFIG.currentSchedule).toBe("currentSchedule");
    expect(DEFAULT_VARIABLES_CONFIG.outfit).toBe("outfit");
    expect(DEFAULT_VARIABLES_CONFIG.currentOutfit).toBe("currentOutfit");
    expect(DEFAULT_VARIABLES_CONFIG.weather).toBe("weather");
  });
});
