/**
 * Checklist tools for Trello MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getTrelloClient, formatError } from "../services/trello-client.js";
import type { TrelloChecklist, TrelloCheckItem } from "../types.js";

export function registerChecklistTools(server: McpServer): void {
  // --- Create Checklist ---
  server.registerTool(
    "trello_create_checklist",
    {
      title: "Create Checklist on Card",
      description: `Create a new checklist on a card.

Args:
  - card_id: The card ID
  - name: Checklist name
  - items: Array of initial checklist items (optional)
  - pos: Position - "top", "bottom", or a positive number (optional)

Returns:
  Created checklist with id and name.`,
      inputSchema: {
        card_id: z.string().describe("The card ID"),
        name: z.string().min(1).max(16384).describe("Checklist name"),
        items: z.array(z.string()).optional().describe("Initial checklist items"),
        pos: z
          .union([z.literal("top"), z.literal("bottom"), z.number().positive()])
          .optional()
          .describe("Position"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ card_id, name, items, pos }) => {
      try {
        const client = getTrelloClient();
        const checklist = await client.post<TrelloChecklist>("/checklists", {
          idCard: card_id,
          name,
          pos: pos !== undefined ? String(pos) : undefined,
        });

        // Add initial items if provided
        if (items && items.length > 0) {
          for (const item of items) {
            await client.post(`/checklists/${checklist.id}/checkItems`, {
              name: item,
            });
          }
        }

        return {
          content: [
            {
              type: "text",
              text: `Checklist created: "${name}"${items?.length ? ` with ${items.length} items` : ""}`,
            },
          ],
          structuredContent: {
            id: checklist.id,
            name: checklist.name,
            itemCount: items?.length || 0,
          },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: formatError(error, "creating checklist") }],
          isError: true,
        };
      }
    }
  );

  // --- Update Checklist ---
  server.registerTool(
    "trello_update_checklist",
    {
      title: "Update Checklist",
      description: `Update a checklist's name or position.

Args:
  - checklist_id: The checklist ID
  - name: New checklist name (optional)
  - pos: New position (optional)

Returns:
  Updated checklist confirmation.`,
      inputSchema: {
        checklist_id: z.string().describe("The checklist ID"),
        name: z.string().optional().describe("New checklist name"),
        pos: z
          .union([z.literal("top"), z.literal("bottom"), z.number().positive()])
          .optional()
          .describe("New position"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ checklist_id, name, pos }) => {
      try {
        if (name === undefined && pos === undefined) {
          return { content: [{ type: "text", text: "No updates provided" }] };
        }

        const client = getTrelloClient();
        const updates: Record<string, string | undefined> = {};
        if (name !== undefined) updates.name = name;
        if (pos !== undefined) updates.pos = String(pos);

        const checklist = await client.put<TrelloChecklist>(
          `/checklists/${checklist_id}`,
          updates
        );

        return {
          content: [
            { type: "text", text: `Checklist updated: "${checklist.name}"` },
          ],
          structuredContent: { id: checklist.id, name: checklist.name },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: formatError(error, "updating checklist") }],
          isError: true,
        };
      }
    }
  );

  // --- Delete Checklist ---
  server.registerTool(
    "trello_delete_checklist",
    {
      title: "Delete Checklist",
      description: `Delete a checklist from a card.

Args:
  - checklist_id: The checklist ID

Returns:
  Confirmation message.`,
      inputSchema: {
        checklist_id: z.string().describe("The checklist ID"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ checklist_id }) => {
      try {
        const client = getTrelloClient();
        await client.delete(`/checklists/${checklist_id}`);

        return {
          content: [{ type: "text", text: "Checklist deleted successfully" }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: formatError(error, "deleting checklist") }],
          isError: true,
        };
      }
    }
  );

  // --- Get Checklist ---
  server.registerTool(
    "trello_get_checklist",
    {
      title: "Get Checklist",
      description: `Get a checklist with all its items.

Args:
  - checklist_id: The checklist ID

Returns:
  Checklist with name and items (showing complete/incomplete status).`,
      inputSchema: {
        checklist_id: z.string().describe("The checklist ID"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ checklist_id }) => {
      try {
        const client = getTrelloClient();
        const checklist = await client.get<TrelloChecklist>(
          `/checklists/${checklist_id}`,
          { checkItems: "all" }
        );

        const result = {
          id: checklist.id,
          name: checklist.name,
          items:
            checklist.checkItems?.map((item) => ({
              id: item.id,
              name: item.name,
              complete: item.state === "complete",
            })) || [],
        };

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          structuredContent: result,
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: formatError(error, "getting checklist") }],
          isError: true,
        };
      }
    }
  );

  // --- Add Checklist Item ---
  server.registerTool(
    "trello_add_checklist_item",
    {
      title: "Add Checklist Item",
      description: `Add a new item to a checklist.

Args:
  - checklist_id: The checklist ID
  - name: Item name/text
  - pos: Position - "top", "bottom", or a positive number (optional)
  - checked: Start as checked (default: false)

Returns:
  Created item info.`,
      inputSchema: {
        checklist_id: z.string().describe("The checklist ID"),
        name: z.string().min(1).max(16384).describe("Item name"),
        pos: z
          .union([z.literal("top"), z.literal("bottom"), z.number().positive()])
          .optional()
          .describe("Position"),
        checked: z.boolean().optional().describe("Start as checked"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ checklist_id, name, pos, checked }) => {
      try {
        const client = getTrelloClient();
        const item = await client.post<TrelloCheckItem>(
          `/checklists/${checklist_id}/checkItems`,
          {
            name,
            pos: pos !== undefined ? String(pos) : undefined,
            checked: checked ? "true" : undefined,
          }
        );

        return {
          content: [{ type: "text", text: `Item added: "${item.name}"` }],
          structuredContent: {
            id: item.id,
            name: item.name,
            complete: item.state === "complete",
          },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: formatError(error, "adding checklist item") }],
          isError: true,
        };
      }
    }
  );

  // --- Update Checklist Item ---
  server.registerTool(
    "trello_update_checklist_item",
    {
      title: "Update Checklist Item",
      description: `Update a checklist item's name, state, or position.

Args:
  - card_id: The card ID containing the checklist
  - check_item_id: The checklist item ID
  - name: New item name (optional)
  - state: "complete" or "incomplete" (optional)
  - pos: New position (optional)

Returns:
  Confirmation message.`,
      inputSchema: {
        card_id: z.string().describe("The card ID"),
        check_item_id: z.string().describe("The checklist item ID"),
        name: z.string().optional().describe("New item name"),
        state: z
          .enum(["complete", "incomplete"])
          .optional()
          .describe("Item state"),
        pos: z
          .union([z.literal("top"), z.literal("bottom"), z.number().positive()])
          .optional()
          .describe("New position"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ card_id, check_item_id, name, state, pos }) => {
      try {
        if (name === undefined && state === undefined && pos === undefined) {
          return { content: [{ type: "text", text: "No updates provided" }] };
        }

        const client = getTrelloClient();
        const updates: Record<string, string | undefined> = {};
        if (name !== undefined) updates.name = name;
        if (state !== undefined) updates.state = state;
        if (pos !== undefined) updates.pos = String(pos);

        await client.put(`/cards/${card_id}/checkItem/${check_item_id}`, updates);

        const stateMsg = state ? ` as ${state}` : "";
        return {
          content: [{ type: "text", text: `Checklist item updated${stateMsg}` }],
        };
      } catch (error) {
        return {
          content: [
            { type: "text", text: formatError(error, "updating checklist item") },
          ],
          isError: true,
        };
      }
    }
  );

  // --- Delete Checklist Item ---
  server.registerTool(
    "trello_delete_checklist_item",
    {
      title: "Delete Checklist Item",
      description: `Delete an item from a checklist.

Args:
  - checklist_id: The checklist ID
  - check_item_id: The checklist item ID

Returns:
  Confirmation message.`,
      inputSchema: {
        checklist_id: z.string().describe("The checklist ID"),
        check_item_id: z.string().describe("The checklist item ID"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ checklist_id, check_item_id }) => {
      try {
        const client = getTrelloClient();
        await client.delete(
          `/checklists/${checklist_id}/checkItems/${check_item_id}`
        );

        return {
          content: [{ type: "text", text: "Checklist item deleted" }],
        };
      } catch (error) {
        return {
          content: [
            { type: "text", text: formatError(error, "deleting checklist item") },
          ],
          isError: true,
        };
      }
    }
  );

  // --- Copy Checklist ---
  server.registerTool(
    "trello_copy_checklist",
    {
      title: "Copy Checklist",
      description: `Copy a checklist to a card (same or different card).

Args:
  - card_id: Destination card ID
  - source_checklist_id: Source checklist ID to copy

Returns:
  New checklist info.`,
      inputSchema: {
        card_id: z.string().describe("Destination card ID"),
        source_checklist_id: z.string().describe("Source checklist ID"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ card_id, source_checklist_id }) => {
      try {
        const client = getTrelloClient();
        const checklist = await client.post<TrelloChecklist>("/checklists", {
          idCard: card_id,
          idChecklistSource: source_checklist_id,
        });

        return {
          content: [{ type: "text", text: `Checklist copied: "${checklist.name}"` }],
          structuredContent: { id: checklist.id, name: checklist.name },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: formatError(error, "copying checklist") }],
          isError: true,
        };
      }
    }
  );
}
