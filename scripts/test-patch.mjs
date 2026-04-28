#!/usr/bin/env node
/**
 * Live integration test for the trello-client.ts patch.
 *
 * Verifies:
 *   1. Long card descriptions no longer 414 (Bug 2 — desc was sent as
 *      query param; now sent as form-encoded body).
 *   2. `pos` on POST /checklists/{id}/checkItems is honored (Bug 1).
 *   3. `pos` on PUT /cards/{id}/checkItem/{idCheckItem} is honored.
 *
 * Run via the wrapper so 1Password supplies TRELLO_API_KEY / TRELLO_TOKEN
 * without echoing them: `~/bin/agents-trello-mcp` execs the MCP server,
 * so we instead source the same env path manually:
 *
 *   TRELLO_API_KEY=$(op read op://agents-trello-mcp/trello-api-key/credential) \
 *   TRELLO_TOKEN=$(op read op://agents-trello-mcp/trello-token/credential) \
 *   node scripts/test-patch.mjs <existing-card-id> <checklist-id>
 *
 * The card is mutated and the checklist gets new items appended; clean up
 * (delete the test card) after the script exits.
 */

import { initializeTrelloClient } from "../dist/services/trello-client.js";

const cardId = process.argv[2];
const checklistId = process.argv[3];

if (!cardId || !checklistId) {
  console.error("Usage: node scripts/test-patch.mjs <card-id> <checklist-id>");
  process.exit(2);
}

const apiKey = process.env.TRELLO_API_KEY;
const token = process.env.TRELLO_TOKEN;
if (!apiKey || !token) {
  console.error("TRELLO_API_KEY and TRELLO_TOKEN must be set in env.");
  process.exit(2);
}

const client = initializeTrelloClient(apiKey, token);

async function step(label, fn) {
  process.stdout.write(`-- ${label} ... `);
  try {
    const result = await fn();
    console.log("OK");
    return result;
  } catch (err) {
    console.log(`FAIL: ${err.message}`);
    throw err;
  }
}

// --- Bug 2: long desc ---
const longDesc =
  `[AGENT TEST patch verify ${new Date().toISOString()}] ` +
  "padding: " +
  "X".repeat(15000);

await step("PUT /cards/{id} with ~15KB desc (Bug 2)", async () => {
  const card = await client.put(`/cards/${cardId}`, { desc: longDesc });
  if (!card || !card.id) throw new Error("no card returned");
  return card;
});

await step("verify desc round-trips via GET", async () => {
  const card = await client.get(`/cards/${cardId}`, { fields: "desc" });
  if (card.desc !== longDesc) {
    throw new Error(
      `desc mismatch: got ${card.desc?.length ?? 0} chars, want ${longDesc.length}`
    );
  }
});

// --- Bug 1: pos on add ---
const tag = Date.now().toString(36);
const addedTop = await step(
  "POST /checklists/{id}/checkItems with pos=top (Bug 1 add)",
  async () => {
    return await client.post(`/checklists/${checklistId}/checkItems`, {
      name: `[AGENT-TEST ${tag}] pos=top via POST`,
      pos: "top",
    });
  }
);
const addedBottom = await step(
  "POST /checklists/{id}/checkItems with pos=bottom",
  async () => {
    return await client.post(`/checklists/${checklistId}/checkItems`, {
      name: `[AGENT-TEST ${tag}] pos=bottom via POST`,
      pos: "bottom",
    });
  }
);

await step("verify pos applied on POST", async () => {
  const cl = await client.get(`/checklists/${checklistId}`, {
    checkItems: "all",
  });
  const top = cl.checkItems.find((i) => i.id === addedTop.id);
  const bot = cl.checkItems.find((i) => i.id === addedBottom.id);
  if (!top || !bot) throw new Error("added items missing on read-back");
  if (top.pos >= bot.pos) {
    throw new Error(
      `pos=top item (pos=${top.pos}) should be < pos=bottom item (pos=${bot.pos})`
    );
  }
  // Also verify ordering in returned array.
  const topIdx = cl.checkItems.findIndex((i) => i.id === addedTop.id);
  const botIdx = cl.checkItems.findIndex((i) => i.id === addedBottom.id);
  if (topIdx >= botIdx) {
    throw new Error(`top item index ${topIdx} should be < bottom index ${botIdx}`);
  }
});

// --- Bug 1: pos on update ---
await step("PUT /cards/{id}/checkItem/{id} with pos=bottom (move top→bottom)", async () => {
  return await client.put(`/cards/${cardId}/checkItem/${addedTop.id}`, {
    pos: "bottom",
  });
});

await step("verify pos applied on PUT", async () => {
  const cl = await client.get(`/checklists/${checklistId}`, {
    checkItems: "all",
  });
  const moved = cl.checkItems.find((i) => i.id === addedTop.id);
  const other = cl.checkItems.find((i) => i.id === addedBottom.id);
  if (!moved || !other) throw new Error("items missing on read-back");
  if (moved.pos <= other.pos) {
    throw new Error(
      `moved item (pos=${moved.pos}) should be > other (pos=${other.pos}) after pos=bottom`
    );
  }
});

console.log("\nAll patch verifications passed.");
