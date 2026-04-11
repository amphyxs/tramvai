export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: Array<[string, string]>;
  timestamp: number;
}

export type NewQueuedRequest = Omit<QueuedRequest, 'id' | 'timestamp'>;
