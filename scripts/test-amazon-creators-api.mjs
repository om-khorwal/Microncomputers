// Standalone test script for the Amazon Creators API.
//
// This file is completely separate from the main app:
// - it does not change anything in app/, lib/, or components/
// - it does not save anything to Supabase
// - it only reads one product from Supabase and sends it to Amazon as a search
//
// What this script does, step by step:
//   1. Connect to Supabase and grab one real product.
//   2. Use that product's name as a search keyword.
//   3. Call the official Amazon Creators API to search for that product.
//   4. Print the raw response, then a cleaned-up summary of the first result.
//
// How to run this file:
//   node --env-file=.env --env-file=.env.local scripts/test-amazon-creators-api.mjs
//
// (Two --env-file flags because our normal Supabase keys live in .env, and
// the Amazon credentials live in .env.local.)

import { createClient } from "@supabase/supabase-js";
import { ApiClient, TypedDefaultApi } from "amazon-creators-api";

// Which Amazon marketplace to search, e.g. "www.amazon.co.uk" or "www.amazon.in".
// Falls back to a default if AMAZON_MARKETPLACE isn't set in .env.local.
const amazonMarketplace = process.env.AMAZON_MARKETPLACE || "www.amazon.co.uk";

// How many search results to ask Amazon for.
const searchResultCount = 5;

// Which pieces of product data we want back. Amazon only returns fields you
// explicitly ask for here - this list covers everything the task asked for.
const resourcesToRequest = [
  "itemInfo.title",
  "itemInfo.byLineInfo", // includes brand
  "itemInfo.features", // specifications / bullet points
  "images.primary.medium",
  "offersV2.listings.price",
  "offersV2.listings.availability",
];

// Step 1: Pick one real product from our Supabase products table.
async function getOneProductFromSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Did you forget --env-file=.env ?");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase.from("products").select("model_number, name").limit(1);

  if (error) {
    throw new Error("Could not read a product from Supabase: " + error.message);
  }

  if (!data || data.length === 0) {
    throw new Error("No products found in Supabase. Add at least one product first.");
  }

  return data[0];
}

// Step 2: Set up the Amazon Creators API client using our credentials.
function createAmazonApiClient() {
  const credentialId = process.env.AMAZON_CREDENTIAL_ID;
  const credentialSecret = process.env.AMAZON_CREDENTIAL_SECRET;
  const credentialVersion = process.env.AMAZON_CREDENTIAL_VERSION;
  const partnerTag = process.env.AMAZON_PARTNER_TAG;

  if (!credentialId || !credentialSecret || !credentialVersion) {
    throw new Error(
      "Missing AMAZON_CREDENTIAL_ID / AMAZON_CREDENTIAL_SECRET / AMAZON_CREDENTIAL_VERSION in .env.local."
    );
  }

  if (!partnerTag) {
    throw new Error("Missing AMAZON_PARTNER_TAG in .env.local (your Amazon Associates tracking ID).");
  }

  const apiClient = new ApiClient();
  apiClient.credentialId = credentialId;
  apiClient.credentialSecret = credentialSecret;
  apiClient.version = credentialVersion;

  const api = new TypedDefaultApi(apiClient);

  return { api: api, partnerTag: partnerTag };
}

// Step 3: Search Amazon for the product using its name as the keyword.
async function searchAmazonForProduct(api, partnerTag, searchKeywords) {
  const searchRequest = {
    partnerTag: partnerTag,
    keywords: searchKeywords,
    searchIndex: "All",
    itemCount: searchResultCount,
    resources: resourcesToRequest,
  };

  return api.searchItems(amazonMarketplace, searchRequest);
}

// Step 4: Print one search result in a clean, readable way. Every field is
// read with "?." because Amazon only fills in fields it actually has data for.
function printCleanedItem(item) {
  const firstListing = item?.offersV2?.listings?.[0];

  console.log("Title:        ", item?.itemInfo?.title?.displayValue);
  console.log("ASIN:         ", item?.asin);
  console.log("Brand:        ", item?.itemInfo?.byLineInfo?.brand?.displayValue);
  console.log("Product URL:  ", item?.detailPageURL);
  console.log("Price:        ", firstListing?.price?.money?.displayAmount);
  console.log("Currency:     ", firstListing?.price?.money?.currency);
  console.log("Availability: ", firstListing?.availability?.message);
  console.log("Image URL:    ", item?.images?.primary?.medium?.url);
  console.log("Features:     ", item?.itemInfo?.features?.displayValues);
}

// Runs all the steps above in order.
async function main() {
  console.log("Step 1: Picking a product from Supabase...");
  const product = await getOneProductFromSupabase();
  console.log("Using product:", product.name, "(model number:", product.model_number + ")");

  console.log("");
  console.log("Step 2: Setting up the Amazon Creators API client...");
  const client = createAmazonApiClient();

  console.log("");
  console.log("Step 3: Searching Amazon (" + amazonMarketplace + ") for:", product.name);
  const response = await searchAmazonForProduct(client.api, client.partnerTag, product.name);

  console.log("");
  console.log("--- RAW RESPONSE FROM AMAZON ---");
  console.log(JSON.stringify(response, null, 2));

  const items = response?.searchResult?.items || [];

  console.log("");
  console.log("--- CLEANED SUMMARY (first result) ---");
  if (items.length === 0) {
    console.log("No items found for this search.");
  } else {
    printCleanedItem(items[0]);
  }
}

main().catch((error) => {
  console.log("");
  console.log("Something went wrong:");

  if (error && error.status) {
    // This is an error response from Amazon itself.
    console.log("HTTP status:", error.status, error.statusText);
    console.log("Response body:", JSON.stringify(error.body, null, 2));
  } else {
    console.log(error);
  }
});
