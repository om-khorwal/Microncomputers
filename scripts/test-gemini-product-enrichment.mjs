// Standalone test script for Gemini product enrichment.
//
// This file is completely separate from the main app:
// - it does not change anything in app/, lib/, or components/
// - it does not save anything to Supabase
// - it only reads one product from Supabase and asks Gemini about it
//
// What this script does, step by step:
//   1. Connect to Supabase and grab one real product.
//   2. Build a question for Gemini using the product's model number + name.
//   3. Call Gemini with Google Search turned on, so it looks things up on the
//      web instead of answering from memory.
//   4. Read Gemini's answer as JSON.
//   5. Add the web pages Google Search actually used (so we can double-check).
//   6. Print everything as clean JSON.
//
// How to run this file:
//   node --env-file=.env --env-file=.env.local scripts/test-gemini-product-enrichment.mjs
//
// (Two --env-file flags because our normal Supabase keys live in .env, and
// the Gemini key lives in .env.local.)
//
// Optional: test a specific product instead of the first one:
//   node --env-file=.env --env-file=.env.local scripts/test-gemini-product-enrichment.mjs "MODEL-NUMBER"

import { createClient } from "@supabase/supabase-js";

// Which Gemini model to use. Can be changed with GEMINI_MODEL in .env.local.
const geminiModel = process.env.GEMINI_MODEL || "gemini-3.8-flash";

// The address of the Gemini API for that model.
const geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/" + geminiModel + ":generateContent";

// Step 1: Pick one real product from our Supabase products table.
// If a model number was typed after the script name, use that product.
async function getOneProductFromSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Did you forget --env-file=.env ?");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Model numbers live on product_variants; the name and brand on the family (products).
  let query = supabase.from("product_variants").select("model_number:sku, products(name, brand)");

  // process.argv[2] is the first thing typed after the script name.
  const modelNumberFromCommandLine = process.argv[2];

  if (modelNumberFromCommandLine) {
    query = query.eq("sku_key", modelNumberFromCommandLine.trim().toUpperCase());
  }

  query = query.limit(1);

  const { data, error } = await query;

  if (error) {
    throw new Error("Could not read a product from Supabase: " + error.message);
  }

  if (!data || data.length === 0) {
    throw new Error("No matching product found in Supabase.");
  }

  // Flatten to { model_number, name, brand } like before.
  return { model_number: data[0].model_number, name: data[0].products.name, brand: data[0].products.brand };
}

// Step 2: Write the instructions we send to Gemini.
// We are very strict here, because we only want facts for this exact model.
function buildPrompt(product) {
  const lines = [
    "You are helping a computer shop in India fill in product details.",
    "",
    "Search the web for this exact product:",
    "Model number: " + product.model_number,
    "Product name: " + product.name,
    "",
    "Rules:",
    "- Only use information about this EXACT model number. Similar models or other variants do not count.",
    "- Never guess or invent anything. If you cannot find a value, use null (or an empty list).",
    "- Prices must be current online prices in India, in INR, from real stores (for example Amazon.in, Flipkart, the brand's own Indian store, or well-known Indian computer shops).",
    "- Every price must include the store name and the exact product page URL where you found it.",
    "- Image URLs must be direct links to image files (ending in .jpg, .jpeg, .png or .webp) that show this product.",
    "- List every web page you used in source_urls.",
    "- Set model_number_matched to true only if you found pages that clearly mention this exact model number.",
    "",
    "Reply with ONLY a JSON object (no extra text, no markdown) in exactly this shape:",
    "{",
    '  "model_number": "string",',
    '  "model_number_matched": true or false,',
    '  "full_product_name": "string or null",',
    '  "brand": "string or null",',
    '  "specifications": { "spec name": "spec value" },',
    '  "image_urls": ["string"],',
    '  "prices": [',
    '    { "store_name": "string", "price_inr": number, "product_url": "string", "in_stock": true or false or null }',
    "  ],",
    '  "source_urls": ["string"],',
    '  "notes": "string or null (anything uncertain, e.g. price not found)"',
    "}",
  ];

  return lines.join("\n");
}

// Step 3: Call Gemini with Google Search turned on.
async function askGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY in .env.local.");
  }

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    // This turns on Google Search grounding - Gemini searches the web first.
    tools: [{ google_search: {} }],
    generationConfig: {
      // Low temperature = less "creative", more factual.
      temperature: 0,
    },
  };

  const response = await fetch(geminiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error("Gemini returned an error (HTTP " + response.status + "): " + JSON.stringify(responseData, null, 2));
  }

  return responseData;
}

// Step 4: Pull Gemini's text answer out of the response and turn it into a
// JavaScript object.
function readJsonAnswer(geminiResponse) {
  const candidate = geminiResponse?.candidates?.[0];
  const parts = candidate?.content?.parts || [];

  // Gemini can split its answer into several parts, so join them together.
  let answerText = "";

  for (const part of parts) {
    if (part.text) {
      answerText = answerText + part.text;
    }
  }

  if (!answerText) {
    throw new Error("Gemini sent back an empty answer: " + JSON.stringify(geminiResponse, null, 2));
  }

  // Sometimes the answer is wrapped in ```json ... ``` anyway.
  // Keep only the part between the first "{" and the last "}".
  const firstBrace = answerText.indexOf("{");
  const lastBrace = answerText.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("Gemini's answer did not contain JSON:\n" + answerText);
  }

  const jsonText = answerText.slice(firstBrace, lastBrace + 1);

  try {
    return JSON.parse(jsonText);
  } catch (error) {
    throw new Error("Could not read Gemini's JSON answer:\n" + answerText);
  }
}

// Step 5: Get the list of web pages Google Search really used.
// This comes from Google, not from Gemini's own text, so it's a good way to
// check that the answer is based on real pages.
function readSearchSources(geminiResponse) {
  const groundingMetadata = geminiResponse?.candidates?.[0]?.groundingMetadata;
  const chunks = groundingMetadata?.groundingChunks || [];

  const sources = [];

  for (const chunk of chunks) {
    if (chunk.web) {
      sources.push({
        title: chunk.web.title,
        url: chunk.web.uri,
      });
    }
  }

  return {
    search_queries: groundingMetadata?.webSearchQueries || [],
    pages_used: sources,
  };
}

// Runs all the steps above in order.
async function main() {
  console.log("Step 1: Picking a product from Supabase...");
  const product = await getOneProductFromSupabase();
  console.log("Using product:", product.name, "(model number:", product.model_number + ")");

  console.log("");
  console.log("Step 2 + 3: Asking Gemini (" + geminiModel + ") with Google Search... (this can take a little while)");
  const prompt = buildPrompt(product);
  const geminiResponse = await askGemini(prompt);

  console.log("");
  console.log("Step 4 + 5: Reading the answer...");
  const productDetails = readJsonAnswer(geminiResponse);
  const searchSources = readSearchSources(geminiResponse);

  const result = {
    our_product: product,
    gemini_model: geminiModel,
    enriched_details: productDetails,
    google_search: searchSources,
  };

  console.log("");
  console.log("--- RESULT ---");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.log("");
  console.log("Something went wrong:");
  console.log(error.message || error);
  process.exitCode = 1;
});
