const r = await fetch("http://localhost:5000/api/book/6a38486196d380d96348f1cf/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    messages: [{ role: "user", content: "I would like a haircut this Friday" }],
    extracted: {},
  }),
});
const d = await r.json();
console.log("Status:", r.status);
console.log(JSON.stringify(d, null, 2));
