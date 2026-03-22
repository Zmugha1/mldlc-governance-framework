## CONFIRMED WORKING PATTERNS
Last verified: March 2026

### The one rule that saves hours:
NEVER call fetch('http://localhost:11434')
from TypeScript in a Tauri v2 app.
It silently fails. No error. Nothing happens.
ALWAYS use invoke('ollama_generate').

### Full extraction pipeline (confirmed):
TypeScript -> invoke('extract_pdf_pages')
  -> Rust pdfium-render extracts text
TypeScript -> invoke('ollama_generate', {
    prompt: text + fewShotPrompt,
    system: systemPrompt,
    model: 'qwen2.5:7b-instruct-q4_k_m'
  })
  -> Rust reqwest calls localhost:11434
  -> Returns JSON string
TypeScript -> JSON.parse(response)
  -> Write fields to SQLite

### Prompt size limits:
num_ctx: 2048 (context window)
num_predict: 512 (response length)
Keep few-shot examples short.
Long prompts cause timeout errors.
One example per document type is enough.
Two examples maximum.

### Timeout:
120 seconds per Ollama call.
Add 500ms delay between clients in bulk ops.
17 clients x 120s max = ~34 minutes worst case.
In practice ~2-3 minutes if Ollama is warm.
