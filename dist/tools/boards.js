/**
 * Board tools for Trello MCP Server
 */
import { z } from "zod";
import { getTrelloClient, formatError } from "../services/trello-client.js";
export function registerBoardTools(server) {
    // --- List Boards ---
    server.registerTool("trello_list_boards", {
        title: "List Trello Boards",
        description: `List all Trello boards accessible to the authenticated user.

Returns:
  Array of boards with id, name, url, and closed status.
  By default only shows open boards. Use include_closed=true to see all.`,
        inputSchema: {
            include_closed: z
                .boolean()
                .optional()
                .describe("Include closed/archived boards (default: false)"),
        },
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: true,
        },
    }, async ({ include_closed }) => {
        try {
            const client = getTrelloClient();
            const boards = await client.get("/members/me/boards", { fields: "name,url,shortUrl,closed,desc" });
            const filtered = include_closed
                ? boards
                : boards.filter((b) => !b.closed);
            const result = filtered.map((b) => ({
                id: b.id,
                name: b.name,
                description: b.desc || null,
                url: b.shortUrl || b.url,
                closed: b.closed,
            }));
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
                structuredContent: { boards: result, count: result.length },
            };
        }
        catch (error) {
            return {
                content: [{ type: "text", text: formatError(error, "listing boards") }],
                isError: true,
            };
        }
    });
    // --- Get Board ---
    server.registerTool("trello_get_board", {
        title: "Get Trello Board",
        description: `Get detailed information about a Trello board including its lists.

Args:
  - board_id: The board ID or shortLink

Returns:
  Board object with id, name, description, url, and lists array.`,
        inputSchema: {
            board_id: z.string().describe("The board ID or shortLink"),
        },
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: true,
        },
    }, async ({ board_id }) => {
        try {
            const client = getTrelloClient();
            const board = await client.get(`/boards/${board_id}`, { fields: "name,desc,url,shortUrl,closed", lists: "open" });
            const result = {
                id: board.id,
                name: board.name,
                description: board.desc || null,
                url: board.shortUrl || board.url,
                closed: board.closed,
                lists: board.lists?.map((l) => ({
                    id: l.id,
                    name: l.name,
                    closed: l.closed,
                })) || [],
            };
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
                structuredContent: result,
            };
        }
        catch (error) {
            return {
                content: [{ type: "text", text: formatError(error, "getting board") }],
                isError: true,
            };
        }
    });
    // --- Create Board ---
    server.registerTool("trello_create_board", {
        title: "Create Trello Board",
        description: `Create a new Trello board.

Args:
  - name: The name for the new board
  - desc: Optional description
  - default_lists: Whether to create default lists (To Do, Doing, Done). Default: true

Returns:
  Created board with id, name, and url.`,
        inputSchema: {
            name: z.string().min(1).max(16384).describe("Board name"),
            desc: z.string().optional().describe("Board description"),
            default_lists: z
                .boolean()
                .optional()
                .describe("Create default lists (default: true)"),
        },
        annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: false,
            openWorldHint: true,
        },
    }, async ({ name, desc, default_lists }) => {
        try {
            const client = getTrelloClient();
            const board = await client.post("/boards", {
                name,
                desc,
                defaultLists: default_lists === false ? "false" : "true",
            });
            return {
                content: [
                    {
                        type: "text",
                        text: `Board created: "${board.name}" (${board.shortUrl || board.url})`,
                    },
                ],
                structuredContent: {
                    id: board.id,
                    name: board.name,
                    url: board.shortUrl || board.url,
                },
            };
        }
        catch (error) {
            return {
                content: [{ type: "text", text: formatError(error, "creating board") }],
                isError: true,
            };
        }
    });
    // --- Get Board Labels ---
    server.registerTool("trello_get_board_labels", {
        title: "Get Board Labels",
        description: `Get all labels defined on a board.

Args:
  - board_id: The board ID

Returns:
  Array of labels with id, name, and color.`,
        inputSchema: {
            board_id: z.string().describe("The board ID"),
        },
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: true,
        },
    }, async ({ board_id }) => {
        try {
            const client = getTrelloClient();
            const labels = await client.get(`/boards/${board_id}/labels`);
            const result = labels.map((l) => ({
                id: l.id,
                name: l.name || "(no name)",
                color: l.color,
            }));
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
                structuredContent: { labels: result, count: result.length },
            };
        }
        catch (error) {
            return {
                content: [{ type: "text", text: formatError(error, "getting board labels") }],
                isError: true,
            };
        }
    });
    // --- Get Board Members ---
    server.registerTool("trello_get_board_members", {
        title: "Get Board Members",
        description: `Get all members of a board.

Args:
  - board_id: The board ID

Returns:
  Array of members with id, username, and fullName.`,
        inputSchema: {
            board_id: z.string().describe("The board ID"),
        },
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: true,
        },
    }, async ({ board_id }) => {
        try {
            const client = getTrelloClient();
            const members = await client.get(`/boards/${board_id}/members`);
            const result = members.map((m) => ({
                id: m.id,
                username: m.username,
                fullName: m.fullName,
                initials: m.initials,
            }));
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
                structuredContent: { members: result, count: result.length },
            };
        }
        catch (error) {
            return {
                content: [{ type: "text", text: formatError(error, "getting board members") }],
                isError: true,
            };
        }
    });
    // --- Update Board ---
    server.registerTool("trello_update_board", {
        title: "Update Trello Board",
        description: `Update a board's name, description, or closed status.

Args:
  - board_id: The board ID
  - name: New board name (optional)
  - desc: New description (optional)
  - closed: Archive (true) or unarchive (false) the board (optional)

Returns:
  Updated board confirmation.`,
        inputSchema: {
            board_id: z.string().describe("The board ID"),
            name: z.string().optional().describe("New board name"),
            desc: z.string().optional().describe("New description"),
            closed: z.boolean().optional().describe("Archive/unarchive the board"),
        },
        annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: true,
        },
    }, async ({ board_id, name, desc, closed }) => {
        try {
            if (name === undefined && desc === undefined && closed === undefined) {
                return {
                    content: [{ type: "text", text: "No updates provided" }],
                };
            }
            const client = getTrelloClient();
            const updates = {};
            if (name !== undefined)
                updates.name = name;
            if (desc !== undefined)
                updates.desc = desc;
            if (closed !== undefined)
                updates.closed = String(closed);
            const board = await client.put(`/boards/${board_id}`, updates);
            return {
                content: [
                    {
                        type: "text",
                        text: `Board updated: "${board.name}" (${board.shortUrl || board.url})`,
                    },
                ],
                structuredContent: {
                    id: board.id,
                    name: board.name,
                    closed: board.closed,
                },
            };
        }
        catch (error) {
            return {
                content: [{ type: "text", text: formatError(error, "updating board") }],
                isError: true,
            };
        }
    });
}
//# sourceMappingURL=boards.js.map