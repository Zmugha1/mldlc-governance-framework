// Document Agent
// Trigger: File lands in watched folder
// Feeds: Document ingestion pipeline
// Status: PHASE 3 — not yet implemented

export interface DocumentAgentInput {
  file_path: string;
  client_id?: string;
}

export interface DocumentAgentOutput {
  client_id: string;
  doc_type: string;
  extracted_fields: object;
  confidence: number;
  audit_id: string;
}

export async function runDocumentAgent(
  input: DocumentAgentInput
): Promise<DocumentAgentOutput> {
  // TODO Phase 3 — implement document ingestion
  throw new Error('Document Agent not yet implemented');
}
