export type LocalMessage = { id: number; text: string; mine: boolean; time: string };
export type LocalConversations = Record<string, LocalMessage[]>;
