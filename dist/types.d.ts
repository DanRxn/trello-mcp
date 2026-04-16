/**
 * Type definitions for Trello MCP Server
 */
export interface TrelloBoard {
    id: string;
    name: string;
    desc?: string;
    url: string;
    shortUrl?: string;
    closed: boolean;
    prefs?: {
        background?: string;
        backgroundColor?: string;
    };
    lists?: TrelloList[];
    labels?: TrelloLabel[];
}
export interface TrelloList {
    id: string;
    name: string;
    closed: boolean;
    idBoard: string;
    pos: number;
}
export interface TrelloCard {
    id: string;
    name: string;
    desc?: string;
    due?: string | null;
    dueComplete?: boolean;
    url: string;
    shortUrl?: string;
    closed: boolean;
    idBoard: string;
    idList: string;
    idMembers?: string[];
    labels?: TrelloLabel[];
    checklists?: TrelloChecklist[];
    attachments?: TrelloAttachment[];
    pos: number;
}
export interface TrelloLabel {
    id: string;
    idBoard: string;
    name: string;
    color: TrelloLabelColor | null;
}
export type TrelloLabelColor = "green" | "yellow" | "orange" | "red" | "purple" | "blue" | "sky" | "lime" | "pink" | "black";
export interface TrelloChecklist {
    id: string;
    name: string;
    idBoard: string;
    idCard: string;
    pos: number;
    checkItems: TrelloCheckItem[];
}
export interface TrelloCheckItem {
    id: string;
    name: string;
    state: "complete" | "incomplete";
    idChecklist: string;
    pos: number;
}
export interface TrelloMember {
    id: string;
    username: string;
    fullName: string;
    avatarUrl?: string;
    initials?: string;
}
export interface TrelloAttachment {
    id: string;
    name: string;
    url: string;
    bytes?: number;
    date: string;
    mimeType?: string;
    isUpload: boolean;
}
export interface TrelloComment {
    id: string;
    idMemberCreator: string;
    data: {
        text: string;
        card?: {
            id: string;
            name: string;
        };
    };
    date: string;
    memberCreator?: TrelloMember;
}
export interface TrelloSearchResult {
    cards?: TrelloCard[];
    boards?: TrelloBoard[];
    members?: TrelloMember[];
}
export interface ToolResult {
    content: Array<{
        type: "text";
        text: string;
    }>;
    isError?: boolean;
    structuredContent?: unknown;
}
export interface TrelloApiError {
    message: string;
    error?: string;
    status?: number;
}
//# sourceMappingURL=types.d.ts.map