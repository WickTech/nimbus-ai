import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const processors: { opts: unknown; forceFlush: ReturnType<typeof vi.fn> }[] = [];
const registered: unknown[] = [];

vi.mock("@langfuse/otel", () => ({
  LangfuseSpanProcessor: class {
    forceFlush = vi.fn(async () => {});
    constructor(public opts: unknown) {
      processors.push(this);
    }
  },
}));

vi.mock("@opentelemetry/sdk-trace-node", () => ({
  NodeTracerProvider: class {
    constructor(public config: { spanProcessors: unknown[] }) {}
    register() {
      registered.push(this.config.spanProcessors[0]);
    }
  },
}));

const ENV_KEYS = [
  "LANGFUSE_PUBLIC_KEY",
  "LANGFUSE_SECRET_KEY",
  "LANGFUSE_RECORD_IO",
  "LANGFUSE_TRACING_ENVIRONMENT",
  "VERCEL",
] as const;

async function freshModule() {
  vi.resetModules();
  return import("@/lib/telemetry");
}

function enable() {
  process.env.LANGFUSE_PUBLIC_KEY = "pk-lf-test";
  process.env.LANGFUSE_SECRET_KEY = "sk-lf-test";
}

describe("telemetry", () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of ENV_KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
    processors.length = 0;
    registered.length = 0;
    delete (globalThis as { __nimbusLangfuse?: unknown }).__nimbusLangfuse;
  });

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it("is disabled and registers nothing without both keys", async () => {
    process.env.LANGFUSE_PUBLIC_KEY = "pk-only";
    const t = await freshModule();
    expect(t.telemetryEnabled()).toBe(false);
    await t.initTelemetry();
    expect(processors).toHaveLength(0);
    expect(t.chatTelemetry({ userId: "u1" }).isEnabled).toBe(false);
    await expect(t.flushTelemetry()).resolves.toBeUndefined(); // no-op, no throw
  });

  it("registers one provider even if init runs twice", async () => {
    enable();
    const t = await freshModule();
    await t.initTelemetry();
    await t.initTelemetry();
    expect(processors).toHaveLength(1);
    expect(registered).toEqual([processors[0]]);
    expect(processors[0].opts).toMatchObject({ exportMode: "batched" });
  });

  it("exports spans immediately on Vercel", async () => {
    enable();
    process.env.VERCEL = "1";
    process.env.LANGFUSE_TRACING_ENVIRONMENT = "preview";
    const t = await freshModule();
    await t.initTelemetry();
    expect(processors[0].opts).toEqual({ environment: "preview", exportMode: "immediate" });
  });

  it("flushes the registered processor and swallows flush errors", async () => {
    enable();
    const t = await freshModule();
    await t.initTelemetry();
    await t.flushTelemetry();
    expect(processors[0].forceFlush).toHaveBeenCalledTimes(1);

    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    processors[0].forceFlush.mockRejectedValueOnce(new Error("network down"));
    await expect(t.flushTelemetry()).resolves.toBeUndefined();
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("builds AI SDK telemetry settings with Langfuse user/session keys", async () => {
    enable();
    const t = await freshModule();
    expect(t.chatTelemetry({ userId: "u1", conversationId: "c9" })).toEqual({
      isEnabled: true,
      functionId: "chat",
      recordInputs: true,
      recordOutputs: true,
      metadata: { userId: "u1", sessionId: "c9", tags: ["chat"] },
    });
    // New conversation: no session id yet.
    expect(t.chatTelemetry({ userId: "u1" }).metadata).not.toHaveProperty("sessionId");
  });

  it("omits message content when LANGFUSE_RECORD_IO=false", async () => {
    enable();
    process.env.LANGFUSE_RECORD_IO = "false";
    const t = await freshModule();
    const s = t.chatTelemetry({ userId: "u1" });
    expect(s.recordInputs).toBe(false);
    expect(s.recordOutputs).toBe(false);
  });
});
