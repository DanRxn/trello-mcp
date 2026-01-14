/**
 * Card tools for Trello MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getTrelloClient, formatError } from "../services/trello-client.js";
import type {
  TrelloCard,
  TrelloComment,
  TrelloAttachment,
  TrelloSearchResult,
} from "../types.js";
import { DEFAULT_LIMIT, CHARACTER_LIMIT } from "../constants.js";

export function registerCardTools(server: McpServer): void {
  // --- Get Card ---
  server.registerTool(
    "trello_get_card",
    {
      title: "Get Card Details",
      description: `Get full details of a Trello card including checklists, labels, and members.

Args:
  - card_id: The card ID or shortLink

Returns:
  Card details with name, description, due date, labels, checklists (with items), members, and attachments.`,
      inputSchema: {
        card_id: z.string().describe("The card ID or shortLink"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ card_id }) => {
      try {
        const client = getTrelloClient();
        const card = await client.get<TrelloCard>(`/cards/${card_id}`, {
          fields: "name,desc,due,dueComplete,shortUrl,labels,idMembers,idList,idBoard,closed",
          checklists: "all",
          attachments: "true",
          members: "true",
        });

        const result = {
          id: card.id,
          name: card.name,
          description: card.desc || null,
          due: card.due || null,
          dueComplete: card.dueComplete || false,
          url: card.shortUrl,
          boardId: card.idBoard,
          listId: card.idList,
          archived: card.closed,
          labels:
            card.labels?.map((l) => ({
              id: l.id,
              name: l.name || "(no name)",
              color: l.color,
            })) || [],
          checklists:
            card.checklists?.map((cl) => ({
              id: cl.id,
              name: cl.name,
              items:
                cl.checkItems?.map((item) => ({
                  id: item.id,
                  name: item.name,
                  complete: item.state === "complete",
                })) || [],
            })) || [],
          attachments:
            card.attachments?.map((a) => ({
              id: a.id,
              name: a.name,
              url: a.url,
              date: a.date,
            })) || [],
          memberIds: card.idMembers || [],
        };

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          structuredContent: result,
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: formatError(error, "getting card") }],
          isError: true,
        };
      }
    }
  );

  // --- Create Card ---
  server.registerTool(
    "trello_create_card",
    {
      title: "Create Trello Card",
      description: `Create a new card in a Trello list.

Args:
  - list_id: The list ID to add the card to
  - name: Card title
  - desc: Card description (optional)
  - due: Due date in ISO 8601 format (optional)
  - pos: Position - "top", "bottom", or a positive number (optional)
  - label_ids: Array of label IDs to add (optional)
  - member_ids: Array of member IDs to assign (optional)

Returns:
  Created card with id, name, and url.`,
      inputSchema: {
        list_id: z.string().describe("The list ID"),
        name: z.string().min(1).max(16384).describe("Card title"),
        desc: z.string().optional().describe("Card description"),
        due: z.string().optional().describe("Due date (ISO 8601)"),
        pos: z
          .union([z.literal("top"), z.literal("bottom"), z.number().positive()])
          .optional()
          .describe("Position"),
        label_ids: z.array(z.string()).optional().describe("Label IDs to add"),
        member_ids: z.array(z.string()).optional().describe("Member IDs to assign"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ list_id, name, desc, due, pos, label_ids, member_ids }) => {
      try {
        const client = getTrelloClient();
        const card = await client.post<TrelloCard>("/cards", {
          idList: list_id,
          name,
          desc,
          due,
          pos: pos !== undefined ? String(pos) : undefined,
          idLabels: label_ids?.join(","),
          idMembers: member_ids?.join(","),
        });

        return {
          content: [
            {
              type: "text",
              text: `Card created: "${card.name}" (${card.shortUrl || card.url})`,
            },
          ],
          structuredContent: {
            id: card.id,
            name: card.name,
            url: card.shortUrl || card.url,
          },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: formatError(error, "creating card") }],
          isError: true,
        };
      }
    }
  );

  // --- Update Card ---
  server.registerTool(
    "trello_update_card",
    {
      title: "Update Trello Card",
      description: `Update a card's fields.

Args:
  - card_id: The card ID
  - name: New card title (optional)
  - desc: New description (optional)
  - due: New due date (ISO 8601) or "null" to remove (optional)
  - due_complete: Mark due date as complete (optional)
  - closed: Archive (true) or unarchive (false) the card (optional)
  - list_id: Move card to a different list (optional)
  - pos: New position (optional)

Returns:
  Updated card confirmation.`,
      inputSchema: {
        card_id: z.string().describe("The card ID"),
        name: z.string().optional().describe("New card title"),
        desc: z.string().optional().describe("New description"),
        due: z.string().optional().describe("Due date (ISO 8601) or 'null' to remove"),
        due_complete: z.boolean().optional().describe("Mark due date complete"),
        closed: z.boolean().optional().describe("Archive/unarchive"),
        list_id: z.string().optional().describe("Move to different list"),
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
    async ({ card_id, name, desc, due, due_complete, closed, list_id, pos }) => {
      try {
        const updates: Record<string, string | undefined> = {};
        if (name !== undefined) updates.name = name;
        if (desc !== undefined) updates.desc = desc;
        if (due !== undefined) updates.due = due === "null" ? "" : due;
        if (due_complete !== undefined) updates.dueComplete = String(due_complete);
        if (closed !== undefined) updates.closed = String(closed);
        if (list_id !== undefined) updates.idList = list_id;
        if (pos !== undefined) updates.pos = String(pos);

        if (Object.keys(updates).length === 0) {
          return { content: [{ type: "text", text: "No updates provided" }] };
        }

        const client = getTrelloClient();
        const card = await client.put<TrelloCard>(`/cards/${card_id}`, updates);

        return {
          content: [
            {
              type: "text",
              text: `Card updated: "${card.name}" (${card.shortUrl || card.url})`,
            },
          ],
          structuredContent: { id: card.id, name: card.name },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: formatError(error, "updating card") }],
          isError: true,
        };
      }
    }
  );

  // --- Delete Card ---
  server.registerTool(
    "trello_delete_card",
    {
      title: "Delete Trello Card",
      description: `Permanently delete a card. This cannot be undone.

Args:
  - card_id: The card ID

Returns:
  Confirmation message.`,
      inputSchema: {
        card_id: z.string().describe("The card ID"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ card_id }) => {
      try {
        const client = getTrelloClient();
        await client.delete(`/cards/${card_id}`);

        return {
          content: [{ type: "text", text: "Card deleted successfully" }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: formatError(error, "deleting card") }],
          isError: true,
        };
      }
    }
  );

  // --- Search Cards ---
  server.registerTool(
    "trello_search_cards",
    {
      title: "Search Trello Cards",
      description: `Search for cards using Trello's full-text search.

Args:
  - query: Search query (supports Trello search operators)
  - board_ids: Limit search to specific boards (optional, comma-separated or array)
  - limit: Maximum results (default: 25, max: 1000)
  - include_archived: Include archived cards (default: false)

Search operators:
  - @username - cards assigned to user
  - #label - cards with label
  - is:open, is:archived - card status
  - due:day, due:week, due:month - due date filters
  - has:attachments, has:description - card features

Returns:
  Array of matching cards.`,
      inputSchema: {
        query: z.string().describe("Search query"),
        board_ids: z
          .union([z.string(), z.array(z.string())])
          .optional()
          .describe("Board ID(s) to search within"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(1000)
          .optional()
          .describe("Max results (default: 25)"),
        include_archived: z
          .boolean()
          .optional()
          .describe("Include archived cards"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ query, board_ids, limit, include_archived }) => {
      try {
        const client = getTrelloClient();
        const boardIdStr = Array.isArray(board_ids)
          ? board_ids.join(",")
          : board_ids;

        const params: Record<string, string> = {
          query,
          modelTypes: "cards",
          cards_limit: String(limit ?? DEFAULT_LIMIT),
          card_fields: "name,desc,due,dueComplete,shortUrl,idBoard,idList,labels,closed",
        };
        if (boardIdStr) params.idBoards = boardIdStr;

        const response = await client.get<TrelloSearchResult>("/search", params);
        const rawCards = response.cards || [];

        const filtered = include_archived
          ? rawCards
          : rawCards.filter((c) => !c.closed);

        const result = filtered.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.desc || null,
          due: c.due || null,
          dueComplete: c.dueComplete || false,
          url: c.shortUrl,
          boardId: c.idBoard,
          listId: c.idList,
          labels: c.labels?.map((l) => l.name || l.color) || [],
          archived: c.closed,
        }));

        // Truncate if too large
        let output = JSON.stringify(
          { query, count: result.length, cards: result },
          null,
          2
        );

        if (output.length > CHARACTER_LIMIT) {
          const truncatedCards = result.slice(0, Math.ceil(result.length / 2));
          output = JSON.stringify(
            {
              query,
              count: truncatedCards.length,
              truncated: true,
              message: `Results truncated. Use board_ids filter to narrow search.`,
              cards: truncatedCards,
            },
            null,
            2
          );
        }

        return {
          content: [{ type: "text", text: output }],
          structuredContent: { query, count: result.length, cards: result },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: formatError(error, "searching cards") }],
          isError: true,
        };
      }
    }
  );

  // --- Add Comment ---
  server.registerTool(
    "trello_add_comment",
    {
      title: "Add Comment to Card",
      description: `Add a comment to a Trello card.

Args:
  - card_id: The card ID
  - text: Comment text

Returns:
  Confirmation message.`,
      inputSchema: {
        card_id: z.string().describe("The card ID"),
        text: z.string().min(1).max(16384).describe("Comment text"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ card_id, text }) => {
      try {
        const client = getTrelloClient();
        await client.post(`/cards/${card_id}/actions/comments`, { text });

        return {
          content: [{ type: "text", text: "Comment added successfully" }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: formatError(error, "adding comment") }],
          isError: true,
        };
      }
    }
  );

  // --- Get Card Comments ---
  server.registerTool(
    "trello_get_card_comments",
    {
      title: "Get Card Comments",
      description: `Get all comments on a card.

Args:
  - card_id: The card ID

Returns:
  Array of comments with author and text.`,
      inputSchema: {
        card_id: z.string().describe("The card ID"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ card_id }) => {
      try {
        const client = getTrelloClient();
        const actions = await client.get<TrelloComment[]>(
          `/cards/${card_id}/actions`,
          { filter: "commentCard" }
        );

        const result = actions.map((a) => ({
          id: a.id,
          text: a.data.text,
          author: a.memberCreator?.fullName || a.idMemberCreator,
          date: a.date,
        }));

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          structuredContent: { comments: result, count: result.length },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: formatError(error, "getting comments") }],
          isError: true,
        };
      }
    }
  );

  // --- Update Comment ---
  server.registerTool(
    "trello_update_comment",
    {
      title: "Update Card Comment",
      description: `Update an existing comment on a card.

Args:
  - card_id: The card ID
  - comment_id: The comment/action ID
  - text: New comment text

Returns:
  Confirmation message.`,
      inputSchema: {
        card_id: z.string().describe("The card ID"),
        comment_id: z.string().describe("The comment ID"),
        text: z.string().min(1).max(16384).describe("New comment text"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ card_id, comment_id, text }) => {
      try {
        const client = getTrelloClient();
        await client.put(`/cards/${card_id}/actions/${comment_id}/comments`, {
          text,
        });

        return {
          content: [{ type: "text", text: "Comment updated successfully" }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: formatError(error, "updating comment") }],
          isError: true,
        };
      }
    }
  );

  // --- Delete Comment ---
  server.registerTool(
    "trello_delete_comment",
    {
      title: "Delete Card Comment",
      description: `Delete a comment from a card.

Args:
  - card_id: The card ID
  - comment_id: The comment/action ID

Returns:
  Confirmation message.`,
      inputSchema: {
        card_id: z.string().describe("The card ID"),
        comment_id: z.string().describe("The comment ID"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ card_id, comment_id }) => {
      try {
        const client = getTrelloClient();
        await client.delete(`/cards/${card_id}/actions/${comment_id}/comments`);

        return {
          content: [{ type: "text", text: "Comment deleted successfully" }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: formatError(error, "deleting comment") }],
          isError: true,
        };
      }
    }
  );

  // --- Add Label to Card ---
  server.registerTool(
    "trello_add_card_label",
    {
      title: "Add Label to Card",
      description: `Add a label to a card.

Args:
  - card_id: The card ID
  - label_id: The label ID (get from trello_get_board_labels)

Returns:
  Confirmation message.`,
      inputSchema: {
        card_id: z.string().describe("The card ID"),
        label_id: z.string().describe("The label ID"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ card_id, label_id }) => {
      try {
        const client = getTrelloClient();
        await client.post(`/cards/${card_id}/idLabels`, { value: label_id });

        return {
          content: [{ type: "text", text: "Label added to card" }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: formatError(error, "adding label") }],
          isError: true,
        };
      }
    }
  );

  // --- Remove Label from Card ---
  server.registerTool(
    "trello_remove_card_label",
    {
      title: "Remove Label from Card",
      description: `Remove a label from a card.

Args:
  - card_id: The card ID
  - label_id: The label ID

Returns:
  Confirmation message.`,
      inputSchema: {
        card_id: z.string().describe("The card ID"),
        label_id: z.string().describe("The label ID"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ card_id, label_id }) => {
      try {
        const client = getTrelloClient();
        await client.delete(`/cards/${card_id}/idLabels/${label_id}`);

        return {
          content: [{ type: "text", text: "Label removed from card" }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: formatError(error, "removing label") }],
          isError: true,
        };
      }
    }
  );

  // --- Assign Member to Card ---
  server.registerTool(
    "trello_assign_member",
    {
      title: "Assign Member to Card",
      description: `Assign a member to a card.

Args:
  - card_id: The card ID
  - member_id: The member ID (get from trello_get_board_members)

Returns:
  Confirmation message.`,
      inputSchema: {
        card_id: z.string().describe("The card ID"),
        member_id: z.string().describe("The member ID"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ card_id, member_id }) => {
      try {
        const client = getTrelloClient();
        await client.post(`/cards/${card_id}/idMembers`, { value: member_id });

        return {
          content: [{ type: "text", text: "Member assigned to card" }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: formatError(error, "assigning member") }],
          isError: true,
        };
      }
    }
  );

  // --- Remove Member from Card ---
  server.registerTool(
    "trello_remove_member",
    {
      title: "Remove Member from Card",
      description: `Remove a member from a card.

Args:
  - card_id: The card ID
  - member_id: The member ID

Returns:
  Confirmation message.`,
      inputSchema: {
        card_id: z.string().describe("The card ID"),
        member_id: z.string().describe("The member ID"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ card_id, member_id }) => {
      try {
        const client = getTrelloClient();
        await client.delete(`/cards/${card_id}/idMembers/${member_id}`);

        return {
          content: [{ type: "text", text: "Member removed from card" }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: formatError(error, "removing member") }],
          isError: true,
        };
      }
    }
  );

  // --- Add Attachment ---
  server.registerTool(
    "trello_add_attachment",
    {
      title: "Add URL Attachment to Card",
      description: `Add a URL attachment to a card.

Args:
  - card_id: The card ID
  - url: The URL to attach
  - name: Display name for the attachment (optional)

Returns:
  Created attachment info.`,
      inputSchema: {
        card_id: z.string().describe("The card ID"),
        url: z.string().url().describe("URL to attach"),
        name: z.string().optional().describe("Attachment display name"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ card_id, url, name }) => {
      try {
        const client = getTrelloClient();
        const attachment = await client.post<TrelloAttachment>(
          `/cards/${card_id}/attachments`,
          { url, name }
        );

        return {
          content: [
            {
              type: "text",
              text: `Attachment added: "${attachment.name}" (${attachment.url})`,
            },
          ],
          structuredContent: {
            id: attachment.id,
            name: attachment.name,
            url: attachment.url,
          },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: formatError(error, "adding attachment") }],
          isError: true,
        };
      }
    }
  );

  // --- Get Attachments ---
  server.registerTool(
    "trello_get_attachments",
    {
      title: "Get Card Attachments",
      description: `Get all attachments on a card.

Args:
  - card_id: The card ID

Returns:
  Array of attachments.`,
      inputSchema: {
        card_id: z.string().describe("The card ID"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ card_id }) => {
      try {
        const client = getTrelloClient();
        const attachments = await client.get<TrelloAttachment[]>(
          `/cards/${card_id}/attachments`
        );

        const result = attachments.map((a) => ({
          id: a.id,
          name: a.name,
          url: a.url,
          date: a.date,
          bytes: a.bytes,
          mimeType: a.mimeType,
        }));

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          structuredContent: { attachments: result, count: result.length },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: formatError(error, "getting attachments") }],
          isError: true,
        };
      }
    }
  );

  // --- Delete Attachment ---
  server.registerTool(
    "trello_delete_attachment",
    {
      title: "Delete Card Attachment",
      description: `Delete an attachment from a card.

Args:
  - card_id: The card ID
  - attachment_id: The attachment ID

Returns:
  Confirmation message.`,
      inputSchema: {
        card_id: z.string().describe("The card ID"),
        attachment_id: z.string().describe("The attachment ID"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ card_id, attachment_id }) => {
      try {
        const client = getTrelloClient();
        await client.delete(`/cards/${card_id}/attachments/${attachment_id}`);

        return {
          content: [{ type: "text", text: "Attachment deleted successfully" }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: formatError(error, "deleting attachment") }],
          isError: true,
        };
      }
    }
  );

  // --- Copy Card ---
  server.registerTool(
    "trello_copy_card",
    {
      title: "Copy Trello Card",
      description: `Copy a card to the same or different list/board.

Args:
  - card_id: The source card ID
  - list_id: Destination list ID
  - name: New card name (optional, defaults to original name)
  - keep_attachments: Copy attachments (default: false)
  - keep_checklists: Copy checklists (default: false)
  - keep_comments: Copy comments (default: false)
  - keep_labels: Copy labels (default: true)
  - keep_members: Copy member assignments (default: false)
  - keep_stickers: Copy stickers (default: false)

Returns:
  New card info.`,
      inputSchema: {
        card_id: z.string().describe("Source card ID"),
        list_id: z.string().describe("Destination list ID"),
        name: z.string().optional().describe("New card name"),
        keep_attachments: z.boolean().optional().describe("Copy attachments"),
        keep_checklists: z.boolean().optional().describe("Copy checklists"),
        keep_comments: z.boolean().optional().describe("Copy comments"),
        keep_labels: z.boolean().optional().describe("Copy labels (default: true)"),
        keep_members: z.boolean().optional().describe("Copy members"),
        keep_stickers: z.boolean().optional().describe("Copy stickers"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({
      card_id,
      list_id,
      name,
      keep_attachments,
      keep_checklists,
      keep_comments,
      keep_labels,
      keep_members,
      keep_stickers,
    }) => {
      try {
        const client = getTrelloClient();

        // Build keepFromSource string
        const keep: string[] = [];
        if (keep_attachments) keep.push("attachments");
        if (keep_checklists) keep.push("checklists");
        if (keep_comments) keep.push("comments");
        if (keep_labels !== false) keep.push("labels"); // Default true
        if (keep_members) keep.push("members");
        if (keep_stickers) keep.push("stickers");

        const card = await client.post<TrelloCard>("/cards", {
          idList: list_id,
          idCardSource: card_id,
          name,
          keepFromSource: keep.join(",") || "labels",
        });

        return {
          content: [
            {
              type: "text",
              text: `Card copied: "${card.name}" (${card.shortUrl || card.url})`,
            },
          ],
          structuredContent: {
            id: card.id,
            name: card.name,
            url: card.shortUrl || card.url,
          },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: formatError(error, "copying card") }],
          isError: true,
        };
      }
    }
  );
}
