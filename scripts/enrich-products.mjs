// Product enrichment: looks up each VARIANT (one exact model number / SKU)
// online and fills in the details our Supabase rows are missing.
//
// A laptop family (e.g. "HP Victus 15") is sold in several configurations
// (processor / RAM / storage / graphics). Each configuration is one row in
// product_variants with its own exact model number. This script always works
// on ONE exact variant and never assumes a configuration just because a web
// page is about the same family.
//
// Our free Gemini account cannot use Gemini's built-in Google Search, so
// this script splits the job in two:
//   - Tavily (a free search API) does the web search.
//   - Gemini (no search tools) reads those search results and turns them
//     into clean product details.
//
// This file is separate from the main app: it does not change anything in
// app/, lib/, or components/. It is run by hand from the terminal.
//
// What this script does for each variant, step by step:
//   1. Read the variant (and its family) from Supabase.
//   2. Search the web with Tavily using everything we already know:
//      brand + exact model number + processor + RAM + storage + graphics.
//      If nothing useful comes back, search again with just "brand + model number".
//   3. Keep only pages whose link or title contains the exact model number,
//      and throw away weak sources (Pinterest, YouTube, social media...).
//      Amazon and Flipkart pages go first, then the manufacturer's own site.
//   4. Send the remaining pages to Gemini, together with the configuration we
//      already know, and ask for JSON.
//   5. Double-check Gemini's answer with plain code:
//      - every link must come from our search results
//      - every price must really appear on its page
//   6. Collect product images straight from the matched product pages
//      (not from Gemini), keeping only images that belong to this exact
//      model and really load.
//   7. Decide the status (see "Status rules" below).
//   8. Work out what to save (see "Merge rules" below), print it, and save
//      it to Supabase ONLY if --save was typed.
//
// Status rules:
//   - enriched      the exact configuration is verified:
//                     * if we already knew the configuration, the web agrees with it
//                       (at least 2 of the known fields confirmed, none disagreeing)
//                     * if we did not know it, at least 2 different websites have
//                       this exact model number and the processor, RAM and storage
//                       were all found, with no "8GB or 16GB"-style options
//   - needs_review  the model number was found, but the configuration is
//                   uncertain or disagrees with ours (reasons are saved)
//   - retry_later   no reliable page for this exact model number was found
//
// Merge rules:
//   - price, quantity and sku are NEVER changed (they come from the stock sheet).
//   - A value we already have (configuration or spec) is never overwritten.
//   - Only when the status is "enriched": missing configuration fields and
//     missing specs are filled in, and the variant's photo if it has none.
//   - When the status is "needs_review", nothing is copied into the variant;
//     the findings are only stored in the "enrichment" column for a person to
//     check in the admin panel.
//   - The family's brand and main photo are filled in if they are empty
//     (they are the same for every configuration).
//   - A variant that could not be enriched gets status "retry_later", unless an
//     earlier run already enriched it (then that earlier result is kept).
//
// Before running:
//   - Run supabase/migrations/0004_product_variants.sql once in the Supabase SQL editor.
//   - .env needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
//   - .env.local needs TAVILY_API_KEY and GEMINI_API_KEY.
//
// How to run (always a dry run first - it only prints, nothing is saved):
//   node --env-file=.env --env-file=.env.local scripts/enrich-products.mjs 15-fa2689TX
//
// Same thing, but really save the result to Supabase:
//   node --env-file=.env --env-file=.env.local scripts/enrich-products.mjs 15-fa2689TX --save
//
// Other ways to pick variants:
//   ... scripts/enrich-products.mjs 15-fa2689TX 16-r1707TX   → these model numbers
//   ... scripts/enrich-products.mjs --limit=3                → the first 3 variants
//   ... scripts/enrich-products.mjs --pending --limit=5      → 5 variants that were never
//                                                              enriched or need a retry

import { createClient } from "@supabase/supabase-js";

// Which Gemini model to use. Can be changed with GEMINI_MODEL in .env.local.
const geminiModel = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

// The address of the Gemini API for that model.
const geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/" + geminiModel + ":generateContent";

// The addresses of the Tavily APIs: one searches the web, the other reads
// whole pages (we use it to get each page's images).
const tavilyUrl = "https://api.tavily.com/search";
const tavilyExtractUrl = "https://api.tavily.com/extract";

// How many matched product pages to read images from (Tavily charges
// 1 credit for every 5 pages, so 3 pages costs 1 credit).
const maxPagesForImages = 3;

// The most images to keep for one product.
const maxImagesPerProduct = 6;

// Pause between products, so we stay well inside the free-tier rate limits
// of Tavily and Gemini when running a batch.
const secondsBetweenProducts = 3;

// How much text to keep from each web page, so the Gemini prompt stays small.
const maxTextPerPage = 4000;

// Websites we never trust for product facts, prices or images.
// Anything on these sites (or their sub-domains) is thrown away.
const blockedDomains = [
  "pinterest.com",
  "pinimg.com",
  "youtube.com",
  "ytimg.com",
  "facebook.com",
  "fbcdn.net",
  "instagram.com",
  "twitter.com",
  "x.com",
  "reddit.com",
  "redd.it",
  "quora.com",
  "linkedin.com",
];

// The spec names we want back. Using the same names for every product makes
// it easy to merge the results into Supabase later.
const standardSpecKeys = [
  "processor",
  "graphics",
  "ram",
  "storage",
  "display",
  "operating_system",
  "battery",
  "weight",
  "ports",
  "wireless",
  "webcam",
  "keyboard",
  "colour",
  "warranty",
];

// Shops we prefer when they show up in the search results. Their pages go
// first, so Gemini reads them first and trusts them most. We never go to
// these sites ourselves or work around their protections: we only use pages
// the normal web search already gave us.
const preferredShopDomains = ["amazon.in", "flipkart.com"];

// Some of our existing rows say "gpu" instead of "graphics".
// When we compare, treat these names as the same spec.
const sameSpecNames = {
  gpu: "graphics",
  os: "operating_system",
  color: "colour",
};

// ----------------------------------------------------------------------------
// Small helpers
// ----------------------------------------------------------------------------

// Makes text easy to compare: lowercase, and only letters and numbers.
// Example: "14-fb0089TX" becomes "14fb0089tx".
function simplifyText(text) {
  if (!text) {
    return "";
  }

  return String(text).toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Returns true if the URL is on one of our blocked websites.
function isBlockedUrl(url) {
  let hostName;

  try {
    hostName = new URL(url).hostname.toLowerCase();
  } catch (error) {
    // Not a valid URL at all, so don't trust it.
    return true;
  }

  for (const domain of blockedDomains) {
    if (hostName === domain || hostName.endsWith("." + domain)) {
      return true;
    }
  }

  return false;
}

// Waits for the given number of seconds.
function wait(seconds) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

// ----------------------------------------------------------------------------
// Step 1: Read variants from Supabase
// ----------------------------------------------------------------------------

// Connects to Supabase with the service-role key. This key can write to the
// products table, so it must only ever be used in scripts and server code.
function connectToSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Did you forget --env-file=.env ?");
  }

  return createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
}

// Reads what was typed after the script name:
//   - "--save"             → really save to Supabase (otherwise it is a dry run)
//   - "--pending"          → only variants never enriched, or marked "retry_later"
//   - "--limit=3"          → at most 3 variants
//   - "15-fa2689TX ..."    → these model numbers
//   - nothing              → the first variant
function readCommandLine() {
  const typedWords = process.argv.slice(2);
  const modelNumbers = [];
  let limit = 1;
  let save = false;
  let pendingOnly = false;

  for (const word of typedWords) {
    if (word === "--save") {
      save = true;
    } else if (word === "--pending") {
      pendingOnly = true;
    } else if (word.startsWith("--limit=")) {
      limit = Number(word.replace("--limit=", ""));
    } else {
      modelNumbers.push(word);
    }
  }

  return { modelNumbers, limit, save, pendingOnly };
}

// Reads the variants to enrich, each with its family ("product") attached:
//   { id, sku, processor, ram, storage, graphics, specifications, image_url,
//     enrichment_status, product: { id, name, brand, image_url } }
async function getVariantsFromSupabase(supabase, commandLine) {
  let query = supabase
    .from("product_variants")
    .select("id, sku, processor, ram, storage, graphics, specifications, image_url, enrichment_status, enrichment, product:products(id, name, brand, category, image_url)")
    .order("sku");

  if (commandLine.modelNumbers.length > 0) {
    // sku_key is the model number in capitals, so "15-FA2689tx" also works.
    const skuKeys = commandLine.modelNumbers.map((modelNumber) => modelNumber.trim().toUpperCase());
    query = query.in("sku_key", skuKeys);
  } else {
    if (commandLine.pendingOnly) {
      query = query.or("enrichment_status.is.null,enrichment_status.eq.retry_later");
    }

    query = query.limit(commandLine.limit);
  }

  const { data, error } = await query;

  if (error) {
    // The most likely reason: the variants table does not exist yet.
    throw new Error(
      "Could not read variants from Supabase: " + error.message +
      "\n(Did you run supabase/migrations/0004_product_variants.sql in the Supabase SQL editor?)"
    );
  }

  if (!data || data.length === 0) {
    throw new Error("No matching variants found in Supabase.");
  }

  return data;
}

// ----------------------------------------------------------------------------
// Step 2: Search the web with Tavily
// ----------------------------------------------------------------------------

// onlyDomains (optional): search only these websites, e.g. ["amazon.in"].
async function searchWithTavily(searchText, onlyDomains) {
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
    // Ask Tavily to skip weak sources. We also filter again ourselves in Step 3.
    exclude_domains: blockedDomains,
  };

  if (onlyDomains) {
    requestBody.include_domains = onlyDomains;
  }

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

// ----------------------------------------------------------------------------
// Step 3: Keep only good pages that mention our exact model number
// ----------------------------------------------------------------------------

// This is a plain code check, so it does not depend on Gemini being careful.
//
// A page only counts if the model number is in its LINK or TITLE. Pages that
// only mention it somewhere in the text are usually listing pages or pages
// about a different product, so we do not trust them.
function keepGoodResults(searchResults, modelNumber) {
  const simpleModelNumber = simplifyText(modelNumber);
  const goodResults = [];
  const droppedUrls = [];

  for (const result of searchResults) {
    const linkAndTitle = result.url + " " + result.title;
    const modelNumberInLinkOrTitle = simplifyText(linkAndTitle).includes(simpleModelNumber);

    if (isBlockedUrl(result.url)) {
      droppedUrls.push({ url: result.url, reason: "weak source" });
    } else if (!modelNumberInLinkOrTitle) {
      droppedUrls.push({ url: result.url, reason: "model number is not in the page link or title" });
    } else {
      goodResults.push(result);
    }
  }

  return { goodResults, droppedUrls };
}

// Puts the good pages in order of trust:
//   1. Amazon and Flipkart (preferredShopDomains)
//   2. the manufacturer's own site (e.g. hp.com for an HP laptop)
//   3. every other shop or review site
// Pages in the same group keep the order the search gave them.
function sortBySourcePriority(results, brand) {
  const brandDomain = simplifyText(brand) + ".com";

  function priority(result) {
    let hostName = "";

    try {
      hostName = new URL(result.url).hostname.toLowerCase();
    } catch (error) {
      return 3;
    }

    for (const domain of preferredShopDomains) {
      if (hostName === domain || hostName.endsWith("." + domain)) {
        return 1;
      }
    }

    if (hostName === brandDomain || hostName.endsWith("." + brandDomain)) {
      return 2;
    }

    return 3;
  }

  // Array.sort keeps equal items in their original order.
  return [...results].sort((first, second) => priority(first) - priority(second));
}

// ----------------------------------------------------------------------------
// Step 4: Ask Gemini to read the pages
// ----------------------------------------------------------------------------

// The configuration fields that make one variant different from another.
const configurationFields = ["processor", "ram", "storage", "graphics"];

