/**
 * XML temp-runtime
 * 通过 getTemp 与 completionMessages.push 监听模型回复
 */

import type { Session } from "koishi";
import type { LogFn } from "../../types";

interface MessageLike {
  _getType?: () => string;
  type?: string;
  role?: string;
  content?: unknown;
  text?: string;
}

interface CompletionMessagesArray extends Array<unknown> {
  push: (...items: unknown[]) => number;
}

interface GroupTempLike {
  completionMessages?: CompletionMessagesArray;
}

interface CharacterServiceLike {
  getTemp?: (...args: unknown[]) => Promise<GroupTempLike>;
}

interface Dispatcher {
  messages: CompletionMessagesArray;
  originalPush: CompletionMessagesArray["push"];
  patchedPush: CompletionMessagesArray["push"];
  listeners: Set<(message: MessageLike) => void>;
  processedMessages: WeakSet<object>;
}

interface AttachedDispatcherListener {
  ref: WeakRef<Dispatcher>;
  listener: (message: MessageLike) => void;
}

export interface XmlRuntimeContext {
  response: string;
  session: Session | null;
}

export interface CharacterTempXmlRuntime {
  start: () => boolean;
  stop: () => void;
  isActive: () => boolean;
}

export interface CharacterTempXmlRuntimeParams {
  getCharacterService: () => CharacterServiceLike | null | undefined;
  processModelResponse: (context: XmlRuntimeContext) => Promise<boolean>;
  log?: LogFn;
}

const GET_TEMP_TAG = Symbol.for("chatlunaToolboxXmlGetTempRuntime");
const GET_TEMP_ORIGINAL = Symbol.for("chatlunaToolboxXmlOriginalGetTemp");
const GET_TEMP_LISTENERS = Symbol.for("chatlunaToolboxXmlGetTempListeners");
const PUSH_DISPATCHER = Symbol.for("chatlunaToolboxXmlPushDispatcher");

function getMessageType(message: MessageLike | null | undefined): string {
  if (!message) return "";
  if (typeof message._getType === "function") {
    return String(message._getType() || "")
      .trim()
      .toLowerCase();
  }
  return String(message.type || message.role || "")
    .trim()
    .toLowerCase();
}

function isAssistantMessage(message: MessageLike | null | undefined): boolean {
  const type = getMessageType(message);
  return type === "ai" || type === "assistant";
}

function extractText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  if (Array.isArray(value)) {
    return value.map((item) => extractText(item)).join("");
  }
  if (typeof value !== "object") return "";

  const record = value as Record<string, unknown>;
  if (typeof record.text === "string") return record.text;
  if (record.content !== undefined && record.content !== value) {
    return extractText(record.content);
  }
  if (Array.isArray(record.children)) return extractText(record.children);
  if (typeof record.attrs === "object" && record.attrs) {
    const attrs = record.attrs as Record<string, unknown>;
    if (typeof attrs.content === "string") return attrs.content;
    if (typeof attrs.text === "string") return attrs.text;
  }
  return "";
}

function getResponseText(message: MessageLike | null | undefined): string {
  if (!isAssistantMessage(message)) return "";
  return extractText(message?.content ?? message?.text).trim();
}

function getDispatcher(messages: CompletionMessagesArray): Dispatcher | null {
  return ((messages as unknown as Record<symbol, unknown>)[PUSH_DISPATCHER] ??
    null) as Dispatcher | null;
}

function setDispatcher(
  messages: CompletionMessagesArray,
  dispatcher: Dispatcher | null,
): void {
  const record = messages as unknown as Record<symbol, unknown>;
  if (!dispatcher) {
    delete record[PUSH_DISPATCHER];
    return;
  }
  Object.defineProperty(record, PUSH_DISPATCHER, {
    value: dispatcher,
    configurable: true,
    enumerable: false,
    writable: true,
  });
}

function attachDispatcher(
  messages: CompletionMessagesArray,
  log?: LogFn,
): Dispatcher {
  const existing = getDispatcher(messages);
  if (existing) return existing;

  const listeners = new Set<(message: MessageLike) => void>();
  const processedMessages = new WeakSet<object>();
  const originalPush = messages.push;

  const patchedPush: CompletionMessagesArray["push"] = function patchedPush(
    this: CompletionMessagesArray,
    ...items: unknown[]
  ): number {
    const result = originalPush.apply(this, items);
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const message = item as MessageLike;
      if (!isAssistantMessage(message)) continue;
      if (processedMessages.has(item)) continue;
      const response = getResponseText(message);
      if (!response) continue;
      processedMessages.add(item);
      for (const listener of Array.from(listeners)) {
        try {
          listener(message);
        } catch (error) {
          log?.("warn", "处理 XML completionMessages 监听器失败", error);
        }
      }
    }
    return result;
  };

  const dispatcher: Dispatcher = {
    messages,
    originalPush,
    patchedPush,
    listeners,
    processedMessages,
  };
  messages.push = patchedPush;
  setDispatcher(messages, dispatcher);
  return dispatcher;
}

