/**
 * Label tools for Trello MCP Server
 */
import { z } from "zod";
import { getTrelloClient, formatError } from "../services/trello-client.js";
import { LABEL_COLORS } from "../constants.js";
// Zod schema for label colors
const LabelColorSchema = z.enum(LABEL_COLORS);
export function registerLabelTools(server) {
    // --- Create Label ---
    server.registerTool("trello_create_label", {
        title: "Create Board Label",
        description: `Create a new label on a board.

Args:
  - board_id: The board ID
  - name: Label name (can be empty for color-only labels)
  - color: Label color - one of: green, yellow, orange, red, purple, blue, sky, lime, pink, black (or null for no color)

Returns:
  Created label with id, name, and color.`,
        inputSchema: {
            board_id: z.string().describe("The board ID"),
            name: z.string().describe("Label name"),
            color: LabelColorSchema.nullable().describe("Label color"),
        },
        annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: false,
            openWorldHint: true,
        },
    }, async ({ board_id, name, color }) => {
        try {
            const client = getTrelloClient();
            const label = await client.post("/labels", {
                idBoard: board_id,
                name,
                color: color || undefined,
            });
            return {
                content: [
                    {
                        type: "text",
                        text: `Label created: "${label.name || "(no name)"}" (${label.color || "no color"})`,
                    },
                ],
                structuredContent: {
                    id: label.id,
                    name: label.name,
                    color: label.color,
                },
            };
        }
        catch (error) {
            return {
                content: [{ type: "text", text: formatError(error, "creating label") }],
                isError: true,
            };
        }
    });
    // --- Update Label ---
    server.registerTool("trello_update_label", {
        title: "Update Board Label",
        description: `Update a label's name or color.

Args:
  - label_id: The label ID
  - name: New label name (optional)
  - color: New label color (optional, use null to remove color)

Returns:
  Updated label confirmation.`,
        inputSchema: {
            label_id: z.string().describe("The label ID"),
            name: z.string().optional().describe("New label name"),
            color: LabelColorSchema.nullable().optional().describe("New label color"),
        },
        annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: true,
        },
    }, async ({ label_id, name, color }) => {
        try {
            if (name === undefined && color === undefined) {
                return { content: [{ type: "text", text: "No updates provided" }] };
            }
            const client = getTrelloClient();
            const updates = {};
            if (name !== undefined)
                updates.name = name;
            if (color !== undefined)
                updates.color = color || "";
            const label = await client.put(`/labels/${label_id}`, updates);
            return {
                content: [
                    {
                        type: "text",
                        text: `Label updated: "${label.name || "(no name)"}" (${label.color || "no color"})`,
                    },
                ],
                structuredContent: {
                    id: label.id,
                    name: label.name,
                    color: label.color,
                },
            };
        }
        catch (error) {
            return {
                content: [{ type: "text", text: formatError(error, "updating label") }],
                isError: true,
            };
        }
    });
    // --- Delete Label ---
    server.registerTool("trello_delete_label", {
        title: "Delete Board Label",
        description: `Delete a label from a board. This will remove the label from all cards.

Args:
  - label_id: The label ID

Returns:
  Confirmation message.`,
        inputSchema: {
            label_id: z.string().describe("The label ID"),
        },
        annotations: {
            readOnlyHint: false,
            destructiveHint: true,
            idempotentHint: true,
            openWorldHint: true,
        },
    }, async ({ label_id }) => {
        try {
            const client = getTrelloClient();
            await client.delete(`/labels/${label_id}`);
            return {
                content: [{ type: "text", text: "Label deleted successfully" }],
            };
        }
        catch (error) {
            return {
                content: [{ type: "text", text: formatError(error, "deleting label") }],
                isError: true,
            };
        }
    });
}
//# sourceMappingURL=labels.js.map