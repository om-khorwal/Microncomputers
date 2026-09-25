// Standalone test script: web search first, then Gemini.
//
// Our free Gemini account cannot use Gemini's built-in Google Search, so
// this script splits the job in two:
//   - Tavily (a free search API) does the web search.
//   - Gemini (no search tools) reads those search results and turns them
//     into clean product details.
//
// This file is completely separate from the main app:
// - it does not change anything in app/, lib/, or components/
// - it does not save anything to Supabase
//
// What this script does, step by step:
//   1. Connect to Supabase and grab one real product.
//   2. Search the web with Tavily for that exact model number.
//   3. Throw away any search result that does not mention the model number.
//   4. Send the remaining results to Gemini and ask for JSON.
//   5. Remove any URL from Gemini's answer that was not in our search results
//      (so Gemini cannot invent links).
//   6. Print everything as clean JSON.
//
// Before running, add these to .env.local:
//   TAVILY_API_KEY=tvly-...     (free key from https://app.tavily.com)
//   GEMINI_API_KEY=...          (already there)
//
// How to run this file:
//   node --env-file=.env --env-file=.env.local scripts/test-search-then-gemini-enrichment.mjs
//
// Optional: test a specific product instead of the first one:
//   node --env-file=.env --env-file=.env.local scripts/test-search-then-gemini-enrichment.mjs "MODEL-NUMBER"

import { createClient } from "@supabase/supabase-js";

// Which Gemini model to use. Can be changed with GEMINI_MODEL in .env.local.
const geminiModel = process.env.GEMINI_MODEL || "gemini-3.8-flash";

// The address of the Gemini API for that model.
const geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/" + geminiModel + ":generateContent";

// The address of the Tavily search API.
const tavilyUrl = "https://api.tavily.com/search";

// How much text to keep from each web page, so the Gemini prompt stays small.
const maxTextPerPage = 4000;

// Step 1: Pick one real product from our Supabase products table.
// If a model number was typed after the script name, use that product.
async function getOneProductFromSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Did you forget --env-file=.env ?");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  let query = supabase.from("products").select("model_number, name, brand");

  // process.argv[2] is the first thing typed after the script name.
  const modelNumberFromCommandLine = process.argv[2];

  if (modelNumberFromCommandLine) {
    query = query.eq("model_number", modelNumberFromCommandLine);
  }

  query = query.limit(1);

  const { data, error } = await query;

  if (error) {
    throw new Error("Could not read a product from Supabase: " + error.message);
  }

  if (!data || data.length === 0) {
    throw new Error("No matching product found in Supabase.");
  }

  return data[0];
}

// Step 2: Run one Tavily web search and return its results.
async function searchWithTavily(searchText) {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    throw new Error("Missing TAVILY_API_KEY in .env.local. Get a free key at https://app.tavily.com");
  }

  const requestBody = {
    query: searchText,
    // "basic" costs 1 free credit per search.
    search_depth: "basic",
    max_results: 8,
    // Prefer results from India, so prices are in INR.
    country: "india",
    // Also give us the text of each page, not just a short snippet.
    include_raw_content: "text",
    include_images: true,
  };

  const response = await fetch(tavilyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error("Tavily returned an error (HTTP " + response.status + "): " + JSON.stringify(responseData, null, 2));
  }

  return responseData;
}