function restoreDispatcher(dispatcher: Dispatcher): void {
  if (dispatcher.messages.push === dispatcher.patchedPush) {
    dispatcher.messages.push = dispatcher.originalPush;
  }
  setDispatcher(dispatcher.messages, null);
}

function registerGetTempListener(
  service: CharacterServiceLike,
  listener: (temp: GroupTempLike, session: Session | null) => void,
): (() => void) | null {
  const getTemp = service.getTemp;
  if (typeof getTemp !== "function") return null;

  const serviceRecord = service as unknown as Record<symbol, unknown>;
  let listeners = serviceRecord[GET_TEMP_LISTENERS] as
    | Set<(temp: GroupTempLike, session: Session | null) => void>
    | undefined;

  if (!listeners) {
    listeners = new Set();
    serviceRecord[GET_TEMP_LISTENERS] = listeners;
  }

  if (!(serviceRecord[GET_TEMP_TAG] as boolean)) {
    Object.defineProperty(serviceRecord, GET_TEMP_ORIGINAL, {
      value: getTemp,
      configurable: true,
      enumerable: false,
      writable: true,
    });

    service.getTemp = async (...args: unknown[]) => {
      const originalGetTemp = serviceRecord[
        GET_TEMP_ORIGINAL
      ] as CharacterServiceLike["getTemp"];
      const temp = (await originalGetTemp?.apply(
        service,
        args,
      )) as GroupTempLike;
      const activeListeners = serviceRecord[GET_TEMP_LISTENERS] as
        | Set<(temp: GroupTempLike, session: Session | null) => void>
        | undefined;
      const session =
        args[0] && typeof args[0] === "object" ? (args[0] as Session) : null;
      if (temp && activeListeners?.size) {
        for (const handler of Array.from(activeListeners)) {
          handler(temp, session);
        }
      }
      return temp;
    };
    serviceRecord[GET_TEMP_TAG] = true;
  }

  listeners.add(listener);

  return () => {
    const currentListeners = serviceRecord[GET_TEMP_LISTENERS] as
      | Set<(temp: GroupTempLike, session: Session | null) => void>
      | undefined;
    currentListeners?.delete(listener);
    if (currentListeners?.size) return;

    const originalGetTemp = serviceRecord[GET_TEMP_ORIGINAL] as
      | CharacterServiceLike["getTemp"]
      | undefined;
    if (originalGetTemp) service.getTemp = originalGetTemp;
    delete serviceRecord[GET_TEMP_ORIGINAL];
    delete serviceRecord[GET_TEMP_TAG];
    delete serviceRecord[GET_TEMP_LISTENERS];
  };
}

export function createCharacterTempXmlRuntime(
  params: CharacterTempXmlRuntimeParams,
): CharacterTempXmlRuntime {
  const { getCharacterService, processModelResponse, log } = params;
  let attachedDispatchers: AttachedDispatcherListener[] = [];
  let stopListening: (() => void) | null = null;

  const compactAttachedDispatchers = (): void => {
    attachedDispatchers = attachedDispatchers.filter((entry) =>
      Boolean(entry.ref.deref()),
    );
  };

  const hasAttachedListener = (dispatcher: Dispatcher): boolean => {
    compactAttachedDispatchers();
    return attachedDispatchers.some(
      (entry) => entry.ref.deref() === dispatcher,
    );
  };

  const detachDispatcherListener = (
    entry: AttachedDispatcherListener,
  ): void => {
    const dispatcher = entry.ref.deref();
    if (!dispatcher) return;
    dispatcher.listeners.delete(entry.listener);
    if (dispatcher.listeners.size === 0) restoreDispatcher(dispatcher);
  };

  const handleTemp = (temp: GroupTempLike, session: Session | null): void => {
    const messages = temp.completionMessages;
    if (!Array.isArray(messages) || typeof messages.push !== "function") return;
    const dispatcher = attachDispatcher(messages, log);
    if (hasAttachedListener(dispatcher)) return;

    const listener = (message: MessageLike): void => {
      const response = getResponseText(message);
      if (!response) return;
      void processModelResponse({ response, session }).catch((error) => {
        log?.("warn", "处理 XML 模型响应失败", error);
      });
    };

    dispatcher.listeners.add(listener);
    attachedDispatchers.push({ ref: new WeakRef(dispatcher), listener });
  };

  return {
    start: (): boolean => {
      if (stopListening) return true;
      const service = getCharacterService();
      if (!service) return false;
      const detach = registerGetTempListener(service, handleTemp);
      if (!detach) return false;
      stopListening = () => {
        compactAttachedDispatchers();
        for (const entry of attachedDispatchers) {
          detachDispatcherListener(entry);
        }
        attachedDispatchers = [];
        detach();
        stopListening = null;
      };
      return true;
    },
    stop: (): void => {
      stopListening?.();
    },
    isActive: (): boolean => Boolean(stopListening),
  };
}
