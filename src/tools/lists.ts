/**
 * List tools for Trello MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getTrelloClient, formatError } from "../services/trello-client.js";
import type { TrelloList, TrelloCard } from "../types.js";

export function registerListTools(server: McpServer): void {
  // --- Create List ---
  server.registerTool(
    "trello_create_list",
    {
      title: "Create Trello List",
      description: `Create a new list on a board.

Args:
  - board_id: The board ID to add the list to
  - name: List name
  - pos: Position - "top", "bottom", or a positive number (optional)

Returns:
  Created list with id and name.`,
      inputSchema: {
        board_id: z.string().describe("The board ID"),
        name: z.string().min(1).max(16384).describe("List name"),
        pos: z
          .union([z.literal("top"), z.literal("bottom"), z.number().positive()])
          .optional()
          .describe("Position: 'top', 'bottom', or a number"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ board_id, name, pos }) => {
      try {
        const client = getTrelloClient();
        const list = await client.post<TrelloList>("/lists", {
          idBoard: board_id,
          name,
          pos: pos !== undefined ? String(pos) : undefined,
        });

        return {
          content: [
            { type: "text", text: `List created: "${list.name}" (${list.id})` },
          ],
          structuredContent: { id: list.id, name: list.name },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: formatError(error, "creating list") }],
          isError: true,
        };
      }
    }
  );

  // --- Update List ---
  server.registerTool(
    "trello_update_list",
    {
      title: "Update Trello List",
      description: `Update a list's name, position, or archive status.

Args:
  - list_id: The list ID
  - name: New list name (optional)
  - closed: Archive (true) or unarchive (false) the list (optional)
  - pos: New position - "top", "bottom", or a positive number (optional)

Returns:
  Updated list confirmation.`,
      inputSchema: {
        list_id: z.string().describe("The list ID"),
        name: z.string().optional().describe("New list name"),
        closed: z.boolean().optional().describe("Archive/unarchive the list"),
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
    async ({ list_id, name, closed, pos }) => {
      try {
        if (name === undefined && closed === undefined && pos === undefined) {
          return { content: [{ type: "text", text: "No updates provided" }] };
        }

        const client = getTrelloClient();
        const updates: Record<string, string | undefined> = {};
        if (name !== undefined) updates.name = name;
        if (closed !== undefined) updates.closed = String(closed);
        if (pos !== undefined) updates.pos = String(pos);

        const list = await client.put<TrelloList>(`/lists/${list_id}`, updates);

        return {
          content: [
            { type: "text", text: `List updated: "${list.name}" (${list.id})` },
          ],
          structuredContent: { id: list.id, name: list.name, closed: list.closed },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: formatError(error, "updating list") }],
          isError: true,
        };
      }
    }
  );

  // --- Get List Cards ---
  server.registerTool(
    "trello_get_list_cards",
    {
      title: "Get Cards in List",
      description: `Get all cards in a Trello list.

Args:
  - list_id: The list ID

Returns:
  Array of cards with id, name, description, due date, labels, and members.`,
      inputSchema: {
        list_id: z.string().describe("The list ID"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ list_id }) => {
      try {
        const client = getTrelloClient();
        const cards = await client.get<TrelloCard[]>(`/lists/${list_id}/cards`, {
          fields: "name,desc,due,dueComplete,shortUrl,labels,idMembers,closed,pos",
        });

        const result = cards.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.desc || null,
          due: c.due || null,
          dueComplete: c.dueComplete || false,
          url: c.shortUrl,
          labels: c.labels?.map((l) => ({ id: l.id, name: l.name, color: l.color })) || [],
          memberIds: c.idMembers || [],
          archived: c.closed,
          pos: c.pos,
        }));

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          structuredContent: { cards: result, count: result.length },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: formatError(error, "getting list cards") }],
          isError: true,
        };
      }
    }
  );

  // --- Archive All Cards in List ---
  server.registerTool(
    "trello_archive_all_cards",
    {
      title: "Archive All Cards in List",
      description: `Archive all cards in a list.

Args:
  - list_id: The list ID

Returns:
  Confirmation message.`,
      inputSchema: {
        list_id: z.string().describe("The list ID"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ list_id }) => {
      try {
        const client = getTrelloClient();
        await client.post(`/lists/${list_id}/archiveAllCards`);

        return {
          content: [{ type: "text", text: "All cards in list have been archived" }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: formatError(error, "archiving cards") }],
          isError: true,
        };
      }
    }
  );

  // --- Move All Cards in List ---
  server.registerTool(
    "trello_move_all_cards",
    {
      title: "Move All Cards in List",
      description: `Move all cards from one list to another.

Args:
  - list_id: The source list ID
  - destination_list_id: The destination list ID
  - destination_board_id: The destination board ID (required, can be same board)

Returns:
  Confirmation message.`,
      inputSchema: {
        list_id: z.string().describe("The source list ID"),
        destination_list_id: z.string().describe("The destination list ID"),
        destination_board_id: z.string().describe("The destination board ID"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ list_id, destination_list_id, destination_board_id }) => {
      try {
        const client = getTrelloClient();
        await client.post(`/lists/${list_id}/moveAllCards`, {
          idBoard: destination_board_id,
          idList: destination_list_id,
        });

        return {
          content: [{ type: "text", text: "All cards moved successfully" }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: formatError(error, "moving cards") }],
          isError: true,
        };
      }
    }
  );

  // --- Move List to Board ---
  server.registerTool(
    "trello_move_list",
    {
      title: "Move List to Board",
      description: `Move a list to a different board.

Args:
  - list_id: The list ID
  - board_id: The destination board ID

Returns:
  Confirmation message.`,
      inputSchema: {
        list_id: z.string().describe("The list ID"),
        board_id: z.string().describe("The destination board ID"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ list_id, board_id }) => {
      try {
        const client = getTrelloClient();
        const list = await client.put<TrelloList>(`/lists/${list_id}/idBoard`, {
          value: board_id,
        });

        return {
          content: [
            { type: "text", text: `List "${list.name}" moved to new board` },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: formatError(error, "moving list") }],
          isError: true,
        };
      }
    }
  );
}