// Writes the instructions for Gemini, including the search results and the
// configuration we already know for this variant.
function buildPrompt(variant, searchResults, sheetName) {
  const lines = [
    "You are helping a computer shop in India fill in product details.",
    "",
    "Product we are looking for:",
    "Model number: " + variant.sku,
    "Product family: " + variant.product.name,
    "Our shop's own name for it (from our stock sheet): " + sheetName,
  ];

  // Tell Gemini what we already know, so it only uses matching information.
  const knownLines = [];

  for (const field of configurationFields) {
    if (variant[field]) {
      knownLines.push("  " + field + ": " + variant[field]);
    }
  }

  if (knownLines.length > 0) {
    lines.push("We already know this exact model has:");
    lines.push(...knownLines);
  }

  lines.push("");
  lines.push("Below are web pages found by a web search. Use ONLY these pages.");
  lines.push("The pages are in order of trust: if two pages disagree, believe the one listed first.");
  lines.push("");

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

  lines.push("Rules:");
  lines.push("- Only use information about this EXACT model number (" + variant.sku + ").");
  lines.push("  Model numbers that differ by even one character are different laptops. Many pages list several similar models; only use the values for this one.");
  lines.push("- A laptop family is often sold in several configurations. NEVER pick one configuration just because a page is about the same family.");
  lines.push("  Put a value in \"configuration\" only if the pages tie it to this exact model number. If the pages show several options (e.g. 8GB or 16GB), write all of them, e.g. \"8GB or 16GB\".");
  lines.push("- Set single_configuration to true only if the pages show this model number is ONE specific configuration.");
  lines.push("  Set it to false if the model number is a whole range or family sold in several configurations.");
  lines.push("- Only use facts written in the pages above. Never guess or invent anything. If a value is not in the pages, use null or leave it out.");
  lines.push("- For other specifications, use these names when they fit: " + standardSpecKeys.filter((key) => !configurationFields.includes(key)).join(", ") + ".");
  lines.push("  Only add another spec name if the fact does not fit any of these. Use lowercase_with_underscores for names.");
  lines.push("- Prices must be the CURRENT selling price in INR at a shop, written on one of the pages above. Use that page's URL as product_url.");
  lines.push("  Do not use launch prices, expected prices, or MRP / list prices.");
  lines.push("- In source_urls, list the URLs of the pages you actually used.");
  lines.push("- Set model_number_matched to true only if the pages clearly mention this exact model number.");
  lines.push("- family_name is the product family / series this exact model belongs to, WITHOUT the model number and WITHOUT");
  lines.push("  configuration details (processor, RAM, storage, colour). Example: for \"HP Victus Gaming Laptop 15-fa2689TX\" the");
  lines.push("  family is \"HP Victus Gaming Laptop 15\". Prefer the manufacturer's own naming (use their page if one is above).");
  lines.push("  Always include the series number or screen size (\"HP Victus 15\", not \"HP Victus\").");
  lines.push("  If the pages show the manufacturer's model / generation code, include it (e.g. \"Lenovo IdeaPad Slim 3 15IAH8\").");
  lines.push("  Never include processor, RAM, storage, graphics, colour or operating system in family_name. Use null if it is unclear.");
  lines.push("- In family_evidence, copy the exact text from the pages that shows this model number together with its full product name.");
  lines.push("- If the pages give DIFFERENT family names for this model number, list the other names in family_conflicts.");
  lines.push("- Compare our shop's own name (\"" + sheetName + "\") with what the pages call this exact model number.");
  lines.push("  Set our_name_matches to false ONLY if our name clearly names a DIFFERENT product line or series");
  lines.push("  (e.g. ours \"HP 14 Laptop\" but the pages say \"HP Envy x360 14\"; ours \"Galaxy Book4\" but the pages say \"Galaxy Book5\").");
  lines.push("  A generic name like \"Lenovo Laptop\" or a shorter version of the same name is NOT a conflict: set true.");
  lines.push("  Use null if the pages don't say. Explain a false in our_name_conflict.");
  lines.push("");
  lines.push("Reply with ONLY a JSON object in exactly this shape:");
  lines.push("{");
  lines.push('  "model_number": "string",');
  lines.push('  "model_number_matched": true or false,');
  lines.push('  "single_configuration": true or false,');
  lines.push('  "full_product_name": "string or null",');
  lines.push('  "family_name": "string or null",');
  lines.push('  "family_evidence": [ { "url": "string", "quote": "string" } ],');
  lines.push('  "family_conflicts": ["string"],');
  lines.push('  "our_name_matches": true or false or null,');
  lines.push('  "our_name_conflict": "string or null",');
  lines.push('  "brand": "string or null",');
  lines.push('  "configuration": { "processor": "string or null", "ram": "string or null", "storage": "string or null", "graphics": "string or null" },');
  lines.push('  "specifications": { "spec_name": "spec value" },');
  lines.push('  "prices": [');
  lines.push('    { "store_name": "string", "price_inr": number, "product_url": "string", "in_stock": true or false or null }');
  lines.push("  ],");
  lines.push('  "source_urls": ["string"],');
  lines.push('  "notes": "string or null (anything uncertain, e.g. price not found)"');
  lines.push("}");

  return lines.join("\n");
}

// Calls Gemini WITHOUT any search tools. It only reads our prompt.
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

  // If Gemini is busy (HTTP 503), wait a little and try again.
  // We retry up to 3 times. Any other error stops right away.
  const maxRetries = 3;
  const secondsBetweenRetries = 5;

  let response;
  let responseData;
  let retryNumber = 0;

  while (true) {
    response = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    responseData = await response.json();

    const geminiIsBusy = response.status === 503;

    if (!geminiIsBusy || retryNumber >= maxRetries) {
      break;
    }

    retryNumber = retryNumber + 1;
    console.log(
      "  Gemini is busy (HTTP 503). Waiting " + secondsBetweenRetries + " seconds, then retry " + retryNumber + " of " + maxRetries + "..."
    );
    await wait(secondsBetweenRetries);
  }

  if (!response.ok) {
    throw new Error("Gemini returned an error (HTTP " + response.status + "): " + JSON.stringify(responseData, null, 2));
  }

  return responseData;
}

// Pulls Gemini's text answer out of the response and turns it into a
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

// ----------------------------------------------------------------------------
// Step 5: Double-check Gemini's answer with plain code
// ----------------------------------------------------------------------------

// Returns true if this price really appears somewhere in the page text.
// Indian pages write prices like "1,20,990", others like "120,990" or "120990",
// so we take every number on the page, remove the commas, and compare.
function priceAppearsOnPage(price, pageText) {
  if (!pageText || typeof price !== "number") {
    return false;
  }

  const numbersOnPage = pageText.match(/\d[\d,]*/g) || [];

  for (const numberText of numbersOnPage) {
    if (Number(numberText.replace(/,/g, "")) === price) {
      return true;
    }
  }

  return false;
}

// Returns true if the URL really downloads as an image.
// This catches invented links, dead links, and shops that block outside use.
async function imageLoads(imageUrl) {
  try {
    const response = await fetch(imageUrl, {
      method: "GET",
      // Give up after 8 seconds, so one slow site cannot hang the script.
      signal: AbortSignal.timeout(8000),
    });

    const contentType = response.headers.get("content-type") || "";

    // We only needed the headers, so stop downloading the rest of the image.
    await response.body?.cancel();

    return response.ok && contentType.startsWith("image/");
  } catch (error) {
    return false;
  }
}

// Checks every link and price in Gemini's answer. Anything that fails a check
// is removed from the answer and listed in "removed", with the reason.
function checkGeminiAnswer(productDetails, goodResults) {
  const removed = [];

  // Look up each page's text by its URL.
  const pageTextByUrl = {};

  for (const result of goodResults) {
    pageTextByUrl[result.url] = (result.raw_content || "") + " " + (result.content || "");
  }

  // Check the prices: the link must be one of our pages, and the number must
  // really appear on that page.
  const checkedPrices = [];

  for (const price of productDetails.prices || []) {
    const pageText = pageTextByUrl[price.product_url];

    if (pageText === undefined) {
      removed.push({ url: price.product_url, reason: "price link was not in our search results" });
    } else if (!priceAppearsOnPage(price.price_inr, pageText)) {
      removed.push({ url: price.product_url, reason: "price " + price.price_inr + " is not written on that page" });
    } else {
      checkedPrices.push(price);
    }
  }

  productDetails.prices = checkedPrices;

  // Check the source links: they must be our pages.
  const checkedSourceUrls = [];

  for (const sourceUrl of productDetails.source_urls || []) {
    if (pageTextByUrl[sourceUrl] === undefined) {
      removed.push({ url: sourceUrl, reason: "source was not in our search results" });
    } else {
      checkedSourceUrls.push(sourceUrl);
    }
  }

  productDetails.source_urls = checkedSourceUrls;

  return removed;
}

// ----------------------------------------------------------------------------
// Step 6: Collect images from the matched product pages
// ----------------------------------------------------------------------------

// Returns true if the page is about ONE product whose link has our model
// number in it. Comparison pages ("A vs B") show two laptops, so we skip them.
function isSingleProductPage(pageUrl, modelNumber) {
  const simpleUrl = simplifyText(pageUrl);
  const isComparison = pageUrl.includes("-vs-") || pageUrl.includes("compare");

  return simpleUrl.includes(simplifyText(modelNumber)) && !isComparison;
}

// Shops often give each product a number in the page link, and use the same
// number in the product's image names.
// Example: croma.com/.../p/315736  →  images named 315736_0_xyz.png
// Returns every group of 5 or more digits in the page link.
function getProductIdsFromPageUrl(pageUrl) {
  return pageUrl.match(/\d{5,}/g) || [];
}

// Returns true if the image link looks like a small thumbnail, icon or logo.
// Examples we skip: "...-w60-h60/...", "...?width=140", "...logo.svg".
function looksLikeThumbnailOrLogo(imageUrl) {
  const lowerUrl = imageUrl.toLowerCase();

  if (lowerUrl.includes(".svg") || lowerUrl.includes("logo") || lowerUrl.includes("icon")) {
    return true;
  }

  const sizeMatch = lowerUrl.match(/[-_?&/]w(?:idth)?[=-]?(\d+)/);

  if (sizeMatch && Number(sizeMatch[1]) < 300) {
    return true;
  }

  return false;
}

// Asks Tavily to read whole pages and send back the images on each one.
async function getImagesFromPages(pageUrls) {
  const apiKey = process.env.TAVILY_API_KEY;

  const response = await fetch(tavilyExtractUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + apiKey,
    },
    body: JSON.stringify({
      urls: pageUrls,
      include_images: true,
      extract_depth: "basic",
    }),
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error("Tavily extract returned an error (HTTP " + response.status + "): " + JSON.stringify(responseData, null, 2));
  }

  return responseData.results || [];
}

