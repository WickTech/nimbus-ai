// Next.js calls register() once per server instance at startup.
export async function register() {
  // OpenTelemetry's Node SDK can't run on the edge runtime (middleware).
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { initTelemetry } = await import("./lib/telemetry");
  await initTelemetry();
}
