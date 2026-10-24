// A tiny stand-in for the OpenAI API, used by the browser tests: no key, no network, no cost, same answer every time.
// nimbus-ai talks to any OpenAI-compatible server through OPENAI_BASE_URL.
//
// It answers POST /v1/chat/completions with a streamed reply "Echo: <last user message>" and token usage:
//   - 40 tokens normally (1 credit)
//   - 2,500 tokens when the message contains LONGREPLY (3 credits)
//   - an HTTP 500 when the message contains FAIL500 (the app must refund the reserved credit)
import http from "node:http";

const port = Number(process.env.PORT ?? 4010);

function lastUserText(messages) {
  const last = [...messages].reverse().find((m) => m.role === "user");
  if (!last) return "";
  if (typeof last.content === "string") return last.content;
  return last.content.map((part) => part.text ?? "").join("");
}

const chunk = (obj) => `data: ${JSON.stringify(obj)}\n\n`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const server = http.createServer(async (req, res) => {
  if (req.url === "/health") {
    res.writeHead(200).end("ok");
    return;
  }
  if (req.method !== "POST" || req.url !== "/v1/chat/completions") {
    res.writeHead(404).end();
    return;
  }

  let raw = "";
  for await (const part of req) raw += part;
  const payload = JSON.parse(raw);
  const text = lastUserText(payload.messages ?? []);

  if (text.includes("FAIL500")) {
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: { message: "fake upstream failure", type: "server_error" } }));
    return;
  }

  const totalTokens = text.includes("LONGREPLY") ? 2500 : 40;
  const promptTokens = 10;
  const completionTokens = totalTokens - promptTokens;
  const reply = `Echo: ${text}`;
  const base = { id: "chatcmpl-fake", object: "chat.completion.chunk", created: 1_700_000_000, model: "fake-model" };
  const usage = { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: totalTokens };

  if (!payload.stream) {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        ...base,
        object: "chat.completion",
        choices: [{ index: 0, message: { role: "assistant", content: reply }, finish_reason: "stop" }],
        usage,
      }),
    );
    return;
  }

  res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
  res.write(chunk({ ...base, choices: [{ index: 0, delta: { role: "assistant", content: "" }, finish_reason: null }] }));
  for (const word of reply.split(/(?<= )/)) {
    res.write(chunk({ ...base, choices: [{ index: 0, delta: { content: word }, finish_reason: null }] }));
    await sleep(15);
  }
  res.write(chunk({ ...base, choices: [{ index: 0, delta: {}, finish_reason: "stop" }] }));
  res.write(chunk({ ...base, choices: [], usage }));
  res.end("data: [DONE]\n\n");
});

server.listen(port, "127.0.0.1", () => console.log(`fake OpenAI listening on http://127.0.0.1:${port}`));