// Finds images that belong to this exact model. An image counts only if:
//   - it is on a single-product page for this model (not a comparison page)
//   - its link contains our model number, OR the product number from that
//     page's link (see getProductIdsFromPageUrl)
//   - it is not a thumbnail, icon, logo, or from a weak source
//   - it really loads as an image
async function collectProductImages(sku, goodResults) {
  const productPages = [];

  for (const result of goodResults) {
    if (isSingleProductPage(result.url, sku)) {
      productPages.push(result.url);
    }
  }

  const pagesToRead = productPages.slice(0, maxPagesForImages);
  const images = [];
  const rejectedCount = { not_this_model: 0, thumbnail_or_logo: 0, weak_source: 0, does_not_load: 0 };

  if (pagesToRead.length === 0) {
    return { images, pagesRead: pagesToRead, rejectedCount };
  }

  const simpleModelNumber = simplifyText(sku);
  const extractedPages = await getImagesFromPages(pagesToRead);

  for (const page of extractedPages) {
    const productIds = getProductIdsFromPageUrl(page.url);

    for (const image of page.images || []) {
      // Tavily can send images as plain strings or as { url, description }.
      const imageUrl = typeof image === "string" ? image : image.url;

      if (!imageUrl || images.length >= maxImagesPerProduct) {
        continue;
      }

      // Skip images we already kept. The same photo often appears several
      // times with a different "?width=..." at the end, so compare the links
      // without the part after "?" (and ignore http vs https).
      const imageWithoutSize = imageUrl.split("?")[0].replace("http://", "https://");

      if (images.some((kept) => kept.url.split("?")[0].replace("http://", "https://") === imageWithoutSize)) {
        continue;
      }

      // Does the image link point to this exact model?
      let matchedBy = null;

      if (simplifyText(imageUrl).includes(simpleModelNumber)) {
        matchedBy = "image link contains the model number";
      } else {
        for (const productId of productIds) {
          if (imageUrl.includes(productId)) {
            matchedBy = "image link contains the page's product number " + productId;
          }
        }
      }

      if (!matchedBy) {
        rejectedCount.not_this_model = rejectedCount.not_this_model + 1;
      } else if (looksLikeThumbnailOrLogo(imageUrl)) {
        rejectedCount.thumbnail_or_logo = rejectedCount.thumbnail_or_logo + 1;
      } else if (isBlockedUrl(imageUrl)) {
        rejectedCount.weak_source = rejectedCount.weak_source + 1;
      } else if (!(await imageLoads(imageUrl))) {
        rejectedCount.does_not_load = rejectedCount.does_not_load + 1;
      } else {
        images.push({ url: imageUrl, from_page: page.url, matched_by: matchedBy });
      }
    }
  }

  return { images, pagesRead: pagesToRead, rejectedCount };
}

// ----------------------------------------------------------------------------
// Step 3b: Amazon India, via the Scrape.do Amazon API
// ----------------------------------------------------------------------------
//
// Scrape.do gives us Amazon's product page as clean data (title, brand, price,
// stock, images, technical details). It is an EXTRA source next to Tavily -
// if anything goes wrong here, enrichment simply carries on without Amazon.
//
// Docs: https://scrape.do/documentation/amazon-scraper-api/
//   GET https://api.scrape.do/plugin/amazon/search?token=...&keyword=...&geocode=in
//   GET https://api.scrape.do/plugin/amazon/pdp?token=...&asin=...&geocode=in
//   Each successful request costs 1 credit (free plan: 1,000 per month).
//
// Our rows have a model number (e.g. 15-fa2689TX), not an Amazon ASIN, so we
// first find the ASIN, cheapest way first:
//   1. An ASIN we verified on an earlier run (saved in enrichment.amazon) - free.
//   2. An amazon.in page that the Tavily search already found for this exact
//      model number - the ASIN is in its link (/dp/B0XXXXXXXX) - free.
//   3. A Tavily search of amazon.in only, for "brand + model number" - 1 Tavily
//      credit, no Scrape.do credit. Amazon India often shows the model number
//      only in the page's details ("Manufacturer Part Number"), not in the
//      title, and Tavily reads the whole page - so this finds far more.
//      Only a listing whose title or page text has the EXACT model number counts.
//   4. Scrape.do's Amazon search for "brand + model number" - 1 credit.
//      Only a result whose title contains the EXACT model number counts.
// Then we read that product page (1 credit) and check it really is our exact
// model before using any of it. We never guess an ASIN.

const scrapeDoToken = process.env.SCRAPEDO_API_TOKEN;
const scrapeDoBaseUrl = "https://api.scrape.do/plugin/amazon";

// Amazon India. An Indian pincode is optional; set SCRAPEDO_ZIPCODE in
// .env.local (e.g. 110001) to get prices/stock for that area.
const amazonGeocode = "in";
const amazonZipcode = process.env.SCRAPEDO_ZIPCODE || null;

// A safety cap so one run can never use up the monthly credits.
const maxScrapeDoRequestsPerRun = Number(process.env.SCRAPEDO_MAX_REQUESTS_PER_RUN || 20);

// Re-use saved Amazon results for this many days before asking Scrape.do again.
const amazonCacheDays = 7;

// Every Scrape.do request of this run, printed at the end.
const scrapeDoLog = [];

// Titles of listings we never use for new stock.
const unwantedAmazonWords = ["renewed", "refurbished", "used"];

// Words that show an Amazon listing is an accessory, not a laptop.
const accessoryWords = ["bag", "sleeve", "backpack", "skin", "charger", "adapter", "battery", "cover", "protector", "stand", "mouse", "keyboard only"];

// Returns true if an Amazon title is an accessory (bag, charger...) for a laptop.
function isAccessoryTitle(title) {
  const lowerTitle = String(title).toLowerCase();
  return accessoryWords.some((word) => lowerTitle.includes(word));
}

// Asks Scrape.do for one Amazon endpoint ("search" or "pdp").
// Returns the parsed JSON, or null if anything went wrong (the reason is logged).
async function callScrapeDo(endpoint, params, sku) {
  if (!scrapeDoToken) {
    return null;
  }

  if (scrapeDoLog.length >= maxScrapeDoRequestsPerRun) {
    console.log("  Scrape.do: per-run limit of " + maxScrapeDoRequestsPerRun + " requests reached, skipping Amazon.");
    return null;
  }

  const query = new URLSearchParams({ token: scrapeDoToken, geocode: amazonGeocode, ...params });

  if (amazonZipcode) {
    query.set("zipcode", amazonZipcode);
  }

  // The token must never be printed, so the log only shows the other parameters.
  const logEntry = { endpoint: endpoint, sku: sku, params: params, http_status: null, result: null };
  scrapeDoLog.push(logEntry);

  // A 429 means "too many requests at once" - wait a moment and try once more.
  for (let attempt = 1; attempt <= 2; attempt++) {
    let response;

    try {
      response = await fetch(scrapeDoBaseUrl + "/" + endpoint + "?" + query.toString(), {
        // Amazon pages can be slow; give up after 60 seconds.
        signal: AbortSignal.timeout(60000),
      });
    } catch (error) {
      logEntry.result = "network error / timeout: " + (error.message || error);
      console.log("  Scrape.do " + endpoint + ": " + logEntry.result);
      return null;
    }

    logEntry.http_status = response.status;

    if (response.status === 429 && attempt === 1) {
      console.log("  Scrape.do " + endpoint + ": 429 too many requests, waiting 5 seconds and trying once more...");
      await wait(5);
      continue;
    }

    let data;

    try {
      data = await response.json();
    } catch (error) {
      logEntry.result = "HTTP " + response.status + ", response was not valid JSON";
      console.log("  Scrape.do " + endpoint + ": " + logEntry.result);
      return null;
    }

    if (!response.ok || data.status !== "success") {
      logEntry.result = "HTTP " + response.status + ": " + (data.errorMessage || data.message || "request failed");
      console.log("  Scrape.do " + endpoint + ": " + logEntry.result);
      return null;
    }

    logEntry.result = "success (1 credit)";
    return data;
  }

  return null;
}

// Pulls the ASIN out of an Amazon product link.
// "https://www.amazon.in/HP-Victus/dp/B0D1234567/ref=..." → "B0D1234567"
function asinFromAmazonUrl(url) {
  const match = String(url).match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?:[/?]|$)/i);
  return match ? match[1].toUpperCase() : null;
}

function isAmazonIndiaUrl(url) {
  try {
    const hostName = new URL(url).hostname.toLowerCase();
    return hostName === "amazon.in" || hostName.endsWith(".amazon.in");
  } catch (error) {
    return false;
  }
}

// Returns true if the text contains the model number as a whole code, even
// if it is written with different dashes or spaces:
//   "HP Victus 15-fa2689TX Gaming Laptop"  → yes for 15-fa2689TX
//   "HP Victus 15 FA2689TX"                → yes
//   "HP Victus 15-fa2689TXU"               → no (a different model)
function textHasExactSku(text, sku) {
  const textWords = String(text).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const simpleSku = simplifyText(sku);

  for (let start = 0; start < textWords.length; start++) {
    let joined = "";

    for (let end = start; end < textWords.length && joined.length < simpleSku.length; end++) {
      joined = joined + textWords[end];

      if (joined === simpleSku) {
        return true;
      }
    }
  }

  return false;
}

function daysSince(isoDate) {
  return (Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24);
}

// Searches amazon.in (through Tavily) for this exact model number.
// Returns { asin, source, candidates, reason } like findAmazonAsin.
async function findAsinWithTavilyOnAmazon(variant) {
  const searchText = getBrand(variant) + " " + variant.sku;
  console.log("  Tavily: searching amazon.in only for \"" + searchText + "\"...");

  let response;

  try {
    response = await searchWithTavily(searchText, ["amazon.in"]);
  } catch (error) {
    console.log("  Tavily amazon.in search failed: " + (error.message || error));
    return { asin: null, source: "Tavily amazon.in search", candidates: [], reason: null };
  }

  const matches = new Map();

  for (const result of response.results || []) {
    const asin = isAmazonIndiaUrl(result.url) ? asinFromAmazonUrl(result.url) : null;
    const title = String(result.title || "");
    const pageText = title + " " + (result.raw_content || result.content || "");

    // Must be a product page (has an ASIN), have the EXACT model number,
    // and be new stock, not an accessory.
    if (!asin || !textHasExactSku(pageText, variant.sku)) {
      continue;
    }

    if (unwantedAmazonWords.some((word) => title.toLowerCase().includes(word)) || isAccessoryTitle(title)) {
      continue;
    }

    matches.set(asin, title);
  }

  console.log("  Tavily amazon.in: " + (response.results || []).length + " page(s), " + matches.size + " listing(s) with this exact model number" + (matches.size ? ": " + [...matches.keys()].join(", ") : "") + ".");

  if (matches.size === 1) {
    return { asin: [...matches.keys()][0], source: "Tavily amazon.in search (exact model number on the page)", candidates: [...matches.keys()], reason: null };
  }

  if (matches.size > 1) {
    return { asin: null, source: "Tavily amazon.in search", candidates: [...matches.keys()], reason: "Several Amazon listings have this model number: " + [...matches.keys()].join(", ") };
  }

  return { asin: null, source: "Tavily amazon.in search", candidates: [], reason: null };
}

// Finds the Amazon India ASIN for this exact model number.
// Returns { asin, source, candidates, reason }. asin is null when there is no
// single, clear match - we never pick one of several listings at random.
async function findAmazonAsin(variant, goodResults) {
  const saved = variant.enrichment?.amazon;

  // 1. Verified on an earlier run - or held for review with its product data
  //    saved recently, so it can be re-checked for free with the current rules.
  const savedRecently = saved?.checked_at && daysSince(saved.checked_at) < amazonCacheDays;

  if (saved?.asin && (saved.match_status === "verified" || (saved.product && savedRecently))) {
    return { asin: saved.asin, source: "saved from an earlier run", candidates: [saved.asin], reason: null };
  }

  // 2. Amazon India pages the Tavily search already found for this exact model.
  const asinsFromTavily = new Set();

  for (const result of goodResults) {
    if (isAmazonIndiaUrl(result.url)) {
      const asin = asinFromAmazonUrl(result.url);

      if (asin) {
        asinsFromTavily.add(asin);
      }
    }
  }

  if (asinsFromTavily.size === 1) {
    return { asin: [...asinsFromTavily][0], source: "Tavily (amazon.in page with this model number)", candidates: [...asinsFromTavily], reason: null };
  }

  if (asinsFromTavily.size > 1) {
    return { asin: null, source: "Tavily", candidates: [...asinsFromTavily], reason: "Several Amazon listings mention this model number: " + [...asinsFromTavily].join(", ") };
  }

  // 3. Tavily, amazon.in only. Free for Scrape.do; the ASIN is in the link.
  const tavilyAmazon = await findAsinWithTavilyOnAmazon(variant);

  if (tavilyAmazon.asin || tavilyAmazon.candidates.length > 1) {
    return tavilyAmazon;
  }

  // Don't search again if an earlier run found nothing recently.
  if (saved?.match_status === "no_result" && saved.checked_at && daysSince(saved.checked_at) < amazonCacheDays) {
    return { asin: null, source: "saved from an earlier run", candidates: [], reason: "No Amazon India listing was found on " + saved.checked_at.slice(0, 10) + " (not searching again yet)." };
  }

  // 4. Scrape.do Amazon search.
  const keyword = getBrand(variant) + " " + variant.sku;
  console.log("  Scrape.do: searching Amazon India for \"" + keyword + "\"...");
  const searchData = await callScrapeDo("search", { keyword: keyword }, variant.sku);

  if (!searchData) {
    return { asin: null, source: "Scrape.do search", candidates: [], reason: scrapeDoToken ? "The Amazon search request failed." : null, failed: true };
  }

  // Keep only listings whose title has the EXACT model number, and that are
  // new stock (no renewed / refurbished listings).
  const matches = new Map();

  for (const product of searchData.products || []) {
    const title = String(product.title || "");
    const lowerTitle = title.toLowerCase();

    if (!product.asin || !textHasExactSku(title, variant.sku)) {
      continue;
    }

    if (unwantedAmazonWords.some((word) => lowerTitle.includes(word)) || isAccessoryTitle(title)) {
      continue;
    }

    matches.set(product.asin, product);
  }

  console.log("  Scrape.do search: " + (searchData.products || []).length + " result(s), " + matches.size + " with this exact model number.");

  if (matches.size === 1) {
    return { asin: [...matches.keys()][0], source: "Scrape.do Amazon search", candidates: [...matches.keys()], reason: null };
  }

  if (matches.size === 0) {
    return { asin: null, source: "Scrape.do Amazon search", candidates: [], reason: "No Amazon India listing has this exact model number in its title.", noResult: true };
  }

  // Several listings: use one only if exactly one of them is not an advert.
  const organic = [...matches.values()].filter((product) => product.isSponsored !== true);

  if (organic.length === 1) {
    return { asin: organic[0].asin, source: "Scrape.do Amazon search (only non-sponsored match)", candidates: [...matches.keys()], reason: null };
  }

  return { asin: null, source: "Scrape.do Amazon search", candidates: [...matches.keys()], reason: "Several Amazon listings have this model number: " + [...matches.keys()].join(", ") };
}

