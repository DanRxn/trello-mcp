# Trello MCP Server

A comprehensive [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server for Trello. Manage boards, lists, cards, checklists, labels, and members through any MCP-compatible AI assistant.

**Works with:** Claude Code, Codex, OpenCode, Cursor, Windsurf, and any other MCP client.

> ⚠️ **SECURITY WARNING**: Your Trello credentials provide full access to your boards. Never share your API key or token. Protect your MCP config files with proper permissions (`chmod 600`) and never commit them to version control.

## Features

- **Board Management**: Create, list, update, and archive boards
- **List Management**: Create, move, and archive lists
- **Card Operations**: Full CRUD operations, search, comments, attachments
- **Checklist Support**: Create checklists, add/update/complete items
- **Label Management**: Create, update, and assign labels
- **Member Management**: View members, assign to cards
- **Search**: Full-text search with Trello search operators

---

## Quick Start

### Step 1: Get Your Trello API Credentials (2 minutes)

You need two things from Trello: an **API Key** and a **Token**.

#### Step 1a: Create a Trello Power-Up

1. Go to **https://trello.com/power-ups/admin**
2. Log in to Trello if prompted
3. Click the **"New"** button (top right)
4. Fill in the **"New App"** form:
   - **App name**: Anything you want (e.g., `trellomcp`)
   - **Workspace**: Select any workspace you belong to
   - **Email**: Your email *(only Trello sees this, not us)*
   - **Support contact**: Your email *(only Trello sees this, not us)*
   - **Author**: Your name
   - **Iframe connector URL**: **Leave this blank**
5. Click **"Create"**

#### Step 1b: Generate Your API Key

1. After creating the app, you'll land on the app settings page
2. Click **"API key"** in the left sidebar (if not already selected)
3. Click the **"Generate a new API key"** button
4. You'll now see three fields:
   - **API key** - ✅ **Copy this!** This is your `TRELLO_API_KEY`
   - **Allowed origins** - ❌ Leave empty (not needed)
   - **Secret** - ❌ Ignore this (only for OAuth, we don't use it)

#### Step 1c: Generate Your Token

1. On the same page, find the text that says *"manually generate a Token"*
2. Click the **"Token"** link in that text
3. You'll see an authorization page asking *"Would you like to give the following application access to your account?"*
   - It shows your app name and Trello account
   - Scroll down and click **"Allow"**
4. You'll see a page that says: *"You have granted access to your Trello account via the token below:"*
5. **Copy the token displayed** - this is your `TRELLO_TOKEN`

> **Alternative:** If you can't find the Token link, visit this URL directly (replace `YOUR_API_KEY`):
> ```
> https://trello.com/1/authorize?expiration=never&scope=read,write&response_type=token&key=YOUR_API_KEY
> ```

**You now have both credentials:**
- `TRELLO_API_KEY` - from Step 1b
- `TRELLO_TOKEN` - from Step 1c

---

### Step 2: Install the MCP Server

```bash
npm install -g trello-mcp
```

Or from source:
```bash
git clone https://github.com/anthropics/trello-mcp.git
cd trello-mcp
npm install
npm run build
```

---

### Step 3: Configure Your MCP Client

Choose your client below:

<details>
<summary><b>Claude Code</b></summary>

```bash
claude mcp add-json trello '{"type":"stdio","command":"npx","args":["-y","trello-mcp"],"env":{"TRELLO_API_KEY":"your-api-key","TRELLO_TOKEN":"your-token"}}'
```

</details>

<details>
<summary><b>Codex (OpenAI)</b></summary>

```bash
codex mcp add trello --env TRELLO_API_KEY=your-key --env TRELLO_TOKEN=your-token -- npx -y trello-mcp
```

</details>

<details>
<summary><b>OpenCode</b></summary>

Interactive setup:
```bash
opencode mcp add
# Select: Local
# Name: trello
# Command: TRELLO_API_KEY=your-key TRELLO_TOKEN=your-token npx -y trello-mcp
```

Or add to `opencode.json`:
```json
{
  "mcp": {
    "trello": {
      "type": "local",
      "command": ["npx", "-y", "trello-mcp"],
      "environment": {
        "TRELLO_API_KEY": "your-api-key",
        "TRELLO_TOKEN": "your-token"
      }
    }
  }
}
```

</details>

<details>
<summary><b>Cursor</b></summary>

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "trello": {
      "command": "npx",
      "args": ["-y", "trello-mcp"],
      "env": {
        "TRELLO_API_KEY": "your-api-key",
        "TRELLO_TOKEN": "your-token"
      }
    }
  }
}
```

</details>

<details>
<summary><b>Windsurf</b></summary>

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "trello": {
      "command": "npx",
      "args": ["-y", "trello-mcp"],
      "env": {
        "TRELLO_API_KEY": "your-api-key",
        "TRELLO_TOKEN": "your-token"
      }
    }
  }
}
```

</details>

<details>
<summary><b>Other / Manual</b></summary>

```bash
TRELLO_API_KEY=your-key TRELLO_TOKEN=your-token npx trello-mcp
```

</details>

---

### Step 4: Verify It Works

Ask your AI assistant:
> "List my Trello boards"

It should respond with your Trello boards!

---

## Troubleshooting

### "Command not found"

