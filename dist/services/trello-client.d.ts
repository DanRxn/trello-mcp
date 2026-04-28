/**
 * Trello API Client
 *
 * Uses API key + token authentication for simplicity.
 * Users can get their API key and token from:
 * https://trello.com/power-ups/admin
 */
export declare class TrelloClient {
    private apiKey;
    private token;
    constructor(apiKey: string, token: string);
    /**
     * Build URL with auth params
     */
    private buildUrl;
    /**
     * Handle API errors
     */
    private handleResponse;
    /**
     * GET request
     */
    get<T>(endpoint: string, params?: Record<string, string>): Promise<T>;
    /**
     * Encode a body record as application/x-www-form-urlencoded.
     * Skips undefined/null entries.
     */
    private encodeBody;
    /**
     * POST request. Sends `body` as form-encoded request body so large fields
     * (e.g. card descriptions) don't overflow the URL length limit and so
     * write-only fields like `pos` are reliably honored by the Trello API.
     * Auth (key/token) and any caller-supplied `params` stay in the query string.
     */
    post<T>(endpoint: string, body?: Record<string, string | undefined>, params?: Record<string, string>): Promise<T>;
    /**
     * PUT request. See `post` for the rationale on form-encoded body.
     */
    put<T>(endpoint: string, body?: Record<string, string | undefined>, params?: Record<string, string>): Promise<T>;
    /**
     * DELETE request
     */
    delete<T>(endpoint: string, params?: Record<string, string>): Promise<T>;
}
/**
 * Initialize the Trello client with credentials
 */
export declare function initializeTrelloClient(apiKey: string, token: string): TrelloClient;
/**
 * Get the initialized Trello client
 */
export declare function getTrelloClient(): TrelloClient;
/**
 * Format error for tool response
 */
export declare function formatError(error: unknown, context: string): string;
//# sourceMappingURL=trello-client.d.ts.map