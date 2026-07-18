"use strict";

const API = "http://localhost:5000/api";
const BIZ_ID = "6a38486196d380d96348f1cf";

let extracted = {};
let messages = [];
let history = [];

async function chat(text) {
  const userMsg = { role: "user", content: text };
  history.push(userMsg);
  messages.push({ role: "user", text });

  console.log(`\n>>> ${text}`);

  const resp = await fetch(`${API}/book/${BIZ_ID}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: history, extracted }),
  });
  const data = await resp.json();
  const ai = data.response;

  console.log(`<<< [${ai.intent}] ${ai.message}`);
  if (ai.extracted) {
    console.log(`    extracted:`, JSON.stringify(ai.extracted));
  }
  if (ai.proposedSlots) {
    console.log(`    proposedSlots:`, ai.proposedSlots);
  }
  console.log(`    readyToBook: ${ai.readyToBook}`);

  // Merge extracted
  extracted = {
    service: ai.extracted.service || extracted.service,
    date: ai.extracted.date || extracted.date,
    timePreference: ai.extracted.timePreference || extracted.timePreference,
    staffPreference: ai.extracted.staffPreference || extracted.staffPreference,
    customerName: ai.extracted.customerName || extracted.customerName,
    customerEmail: ai.extracted.customerEmail || extracted.customerEmail,
  };

  // Push assistant message to history for next turn
  const assistantMsg = { role: "assistant", content: ai.message };
  history.push(assistantMsg);
  messages.push({ role: "assistant", text: ai.message });

  return ai;
}

async function confirm() {
  console.log(`\n--- CONFIRMING ---`);
  const resp = await fetch(`${API}/book/${BIZ_ID}/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerName: extracted.customerName,
      customerEmail: extracted.customerEmail,
      service: extracted.service,
      date: extracted.date,
      time: extracted.timePreference,
      staffPreference: extracted.staffPreference,
    }),
  });
  const data = await resp.json();
  console.log(`Confirm status: ${resp.status}`);
  console.log(JSON.stringify(data, null, 2));
  return data;
}

(async () => {
  console.log("=== BOOKING CONVERSATION TEST ===\n");

  // Step 1: Initial greeting + service request
  let ai = await chat("Hi! I'd like a haircut this Friday afternoon");
  if (ai.intent === "error") {
    console.log("\n✗ Ollama unavailable, aborting test.");
    process.exit(1);
  }
  console.log(`\n--- Turn 1 complete ---`);

  // Step 2: Pick a specific time
  // The AI should have proposed slots. Pick "2pm" (14:00).
  ai = await chat("2pm works for me");
  console.log(`\n--- Turn 2 complete ---`);

  // Step 3: Provide name
  ai = await chat("My name is Jane Doe");
  console.log(`\n--- Turn 3 complete ---`);

  // Step 4: Provide email
  ai = await chat("jane@example.com");
  console.log(`\n--- Turn 4 complete ---`);

  console.log("\n=== FINAL EXTRACTED STATE ===");
  console.log(JSON.stringify(extracted, null, 2));
  console.log(
    `\n=== readyToBook: ${extracted.service && extracted.date && /^\d{2}:\d{2}$/.test(extracted.timePreference || "") && extracted.customerName && extracted.customerEmail}`,
  );

  // If ready to book, confirm
  if (
    extracted.service &&
    extracted.date &&
    /^\d{2}:\d{2}$/.test(extracted.timePreference || "") &&
    extracted.customerName &&
    extracted.customerEmail
  ) {
    await confirm();
  }

  console.log("\n=== TEST COMPLETE ===");
})();
