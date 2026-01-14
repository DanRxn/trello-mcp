/**
 * Constants for Trello MCP Server
 */

export const TRELLO_API_BASE = "https://api.trello.com/1";

// Maximum characters in a response before truncation
export const CHARACTER_LIMIT = 25000;

// Default pagination limits
export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 1000;

// Valid label colors for Trello
export const LABEL_COLORS = [
  "green",
  "yellow",
  "orange",
  "red",
  "purple",
  "blue",
  "sky",
  "lime",
  "pink",
  "black",
] as const;

// Card position helpers
export const POSITION = {
  TOP: "top",
  BOTTOM: "bottom",
} as const;
