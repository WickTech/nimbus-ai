import type { LangfuseSpanProcessor } from "@langfuse/otel";
import { propagateAttributes } from "@langfuse/tracing";

/**
 * Langfuse LLM observability over OpenTelemetry.
 *
 * Off unless LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY are set, so local dev
 * and CI need no Langfuse account. When on, every `streamText` call that
 * passes `chatTelemetry(...)` becomes a Langfuse trace with the prompt,
 * completion, token usage, latency, model, user and conversation.
 *
 * The processor lives on globalThis: Next.js bundles instrumentation.ts and
 * route handlers separately, so a module-level variable would give the route
 * a different (never-registered) instance to flush.
 */

const g = globalThis as typeof globalThis & {
  __nimbusLangfuse?: LangfuseSpanProcessor;
};

export function telemetryEnabled(): boolean {
  return Boolean(process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY);
}

/** Register the global tracer provider. Called once from instrumentation.ts. */
export async function initTelemetry(): Promise<void> {
  if (!telemetryEnabled() || g.__nimbusLangfuse) return;

  const [{ LangfuseSpanProcessor }, { NodeTracerProvider }, { registerTelemetry }, { OpenTelemetry }] =
    await Promise.all([
      import("@langfuse/otel"),
      import("@opentelemetry/sdk-trace-node"),
      import("ai"),
      import("@ai-sdk/otel"),
    ]);

  // Credentials + LANGFUSE_BASE_URL are read from env by the processor itself.
  const processor = new LangfuseSpanProcessor({
    environment: process.env.LANGFUSE_TRACING_ENVIRONMENT ?? process.env.NODE_ENV,
    // Serverless instances can freeze right after the response; export each
    // span as it ends rather than waiting for a batch that may never flush.
    exportMode: process.env.VERCEL ? "immediate" : "batched",
  });

  new NodeTracerProvider({ spanProcessors: [processor] }).register();
  // AI SDK 7 no longer emits OpenTelemetry spans by itself: this integration turns every streamText call into spans.
  registerTelemetry(new OpenTelemetry());
  g.__nimbusLangfuse = processor;
}

/** Flush pending spans; schedule with `after()` so it never delays the response. */
export async function flushTelemetry(): Promise<void> {
  try {
    await g.__nimbusLangfuse?.forceFlush();
  } catch (err) {
    // Observability must never break chat.
    console.error("[telemetry] Langfuse flush failed:", err);
  }
}

/**
 * `telemetry` settings for the AI SDK (v7). Per-call user, session and tags are not part of these settings any more:
 * attach them with `withTraceAttributes`, which Langfuse maps onto its per-user cost and per-conversation session views.
 */
export function chatTelemetry() {
  // LANGFUSE_RECORD_IO=false keeps message content out of Langfuse (only
  // metadata, usage and timings are sent) for privacy-sensitive deployments.
  const recordIO = process.env.LANGFUSE_RECORD_IO !== "false";
  return {
    isEnabled: telemetryEnabled(),
    functionId: "chat",
    recordInputs: recordIO,
    recordOutputs: recordIO,
  };
}

/** Run `fn` (the `streamText` call) with Langfuse user, session and tag attributes on every span it creates. */
export function withTraceAttributes<T>(opts: { userId: string; conversationId?: string }, fn: () => T): T {
  if (!telemetryEnabled()) return fn();
  return propagateAttributes(
    { userId: opts.userId, ...(opts.conversationId ? { sessionId: opts.conversationId } : {}), tags: ["chat"] },
    fn,
  );
}
