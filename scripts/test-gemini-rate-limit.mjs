// Standalone test script to find out why Gemini returns 429 (Too Many Requests).
//
// It sends exactly TWO tiny requests to Gemini:
//   Test 1: a plain question, WITHOUT Google Search.
//   Test 2: the same question, WITH Google Search grounding turned on.
//
// For each test it prints the full response (status, headers, body), so we
// can see exactly which quota Google says we hit.
//
// It does not use Supabase and does not change anything.
//
// How to run this file:
//   node --env-file=.env.local scripts/test-gemini-rate-limit.mjs

// Same model as the enrichment script. Can be changed with GEMINI_MODEL in .env.local.
const geminiModel = process.env.GEMINI_MODEL || "gemini-3.8-flash";

// The address of the Gemini API for that model.
const geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/" + geminiModel + ":generateContent";

// Sends one question to Gemini and prints everything that comes back.
// If useGoogleSearch is true, Google Search grounding is turned on.
async function sendTestRequest(testName, useGoogleSearch) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY. Did you forget --env-file=.env.local ?");
  }

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [{ text: "Reply with just the word: hello" }],
      },
    ],
  };

  if (useGoogleSearch) {
    requestBody.tools = [{ google_search: {} }];
  }

  console.log("");
  console.log("==============================");
  console.log(testName);
  console.log("Model: " + geminiModel);
  console.log("Google Search: " + (useGoogleSearch ? "ON" : "OFF"));
  console.log("==============================");

  const response = await fetch(geminiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  console.log("HTTP status: " + response.status + " " + response.statusText);

  // Retry-After tells us how long Google wants us to wait (if it sends it).
  const retryAfter = response.headers.get("retry-after");

  if (retryAfter) {
    console.log("Retry-After header: " + retryAfter);
  }

  // Read the body as text first, so we can print it even if it's not JSON.
  const bodyText = await response.text();

  let bodyData = null;

  try {
    bodyData = JSON.parse(bodyText);
  } catch (error) {
    console.log("Body (not JSON):");
    console.log(bodyText);
    return;
  }

  if (response.ok) {
    const answerText = bodyData?.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log("SUCCESS. Gemini answered: " + answerText);
    return;
  }

  // For errors, print the whole body. For 429 errors, Google puts the exact
  // quota name (quotaMetric / quotaId) inside error.details.
  console.log("ERROR body:");
  console.log(JSON.stringify(bodyData, null, 2));
}

// Runs the two tests one after the other.
async function main() {
  await sendTestRequest("Test 1: plain request (no Google Search)", false);
  await sendTestRequest("Test 2: request WITH Google Search grounding", true);
}

main().catch((error) => {
  console.log("");
  console.log("Something went wrong:");
  console.log(error.message || error);

  // "fetch failed" hides the real network reason inside error.cause.
  if (error.cause) {
    console.log("Cause:", error.cause);
  }

  process.exitCode = 1;
});
