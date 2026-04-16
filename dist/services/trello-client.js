/**
 * Trello API Client
 *
 * Uses API key + token authentication for simplicity.
 * Users can get their API key and token from:
 * https://trello.com/power-ups/admin
 */
import { TRELLO_API_BASE } from "../constants.js";
export class TrelloClient {
    apiKey;
    token;
    constructor(apiKey, token) {
        this.apiKey = apiKey;
        this.token = token;
    }
    /**
     * Build URL with auth params
     */
    buildUrl(endpoint, params) {
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
    async handleResponse(response) {
        if (!response.ok) {
            let errorMessage;
            try {
                const errorData = (await response.json());
                errorMessage = errorData.message || errorData.error || response.statusText;
            }
            catch {
                errorMessage = response.statusText;
            }
            throw new Error(`Trello API error (${response.status}): ${errorMessage}`);
        }
        // Handle empty responses
        const text = await response.text();
        if (!text) {
            return {};
        }
        try {
            return JSON.parse(text);
        }
        catch {
            return text;
        }
    }
    /**
     * GET request
     */
    async get(endpoint, params) {
        const url = this.buildUrl(endpoint, params);
        const response = await fetch(url, {
            method: "GET",
            headers: {
                Accept: "application/json",
            },
        });
        return this.handleResponse(response);
    }
    /**
     * POST request
     */
    async post(endpoint, body, params) {
        const url = this.buildUrl(endpoint, params);
        // Trello API prefers query params for POST data
        const finalUrl = new URL(url);
        if (body) {
            for (const [key, value] of Object.entries(body)) {
                if (value !== undefined && value !== null) {
                    finalUrl.searchParams.set(key, value);
                }
            }
        }
        const response = await fetch(finalUrl.toString(), {
            method: "POST",
            headers: {
                Accept: "application/json",
            },
        });
        return this.handleResponse(response);
    }
    /**
     * PUT request
     */
    async put(endpoint, body, params) {
        const url = this.buildUrl(endpoint, params);
        const finalUrl = new URL(url);
        if (body) {
            for (const [key, value] of Object.entries(body)) {
                if (value !== undefined && value !== null) {
                    finalUrl.searchParams.set(key, value);
                }
            }
        }
        const response = await fetch(finalUrl.toString(), {
            method: "PUT",
            headers: {
                Accept: "application/json",
            },
        });
        return this.handleResponse(response);
    }
    /**
     * DELETE request
     */
    async delete(endpoint, params) {
        const url = this.buildUrl(endpoint, params);
        const response = await fetch(url, {
            method: "DELETE",
            headers: {
                Accept: "application/json",
            },
        });
        return this.handleResponse(response);
    }
}
// Singleton instance - will be initialized from env vars or provided credentials
let clientInstance = null;
/**
 * Initialize the Trello client with credentials
 */
export function initializeTrelloClient(apiKey, token) {
    clientInstance = new TrelloClient(apiKey, token);
    return clientInstance;
}
/**
 * Get the initialized Trello client
 */
export function getTrelloClient() {
    if (!clientInstance) {
        // Try to initialize from environment variables
        const apiKey = process.env.TRELLO_API_KEY;
        const token = process.env.TRELLO_TOKEN;
        if (!apiKey || !token) {
            throw new Error("Trello client not initialized. Set TRELLO_API_KEY and TRELLO_TOKEN environment variables.");
        }
        clientInstance = new TrelloClient(apiKey, token);
    }
    return clientInstance;
}
/**
 * Format error for tool response
 */
export function formatError(error, context) {
    if (error instanceof Error) {
        return `Error ${context}: ${error.message}`;
    }
    return `Error ${context}: ${String(error)}`;
}
//# sourceMappingURL=trello-client.js.map