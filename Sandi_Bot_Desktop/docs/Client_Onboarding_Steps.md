# New Client Onboarding Steps
## Dr. Data Decision Intelligence

Follow this sequence for every new client.
Do not skip steps. Do not reorder steps.

---

## Before You Start

Confirm you have:
- Completed STZ discovery session (20 questions)
- Client's historical data folder organized as:
  Active / Converted / Stalled / Closed
  Each with DISC / You2 / Fathom / Vision subfolders
- Client's computer specs (RAM, OS, disk space)
- Signed agreement

---

## Step 1 — Create client config (30 min)

Copy configs/base_client.config.json
Rename to configs/[client_id].json
Fill in all fields from STZ discovery session:
- methodology.framework and framework_version
- methodology.pink_flag_rules (from Q4 and Q18)
- agents — enable only what they need
- external_integrations — only what they signed for
- llm.model — based on hardware specs
- evaluation.primary_kpi — from Q20

Commit the config file before writing any code.

---

## Step 2 — Write/update prompt files (2-3 hrs)

If their methodology differs from TES+CLEAR:
- Write new prompt files for their framework
- Use their exact vocabulary from Q1-Q4 answers
- Add positive examples from Q17
- Add failure modes from Q18

If they use TES+CLEAR (like Sandi and Fred):
- Shared prompt files already exist
- Add their specific examples when data arrives

---

## Step 3 — Data inventory (30 min)

Before running any extraction, open their folder
and create a spreadsheet:
- Client name
- Outcome bucket
- Which documents present (Y/N per type)
- File format for each

This prevents surprises during bulk import.

---

## Step 4 — Test extraction on Converted first

Run extraction on Converted folder only.
Verify scores match actual documents.
Fix any extraction bugs before running all folders.
Converted = ground truth. You know the outcome.

---

## Step 5 — Run full extraction

Once Converted extraction is clean:
Run You 2.0, Fathom, Vision in same order.
Each folder: Converted first, then others.
All extractions logged to audit table.
Tag each record with outcome bucket.

---

## Step 6 — Load methodology into FTS5

Load all methodology documents into
knowledge_search table:
- Framework documents
- CLEAR playbook (current version)
- Scripts and objection handling guides
- Stage definitions

These power the coaching assistant queries.

---

## Step 7 — Update prompt files with examples

Now that extraction is complete:
- Add 3 Converted examples to recommendation.txt
- Add 2 Stalled examples as negative cases
- Add client's pink flag language to
  pink_flag_detection.txt
- Update any DISC format quirks found

All on feature branch. Review before merging.

---

## Step 8 — Update client config with real values

Replace placeholder values with real ones:
- pink_flag_rules from their actual data
- confidence_floor based on extraction quality
- framework_version confirmed from their documents

---

## Step 9 — End-to-end test

Pick one active client.
Run full sequence:
1. Document Agent ingests their documents
2. Score readiness
3. Get recommendation
4. Verify audit log entry
5. Open Live Coaching Assistant
6. Confirm CLEAR questions surface
7. Confirm pink flags show if any active

All six must pass before declaring ready.

---

## Step 10 — Handover session (90 min)

With client present:
- Show dashboard with their real data loaded
- Walk through each of the 8 modules
- Demonstrate dropping a new document
- Show audit trail
- Confirm backup is working
- Hand over user guide PDF

After handover: client is live.
You move to retainer support mode.
