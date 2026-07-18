"use strict";

/**
 * aiBookingService — wraps the Groq API for fast AI responses.
 *
 * Builds a structured system prompt that injects business context and today's
 * date/time in the business's timezone, then sends the full conversation
 * history to Groq and parses the model's JSON response.
 *
 * Environment variables:
 *   GROQ_API_KEY     required
 *   GROQ_MODEL       default: llama3-70b-8192
 */

const GROQ_API_KEY = () => process.env.GROQ_API_KEY;
const GROQ_MODEL = () => process.env.GROQ_MODEL || "llama3-70b-8192";

// ─── Response schema constants ────────────────────────────────────────────────

const VALID_INTENTS = [
  "greeting",
  "collecting_info",
  "check_availability",
  "propose_slots",
  "confirm_booking",
  "clarify",
  "error",
];

const FALLBACK_RESPONSE = {
  intent: "clarify",
  message:
    "I didn't quite catch that — could you rephrase? For example: \"I'd like a haircut next Friday afternoon\".",
  extracted: {
    service: null,
    date: null,
    timePreference: null,
    staffPreference: null,
    customerName: null,
    customerEmail: null,
  },
  proposedSlots: null,
  readyToBook: false,
};

const UNAVAILABLE_RESPONSE = {
  intent: "error",
  message:
    "Our booking assistant is temporarily unavailable. Please call us directly to make an appointment.",
  extracted: {
    service: null,
    date: null,
    timePreference: null,
    staffPreference: null,
    customerName: null,
    customerEmail: null,
  },
  proposedSlots: null,
  readyToBook: false,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Format opening hours array into a human-readable string for the system prompt.
 * @param {Array} openingHours
 * @returns {string}
 */
function formatOpeningHours(openingHours) {
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return openingHours
    .sort((a, b) => a.day - b.day)
    .map((h) => {
      if (!h.isOpen) return `${dayNames[h.day]}: Closed`;
      return `${dayNames[h.day]}: ${h.openTime} – ${h.closeTime}`;
    })
    .join("\n");
}

/**
 * Get the current date and time string in an IANA timezone.
 * @param {string} timezone
 * @returns {{ dateStr: string, timeStr: string, dayName: string }}
 */
function getNowInTimezone(timezone) {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "long",
    hour12: false,
  });

  const parts = Object.fromEntries(formatter.formatToParts(now).map((p) => [p.type, p.value]));

  const dateStr = `${parts.year}-${parts.month}-${parts.day}`;
  const timeStr = `${parts.hour}:${parts.minute}`;
  const dayName = parts.weekday;

  return { dateStr, timeStr, dayName };
}

/**
 * Build the system prompt for the booking assistant.
 * @param {object} businessContext
 * @returns {string}
 */
