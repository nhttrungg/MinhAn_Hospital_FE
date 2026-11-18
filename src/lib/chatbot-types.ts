export type ChatSource = { id: string; title: string; url: string };
export type ChatAction = { label: string; url: string; detail: string | null };
export type ChatReply = {
  messageId: string;
  answer: string;
  sources: ChatSource[];
  actions: ChatAction[];
  status: string;
  demoData: boolean;
};
export type Knowledge = { id: number; slug: string; kind: string; title: string; content: string };
export type KnowledgeAdmin = Knowledge & {
  publishedVersionId: number | null;
  versionId: number;
  status: string;
  embeddingRevision: number | null;
  jobStatus: string | null;
  progress: number;
  total: number;
  error: string | null;
};
export type AiConfig = {
  enabled: boolean;
  chatBaseUrl: string;
  chatKeySet: boolean;
  chatModel: string;
  embeddingShareChat: boolean;
  embeddingBaseUrl: string;
  embeddingKeySet: boolean;
  embeddingModel: string;
  revision: number;
  embeddingRevision: number;
  chatReady: boolean;
  embeddingReady: boolean;
  dimensions: number | null;
  masterKeyReady: boolean;
  indexedPublishedDocuments: number;
};
export function internalLink(url: string): boolean {
  return /^\/(?:booking(?:\?[a-zA-Z0-9=&%-]*)?|faq|contact|doctors\/\d+|specialties\/\d+|huong-dan\/[a-z0-9-]+)$/.test(
    url,
  );
}