// Makes text easy to compare: lowercase, and only letters and numbers.
// Example: "14-fb0089TX" becomes "14fb0089tx".
function simplifyText(text) {
  if (!text) {
    return "";
  }

  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Step 3: Keep only search results that really mention our model number.
// This is a plain code check, so it does not depend on Gemini being careful.
function keepMatchingResults(searchResults, modelNumber) {
  const simpleModelNumber = simplifyText(modelNumber);
  const matchingResults = [];

  for (const result of searchResults) {
    const allText = result.title + " " + result.url + " " + result.content + " " + result.raw_content;

    if (simplifyText(allText).includes(simpleModelNumber)) {
      matchingResults.push(result);
    }
  }

  return matchingResults;
}

// Step 4a: Write the instructions for Gemini, including the search results.
function buildPrompt(product, searchResults, imageUrls) {
  const lines = [
    "You are helping a computer shop in India fill in product details.",
    "",
    "Product we are looking for:",
    "Model number: " + product.model_number,
    "Product name: " + product.name,
    "",
    "Below are web pages found by a web search. Use ONLY these pages.",
    "",
  ];

  let pageNumber = 1;

  for (const result of searchResults) {
    // Use the full page text if we have it, otherwise the short snippet.
    let pageText = result.raw_content;

    if (!pageText) {
      pageText = result.content;
    }

    lines.push("--- PAGE " + pageNumber + " ---");
    lines.push("Title: " + result.title);
    lines.push("URL: " + result.url);
    lines.push("Text:");
    lines.push(pageText.slice(0, maxTextPerPage));
    lines.push("");

    pageNumber = pageNumber + 1;
  }

  lines.push("--- IMAGE URLS FROM THE SEARCH ---");

  for (const imageUrl of imageUrls) {
    lines.push(imageUrl);
  }

  lines.push("");
  lines.push("Rules:");
  lines.push("- Only use information about this EXACT model number. Similar models or other variants do not count.");
  lines.push("- Only use facts written in the pages above. Never guess or invent anything. If a value is not in the pages, use null (or an empty list).");
  lines.push("- Prices must be in INR and must come from a page above. Use that page's URL as product_url.");
  lines.push("- Only pick image URLs from the image list above, and only if they clearly show this product.");
  lines.push("- In source_urls, list the URLs of the pages you actually used.");
  lines.push("- Set model_number_matched to true only if the pages clearly mention this exact model number.");
  lines.push("");
  lines.push("Reply with ONLY a JSON object in exactly this shape:");
  lines.push("{");
  lines.push('  "model_number": "string",');
  lines.push('  "model_number_matched": true or false,');
  lines.push('  "full_product_name": "string or null",');
  lines.push('  "brand": "string or null",');
  lines.push('  "specifications": { "spec name": "spec value" },');
  lines.push('  "image_urls": ["string"],');
  lines.push('  "prices": [');
  lines.push('    { "store_name": "string", "price_inr": number, "product_url": "string", "in_stock": true or false or null }');
  lines.push("  ],");
  lines.push('  "source_urls": ["string"],');
  lines.push('  "notes": "string or null (anything uncertain, e.g. price not found)"');
  lines.push("}");

  return lines.join("\n");
}

// Step 4b: Call Gemini WITHOUT any search tools. It only reads our prompt.
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
    generationConfig: {
      // Ask Gemini to reply with pure JSON (no markdown around it).
      responseMimeType: "application/json",
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

// Step 4c: Pull Gemini's text answer out of the response and turn it into a
// JavaScript object.
function readJsonAnswer(geminiResponse) {
  const parts = geminiResponse?.candidates?.[0]?.content?.parts || [];

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

  try {
    return JSON.parse(answerText);
  } catch (error) {
    throw new Error("Could not read Gemini's JSON answer:\n" + answerText);
  }
}

// Step 5: Remove any URL Gemini gave us that was not in the search results.
// Returns a list of the URLs that were removed, so we can see them.
function removeInventedUrls(productDetails, pageUrls, imageUrls) {
  const removedUrls = [];

  // Check the price links.
  const checkedPrices = [];

  for (const price of productDetails.prices || []) {
    if (pageUrls.includes(price.product_url)) {
      checkedPrices.push(price);
    } else {
      removedUrls.push(price.product_url);
    }
  }

  productDetails.prices = checkedPrices;

  // Check the source links.
  const checkedSourceUrls = [];

  for (const sourceUrl of productDetails.source_urls || []) {
    if (pageUrls.includes(sourceUrl)) {
      checkedSourceUrls.push(sourceUrl);
    } else {
      removedUrls.push(sourceUrl);
    }
  }

  productDetails.source_urls = checkedSourceUrls;

  // Check the image links.
  const checkedImageUrls = [];

  for (const imageUrl of productDetails.image_urls || []) {
    if (imageUrls.includes(imageUrl)) {
      checkedImageUrls.push(imageUrl);
    } else {
      removedUrls.push(imageUrl);
    }
  }

  productDetails.image_urls = checkedImageUrls;

  return removedUrls;
}

// Runs all the steps above in order.
async function main() {
  console.log("Step 1: Picking a product from Supabase...");
  const product = await getOneProductFromSupabase();
  console.log("Using product:", product.name, "(model number:", product.model_number + ")");

  console.log("");
  console.log("Step 2: Searching the web with Tavily...");
  const searchText = product.model_number + " " + product.name + " specifications price India";
  const searchResponse = await searchWithTavily(searchText);
  const allResults = searchResponse.results || [];
  console.log("Tavily found " + allResults.length + " pages.");

  console.log("");
  console.log("Step 3: Keeping only pages that mention " + product.model_number + "...");
  const matchingResults = keepMatchingResults(allResults, product.model_number);
  console.log(matchingResults.length + " pages mention the exact model number.");

  if (matchingResults.length === 0) {
    console.log("");
    console.log("No page mentions this exact model number, so we stop here instead of guessing.");
    console.log("Pages Tavily found:");

    for (const result of allResults) {
      console.log("- " + result.title + " (" + result.url + ")");
    }

    return;
  }

  // Tavily can send images as plain strings or as { url, description }.
  const imageUrls = [];

  for (const image of searchResponse.images || []) {
    if (typeof image === "string") {
      imageUrls.push(image);
    } else if (image.url) {
      imageUrls.push(image.url);
    }
  }

  const pageUrls = [];

  for (const result of matchingResults) {
    pageUrls.push(result.url);
  }

  console.log("");
  console.log("Step 4: Asking Gemini (" + geminiModel + ") to read the pages... (this can take a little while)");
  const prompt = buildPrompt(product, matchingResults, imageUrls);
  const geminiResponse = await askGemini(prompt);
  const productDetails = readJsonAnswer(geminiResponse);

  console.log("");
  console.log("Step 5: Checking Gemini's links against the search results...");
  const removedUrls = removeInventedUrls(productDetails, pageUrls, imageUrls);
  console.log("Removed " + removedUrls.length + " link(s) that were not in the search results.");

  const result = {
    our_product: product,
    gemini_model: geminiModel,
    search_query: searchText,
    enriched_details: productDetails,
    removed_urls: removedUrls,
    pages_given_to_gemini: pageUrls,
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
