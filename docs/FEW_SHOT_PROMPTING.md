# Few-Shot Prompting Guide
## Sandi Bot — Coaching Intelligence System
### Dr. Data Decision Intelligence LLC

---

## What Is Few-Shot Prompting

Few-shot prompting means showing the LLM examples
of correct input/output pairs before asking it to
process new data. Instead of hoping the model
guesses correctly, you show it exactly what you want.

Zero-shot (what we do now):
  "Extract the vision statement from this document."
  → Model guesses format, sometimes wrong

Few-shot (what this guide builds toward):
  "Here are 3 examples of correctly extracted
   vision statements. Now extract this one."
  → Model follows the pattern exactly

---

## Why This Matters For Sandi Bot

Every time Sandi or you corrects extracted data
in the Data Review UI, that correction is stored
in extraction_corrections table. Over time this
becomes a library of:

  - What the LLM got wrong
  - What the correct answer was
  - Which document type it came from
  - Who corrected it

This library IS your few-shot training data.
No additional data collection needed.

---

## Current Extraction Quality

As of March 2026:

| Document Type | Method          | Accuracy |
|---------------|-----------------|----------|
| DISC scores   | Deterministic   | ~100%    |
| DISC narrative| qwen2.5:7b      | ~80%     |
| You2 vision   | Deterministic   | ~95%     |
| You2 top 3    | Deterministic   | ~90%     |
| Fathom        | qwen2.5:7b      | ~75%     |
| TUMAY         | qwen2.5:7b      | ~70%     |

---

## How To Build Few-Shot Prompts From Corrections

### Step 1 — Query your corrections

```sql
SELECT 
  document_type,
  field_name,
  original_value,
  corrected_value,
  confirmed_by,
  corrected_at
FROM extraction_corrections
WHERE document_type = 'you2'
ORDER BY corrected_at DESC
LIMIT 20;
```

### Step 2 — Build example pairs

For each correction, create an example:

```typescript
const fewShotExample = `
EXAMPLE ${n}:
Document excerpt: "${documentChunk}"
Correct extraction: "${correctedValue}"
Wrong extraction to avoid: "${originalValue}"
`;
```

### Step 3 — Inject into prompt

```typescript
const systemPrompt = `
You are extracting structured data from
TES franchise coaching documents.

Here are examples of correct extractions:

${fewShotExamples.join('\n\n')}

Now extract the same fields from this document.
Return valid JSON matching the schema exactly.
`;
```

---

## Few-Shot Template — You2 Vision Statement

```typescript
const YOU2_VISION_FEW_SHOT = `
You are extracting the one-year vision statement
from a You 2.0 TES coaching assessment.

The vision is the client's personal answer to:
"If we looked at your life a year from today,
what has to have happened for you to be happy?"

EXAMPLE 1 — Correct extraction:
Raw text: "I would love to be doing what I love
doing which is helping people excel in their
professional and personal lives..."
Vision: "I would love to be doing what I love
doing which is helping people excel in their
professional and personal lives..."

EXAMPLE 2 — Correct extraction:
Raw text: "Professionally I'll be working on
something impactful to Seattle, real estate
or otherwise. Personally I'll be less
financially stressed..."
Vision: "Professionally I'll be working on
something impactful to Seattle, real estate
or otherwise. Personally I'll be less
financially stressed..."

EXAMPLE 3 — What NOT to do:
Wrong: Include the question text in the vision
Wrong: Include "Other:" field content
Wrong: Include client name or date
Right: Only the client's actual answer paragraph

Rules:
- Start after "happy with your progress?"
- Stop before "Dangers" section
- Remove "Other:" and everything after it
- Never include the question itself
- Return ONLY the vision text, no JSON wrapper

Document text:
`;
```

---

## Few-Shot Template — Fathom Session Summary

```typescript
const FATHOM_FEW_SHOT = `
You are extracting coaching session data from
a Fathom call transcript between franchise
coach Sandi Stahl and a prospective client.

EXAMPLE 1 — Correct extraction:
Transcript excerpt: "Sandi: So tell me about
your financial situation. Client: We have
about 50k liquid and my credit is around 800."
Correct JSON:
{
  "financial_liquid": "50k",
  "credit_score": 800,
  "financial_notes": "Client disclosed liquid
    assets and credit score when asked directly"
}

EXAMPLE 2 — Pink flag extraction:
Transcript excerpt: "Client: My wife isn't
really on board with this yet, she thinks
it's too risky."
Correct JSON:
{
  "pink_flags": ["Spouse not aligned —
    wife expressed risk concerns"],
  "spouse_alignment": "not_aligned"
}

EXAMPLE 3 — Objection extraction:
Transcript excerpt: "I'm worried about the
initial investment, what if it doesn't work?"
Correct JSON:
{
  "objections": [{
    "objection": "Concerned about initial
      investment risk",
    "category": "financial",
    "intensity": "moderate"
  }]
}

Extract all fields from this transcript:
`;
```

---

## Retrieval-Augmented Few-Shot (Phase 7)

Once you have a vector database (Phase 7),
instead of hardcoding examples, retrieve them:

```typescript
async function buildFewShotPrompt(
  documentType: string,
  documentText: string
): Promise<string> {
  
  // 1. Embed the new document
  const queryVector = await embedText(documentText);
  
  // 2. Find similar past corrections
  const similarCorrections = await vectorDB.search({
    vector: queryVector,
    filter: { document_type: documentType },
    limit: 3
  });
  
  // 3. Build examples from corrections
  const examples = similarCorrections.map(
    (c, i) => `
EXAMPLE ${i + 1}:
Similar document: "${c.document_excerpt}"
Correct extraction: ${c.corrected_value}
    `
  );
  
  // 4. Return augmented prompt
  return `${BASE_PROMPT}\n\n${examples.join('\n')}\n\nNow extract:\n${documentText}`;
}
```

This is the full RAG pipeline for extraction.
Similar documents → similar extraction patterns.
The system gets smarter with every correction.

---

## Tracking Few-Shot Effectiveness

Add this to your STZ feedback log queries:

```sql
-- Which fields get corrected most often?
SELECT 
  field_name,
  document_type,
  COUNT(*) as correction_count,
  COUNT(*) * 100.0 / (
    SELECT COUNT(*) FROM document_extractions
    WHERE document_type = ec.document_type
  ) as correction_rate_pct
FROM extraction_corrections ec
GROUP BY field_name, document_type
ORDER BY correction_count DESC;
```

Fields with highest correction rates
need few-shot examples most urgently.
Build examples for those fields first.
