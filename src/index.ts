#!/usr/bin/env node
/**
 * Trello MCP Server
 *
 * A comprehensive MCP server for managing Trello boards, lists, cards,
 * checklists, labels, and members.
 *
 * Features:
 * - Full board, list, and card management
 * - Checklist creation and management
 * - Label management
 * - Member assignment
 * - Card search with Trello search operators
 * - Attachment handling
 * - Comment management
 *
 * Authentication:
 * - Set TRELLO_API_KEY and TRELLO_TOKEN environment variables
 * - Get your API key from: https://trello.com/power-ups/admin
 * - Generate a token from: https://trello.com/1/authorize?expiration=never&scope=read,write&response_type=token&key=YOUR_API_KEY
 *
 * Usage:
 * - stdio transport (default): node dist/index.js
 * - HTTP transport: TRANSPORT=http PORT=3000 node dist/index.js
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getTrelloClient } from "./services/trello-client.js";
import { registerBoardTools } from "./tools/boards.js";
import { registerListTools } from "./tools/lists.js";
import { registerCardTools } from "./tools/cards.js";
import { registerLabelTools } from "./tools/labels.js";
import { registerChecklistTools } from "./tools/checklists.js";
import { registerMemberTools } from "./tools/members.js";

// Parse command line arguments
const args = process.argv.slice(2);
const showHelp = args.includes("--help") || args.includes("-h");
const showVersion = args.includes("--version") || args.includes("-v");

if (showHelp) {
  console.log(`
Trello MCP Server - Manage Trello boards, lists, cards, and more via MCP

USAGE:
  trello-mcp [OPTIONS]

OPTIONS:
  -h, --help      Show this help message
  -v, --version   Show version number

ENVIRONMENT VARIABLES:
  TRELLO_API_KEY  Your Trello API key (required)
                  Get from: https://trello.com/power-ups/admin

  TRELLO_TOKEN    Your Trello API token (required)
                  Generate from: https://trello.com/1/authorize?expiration=never&scope=read,write&response_type=token&key=YOUR_API_KEY

  TRANSPORT       Transport mode: 'stdio' (default) or 'http'

  PORT            HTTP port when using http transport (default: 3000)

EXAMPLES:
  # Run with stdio transport (for Claude Desktop)
  TRELLO_API_KEY=xxx TRELLO_TOKEN=xxx trello-mcp

  # Run with HTTP transport
  TRELLO_API_KEY=xxx TRELLO_TOKEN=xxx TRANSPORT=http PORT=3000 trello-mcp

TOOLS:
  Boards:
    - trello_list_boards       List all accessible boards
    - trello_get_board         Get board with its lists
    - trello_create_board      Create a new board
    - trello_update_board      Update board name/description
    - trello_get_board_labels  Get all labels on a board
    - trello_get_board_members Get all members on a board

  Lists:
    - trello_create_list       Create a new list
    - trello_update_list       Update list name/position
    - trello_get_list_cards    Get all cards in a list
    - trello_archive_all_cards Archive all cards in a list
    - trello_move_all_cards    Move all cards to another list
    - trello_move_list         Move list to another board

  Cards:
    - trello_get_card          Get card details
    - trello_create_card       Create a new card
    - trello_update_card       Update card fields
    - trello_delete_card       Delete a card
    - trello_search_cards      Search for cards
    - trello_copy_card         Copy a card
    - trello_add_comment       Add comment to card
    - trello_get_card_comments Get card comments
    - trello_update_comment    Update a comment
    - trello_delete_comment    Delete a comment
    - trello_add_card_label    Add label to card
    - trello_remove_card_label Remove label from card
    - trello_assign_member     Assign member to card
    - trello_remove_member     Remove member from card
    - trello_add_attachment    Add URL attachment
    - trello_get_attachments   Get card attachments
    - trello_delete_attachment Delete attachment

  Labels:
    - trello_create_label      Create a new label
    - trello_update_label      Update label name/color
    - trello_delete_label      Delete a label

  Checklists:
    - trello_create_checklist      Create a checklist
    - trello_update_checklist      Update checklist name
    - trello_delete_checklist      Delete a checklist
    - trello_get_checklist         Get checklist with items
    - trello_add_checklist_item    Add item to checklist
    - trello_update_checklist_item Update checklist item
    - trello_delete_checklist_item Delete checklist item
    - trello_copy_checklist        Copy checklist to card

  Members:
    - trello_get_me            Get current user info
    - trello_get_member        Get member info
    - trello_get_member_boards Get member's boards
    - trello_get_member_cards  Get member's assigned cards
    - trello_search_members    Search for members

For more information, visit: https://github.com/your-repo/trello-mcp
`);
  process.exit(0);
}

if (showVersion) {
  console.log("1.0.0");
  process.exit(0);
}

/**
 * Create and configure the MCP server with all tools
 */
function createServer(): McpServer {
  const server = new McpServer({
    name: "trello-mcp",
    version: "1.0.0",
  });

  // Register all tool groups
  registerBoardTools(server);
  registerListTools(server);
  registerCardTools(server);
  registerLabelTools(server);
  registerChecklistTools(server);
  registerMemberTools(server);

  return server;
}

/**
 * Validate environment variables
 */
function validateEnvironment(): void {
  const apiKey = process.env.TRELLO_API_KEY;
  const token = process.env.TRELLO_TOKEN;

  if (!apiKey) {
    console.error("ERROR: TRELLO_API_KEY environment variable is required");
    console.error("Get your API key from: https://trello.com/power-ups/admin");
    process.exit(1);
  }

  if (!token) {
    console.error("ERROR: TRELLO_TOKEN environment variable is required");
    console.error(
      "Generate a token from: https://trello.com/1/authorize?expiration=never&scope=read,write&response_type=token&key=YOUR_API_KEY"
    );
    console.error("(Replace YOUR_API_KEY with your actual Trello API key)");
    process.exit(1);
  }

  // Initialize the client (validates credentials format)
  try {
    getTrelloClient();
  } catch (error) {
    console.error("ERROR: Failed to initialize Trello client:", error);
    process.exit(1);
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  validateEnvironment();

  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Trello MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
