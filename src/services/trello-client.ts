/**
 * Trello API Client
 *
 * Uses API key + token authentication for simplicity.
 * Users can get their API key and token from:
 * https://trello.com/power-ups/admin
 */

import { TRELLO_API_BASE } from "../constants.js";
import type { TrelloApiError } from "../types.js";

export class TrelloClient {
  private apiKey: string;
  private token: string;

  constructor(apiKey: string, token: string) {
    this.apiKey = apiKey;
    this.token = token;
  }

  /**
   * Build URL with auth params
   */
  private buildUrl(endpoint: string, params?: Record<string, string>): string {
    const url = new URL(`${TRELLO_API_BASE}${endpoint}`);
    url.searchParams.set("key", this.apiKey);
    url.searchParams.set("token", this.token);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, value);
        }
      }
    }

    return url.toString();
  }

  /**
   * Handle API errors
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage: string;
      try {
        const errorData = (await response.json()) as TrelloApiError;
        errorMessage = errorData.message || errorData.error || response.statusText;
      } catch {
        errorMessage = response.statusText;
      }

      throw new Error(`Trello API error (${response.status}): ${errorMessage}`);
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = this.buildUrl(endpoint, params);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });
    return this.handleResponse<T>(response);
  }

  /**
   * Encode a body record as application/x-www-form-urlencoded.
   * Skips undefined/null entries.
   */
  private encodeBody(body: Record<string, string | undefined>): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined && value !== null) {
        params.append(key, value);
      }
    }
    return params.toString();
  }

  /**
   * POST request. Sends `body` as form-encoded request body so large fields
   * (e.g. card descriptions) don't overflow the URL length limit and so
   * write-only fields like `pos` are reliably honored by the Trello API.
   * Auth (key/token) and any caller-supplied `params` stay in the query string.
   */
  async post<T>(
    endpoint: string,
    body?: Record<string, string | undefined>,
    params?: Record<string, string>
  ): Promise<T> {
    const url = this.buildUrl(endpoint, params);

    const init: RequestInit = {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
    };

    if (body) {
      const encoded = this.encodeBody(body);
      if (encoded.length > 0) {
        (init.headers as Record<string, string>)["Content-Type"] =
          "application/x-www-form-urlencoded";
        init.body = encoded;
      }
    }

    const response = await fetch(url, init);
    return this.handleResponse<T>(response);
  }

  /**
   * PUT request. See `post` for the rationale on form-encoded body.
   */
  async put<T>(
    endpoint: string,
    body?: Record<string, string | undefined>,
    params?: Record<string, string>
  ): Promise<T> {
    const url = this.buildUrl(endpoint, params);

    const init: RequestInit = {
      method: "PUT",
      headers: {
        Accept: "application/json",
      },
    };

    if (body) {
      const encoded = this.encodeBody(body);
      if (encoded.length > 0) {
        (init.headers as Record<string, string>)["Content-Type"] =
          "application/x-www-form-urlencoded";
        init.body = encoded;
      }
    }

    const response = await fetch(url, init);
    return this.handleResponse<T>(response);
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = this.buildUrl(endpoint, params);
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
      },
    });
    return this.handleResponse<T>(response);
  }
}

// Singleton instance - will be initialized from env vars or provided credentials
let clientInstance: TrelloClient | null = null;

/**
 * Initialize the Trello client with credentials
 */
export function initializeTrelloClient(apiKey: string, token: string): TrelloClient {
  clientInstance = new TrelloClient(apiKey, token);
  return clientInstance;
}

/**
 * Get the initialized Trello client
 */
export function getTrelloClient(): TrelloClient {
  if (!clientInstance) {
    // Try to initialize from environment variables
    const apiKey = process.env.TRELLO_API_KEY;
    const token = process.env.TRELLO_TOKEN;

    if (!apiKey || !token) {
      throw new Error(
        "Trello client not initialized. Set TRELLO_API_KEY and TRELLO_TOKEN environment variables."
      );
    }

    clientInstance = new TrelloClient(apiKey, token);
  }
  return clientInstance;
}

/**
 * Format error for tool response
 */
export function formatError(error: unknown, context: string): string {
  if (error instanceof Error) {
    return `Error ${context}: ${error.message}`;
  }
  return `Error ${context}: ${String(error)}`;
}