// Finds a value in Amazon's technical details table. The labels are tried in
// order, most exact first, e.g. "CPU Model Number" ("Core i3-1215U") before
// the rougher "Processor Type" ("Core i3"). Labels are compared ignoring
// capitals and spaces. These are the labels Amazon India really sends
// (checked against a live Scrape.do response).
function amazonDetail(technicalDetails, labels) {
  const wanted = labels.map((label) => simplifyText(label));

  for (const label of wanted) {
    for (const [name, value] of Object.entries(technicalDetails || {})) {
      if (simplifyText(name) === label && !isEmptyValue(value)) {
        return String(value).trim();
      }
    }
  }

  return null;
}

// The configuration as Amazon lists it (null where Amazon doesn't say).
function amazonConfiguration(product) {
  const details = product.technical_details || {};

  return {
    processor: amazonDetail(details, ["CPU Model Number", "CPU Model", "Processor Name", "Processor Type"]),
    ram: amazonDetail(details, ["RAM Memory Installed", "RAM Memory Installed Size", "RAM Size", "Installed RAM"]),
    storage: amazonDetail(details, ["Hard Drive Size", "Hard Disk Size", "SSD Capacity", "DriveMemory Storage Capacity", "Memory Storage Capacity"]),
    graphics: amazonDetail(details, ["Graphics Co Processor", "Graphics Coprocessor", "Graphics Card Description", "Graphics Description"]),
  };
}

// True if the found value is only LESS SPECIFIC than ours, not different:
// every numbered word it gives is also in our value.
// Example: ours "Core i3-1215U (12th Gen)", found "Core i3" → only less specific.
//          ours "8GB", found "16 GB" → different.
function isOnlyLessSpecific(ourValue, foundValue) {
  const numberedWords = String(foundValue).toLowerCase().split(/[^a-z0-9]+/).filter((word) => /\d/.test(word));
  return numberedWords.length > 0 && specValuesAgree(foundValue, ourValue);
}

// Checks that the Amazon product really is our exact model.
// Returns { status: "verified" | "needs_review", reasons, configuration }.
function verifyAmazonProduct(variant, product) {
  const reasons = [];
  const allText = (product.name || "") + " " + Object.values(product.technical_details || {}).join(" ");
  const lowerName = String(product.name || "").toLowerCase();

  // The exact model number must be on the Amazon page.
  if (!textHasExactSku(allText, variant.sku)) {
    reasons.push("The Amazon listing does not show the exact model number " + variant.sku + ".");
  }

  // Same brand.
  const ourBrand = getBrand(variant);

  if (product.brand && simplifyText(product.brand) !== simplifyText(ourBrand) && !simplifyText(product.name || "").startsWith(simplifyText(ourBrand))) {
    reasons.push("Amazon says the brand is \"" + product.brand + "\" but ours is \"" + ourBrand + "\".");
  }

  // It must be a laptop, not an accessory for one: the title says laptop /
  // notebook, or Amazon lists a processor for it.
  const hasLaptopWord = /laptop|notebook|macbook|chromebook/.test(lowerName);
  const hasProcessor = amazonConfiguration(product).processor !== null;

  if (isAccessoryTitle(product.name) || (!hasLaptopWord && !hasProcessor)) {
    reasons.push("The Amazon listing does not look like a laptop: \"" + product.name + "\".");
  }

  if (unwantedAmazonWords.some((word) => lowerName.includes(word))) {
    reasons.push("The Amazon listing is renewed / refurbished stock.");
  }

  // Our trusted configuration must not be contradicted.
  // Amazon's "Processor Type" is often rough (e.g. "Core i7" for an "Intel
  // Core 7 240H"), so for the PROCESSOR only, the listing title may confirm
  // our value instead. Not for RAM / storage / graphics: a title mixes all
  // specs together ("16GB RAM ... RTX 5050 8GB"), so "8GB" could be the
  // graphics memory, not the RAM.
  const configuration = amazonConfiguration(product);

  for (const field of configurationFields) {
    if (isEmptyValue(variant[field]) || !configuration[field]) {
      continue;
    }

    const detailsAgree = specValuesAgree(variant[field], configuration[field]) || isOnlyLessSpecific(variant[field], configuration[field]);
    const titleAgrees = field === "processor" && specValuesAgree(variant[field], product.name || "");

    if (!detailsAgree && !titleAgrees) {
      reasons.push("Our " + field + " is \"" + variant[field] + "\" but Amazon says \"" + configuration[field] + "\".");
    }
  }

  return { status: reasons.length === 0 ? "verified" : "needs_review", reasons, configuration };
}

// Turns the Amazon product into a "page" in the same shape as a Tavily result,
// so Gemini reads it with the other pages and the usual checks still work
// (the price check, the family check).
function amazonAsPage(product) {
  const lines = [
    "Source: Amazon India product page data from the Scrape.do Amazon API (ASIN " + product.asin + ").",
    "Title: " + product.name,
    "Brand: " + (product.brand || ""),
    "Price: " + (product.price ?? "") + " " + (product.currency || ""),
    "List price (MRP): " + (product.list_price ?? ""),
    "Availability: " + (product.availability_text || (product.in_stock === true ? "In stock" : product.in_stock === false ? "Out of stock" : "")),
    "Technical details:",
  ];

  for (const [label, value] of Object.entries(product.technical_details || {})) {
    lines.push("  " + label + ": " + value);
  }

  if (product.description) {
    lines.push("Description: " + product.description);
  }

  return { url: product.url, title: product.name, content: "", raw_content: lines.join("\n") };
}

// The part of the Amazon product we save, so a later run can re-use it
// without spending another credit.
function amazonToSave(product) {
  return {
    asin: product.asin,
    url: product.url,
    title: product.name,
    brand: product.brand ?? null,
    price: product.price ?? null,
    list_price: product.list_price ?? null,
    currency: product.currency ?? null,
    in_stock: product.in_stock ?? null,
    availability_text: product.availability_text ?? null,
    technical_details: product.technical_details ?? {},
    description: product.description ?? null,
    images: (product.images || []).map((image) => image.url).filter(Boolean),
  };
}

// Runs the whole Amazon step for one variant. Returns:
//   { amazon: <what to save in enrichment.amazon>, page: <page for Gemini or null>,
//     images: [...], price: <online price entry or null> }
// Only a VERIFIED product gives a page, images and a price.
async function lookUpAmazon(variant, goodResults) {
  const saved = variant.enrichment?.amazon;
  const now = new Date().toISOString();
  const empty = { amazon: saved ?? null, page: null, images: [], price: null };

  if (!scrapeDoToken) {
    console.log("  Amazon: SCRAPEDO_API_TOKEN is not set in .env.local, skipping Amazon.");
    return empty;
  }

  console.log("Step 3b: Amazon India (Scrape.do)...");
  const found = await findAmazonAsin(variant, goodResults);

  if (!found.asin) {
    console.log("  Amazon: no ASIN - " + (found.reason || "no match"));

    // A failed request is not a real "no result", so keep what we had.
    if (found.failed) {
      return empty;
    }

    return {
      ...empty,
      amazon: {
        match_status: found.noResult ? "no_result" : "needs_review",
        asin: null,
        asin_source: found.source,
        candidates: found.candidates,
        reasons: found.reason ? [found.reason] : [],
        checked_at: now,
        data_source: "scrape.do",
      },
    };
  }

  console.log("  Amazon: ASIN " + found.asin + " (from " + found.source + ")");

  // Re-use a recent verified product instead of spending a credit.
  let product = null;

  // (Also when it was held for review: the saved data is re-checked with the
  // current rules, without spending a credit.)
  if (saved?.asin === found.asin && saved.product && saved.checked_at && daysSince(saved.checked_at) < amazonCacheDays) {
    console.log("  Amazon: re-using the product data saved on " + saved.checked_at.slice(0, 10) + " (no credit used).");
    product = { ...saved.product, name: saved.product.title, images: saved.product.images.map((url) => ({ url })) };
  } else {
    console.log("  Scrape.do: reading the Amazon product page " + found.asin + "...");
    product = await callScrapeDo("pdp", { asin: found.asin }, variant.sku);
  }

  if (!product) {
    return empty;
  }

  const check = verifyAmazonProduct(variant, product);
  console.log("  Amazon: \"" + String(product.name).slice(0, 90) + "\" → " + check.status + (check.reasons.length ? " (" + check.reasons.join(" ") + ")" : ""));

  const amazon = {
    match_status: check.status,
    asin: found.asin,
    asin_source: found.source,
    candidates: found.candidates,
    reasons: check.reasons,
    configuration: check.configuration,
    product: amazonToSave(product),
    checked_at: now,
    data_source: "scrape.do",
  };

  if (check.status !== "verified") {
    // Not our exact model (or not sure): save what we saw, use none of it.
    return { amazon, page: null, images: [], price: null };
  }

  // Amazon's own price, kept apart from Micron's price. Only Indian rupees.
  let price = null;

  if (typeof product.price === "number" && String(product.currency).toUpperCase() === "INR") {
    price = {
      store_name: "Amazon",
      price_inr: product.price,
      list_price_inr: typeof product.list_price === "number" ? product.list_price : null,
      product_url: product.url,
      in_stock: product.in_stock ?? null,
      source: "scrape.do",
    };
  }

  const images = (product.images || [])
    .map((image) => image.url)
    .filter(Boolean)
    .map((url) => ({ url: url, from_page: product.url, matched_by: "Amazon product page of the verified ASIN " + found.asin + " (Scrape.do)" }));

  return { amazon, page: amazonAsPage(product), images, price };
}

// ----------------------------------------------------------------------------
// Step 7: Compare with what we already know, and decide the status
// ----------------------------------------------------------------------------

// Returns the standard name for one of our spec names.
// Example: our old rows say "gpu", the standard name is "graphics".
function standardSpecName(ourName) {
  return sameSpecNames[ourName] || ourName;
}

// Returns true if an empty value (nothing useful to save or compare).
function isEmptyValue(value) {
  return value === null || value === undefined || String(value).trim() === "";
}

