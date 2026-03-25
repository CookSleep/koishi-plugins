/**
 * XML 工具注册
 * 组合 temp-runtime 与 XML 处理器
 */

import type { Config, LogFn, OneBotProtocol } from "../../types";
import { createXmlProcessor } from "./processor";
import { createCharacterTempXmlRuntime } from "./temp-runtime";

export interface RegisterXmlToolsDeps {
  ctx: import("koishi").Context;
  config: Config;
  protocol: OneBotProtocol;
  log?: LogFn;
}

export interface XmlToolsRuntime {
  start: () => boolean;
  stop: () => void;
  isActive: () => boolean;
}

export function registerXmlTools(deps: RegisterXmlToolsDeps): XmlToolsRuntime {
  const { ctx, config, protocol, log } = deps;
  const processor = createXmlProcessor({ config, protocol, log });
  const runtime = createCharacterTempXmlRuntime({
    getCharacterService: () =>
      (
        ctx as unknown as {
          chatluna_character?: {
            getTemp?: (
              ...args: unknown[]
            ) => Promise<{ completionMessages?: unknown[] }>;
          };
        }
      ).chatluna_character,
    processModelResponse: processor,
    log,
  });

  return {
    start: () => runtime.start(),
    stop: () => runtime.stop(),
    isActive: () => runtime.isActive(),
  };
}
