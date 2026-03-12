import { dbSelect, dbExecute } from './db';
import type { SearchResult } from '../types';

export async function searchKnowledge(
  query: string,
  stage?: string
): Promise<SearchResult[]> {
  if (stage) {
    return dbSelect<SearchResult>(
      `SELECT content, content_type, stage, client_id
       FROM knowledge_search
       WHERE knowledge_search MATCH $1
       AND stage = $2
       LIMIT 20`,
      [query, stage]
    );
  }
  return dbSelect<SearchResult>(
    `SELECT content, content_type, stage, client_id
     FROM knowledge_search
     WHERE knowledge_search MATCH $1
     LIMIT 20`,
    [query]
  );
}

export async function insertKnowledge(
  content: string,
  contentType: string,
  stage?: string,
  clientId?: string
): Promise<void> {
  await dbExecute(
    `INSERT INTO knowledge_search 
     (content, content_type, stage, client_id)
     VALUES ($1, $2, $3, $4)`,
    [content, contentType, stage ?? null, clientId ?? null]
  );
}