// Decides if our value and the found value say the same thing.
// The wording is often different ("16GB" vs "16 GB RAM"), so we only compare
// the important parts: every word of ours that contains a digit must also
// appear in the found value as a WHOLE word.
//
// "Whole word" matters: "7445H" and "7445HS" are different processors, so
// "7445h" must not match inside "7445hs". To still treat "16GB" and "16 GB"
// as the same, a word may also be made of 2-3 neighbouring found words
// ("16" + "gb" = "16gb", "15" + "6" = "156" for 15.6).
//
// Examples:
//   "NVIDIA GeForce RTX 3050 6GB"  vs "NVIDIA GeForce RTX 3050 with 6 GB VRAM" → agree ("3050", "6gb")
//   "NVIDIA GeForce RTX 4050 6GB"  vs "NVIDIA® GeForce"                        → disagree
//   "AMD Ryzen 7 7445H"            vs "AMD Ryzen 7 7445HS"                     → disagree
function specValuesAgree(ourValue, foundValue) {
  // All the whole words of the found value, plus 2- and 3-word combinations.
  const foundWords = String(foundValue).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const foundPieces = new Set(foundWords);

  for (let i = 0; i < foundWords.length; i++) {
    if (i + 1 < foundWords.length) {
      foundPieces.add(foundWords[i] + foundWords[i + 1]);
    }

    if (i + 2 < foundWords.length) {
      foundPieces.add(foundWords[i] + foundWords[i + 1] + foundWords[i + 2]);
    }
  }

  const importantWords = [];

  for (const word of String(ourValue).split(/[\s\-\/,()]+/)) {
    const simpleWord = simplifyText(word);

    if (/\d/.test(simpleWord)) {
      importantWords.push(simpleWord);
    }
  }

  // Our value has no numbers at all (e.g. "Mica Silver", "Intel Arc Graphics"):
  // it agrees if every meaningful word of ours is in the found value, so
  // "Intel Arc Graphics" agrees with the more exact "Intel Arc 130V GPU",
  // but "Intel UHD Graphics" does not agree with "Intel Iris Xe".
  if (importantWords.length === 0) {
    const fillerWords = ["graphics", "gpu", "card", "integrated", "dedicated", "colour", "color"];
    const ourWords = String(ourValue).toLowerCase().split(/[^a-z0-9]+/).filter((word) => word && !fillerWords.includes(word));

    if (ourWords.length > 0 && ourWords.every((word) => foundWords.includes(word))) {
      return true;
    }

    const simpleOurs = simplifyText(ourValue);
    const simpleFound = simplifyText(foundValue);
    return simpleFound.includes(simpleOurs) || simpleOurs.includes(simpleFound);
  }

  for (const word of importantWords) {
    if (!foundPieces.has(word)) {
      return false;
    }
  }

  return true;
}

// Returns true if a found value lists several options instead of one,
// e.g. "16GB, 24GB or 32GB" or "512GB / 1TB".
function listsSeveralOptions(value) {
  const text = String(value);
  return /\bor\b/i.test(text) || text.includes("/") || /\d\s*(gb|tb)\s*,\s*\d/i.test(text);
}

// The configuration Gemini found. Older answers may only have it inside
// "specifications", so look there too.
function foundConfiguration(details) {
  const configuration = {};

  for (const field of configurationFields) {
    const value = details.configuration?.[field] ?? details.specifications?.[field] ?? null;
    configuration[field] = isEmptyValue(value) ? null : String(value).trim();
  }

  return configuration;
}

// Counts the different websites among the kept pages. Every kept page has the
// exact model number in its link or title (see keepGoodResults).
function countDifferentWebsites(goodResults) {
  const websites = new Set();

  for (const result of goodResults) {
    try {
      websites.add(new URL(result.url).hostname.replace(/^www\./, ""));
    } catch (error) {
      // Skip a broken link.
    }
  }

  return websites.size;
}

// ----------------------------------------------------------------------------
// Step 7a: Does our sheet name agree with the verified web name?
// ----------------------------------------------------------------------------
//
// Our stock sheet may call a model something different from what it really
// is (e.g. sheet "HP 14 Laptop", web "HP Envy x360 14"; sheet "Galaxy Book4",
// web "Galaxy Book5"). Then we don't trust either name automatically: the
// variant is flagged for review with both names and the evidence. Nothing is
// renamed, no configuration is copied in, and the variant is not moved.
//
// Two independent signals:
//   1. Code: every "series word" of our name must appear in the web name.
//      Series words = words with letters, not the brand, not the model
//      number, not filler like "laptop" / "gaming". A generic name such as
//      "Lenovo Laptop" has no series words, so it can never mismatch.
//   2. Gemini: says whether our name clearly names a different product line
//      (needed for names like "HP 14", where the series is only a number).

// The name our stock sheet (or admin) gave this model:
//   1. saved in the variant's enrichment (original_sheet_name) - set the first
//      time the family step moves a variant, and kept on every run after, so
//      it survives even if that old family is deleted;
//   2. otherwise the family it came from, if it was moved;
//   3. otherwise the family it is in now.
async function getSheetName(supabase, variant) {
  const savedName = variant.enrichment?.family?.original_sheet_name;

  if (!isEmptyValue(savedName)) {
    return savedName;
  }

  const movedFrom = variant.enrichment?.family?.original_family_id ?? variant.enrichment?.family?.moved_from;

  if (movedFrom) {
    const { data } = await supabase.from("products").select("name").eq("id", movedFrom).maybeSingle();

    if (data?.name) {
      return data.name;
    }
  }

  return variant.product.name;
}

// The series words of a name, e.g. "Samsung Galaxy Book4 360 NP750QHA-LG1IN"
// → ["galaxy", "book4"] (brand, model number, plain numbers and filler removed).
function seriesWords(name, variant) {
  const brandWords = familyWords(getBrand(variant));
  const skuWords = familyWords(variant.sku);

  return familyWords(name).filter(
    (word) => /[a-z]/.test(word) && !brandWords.includes(word) && !skuWords.includes(word) && !isConfigurationWord(word)
  );
}

// Returns { status: "matches" | "mismatch" | "not_checked", sheet_name, web_name, reasons, sources }.
function checkSheetName(variant, details, sheetName) {
  const webName = [details.full_product_name, details.family_name].filter((name) => !isEmptyValue(name)).join(" / ");
  const nameCheck = { status: "not_checked", sheet_name: sheetName, web_name: webName || null, reasons: [], sources: details.source_urls || [] };

  if (!webName) {
    return nameCheck;
  }

  // 1. Series words of our name that the web name doesn't have.
  const webWords = new Set(familyWords(webName));
  const missing = seriesWords(sheetName, variant).filter((word) => !webWords.has(word));

  if (missing.length > 0) {
    nameCheck.reasons.push("Our name \"" + sheetName + "\" says \"" + missing.join(" ") + "\", but the verified web name is \"" + webName + "\".");
  }

  // 2. Gemini's judgement.
  if (details.our_name_matches === false) {
    nameCheck.reasons.push("The sources name a different product line: " + (details.our_name_conflict || "our name \"" + sheetName + "\" vs \"" + webName + "\"") + ".");
  }

  nameCheck.status = nameCheck.reasons.length > 0 ? "mismatch" : "matches";
  return nameCheck;
}

// Returns a reason if our identifier looks like a product RANGE / model name
// rather than one exact SKU, otherwise null. Examples of ranges:
//   "Inspiron 5440"          - every word is in the family "Dell Inspiron 14 5440"
//   "MacBook Pro 14-inch M5" - the sources say it comes in several configurations
// A real SKU like "15-fa2689TX" or "NP750QHA-LG1IN" is never part of the family name.
function rangeIdentifierReason(variant, details) {
  if (details.single_configuration === false) {
    return "The sources say \"" + variant.sku + "\" is sold in several configurations, so it is a range rather than one exact model.";
  }

  if (!isEmptyValue(details.family_name)) {
    const skuWords = familyWords(variant.sku);
    const familyNameWords = familyWords(getBrand(variant) + " " + details.family_name);

    if (skuWords.length > 0 && skuWords.every((word) => familyNameWords.includes(word))) {
      return "\"" + variant.sku + "\" is part of the family name \"" + details.family_name + "\", so it is a model / range name, not an exact SKU - the configuration found may be only one of several.";
    }
  }

  return null;
}

// Follows the "Status rules" at the top of this file.
// Returns { status, reasons, conflicts, configuration }.
function decideStatus(variant, details, goodResults) {
  const configuration = foundConfiguration(details);
  const reasons = [];
  const conflicts = [];

  // 1. Does the web list several options for any configuration field?
  for (const field of configurationFields) {
    if (configuration[field] && listsSeveralOptions(configuration[field])) {
      reasons.push("The web lists several options for " + field + " (\"" + configuration[field] + "\"), so the exact configuration is unclear.");
    }
  }

  // 2. Is our identifier a range / model name rather than one exact SKU?
  const rangeReason = rangeIdentifierReason(variant, details);

  if (rangeReason) {
    reasons.push(rangeReason);
  }

  // 3. Check the configuration against what we already know.
  const knownFields = configurationFields.filter((field) => !isEmptyValue(variant[field]));

  if (knownFields.length > 0) {
    let confirmed = 0;

    for (const field of knownFields) {
      const found = configuration[field];

      if (found === null) {
        continue;
      }

      // Agrees, or the web is only less specific than us ("i3-1215U" vs our "i3-1215U (12th Gen)").
      if (specValuesAgree(variant[field], found) || isOnlyLessSpecific(variant[field], found)) {
        confirmed = confirmed + 1;
      } else {
        conflicts.push({ spec: field, ours: variant[field], found: found });
        reasons.push("Our " + field + " is \"" + variant[field] + "\" but the web says \"" + found + "\".");
      }
    }

    const needed = Math.min(2, knownFields.length);

    if (confirmed < needed) {
      reasons.push("Only " + confirmed + " of our " + knownFields.length + " known configuration fields could be confirmed online.");
    }
  } else {
    // We knew nothing about the configuration: the web alone must be convincing.
    const missing = ["processor", "ram", "storage"].filter((field) => configuration[field] === null);

    if (missing.length > 0) {
      reasons.push("Could not find the " + missing.join(", ") + " for this exact model number.");
    }

    const websites = countDifferentWebsites(goodResults);

    if (websites < 2) {
      reasons.push("Only " + websites + " website lists this exact model number - at least 2 are needed to trust a configuration we didn't know.");
    }
  }

  const status = reasons.length > 0 ? "needs_review" : "enriched";

  return { status, reasons, conflicts, configuration };
}

// ----------------------------------------------------------------------------
// Step 7b: Work out which product FAMILY this exact model belongs to
// ----------------------------------------------------------------------------
//
// Family rules (a variant is only ever moved on evidence, never on a guess):
//   - Gemini must name the family (e.g. "HP Victus Gaming Laptop 15"), and
//     code checks that name really appears on pages that have this EXACT
//     model number in their link or title.
//   - That needs the manufacturer's own page, or at least 2 different websites.
//   - A name that is only the brand ("Lenovo Laptop") is too generic.
//   - If the family name contains the identifier itself (e.g. "MacBook Pro
//     14-inch M5"), the identifier is a product range, not an exact SKU.
//   - If the brand or the pages disagree, nothing is moved.
//   - Families are matched on a "family key": the family name in lowercase
//     without filler words, e.g. "HP Victus Gaming Laptop 15", "HP Victus 15"
//     and "HP Victus 15 Gaming Laptop" all become "hp victus 15". Keys must be
//     EXACTLY equal - there is no "looks similar" matching.
//   - Only a family that already holds a VERIFIED variant with the same key
//     can receive another variant.

// Words that describe a CONFIGURATION, not a family. A family name that
// contains one of these (e.g. "HP Victus Intel Core i5 13th Gen") is rejected.
const configurationWords = [
  "intel", "amd", "ryzen", "core", "celeron", "pentium", "gen", "gb", "tb", "ssd", "hdd", "ram",
  "ddr4", "ddr5", "rtx", "gtx", "geforce", "nvidia", "radeon", "graphics", "windows", "win11",
];

