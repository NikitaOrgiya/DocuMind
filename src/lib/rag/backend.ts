export interface BackendMatch {
  id: string;
  documentId: string;
  documentTitle: string;
  documentSource: string | null;
  content: string;
  section: string | null;
  pageNumber: number | null;
  similarity: number;
}

export interface SearchOptions {
  matchThreshold: number;
  matchCount: number;
}

export interface RetrievalBackend {
  readonly name: string;
  search(queryEmbedding: number[], opts: SearchOptions): Promise<BackendMatch[]>;
}
