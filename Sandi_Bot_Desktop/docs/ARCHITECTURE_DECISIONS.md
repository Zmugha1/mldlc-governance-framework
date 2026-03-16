# Architecture Decisions Log
## Sandi Bot — Dr. Data Decision Intelligence

A running log of significant decisions and why
they were made. Update this when making any
decision that future developers would question.

---

## ADR-001: Tauri over Electron
Date: Early 2026
Decision: Use Tauri v2 as the desktop shell.
Reason: Tauri installer is ~5MB vs Electron ~150MB.
Tauri uses the OS web renderer — no bundled Chrome.
RAM footprint at idle: ~30-50MB vs 500MB+ Electron.
For a privacy-focused local app, smaller is better.
Rule added: Never use Electron in this project.

## ADR-002: Airgapped architecture
Date: Early 2026
Decision: Zero internet dependency after setup.
Reason: Clients handle sensitive personal and
financial data. Coaches have legal and ethical
obligations to protect client information.
Cloud tools expose client data to third parties.
This is a compliance feature, not a limitation.
Rule added: No external API calls except where
client config explicitly permits them.

## ADR-003: Config-driven client differentiation
Date: March 2026
Decision: All client-specific behavior lives in
configs/[client_id].json, never in code.
Reason: New client onboarding should be one week
not a new build. Hardcoded client values create
a maintenance nightmare at scale.
Rule added: Never hardcode client-specific values.

## ADR-004: Service layer as single source of truth
Date: March 2026
Decision: All business logic in src/services/.
Modules are display-only. No exceptions.
Reason: Agents and modules both need to call the
same logic. If logic lives in modules, agents
cannot use it without duplication. Duplication
creates bugs and maintenance overhead.
Rule added: Move any logic found in modules to
the appropriate service file immediately.

## ADR-005: TOOLS.md as operations registry
Date: March 2026
Decision: Every named operation defined in
TOOLS.md before it is built.
Reason: This becomes the MCP tool manifest when
the system is ready for MCP server exposure.
Defining contracts first prevents the service
layer from becoming an undocumented maze.
Rule added: Add to TOOLS.md before building.

## ADR-006: Audit reasoning as governance
Date: Early 2026
Decision: Every recommendation logged with
step-by-step reasoning, not a summary.
Reason: GDPR and EU AI Act require explainability.
Coaches must be able to audit every AI decision.
Glass box not black box is a trust requirement,
not a nice-to-have.
Rule added: reasoning field is never a summary.

## ADR-007: Ollama on-demand loading
Date: March 2026
Decision: Ollama loads when a task requires it.
Not at app startup.
Reason: phi3:mini uses 2.3GB RAM when loaded.
llama3.1:8b uses 5-6GB. Loading at startup would
make the app feel slow and consume resources for
sessions that never need LLM inference.
Rule added: Check if task is deterministic before
calling Ollama. Never load for scoring tasks.

## ADR-008: phi3 for Sandi, llama3.1 for Fred
Date: March 2026
Decision: Different LLM models per client config.
Reason: Sandi's use cases are document extraction
and readiness scoring — phi3:mini handles these
well and is faster. Fred needs vision statement
synthesis and franchise intro document generation
— these require the stronger reasoning of llama3.1.
Hardware also differs — verify Fred's specs.
Rule added: llm.model in client config controls
which model loads. Never hardcode model name.