// True for words like "i5", "16gb", "13th", "13420h" (a processor model).
function isConfigurationWord(word) {
  return (
    configurationWords.includes(word) ||
    /^i[3579]$/.test(word) ||
    /^\d+(gb|tb)$/.test(word) ||
    /^\d+(st|nd|rd|th)$/.test(word) ||
    /^\d{4,5}(h|hs|hx|u|p|g\d?)$/.test(word)
  );
}

// Words that don't tell families apart, left out of the family key.
const fillerFamilyWords = ["laptop", "laptops", "notebook", "gaming", "pc", "copilot", "inch", "in"];

// "HP Victus Gaming Laptop 15" → ["hp", "victus", "15"]
function familyWords(text) {
  return String(text ?? "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word !== "" && !fillerFamilyWords.includes(word));
}

// Builds the family key: brand first (once), then the rest of the name.
// Returns the key and the words that are not the brand.
// Example: ("HP", "HP Victus Gaming Laptop 15") → { key: "hp victus 15", nameWords: ["victus", "15"] }
function makeFamilyKey(brand, familyName) {
  const brandWords = familyWords(brand);
  const nameWords = familyWords(familyName).filter((word) => !brandWords.includes(word));

  return { key: [...brandWords, ...nameWords].join(" "), nameWords };
}

// Returns true if the page's link belongs to the brand's own website,
// e.g. hp.com for HP, samsung.com for Samsung.
function isManufacturerPage(url, brand) {
  const simpleBrand = simplifyText(brand);

  if (simpleBrand === "") {
    return false;
  }

  try {
    const hostName = new URL(url).hostname.toLowerCase();
    return hostName.split(".").some((part) => part === simpleBrand);
  } catch (error) {
    return false;
  }
}

// Checks the family Gemini found against the pages. Returns:
//   { status: "verified" | "needs_review", familyName, familyKey, brand,
//     confidence, supportingWebsites, manufacturerPage, reasons }
function verifyFamily(variant, details, goodResults) {
  const reasons = [];
  const ourBrand = getBrand(variant);
  const foundBrand = isEmptyValue(details.brand) ? ourBrand : String(details.brand).trim();
  let familyName = isEmptyValue(details.family_name) ? null : String(details.family_name).trim();

  const check = {
    status: "needs_review",
    familyName: familyName,
    familyKey: null,
    brand: foundBrand,
    confidence: "none",
    supportingWebsites: [],
    manufacturerPage: null,
    reasons: reasons,
  };

  if (familyName === null) {
    reasons.push("No family / series name was found for this exact model number.");
    return check;
  }

  // The brand on the web must be the brand we already have.
  if (simplifyText(foundBrand) !== simplifyText(ourBrand)) {
    reasons.push("The web says the brand is \"" + foundBrand + "\" but ours is \"" + ourBrand + "\".");
  }

  // Put the brand in front of the name if the pages left it out.
  if (!familyWords(familyName).includes(familyWords(foundBrand)[0])) {
    familyName = foundBrand + " " + familyName;
    check.familyName = familyName;
  }

  const { key, nameWords } = makeFamilyKey(foundBrand, familyName);
  check.familyKey = key;

  if (nameWords.length === 0) {
    reasons.push("The family name \"" + familyName + "\" is only the brand - too generic to group by.");
  } else if (!nameWords.some((word) => /\d/.test(word))) {
    // e.g. "HP Victus" - could be Victus 15 or Victus 16.
    reasons.push("The family name \"" + familyName + "\" has no series number or screen size, so it is too broad to group by.");
  }

  const configInName = nameWords.filter(isConfigurationWord);

  if (configInName.length > 0) {
    reasons.push("The family name \"" + familyName + "\" includes configuration details (" + configInName.join(", ") + "), so it is not a clean family name.");
  }

  // An identifier that is part of the family name, or sold in several
  // configurations, is a range - not an exact model to group.
  const rangeReason = rangeIdentifierReason(variant, details);

  if (rangeReason) {
    reasons.push(rangeReason);
  }

  const conflicts = (details.family_conflicts || []).filter((name) => !isEmptyValue(name));

  if (conflicts.length > 0) {
    reasons.push("The pages give different family names: " + conflicts.join(", ") + ".");
  }

  // Which kept pages (all have the exact model number in link/title) also
  // contain every word of the family name?
  const websites = new Set();

  for (const result of goodResults) {
    const pageText = (result.title || "") + " " + String(result.raw_content || result.content || "").slice(0, 6000);
    const pageWords = new Set(familyWords(pageText));
    const supportsFamily = nameWords.length > 0 && nameWords.every((word) => pageWords.has(word));

    if (!supportsFamily) {
      continue;
    }

    try {
      websites.add(new URL(result.url).hostname.replace(/^www\./, ""));
    } catch (error) {
      continue;
    }

    if (check.manufacturerPage === null && isManufacturerPage(result.url, foundBrand)) {
      check.manufacturerPage = result.url;
    }
  }

  check.supportingWebsites = Array.from(websites);

  if (check.manufacturerPage) {
    check.confidence = "strong (manufacturer page)";
  } else if (websites.size >= 2) {
    check.confidence = "good (" + websites.size + " websites)";
  } else {
    check.confidence = websites.size === 1 ? "weak (1 website)" : "none";
    reasons.push(
      websites.size === 1
        ? "Only 1 website (" + check.supportingWebsites[0] + ") shows this family name with this exact model number - the manufacturer's page or 2 websites are needed."
        : "No page with this exact model number shows the family name \"" + familyName + "\"."
    );
  }

  if (reasons.length === 0) {
    check.status = "verified";
  }

  return check;
}

// Finds the family that already holds a VERIFIED variant with this family key.
// Returns its id, or null. (Other variants of the same exact family.)
async function findVerifiedFamily(supabase, familyKey, variantId) {
  const { data, error } = await supabase
    .from("product_variants")
    .select("id, product_id")
    .eq("enrichment->family->>family_key", familyKey)
    .eq("enrichment->family->>status", "verified")
    .neq("id", variantId);

  if (error) {
    throw new Error("Could not look up verified families: " + error.message);
  }

  // If (unexpectedly) several families hold this key, use the one with the most variants.
  const countByFamily = new Map();

  for (const row of data ?? []) {
    countByFamily.set(row.product_id, (countByFamily.get(row.product_id) || 0) + 1);
  }

  let bestId = null;
  let bestCount = 0;

  for (const [familyId, count] of countByFamily) {
    if (count > bestCount) {
      bestId = familyId;
      bestCount = count;
    }
  }

  return bestId;
}

// Decides where this variant should live. Returns:
//   { check, decision, targetFamilyId, newFamily, summary }
//   - targetFamilyId: move the variant to this existing family (or null = stay)
//   - newFamily:      create this family first, then move the variant into it
// familiesPlannedThisRun remembers families found or created earlier in this
// run, so two variants of the same family in one batch end up together.
async function planFamilyGrouping(supabase, variant, result, familiesPlannedThisRun) {
  const check = verifyFamily(variant, result.enriched_details, result.good_results);

  // If our sheet name and the web name disagree, don't move the variant anywhere.
  if (result.name_check?.status === "mismatch") {
    check.status = "needs_review";
    check.reasons.push("Our sheet name and the verified web name disagree (see the name check), so the variant is not moved.");
  }
  const summary = [];
  const plan = { check, decision: "not moved", targetFamilyId: null, newFamily: null, summary, sheetName: result.sheet_name ?? null };

  if (check.status !== "verified") {
    plan.decision = "not moved - family needs review";
    summary.push("family: \"" + (check.familyName ?? "?") + "\" NOT verified → stays in \"" + variant.product.name + "\"");

    for (const reason of check.reasons) {
      summary.push("FAMILY REVIEW: " + reason);
    }

    return plan;
  }

  summary.push("family: \"" + check.familyName + "\" verified, " + check.confidence);

  // 0. Was this variant's family already verified on an earlier run? Then it
  //    never jumps to another family on a later run:
  //    - same key, or the new name only ADDS detail (e.g. "lenovo ideapad slim 3"
  //      → "lenovo ideapad slim 3 15iau7"): stay, keep the earlier key.
  //    - a genuinely different family: stay, and flag it for family review.
  const previous = variant.enrichment?.family;

  if (previous?.status === "verified" && previous.family_key && previous.decision !== "not moved - family needs review") {
    const previousWords = previous.family_key.split(" ");
    const newWords = check.familyKey.split(" ");
    const onlyAddsDetail = previousWords.every((word) => newWords.includes(word));

    if (onlyAddsDetail) {
      plan.decision = "stays in its verified family";
      plan.keepFamilyKey = previous.family_key;
      summary.push("family: stays in its verified family (key \"" + previous.family_key + "\"" + (previous.family_key !== check.familyKey ? ", this run found more detail: \"" + check.familyName + "\"" : "") + ")");
      familiesPlannedThisRun.set(previous.family_key, variant.product.id);
      return plan;
    }

    check.status = "needs_review";
    check.reasons.push("An earlier run verified this variant as \"" + previous.family_name + "\" but this run found \"" + check.familyName + "\". Not moved.");
    plan.decision = "not moved - family needs review";
    summary.push("FAMILY REVIEW: family changed between runs (\"" + previous.family_name + "\" → \"" + check.familyName + "\"), not moved");
    return plan;
  }

  // 1. A family verified earlier in this run, or already in the database?
  let existingId = familiesPlannedThisRun.get(check.familyKey) ?? null;

  if (existingId === null) {
    existingId = await findVerifiedFamily(supabase, check.familyKey, variant.id);
  }

  if (existingId !== null) {
    if (existingId === variant.product.id) {
      plan.decision = "already in its verified family";
      summary.push("family: already in the verified family \"" + variant.product.name + "\"");
    } else {
      plan.decision = "moved to existing verified family";
      plan.targetFamilyId = existingId;
      summary.push("family: MOVE to the existing verified family (" + existingId + ")");
    }

    familiesPlannedThisRun.set(check.familyKey, existingId);
    return plan;
  }

  // 2. Is the variant's current family already exactly this family?
  //    e.g. current family "HP Victus Gaming Laptop 15" = verified "HP Victus 15".
  if (makeFamilyKey(check.brand, variant.product.name).key === check.familyKey) {
    plan.decision = "current family confirmed";
    summary.push("family: current family \"" + variant.product.name + "\" confirmed as the verified family");
    familiesPlannedThisRun.set(check.familyKey, variant.product.id);
    return plan;
  }

  // 3. No family for it yet: create one and move the variant into it.
  plan.decision = "moved to new verified family";
  plan.newFamily = {
    name: check.familyName,
    brand: check.brand,
    category: variant.product.category ?? null,
    image_url: variant.image_url ?? variant.product.image_url ?? result.images[0]?.url ?? null,
  };
  summary.push("family: CREATE \"" + check.familyName + "\" and move the variant into it");
  familiesPlannedThisRun.set(check.familyKey, "(new family planned earlier in this run: " + check.familyName + ")");
  return plan;
}

// Adds the family decision to the variant's save plan.
// Only product_id changes on the variant; price, quantity, sku, specs stay.
function addFamilyToPlan(plan, variant, familyPlan) {
  const check = familyPlan.check;

  plan.variantFields.enrichment.family = {
    status: check.status,
    family_name: familyPlan.keepFamilyKey ? variant.enrichment.family.family_name : check.familyName,
    family_key: familyPlan.keepFamilyKey ?? check.familyKey,
    latest_family_name_found: check.familyName,
    brand: check.brand,
    confidence: check.confidence,
    manufacturer_page: check.manufacturerPage,
    supporting_websites: check.supportingWebsites,
    evidence: plan.variantFields.enrichment.family_evidence ?? [],
    reasons: check.reasons,
    decision: familyPlan.decision,
    moved_from: familyPlan.targetFamilyId || familyPlan.newFamily ? variant.product.id : null,
    // The family the variant was in before ANY family move (its stock-sheet
    // family). Carried forward on every run, so the sheet name is never lost.
    original_family_id: variant.enrichment?.family?.original_family_id ?? variant.enrichment?.family?.moved_from ?? variant.product.id,
    // The stock-sheet name itself, kept forever (see getSheetName).
    original_sheet_name: variant.enrichment?.family?.original_sheet_name ?? familyPlan.sheetName ?? null,
  };
  delete plan.variantFields.enrichment.family_evidence;

  if (familyPlan.targetFamilyId && !String(familyPlan.targetFamilyId).startsWith("(new family")) {
    plan.variantFields.product_id = familyPlan.targetFamilyId;
  }

  // The brand / image fill-ins belong to the family the variant ends up in.
  if (familyPlan.targetFamilyId || familyPlan.newFamily) {
    plan.familyFields = null;
    plan.fillTargetFamily = Boolean(familyPlan.targetFamilyId);
  }

  plan.newFamily = familyPlan.newFamily;
  plan.familyDecision = familyPlan.decision;
  plan.summary.push(...familyPlan.summary);
}

// ----------------------------------------------------------------------------
// Step 8: Work out what to save, and save it
// ----------------------------------------------------------------------------

// The ONLY variant columns this script may write. price, quantity and sku are
// deliberately missing, so they can never be changed by enrichment.
const allowedVariantColumns = [
  "product_id", // only set by the family step, when the family was verified
  "processor",
  "ram",
  "storage",
  "graphics",
  "specifications",
  "image_url",
  "enrichment_status",
  "enrichment",
  "enriched_at",
];

// The ONLY family columns this script may write (and only when they are empty).
const allowedFamilyColumns = ["brand", "image_url"];

// Removes any column that is not on the allowed list. A safety net, so a
// mistake elsewhere can never overwrite Micron's price or stock.
function keepAllowedColumns(fields, allowedColumns) {
  const safeFields = {};

  for (const column of Object.keys(fields)) {
    if (allowedColumns.includes(column)) {
      safeFields[column] = fields[column];
    }
  }

  return safeFields;
}

// Follows the merge rules at the top of this file. Returns:
//   - status:             the new enrichment_status
//   - variantFields:      the exact variant columns we would update (or null for "change nothing")
//   - familyFields:       the exact family columns we would update (or null)
//   - summary:            a short, readable list of what changes
function planMerge(variant, result) {
  const now = new Date().toISOString();
  const family = variant.product;

  // Could not enrich this variant this time.
  if (result.status !== "matched") {
    const reason = result.error || result.status;

    // If an earlier run already enriched it, keep that data untouched.
    if (variant.enrichment_status === "enriched" || variant.enrichment_status === "needs_review") {
      return {
        status: variant.enrichment_status,
        variantFields: null,
        familyFields: null,
        summary: ["could not enrich this time (" + reason + "), keeping the earlier enrichment"],
      };
    }

    return {
      status: "retry_later",
      variantFields: {
        enrichment_status: "retry_later",
        enriched_at: now,
        enrichment: {
          retry_reason: reason,
          search_query: result.search_query || null,
          amazon: result.amazon ?? variant.enrichment?.amazon ?? null,
        },
      },
      familyFields: null,
      summary: ["marked retry_later: " + reason],
    };
  }

  const details = result.enriched_details;
  const decision = decideStatus(variant, details, result.good_results);
  // Our sheet name and the verified web name disagree → review, copy nothing in.
  const nameCheck = result.name_check ?? null;

  if (nameCheck?.status === "mismatch") {
    decision.status = "needs_review";

    for (const reason of nameCheck.reasons) {
      decision.reasons.push("NAME MISMATCH: " + reason);
    }
  }

  const isVerified = decision.status === "enriched";

  // For a range identifier, one Amazon listing is just ONE of its configurations,
  // so it can't count as a verified match, and its price is not used.
  const rangeReason = rangeIdentifierReason(variant, details);

  if (rangeReason && result.amazon?.match_status === "verified") {
    result.amazon = { ...result.amazon, match_status: "needs_review", reasons: [...(result.amazon.reasons || []), rangeReason] };
    details.prices = (details.prices || []).filter((price) => price.source !== "scrape.do");
  }

  // Other specs = everything Gemini found except the configuration fields.
  const foundOtherSpecs = {};

  for (const [name, value] of Object.entries(details.specifications || {})) {
    if (!configurationFields.includes(name) && name !== "gpu" && !isEmptyValue(value)) {
      foundOtherSpecs[name] = value;
    }
  }

  const summary = [];
  const variantFields = {
    enrichment_status: decision.status,
    enriched_at: now,
  };
  const configurationAdded = [];
  const specsAdded = [];

  if (isVerified) {
    // Fill in missing configuration fields - verified for this exact model.
    for (const field of configurationFields) {
      if (isEmptyValue(variant[field]) && decision.configuration[field]) {
        variantFields[field] = decision.configuration[field];
        configurationAdded.push(field);
        summary.push(field + ": (empty) → " + decision.configuration[field]);
      }
    }

    // Fill in missing other specs. Specs we already have are never changed;
    // if the web disagrees with one of them, it is only noted.
    const ourSpecs = variant.specifications || {};
    const mergedSpecs = { ...ourSpecs };

    for (const [name, value] of Object.entries(foundOtherSpecs)) {
      let ourName = null;

      for (const existingName of Object.keys(ourSpecs)) {
        if (standardSpecName(existingName) === name && !isEmptyValue(ourSpecs[existingName])) {
          ourName = existingName;
        }
      }

      if (ourName === null) {
        mergedSpecs[name] = value;
        specsAdded.push(name);
        summary.push("spec added: " + name + " = " + value);
      } else if (!specValuesAgree(ourSpecs[ourName], value)) {
        decision.conflicts.push({ spec: ourName, ours: ourSpecs[ourName], found: value });
      }
    }

    if (specsAdded.length > 0) {
      variantFields.specifications = mergedSpecs;
    }

    // The variant's own photo, if it has none. These images come from pages
    // whose link has this exact model number.
    if (isEmptyValue(variant.image_url) && result.images.length > 0) {
      variantFields.image_url = result.images[0].url;
      summary.push("image_url: (empty) → " + result.images[0].url);
    }
  }

  variantFields.enrichment = {
    full_product_name: details.full_product_name || null,
    family_evidence: details.family_evidence || [],
    single_configuration: details.single_configuration ?? null,
    found_configuration: decision.configuration,
    found_specifications: foundOtherSpecs,
    images: result.images,
    online_prices: details.prices || [],
    source_urls: details.source_urls || [],
    review_reasons: decision.reasons,
    spec_conflicts: decision.conflicts,
    configuration_added: configurationAdded,
    specs_added: specsAdded,
    notes: details.notes || null,
    search_query: result.search_query,
    gemini_model: geminiModel,
    // Amazon India data from Scrape.do (with its match status and ASIN).
    amazon: result.amazon ?? variant.enrichment?.amazon ?? null,
    // Our sheet name vs the verified web name.
    name_check: nameCheck,
  };

  // Family details are the same for every configuration, so they can be
  // filled in even when this variant's configuration needs review.
  const familyFields = {};

  if (isEmptyValue(family.brand) && !isEmptyValue(details.brand)) {
    familyFields.brand = details.brand;
    summary.push("family brand: (empty) → " + details.brand);
  }

  if (isEmptyValue(family.image_url) && result.images.length > 0) {
    familyFields.image_url = result.images[0].url;
    summary.push("family image_url: (empty) → " + result.images[0].url);
  }

  for (const reason of decision.reasons) {
    summary.push("REVIEW: " + reason);
  }

  summary.push(
    "enrichment: " + result.images.length + " image(s), " +
    variantFields.enrichment.online_prices.length + " online price(s), " +
    variantFields.enrichment.source_urls.length + " source(s)"
  );
  summary.push("enrichment_status → " + decision.status);

  return {
    status: decision.status,
    variantFields: keepAllowedColumns(variantFields, allowedVariantColumns),
    familyFields: Object.keys(familyFields).length > 0 ? keepAllowedColumns(familyFields, allowedFamilyColumns) : null,
    summary,
  };
}

// Saves the planned fields for one variant (and its family, if needed).
// Only the allowed columns are ever sent, so price, quantity and sku can
// never be changed here.
async function saveMerge(supabase, variant, plan) {
  // A new verified family is created first, so the variant can move into it.
  if (plan.newFamily) {
    const { data, error } = await supabase.from("products").insert(plan.newFamily).select("id").single();

    if (error) {
      throw new Error("Could not create the family \"" + plan.newFamily.name + "\" for " + variant.sku + ": " + error.message);
    }

    plan.variantFields.product_id = data.id;
    plan.createdFamilyId = data.id;
  }

  // Moving to an existing verified family: fill in its brand / image only if empty.
  if (plan.fillTargetFamily && plan.variantFields?.product_id) {
    const { data: target } = await supabase
      .from("products")
      .select("id, brand, image_url")
      .eq("id", plan.variantFields.product_id)
      .single();

    const fillIns = {};
    const images = plan.variantFields.enrichment?.images ?? [];

    if (target && isEmptyValue(target.brand) && !isEmptyValue(plan.variantFields.enrichment?.family?.brand)) {
      fillIns.brand = plan.variantFields.enrichment.family.brand;
    }

    if (target && isEmptyValue(target.image_url) && images.length > 0) {
      fillIns.image_url = images[0].url;
    }

    if (Object.keys(fillIns).length > 0) {
      plan.familyFields = fillIns;
      plan.familyFieldsTargetId = target.id;
    }
  }

  // The variant: enrichment, verified fill-ins and (if verified) its new family,
  // all in ONE update, so the database keeps its updated_at unchanged.
  if (plan.variantFields) {
    const { error } = await supabase
      .from("product_variants")
      .update(keepAllowedColumns(plan.variantFields, allowedVariantColumns))
      .eq("id", variant.id);

    if (error) {
      throw new Error("Could not save " + variant.sku + ": " + error.message);
    }
  }

  if (plan.familyFields) {
    const { error } = await supabase
      .from("products")
      .update(keepAllowedColumns(plan.familyFields, allowedFamilyColumns))
      .eq("id", plan.familyFieldsTargetId ?? variant.product.id);

    if (error) {
      throw new Error("Could not save the family of " + variant.sku + ": " + error.message);
    }
  }
}

// ----------------------------------------------------------------------------
// Runs every step for one variant and returns the result.
// ----------------------------------------------------------------------------

// Searches Tavily and keeps only the good pages. Returns everything the
// later steps need, plus the search text that was used.
async function searchAndFilter(searchText, modelNumber) {
  const searchResponse = await searchWithTavily(searchText);
  const allResults = searchResponse.results || [];
  const { goodResults, droppedUrls } = keepGoodResults(allResults, modelNumber);

  console.log("  \"" + searchText + "\" → " + allResults.length + " page(s) found, " + goodResults.length + " kept, " + droppedUrls.length + " dropped.");

  return { searchText, goodResults, droppedUrls };
}

// Our families often have no brand yet, so fall back to the first word of the
// name. Example: "HP Victus Gaming Laptop 15" → "HP".
function getBrand(variant) {
  if (variant.product.brand) {
    return variant.product.brand;
  }

  return variant.product.name.split(" ")[0];
}

// The main search text: brand + exact model number + everything we already
// know about the configuration.
// Example: "HP 15-fa2689TX Intel Core 7 240H 16GB 1TB SSD NVIDIA GeForce RTX 5050 8GB price India"
function buildSearchText(variant) {
  const parts = [getBrand(variant), variant.sku];

  for (const field of configurationFields) {
    if (variant[field]) {
      parts.push(variant[field]);
    }
  }

  parts.push("price India");

  return parts.join(" ");
}

async function enrichOneVariant(variant, sheetName) {
  console.log("Steps 2 + 3: Searching the web with Tavily and keeping only good pages...");
  let search = await searchAndFilter(buildSearchText(variant), variant.sku);

  // If the long search found nothing useful, try a short, simple one.
  if (search.goodResults.length === 0) {
    console.log("  Nothing useful. Trying a simpler search...");
    search = await searchAndFilter(getBrand(variant) + " " + variant.sku, variant.sku);
  }

  const { searchText, droppedUrls } = search;

  // Amazon / Flipkart first, then the manufacturer, then everyone else.
  let goodResults = sortBySourcePriority(search.goodResults, getBrand(variant));

  // Amazon India via Scrape.do. A failure here never stops the enrichment.
  let amazonResult = { amazon: variant.enrichment?.amazon ?? null, page: null, images: [], price: null };

  try {
    amazonResult = await lookUpAmazon(variant, goodResults);
  } catch (error) {
    console.log("  Amazon step failed, carrying on without it: " + (error.message || error));
  }

  // A verified Amazon product goes first, as its own page (replacing any
  // Tavily copy of the same Amazon listing).
  if (amazonResult.page) {
    const asin = amazonResult.amazon.asin;
    goodResults = [amazonResult.page, ...goodResults.filter((result) => asinFromAmazonUrl(result.url) !== asin)];
  }

  if (goodResults.length === 0) {
    console.log("  No good page mentions this exact model number, so we skip it instead of guessing.");

    return {
      status: "no reliable page found for this exact model number",
      search_query: searchText,
      dropped_pages: droppedUrls,
      amazon: amazonResult.amazon,
    };
  }

  console.log("Step 4: Asking Gemini (" + geminiModel + ") to read the pages...");
  const prompt = buildPrompt(variant, goodResults, sheetName);
  const geminiResponse = await askGemini(prompt);
  const details = readJsonAnswer(geminiResponse);

  console.log("Step 5: Checking Gemini's links and prices...");
  const removed = checkGeminiAnswer(details, goodResults);
  console.log("  Removed " + removed.length + " item(s) that failed a check.");

  // Amazon's price comes straight from Scrape.do (exact numbers), so it
  // replaces any Amazon price Gemini copied from the pages.
  if (amazonResult.price) {
    details.prices = (details.prices || []).filter((price) => !isAmazonIndiaUrl(price.product_url) && simplifyText(price.store_name) !== "amazon");
    details.prices.unshift(amazonResult.price);
  }

  console.log("Step 6: Collecting images from the matched product pages...");
  const { images: pageImages, pagesRead } = await collectProductImages(variant.sku, goodResults);
  console.log("  Read " + pagesRead.length + " page(s), kept " + pageImages.length + " image(s).");

  // Images from the verified Amazon product page come after the other pages' images.
  const images = [...pageImages, ...amazonResult.images].slice(0, maxImagesPerProduct + amazonResult.images.length);

  if (amazonResult.images.length > 0) {
    console.log("  Added " + amazonResult.images.length + " image(s) from the verified Amazon listing.");
  }

  const nameCheck = checkSheetName(variant, details, sheetName);

  if (nameCheck.status === "mismatch") {
    console.log("  NAME MISMATCH: " + nameCheck.reasons.join(" "));
  }

  return {
    sheet_name: sheetName,
    name_check: nameCheck,
    amazon: amazonResult.amazon,
    status: details.model_number_matched ? "matched" : "the pages do not clearly mention this exact model number",
    search_query: searchText,
    enriched_details: details,
    images: images,
    good_results: goodResults,
    removed_by_checks: removed,
    dropped_pages: droppedUrls,
  };
}

// Runs all variants one after another, prints what would change, and saves
// it only if --save was typed.
async function main() {
  const commandLine = readCommandLine();
  const supabase = connectToSupabase();

  if (commandLine.save) {
    console.log("MODE: SAVE - results will be written to Supabase.");
  } else {
    console.log("MODE: DRY RUN - nothing will be saved. Add --save to save.");
  }

  console.log("");
  console.log("Step 1: Reading variants from Supabase...");
  const variants = await getVariantsFromSupabase(supabase, commandLine);
  console.log("  " + variants.length + " variant(s), using " + geminiModel + ".");

  const allPlans = [];

  // Family key → family id, for families found or created during this run.
  const familiesPlannedThisRun = new Map();

  for (const variant of variants) {
    // Wait a little before every variant except the first.
    if (allPlans.length > 0) {
      await wait(secondsBetweenProducts);
    }

    const knownConfiguration = configurationFields.map((field) => variant[field]).filter(Boolean).join(" / ");

    console.log("");
    console.log("=== " + variant.sku + " (" + variant.product.name + ") ===");
    console.log("  Known configuration: " + (knownConfiguration || "none"));

    // If one variant fails, note the error and carry on with the next one.
    let result;

    try {
      const sheetName = await getSheetName(supabase, variant);
      result = await enrichOneVariant(variant, sheetName);
    } catch (error) {
      console.log("  Failed: " + (error.message || error));
      result = { status: "failed", error: error.message || String(error) };
    }

    console.log("Step 7 + 8: Deciding the status, the family and what to save...");
    const plan = planMerge(variant, result);
    let familyPlan = null;

    // The family step only runs when the exact model number was matched.
    if (result.status === "matched") {
      try {
        familyPlan = await planFamilyGrouping(supabase, variant, result, familiesPlannedThisRun);
        addFamilyToPlan(plan, variant, familyPlan);
      } catch (error) {
        plan.summary.push("FAMILY step failed, variant stays where it is: " + (error.message || error));
      }
    }

    for (const line of plan.summary) {
      console.log("  - " + line);
    }

    let saved = false;
    let saveFailed = false;

    if (commandLine.save && (plan.variantFields || plan.familyFields)) {
      // If saving fails (e.g. the internet drops for a moment), note it and
      // carry on with the next variant instead of stopping the whole batch.
      try {
        await saveMerge(supabase, variant, plan);
        saved = true;
        console.log("  Saved to Supabase.");

        // Later variants of the same family in this run should join the real new family.
        if (plan.createdFamilyId && familyPlan) {
          familiesPlannedThisRun.set(familyPlan.check.familyKey, plan.createdFamilyId);
        }
      } catch (error) {
        saveFailed = true;
        console.log("  NOT saved: " + (error.message || error));
      }
    }

    const enrichment = plan.variantFields?.enrichment;

    allPlans.push({
      model_number: variant.sku,
      status: plan.status,
      saved: saved,
      failed: result.status === "failed" || saveFailed,
      specs_found: Object.keys(enrichment?.found_specifications || {}).length,
      specs_added: (enrichment?.specs_added || []).length + (enrichment?.configuration_added || []).length,
      images_found: (enrichment?.images || []).length,
      prices_found: (enrichment?.online_prices || []).length,
      variant_fields: plan.variantFields,
      family_fields: plan.familyFields,
      new_family: plan.newFamily ?? null,
      family: plan.variantFields?.enrichment?.family ?? null,
      current_family_name: variant.product.name,
      known_configuration: knownConfiguration,
    });
  }

  console.log("");
  console.log("--- DETAILS ---");
  console.log(JSON.stringify(allPlans, null, 2));

  console.log("");
  console.log("--- SUMMARY ---");
  console.log("model number         status         specs found/added  images  prices  saved");

  const totals = { enriched: 0, needs_review: 0, retry_later: 0, failed: 0, specs_added: 0, images: 0, prices: 0 };

  for (const plan of allPlans) {
    let savedText = "no (dry run)";

    if (plan.saved) {
      savedText = "yes";
    } else if (plan.failed && commandLine.save) {
      savedText = "FAILED";
    } else if (commandLine.save) {
      savedText = "nothing to save";
    }

    console.log(
      plan.model_number.padEnd(21) + " " +
      plan.status.padEnd(15) +
      (plan.specs_found + "/" + plan.specs_added).padEnd(19) +
      String(plan.images_found).padEnd(8) +
      String(plan.prices_found).padEnd(8) +
      savedText
    );

    totals[plan.status] = (totals[plan.status] || 0) + 1;
    totals.specs_added = totals.specs_added + plan.specs_added;
    totals.images = totals.images + plan.images_found;
    totals.prices = totals.prices + plan.prices_found;

    if (plan.failed) {
      totals.failed = totals.failed + 1;
    }
  }

  console.log("");
  console.log("TOTALS: " + JSON.stringify(totals));

  // SKU → full name → brand → detected family → configuration → evidence → decision
  console.log("");
  console.log("--- FAMILY REPORT ---");

  for (const plan of allPlans) {
    const enrichment = plan.variant_fields?.enrichment;
    const family = plan.family;
    const configuration = Object.values(enrichment?.found_configuration || {}).filter(Boolean).join(" / ");

    console.log("");
    console.log(plan.model_number);
    console.log("  full name:      " + (enrichment?.full_product_name ?? "-"));
    console.log("  brand:          " + (family?.brand ?? "-"));
    console.log("  detected family:" + " " + (family?.family_name ?? "-") + (family?.family_key ? "  [key: " + family.family_key + "]" : ""));
    console.log("  configuration:  " + (configuration || "-") + "  (variant status: " + plan.status + ")");
    console.log("  evidence:       " + (family ? family.confidence + (family.manufacturer_page ? " - " + family.manufacturer_page : "") + (family.supporting_websites.length ? " | websites: " + family.supporting_websites.join(", ") : "") : "-"));
    console.log("  decision:       " + (family?.decision ?? "no family step (" + plan.status + ")") + " | was in \"" + plan.current_family_name + "\"");

    for (const reason of family?.reasons ?? []) {
      console.log("  review reason:  " + reason);
    }

    // Our sheet name vs the verified web name.
    const nameCheck = enrichment?.name_check;

    if (nameCheck) {
      console.log("  name check:     " + nameCheck.status + " | sheet \"" + nameCheck.sheet_name + "\" vs web \"" + (nameCheck.web_name ?? "-") + "\"");

      for (const reason of nameCheck.reasons) {
        console.log("    reason:       " + reason);
      }
    }

    // Amazon India (Scrape.do) for this variant.
    const amazon = enrichment?.amazon;

    if (amazon) {
      const product = amazon.product;
      const amazonConfig = Object.values(amazon.configuration || {}).filter(Boolean).join(" / ");
      console.log("  amazon:         " + amazon.match_status + " | ASIN " + (amazon.asin ?? "-") + " (from " + amazon.asin_source + ")");

      if (product) {
        console.log("    title:        " + product.title);
        console.log("    specs:        " + (amazonConfig || "-"));
        console.log("    price:        " + (product.price ?? "-") + " " + (product.currency ?? "") + (product.list_price ? " (MRP " + product.list_price + ")" : "") + " | " + (product.availability_text ?? (product.in_stock ? "in stock" : "-")));
        console.log("    images:       " + product.images.length);
      }

      for (const reason of amazon.reasons ?? []) {
        console.log("    reason:       " + reason);
      }
    } else {
      console.log("  amazon:         not checked");
    }

    // Where each piece of information came from.
    console.log("  sources:        Micron = SKU, price, quantity" + (plan.known_configuration ? ", configuration (" + plan.known_configuration + ")" : "") +
      " | Tavily = " + (enrichment?.source_urls?.length ?? 0) + " page(s)" +
      " | Scrape.do = " + (amazon?.product ? "Amazon listing " + amazon.asin : "nothing used") +
      " | Gemini = family name, configuration and specs read from those pages");
  }

  // Every Scrape.do request made in this run (the token is never printed).
  console.log("");
  console.log("--- SCRAPE.DO REQUESTS ---");

  if (!scrapeDoToken) {
    console.log("SCRAPEDO_API_TOKEN is not set in .env.local - Amazon was skipped, 0 requests.");
  }

  let creditsUsed = 0;

  for (const entry of scrapeDoLog) {
    if (entry.result === "success (1 credit)") {
      creditsUsed = creditsUsed + 1;
    }

    console.log(entry.endpoint.padEnd(7) + " " + entry.sku.padEnd(24) + " " + JSON.stringify(entry.params) + " → " + entry.result);
  }

  console.log("Requests: " + scrapeDoLog.length + " | successful (credits used): " + creditsUsed);
}

main().catch((error) => {
  console.log("");
  console.log("Something went wrong:");
  console.log(error.message || error);
  process.exitCode = 1;
});
