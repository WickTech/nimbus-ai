import { createOpenAI } from "@ai-sdk/openai";

// Provider wrapper. Defaults to OpenAI but works with any OpenAI-compatible
// endpoint (Ollama, Groq, Together) via OPENAI_BASE_URL.
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? "",
  baseURL: process.env.OPENAI_BASE_URL,
});

// `.chat()` pins the Chat Completions API: since provider 5 the bare `openai(model)` calls the Responses API, which
// Ollama, Groq and Together do not serve.
export const chatModel = openai.chat(process.env.OPENAI_MODEL ?? "gpt-4o-mini");

export const SYSTEM_PROMPT =
  "You are Nimbus, a concise and helpful AI assistant. " +
  "Prefer clear, direct answers. Use markdown for code.";
