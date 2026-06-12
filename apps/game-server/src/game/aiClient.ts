type GenerateArgs = {
  apiKey: string;
  model: string;
  system: string;
  prompt: string;
};

type OpenAiResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

const DEFAULT_MODEL = "gpt-4o-mini";

// OpenAI Chat Completions cagrisi. Secilen mini modeller (gpt-4o-mini / gpt-4.1-mini)
// gorsel girdiyi de destekler; ileride kanit resmi eklemek icin messages.content
// dizisine { type: "image_url", image_url: { url } } parcasi eklenebilir.
export async function generateReply({ apiKey, model, system, prompt }: GenerateArgs): Promise<string> {
  const safeModel = model.trim() || DEFAULT_MODEL;
  const url = "https://api.openai.com/v1/chat/completions";

  const body = {
    model: safeModel,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt }
    ],
    temperature: 0.9,
    max_completion_tokens: 220
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
  } catch (error) {
    clearTimeout(timeout);
    throw new Error(`baglanti hatasi (${(error as Error).message})`);
  }
  clearTimeout(timeout);

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status} ${detail.slice(0, 200)}`);
  }

  const data = (await response.json()) as OpenAiResponse;
  if (data.error?.message) {
    throw new Error(data.error.message.slice(0, 200));
  }

  const text = (data.choices?.[0]?.message?.content || "").trim();
  if (!text) {
    throw new Error("model bos yanit dondurdu");
  }

  return text;
}
