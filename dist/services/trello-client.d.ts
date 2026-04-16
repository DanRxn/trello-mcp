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
     * POST request
     */
    post<T>(endpoint: string, body?: Record<string, string | undefined>, params?: Record<string, string>): Promise<T>;
    /**
     * PUT request
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