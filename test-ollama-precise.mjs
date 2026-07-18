// Reproduce exactly what getAIResponse does
const BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
console.log("BASE_URL:", BASE_URL);
console.log("OLLAMA_BASE_URL from env:", process.env.OLLAMA_BASE_URL || "(not set)");

try {
  const response = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3.1",
      messages: [{ role: "user", content: "Say hello" }],
      stream: false,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  console.log("Status:", response.status);
  const data = await response.json();
  console.log("Response:", data?.message?.content?.substring(0, 100));
} catch (err) {
  const code = err?.cause?.code || err?.code || err?.name;
  console.error("Error code:", code);
  console.error("Error message:", err.message);
  console.error("Full error:", err);
  console.error("Cause:", err?.cause);
}