Find the full path:
```bash
which trello-mcp   # macOS/Linux
where trello-mcp   # Windows
```

Then use the full path in your config (e.g., `/usr/local/bin/trello-mcp`).

### "Invalid API key" or "Invalid token"

- Check you copied the full key (32 chars) and token (64 chars)
- No extra spaces
- Token not revoked at https://trello.com/your/account

### Tools not showing up

- Restart your MCP client after config changes
- Check JSON syntax is valid (use a JSON validator)
- Check the server runs manually: `TRELLO_API_KEY=x TRELLO_TOKEN=y trello-mcp --help`

---

## What You Can Do

Example prompts:

### Boards
- "List all my Trello boards"
- "Create a new board called 'Project Alpha'"
- "Show me the lists on my 'Work' board"

### Cards
- "Create a card called 'Review PR #123' in the 'To Do' list"
- "Move the 'Homepage redesign' card to 'Done'"
- "Search for cards containing 'bug' due this week"

### Checklists
- "Add a checklist to the 'Release v2.0' card with items: Tests, Docs, Deploy"
- "Mark 'Tests' as complete"

### Labels & Members
- "Add the 'Urgent' label to the 'Fix bug' card"
- "Assign @john to the 'Design review' card"

### Comments
- "Add a comment to the card saying 'Waiting for client feedback'"

---

## All Available Tools (39 total)

### Boards (6)
- `trello_list_boards` - List all boards
- `trello_get_board` - Get board with lists
- `trello_create_board` - Create board
- `trello_update_board` - Update board
- `trello_get_board_labels` - Get board labels
- `trello_get_board_members` - Get board members

### Lists (6)
- `trello_create_list` - Create list
- `trello_update_list` - Update list
- `trello_get_list_cards` - Get cards in list
- `trello_archive_all_cards` - Archive all cards
- `trello_move_all_cards` - Move all cards
- `trello_move_list` - Move list to board

### Cards (17)
- `trello_get_card` - Get card details
- `trello_create_card` - Create card
- `trello_update_card` - Update card
- `trello_delete_card` - Delete card
- `trello_search_cards` - Search cards
- `trello_copy_card` - Copy card
- `trello_add_comment` - Add comment
- `trello_get_card_comments` - Get comments
- `trello_update_comment` - Update comment
- `trello_delete_comment` - Delete comment
- `trello_add_card_label` - Add label
- `trello_remove_card_label` - Remove label
- `trello_assign_member` - Assign member
- `trello_remove_member` - Remove member
- `trello_add_attachment` - Add attachment
- `trello_get_attachments` - Get attachments
- `trello_delete_attachment` - Delete attachment

### Labels (3)
- `trello_create_label` - Create label
- `trello_update_label` - Update label
- `trello_delete_label` - Delete label

### Checklists (8)
- `trello_create_checklist` - Create checklist
- `trello_update_checklist` - Update checklist
- `trello_delete_checklist` - Delete checklist
- `trello_get_checklist` - Get checklist
- `trello_add_checklist_item` - Add item
- `trello_update_checklist_item` - Update item
- `trello_delete_checklist_item` - Delete item
- `trello_copy_checklist` - Copy checklist

### Members (5)
- `trello_get_me` - Get current user
- `trello_get_member` - Get member info
- `trello_get_member_boards` - Get member's boards
- `trello_get_member_cards` - Get member's cards
- `trello_search_members` - Search members

---

## Search Operators

Use Trello's search syntax with `trello_search_cards`:

| Operator | Example | Description |
|----------|---------|-------------|
| `@me` | `@me` | My cards |
| `#label` | `#bug` | Cards with label |
| `board:` | `board:Dev` | On specific board |
| `list:` | `list:"To Do"` | In specific list |
| `is:open` | `is:open` | Open cards |
| `due:day` | `due:week` | Due soon |
| `due:overdue` | `due:overdue` | Past due |
| `has:attachments` | `has:checklist` | Has feature |

Example: `@me due:week is:open #urgent`

---

## Development

```bash
npm install
TRELLO_API_KEY=x TRELLO_TOKEN=y npm run dev   # Dev mode with auto-reload
npm run build                                   # Build for production
npm run inspect                                 # Test with MCP Inspector
```

---

## Security & Credentials

### How are my credentials stored?

Your Trello API key and token are stored **locally on your machine** in your MCP client's config file:

| Client | Config Location |
|--------|-----------------|
| Claude Code | `~/.claude.json` |
| Codex | `~/.codex/config.toml` |
| OpenCode | `opencode.json` or `~/.config/opencode/opencode.json` |
| Cursor | `~/.cursor/mcp.json` |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` |

The MCP server **never stores your credentials** - it only reads them from environment variables that your MCP client provides when starting the server.

### Do credentials expire?

- **API Key**: Never expires
- **Token**: Never expires (we use `expiration=never`)

You can revoke your token anytime at https://trello.com/your/account

### Security best practices

- **Never share your token** - it provides full access to your Trello account
- **Don't commit config files** with credentials to git (add them to `.gitignore`)
- **Revoke and regenerate** if you accidentally expose your token
- **Don't screenshot** your terminal/config files with credentials visible
- The token has `read,write` scope - it can read and modify your boards

---

## License

MIT
