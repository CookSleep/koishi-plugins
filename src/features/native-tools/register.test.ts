/**
 * 原生工具注册测试
 * 覆盖协议选择与嵌套配置注册行为
 */

import { describe, expect, it, vi } from "vitest";
import { registerNativeTools, resolveOneBotProtocol } from "./register";
import type { Config } from "../../types";

function createConfig(overrides: Partial<Config> = {}): Config {
  return {
    enableNapCatProtocol: true,
    enableLlbotProtocol: false,
    poke: { enabled: false, toolName: "poke_user" },
    setSelfProfile: { enabled: false, toolName: "set_self_profile" },
    setGroupCard: { enabled: false, toolName: "set_group_card" },
    setMsgEmoji: { enabled: false, toolName: "set_msg_emoji" },
    deleteMessage: { enabled: false, toolName: "delete_msg" },
    enablePokeXmlTool: false,
    enableEmojiXmlTool: false,
    enableDeleteXmlTool: false,
    referencePrompt: "",
    userInfo: { variableName: "userInfo", items: [] },
    botInfo: { variableName: "botInfo", items: [] },
    groupInfo: { variableName: "groupInfo", items: [] },
    random: { variableName: "random", min: 0, max: 100 },
    debugLogging: false,
    ...overrides,
  };
}

describe("resolveOneBotProtocol", () => {
  it("在 LLBot 开启时优先返回 llbot", () => {
    const config = createConfig({
      enableNapCatProtocol: true,
      enableLlbotProtocol: true,
    });

    expect(resolveOneBotProtocol(config)).toBe("llbot");
  });

  it("在协议都关闭时回退到 napcat", () => {
    const config = createConfig({
      enableNapCatProtocol: false,
      enableLlbotProtocol: false,
    });

    expect(resolveOneBotProtocol(config)).toBe("napcat");
  });
});

describe("registerNativeTools", () => {
  it("按嵌套配置注册启用的原生工具", () => {
    const registerTool = vi.fn();
    const config = createConfig({
      poke: { enabled: true, toolName: "custom_poke" },
      setMsgEmoji: { enabled: true, toolName: "custom_emoji" },
    });

    registerNativeTools({
      ctx: {} as never,
      config,
      plugin: { registerTool },
      protocol: "napcat",
    });

    expect(registerTool).toHaveBeenCalledTimes(2);
    expect(registerTool).toHaveBeenNthCalledWith(
      1,
      "custom_poke",
      expect.objectContaining({
        selector: expect.any(Function),
        authorization: expect.any(Function),
        createTool: expect.any(Function),
      }),
    );
    expect(registerTool).toHaveBeenNthCalledWith(
      2,
      "custom_emoji",
      expect.objectContaining({
        selector: expect.any(Function),
        authorization: expect.any(Function),
        createTool: expect.any(Function),
      }),
    );
  });

  it("在工具名为空白时回退到默认名称", () => {
    const registerTool = vi.fn();
    const config = createConfig({
      poke: { enabled: true, toolName: "   " },
    });

    registerNativeTools({
      ctx: {} as never,
      config,
      plugin: { registerTool },
      protocol: "napcat",
    });

    expect(registerTool).toHaveBeenCalledTimes(1);
    expect(registerTool).toHaveBeenCalledWith(
      "poke_user",
      expect.objectContaining({
        selector: expect.any(Function),
        authorization: expect.any(Function),
        createTool: expect.any(Function),
      }),
    );
  });

  it("忽略未启用的原生工具", () => {
    const registerTool = vi.fn();

    registerNativeTools({
      ctx: {} as never,
      config: createConfig(),
      plugin: { registerTool },
      protocol: "napcat",
    });

    expect(registerTool).not.toHaveBeenCalled();
  });
});
