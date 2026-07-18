const r = await fetch("http://localhost:11434/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "llama3.1",
    messages: [{ role: "user", content: "Say hello" }],
    stream: false,
  }),
});
console.log("Status:", r.status);
const d = await r.json();
console.log("Response:", d.message?.content?.substring(0, 200));