function buildSystemPrompt(businessContext) {
  const { name, services, staff, openingHours, timezone } = businessContext;
  const { dateStr, timeStr, dayName } = getNowInTimezone(timezone || "UTC");

  const serviceList = services.length
    ? services.filter(s => s.active !== false)
        .map((s) => {
          let line = `- ${s.name} (${s.durationMinutes} min)`;
          if (s.price != null) line += ` — $${s.price}`;
          return line;
        })
        .join("\n")
    : "- No services configured yet.";

  const staffList = staff.length
    ? staff.map((s) => `- ${s.name}`).join("\n")
    : "- Any available staff member";

  const hasMultipleStaff = staff.length > 1;

  const hoursBlock = formatOpeningHours(openingHours);

  return `You are the AI booking assistant for "${name}".
Your job is to help customers book appointments through a friendly, conversational interface.

CURRENT DATE & TIME (business timezone: ${timezone}):
Today is ${dayName}, ${dateStr}. Current time: ${timeStr}.
Use this to resolve relative dates like "tomorrow", "next Friday", "this weekend", etc.
Always resolve dates to a specific YYYY-MM-DD string.

AVAILABLE SERVICES:
${serviceList}

STAFF:
${staffList}

OPENING HOURS (${timezone}):
${hoursBlock}

RULES:
1. READ THE ENTIRE CONVERSATION HISTORY before responding. Extract information from ALL previous messages, not just the latest one. If the customer already said "next Friday afternoon" in an earlier message, you MUST extract date="2025-XX-XX" and timePreference="afternoon" — do NOT ask for these again.

2. Only offer services and staff that are listed above. If a customer requests a service not in the list, politely explain what IS available and ask them to choose one.

3. Ask for missing information ONE QUESTION AT A TIME. Before asking for anything, check if it was already mentioned in the conversation history. If the customer provides service, date, AND time in a single message, extract all three and move directly to asking for their name — do NOT ask for date or time again.

4. ${hasMultipleStaff ? "Staff preference is OPTIONAL. Only ask about staff preference if the customer specifically mentions wanting a particular person, or if they seem to be a returning customer who might have a preference. Otherwise, default to 'any available staff' (null)." : "There is only one staff member, so staff preference is not needed — always set staffPreference to null."}

5. Once you have all required info (service, date, time slot chosen by customer, name, email), set readyToBook to true.

6. Be warm, concise, and professional. Never make up availability — availability is checked server-side.

7. When proposing slots, list them clearly in the message and also populate the proposedSlots array.

CRITICAL — RESPONSE FORMAT:
You MUST respond with ONLY a valid JSON object. Do NOT include any text before or after the JSON. Do NOT use markdown code fences. The JSON must exactly match this schema:

{
  "intent": "<one of: greeting | collecting_info | check_availability | propose_slots | confirm_booking | clarify | error>",
  "message": "<the natural language message to show the customer>",
  "extracted": {
    "service": "<service name exactly as listed above, or null>",
    "date": "<YYYY-MM-DD or null>",
    "timePreference": "<specific HH:mm like 14:30, or a preference like 'morning'/'afternoon', or null>",
    "staffPreference": "<staff name or null>",
    "customerName": "<full name or null>",
    "customerEmail": "<email address or null>"
  },
  "proposedSlots": ["HH:mm", ...] or null,
  "readyToBook": false
}

Set readyToBook to true ONLY when ALL of the following are non-null: service, date, timePreference (a specific HH:mm chosen by the customer), customerName, customerEmail.
`;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Call the Groq API and return a parsed structured response.
 *
 * @param {object} params
 * @param {Array<{role: string, content: string}>} params.messages - Full conversation history
 * @param {object} params.businessContext - Public business info (name, services, staff, openingHours, timezone)
 * @returns {Promise<object>} Parsed AI response matching the booking response schema
 */
async function getAIResponse({ messages, businessContext }) {
  const systemPrompt = buildSystemPrompt(businessContext);

  const groqMessages = [{ role: "system", content: systemPrompt }, ...messages];

  console.log("[aiBookingService] === GROQ API CALL START ===");
  console.log("[aiBookingService] Messages sent to Groq:", JSON.stringify(groqMessages, null, 2));
  console.log("[aiBookingService] Business context:", JSON.stringify(businessContext, null, 2));

  let rawResponse;
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY()}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL(),
        messages: groqMessages,
        temperature: 0.7,
        max_tokens: 1024,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      console.error(`[aiBookingService] Groq returned HTTP ${response.status}`);
      const errorText = await response.text();
      console.error("[aiBookingService] Error response:", errorText);
      return UNAVAILABLE_RESPONSE;
    }

    const data = await response.json();
    rawResponse = data?.choices?.[0]?.message?.content || "";
    console.log("[aiBookingService] Raw Groq response:", rawResponse);
  } catch (err) {
    console.error(`[aiBookingService] Failed to reach Groq:`, err.message);
    console.error("[aiBookingService] Full error details:", {
      code: err?.code,
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
    });
    return UNAVAILABLE_RESPONSE;
  }

  // ── Parse the model's JSON output ─────────────────────────────────────────
  let parsed;
  try {
    // Strip markdown code fences in case the model wraps output despite instructions
    const cleaned = rawResponse
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();

    parsed = JSON.parse(cleaned);
  } catch (parseErr) {
    console.error("[aiBookingService] Failed to parse LLM JSON:", rawResponse);
    return { ...FALLBACK_RESPONSE };
  }

  // ── Validate and sanitize the parsed object ────────────────────────────────
  const intent = VALID_INTENTS.includes(parsed.intent) ? parsed.intent : "clarify";
  const message =
    typeof parsed.message === "string" && parsed.message.trim()
      ? parsed.message
      : FALLBACK_RESPONSE.message;

  const extracted = {
    service: parsed.extracted?.service || null,
    date: parsed.extracted?.date || null,
    timePreference: parsed.extracted?.timePreference || null,
    staffPreference: parsed.extracted?.staffPreference || null,
    customerName: parsed.extracted?.customerName || null,
    customerEmail: parsed.extracted?.customerEmail || null,
  };

  const proposedSlots =
    Array.isArray(parsed.proposedSlots) && parsed.proposedSlots.length
      ? parsed.proposedSlots.filter((s) => typeof s === "string")
      : null;

  const readyToBook = Boolean(
    extracted.service &&
    extracted.date &&
    extracted.timePreference &&
    // Treat only specific HH:mm times (not "morning"/"afternoon") as ready
    /^\d{2}:\d{2}$/.test(extracted.timePreference) &&
    extracted.customerName &&
    extracted.customerEmail,
  );

  return { intent, message, extracted, proposedSlots, readyToBook };
}

module.exports = { getAIResponse };
