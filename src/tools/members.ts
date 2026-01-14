/**
 * Member tools for Trello MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getTrelloClient, formatError } from "../services/trello-client.js";
import type { TrelloMember, TrelloBoard, TrelloCard, TrelloSearchResult } from "../types.js";

export function registerMemberTools(server: McpServer): void {
  // --- Get Current User ---
  server.registerTool(
    "trello_get_me",
    {
      title: "Get Current User",
      description: `Get information about the authenticated Trello user.

Returns:
  User info including id, username, fullName, and email.`,
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async () => {
      try {
        const client = getTrelloClient();
        const member = await client.get<TrelloMember & { email?: string }>(
          "/members/me",
          { fields: "id,username,fullName,initials,avatarUrl,email" }
        );

        const result = {
          id: member.id,
          username: member.username,
          fullName: member.fullName,
          initials: member.initials,
          email: member.email,
          avatarUrl: member.avatarUrl,
        };

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          structuredContent: result,
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: formatError(error, "getting current user") }],
          isError: true,
        };
      }
    }
  );

  // --- Get Member ---
  server.registerTool(
    "trello_get_member",
    {
      title: "Get Member Info",
      description: `Get information about a Trello member by ID or username.

Args:
  - member_id: Member ID or username

Returns:
  Member info including id, username, and fullName.`,
      inputSchema: {
        member_id: z.string().describe("Member ID or username"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ member_id }) => {
      try {
        const client = getTrelloClient();
        const member = await client.get<TrelloMember>(
          `/members/${member_id}`,
          { fields: "id,username,fullName,initials,avatarUrl" }
        );

        const result = {
          id: member.id,
          username: member.username,
          fullName: member.fullName,
          initials: member.initials,
          avatarUrl: member.avatarUrl,
        };

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          structuredContent: result,
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: formatError(error, "getting member") }],
          isError: true,
        };
      }
    }
  );

  // --- Get Member's Boards ---
  server.registerTool(
    "trello_get_member_boards",
    {
      title: "Get Member's Boards",
      description: `Get all boards a member has access to.

Args:
  - member_id: Member ID or username (use "me" for current user)

Returns:
  Array of boards with id, name, and url.`,
      inputSchema: {
        member_id: z
          .string()
          .optional()
          .describe("Member ID or username (default: 'me')"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ member_id }) => {
      try {
        const client = getTrelloClient();
        const memberId = member_id || "me";
        const boards = await client.get<TrelloBoard[]>(
          `/members/${memberId}/boards`,
          { fields: "name,url,shortUrl,closed" }
        );

        const result = boards
          .filter((b) => !b.closed)
          .map((b) => ({
            id: b.id,
            name: b.name,
            url: b.shortUrl || b.url,
          }));

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          structuredContent: { boards: result, count: result.length },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: formatError(error, "getting member boards") }],
          isError: true,
        };
      }
    }
  );

  // --- Get Member's Cards ---
  server.registerTool(
    "trello_get_member_cards",
    {
      title: "Get Member's Cards",
      description: `Get all cards assigned to a member.

Args:
  - member_id: Member ID or username (use "me" for current user)

Returns:
  Array of cards with id, name, board, and list info.`,
      inputSchema: {
        member_id: z
          .string()
          .optional()
          .describe("Member ID or username (default: 'me')"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ member_id }) => {
      try {
        const client = getTrelloClient();
        const memberId = member_id || "me";
        const cards = await client.get<TrelloCard[]>(
          `/members/${memberId}/cards`,
          {
            fields: "name,desc,due,dueComplete,shortUrl,idBoard,idList,closed",
          }
        );

        const result = cards
          .filter((c) => !c.closed)
          .map((c) => ({
            id: c.id,
            name: c.name,
            description: c.desc || null,
            due: c.due || null,
            dueComplete: c.dueComplete || false,
            url: c.shortUrl,
            boardId: c.idBoard,
            listId: c.idList,
          }));

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          structuredContent: { cards: result, count: result.length },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: formatError(error, "getting member cards") }],
          isError: true,
        };
      }
    }
  );

  // --- Search Members ---
  server.registerTool(
    "trello_search_members",
    {
      title: "Search Members",
      description: `Search for Trello members by name or username.

Args:
  - query: Search query (name or username)
  - board_id: Limit search to members of a specific board (optional)
  - limit: Maximum results (default: 8, max: 20)

Returns:
  Array of matching members.`,
      inputSchema: {
        query: z.string().min(1).describe("Search query"),
        board_id: z.string().optional().describe("Board ID to scope search"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(20)
          .optional()
          .describe("Max results (default: 8)"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ query, board_id, limit }) => {
      try {
        const client = getTrelloClient();

        let members: TrelloMember[];

        if (board_id) {
          // Search within board members
          const allMembers = await client.get<TrelloMember[]>(
            `/boards/${board_id}/members`
          );
          const lowerQuery = query.toLowerCase();
          members = allMembers.filter(
            (m) =>
              m.fullName.toLowerCase().includes(lowerQuery) ||
              m.username.toLowerCase().includes(lowerQuery)
          );
        } else {
          // Use Trello search API
          const response = await client.get<TrelloSearchResult>("/search", {
            query,
            modelTypes: "members",
            members_limit: String(limit || 8),
          });
          members = response.members || [];
        }

        const result = members.slice(0, limit || 8).map((m) => ({
          id: m.id,
          username: m.username,
          fullName: m.fullName,
          initials: m.initials,
        }));

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          structuredContent: { members: result, count: result.length },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: formatError(error, "searching members") }],
          isError: true,
        };
      }
    }
  );
}
