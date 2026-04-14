# Coach Bot Desktop — Installer Rules
# Dr. Data Decision Intelligence LLC
# Sandi Stahl — Windows one-click install
#
# MANDATORY: Read this entire file before
# building, changing, or documenting any
# installer bundle, NSIS script, CI job, or
# first-run DB logic for Coach Bot Desktop.

---

## Purpose

Deliver a clean **one-click** Windows installer for Sandi Stahl:

- **No PowerShell** visible to the user.
- **No cmd** or other terminal windows.
- **No manual** copy/paste of files or folders.
- **No technical** steps (paths, env vars, registry edits) required.
- **One double-click** runs the installer; when finished, Coach Bot **launches**.

Non-goals for v0.4.0 installer scope are listed under Open questions; do not silently expand scope without updating this file.

---

## Product identity (locked)

- **Application:** Coach Bot Desktop (Tauri v2).
- **Bundle identifier / app data folder name:** `com.sandibot.desktop` (see `STZ_AGENT_SPECIFICATION.md`).
- **SQLite database filename:** `sandi_bot.db`.
- **Default user DB directory (Windows):**  
  `%AppData%\Roaming\com.sandibot.desktop\`  
  (full path example: `C:\Users\<User>\AppData\Roaming\com.sandibot.desktop\sandi_bot.db`)

All installer and first-run code must resolve paths using the same identifier the runtime uses (Tauri app config / bundle id). Never hardcode a different folder name for production installs.

---

## Functional requirements (must ship)

### R1 — Silent upgrade path

If a **previous Coach Bot** (same product / same bundle id) is installed:

1. **Remove or upgrade** that version **without** showing a console, PowerShell, or technical dialog sequence to Sandi.
2. Prefer the platform-standard pattern: run the official **uninstall** of the existing product (same upgrade code / product code family) then install the new MSI/NSIS build, **or** use the installer framework’s built-in “upgrade if present” behavior.
3. **Never** leave two Add/Remove Programs entries for the same product long-term.

Document the exact mechanism (NSIS `Exec` vs MSI MajorUpgrade, etc.) in the build README when implemented.

### R2 — Install new application binaries

Install the signed/current build of Coach Bot (exe, WebView assets, `src-tauri` resources as produced by `tauri build`) to the standard per-machine or per-user location **chosen once** and documented here (e.g. `%LocalAppData%\Programs\...` vs `Program Files`).

### R3 — Database file: create only if missing (never overwrite)

**Rule:** Place `sandi_bot.db` in the correct **AppData** location **only if** the file **does not already exist**.

- If `sandi_bot.db` **exists** → **do nothing** to that file (no replace, no truncate, no merge). Updates must **preserve** all coaching data.
- If `sandi_bot.db` **does not exist** → create it by **one** of:
  - shipping a **template** empty DB with migrations already applied, **or**
  - running the app’s **first-run migration** path once (must match dev behavior documented in repo).

**Never** overwrite an existing DB on install or upgrade.

### R4 — Launch when done

When installation completes successfully, **start Coach Bot** automatically (shortcut optional; auto-launch required unless Sandi opts out in a future ADR).

### R5 — No visible shells

- **No** `powershell.exe` / `pwsh.exe` window.
- **No** `cmd.exe` window for normal install/uninstall.
- **No** terminal for Sandi to read stack traces during install.

Internal tools may run headless only if the framework guarantees no window (document if used).

### R6 — No manual file operations for Sandi

Sandi must not copy `sandi_bot.db`, DLLs, or folders by hand. The installer and app resolve paths.

---

## Engineering constraints (from STZ / CLAUDE)

- **Stack:** Tauri v2 + React + SQLite via **tauri-plugin-sql** (`getDb()` pattern). Do not introduce better-sqlite3 or Electron installers.
- **Migrations:** Never ship an installer that replaces an existing DB; migration numbering remains **70+** for new schema changes (see `CLAUDE.md`).
- **Capabilities / Rust:** Changes to `default.json`, Rust, or migrations follow the same **touch-only-what-you-must** rules as the rest of the repo; installer work may add **new** WiX/NSIS assets or `bundle` config as needed without violating separate user rules for a given prompt.

---

## Verification checklist (before calling a build “done”)

1. Fresh VM or clean user: double-click installer → app opens → **no** PowerShell/cmd flash.
2. Second run (upgrade): old version gone or upgraded → **still one** `sandi_bot.db` with **data intact**.
3. Uninstall (if offered): document whether DB is left in place (recommended default: **leave** `sandi_bot.db` unless Sandi explicitly deletes app data).
4. Confirm DB path matches `%AppData%\Roaming\com.sandibot.desktop\sandi_bot.db` (or documented equivalent).

---

## Open questions (resolve before or during implementation)

1. **Ollama:** “Installs everything” may mean **Coach Bot only**; Ollama may remain a **documented prerequisite** or a **future** bundled/portable step. State clearly in release notes until resolved.
2. **Code signing:** Windows SmartScreen; certificate and signing step belong in CI/release doc.
3. **Install scope:** per-user vs machine-wide — pick one default for Sandi and document.

---

## Cursor / agent workflow

1. Open **`docs/INSTALLER_RULES.md`** (this file) at the **start** of any session that touches installers.
2. Implement installer changes in **small** commits (one concern per commit where possible).
3. After code changes: **`npx tsc --noEmit`** in `Sandi_Bot_Desktop` unless the change is docs-only.
4. Push: **`git push sandi dev`** from branch **`dev`**.

---

## Revision log

| Date       | Change |
| ---------- | ------ |
| 2026-04-11 | Initial rules file: Windows one-click goals, DB never overwrite, no PowerShell, launch when done. |
| 2026-04-14 | Session capture: desktop shortcut mandatory; Google creds compile-time; smart install checklist; delivery package contents (see rules below). |

---

## Mandatory rules supplement (session April 13–14 2026)

These rules **add** to everything above. Never delete prior requirements.

### RULE — Always create desktop shortcut

Every NSIS installer build must create a **desktop shortcut**. Sandi could not find the app without it after closing Coach Bot. **Never** ship an installer build without desktop shortcut creation verified.

### RULE — Google credentials must be baked into build

**Never** rely on environment variables at runtime in production for Google OAuth. Use **build-time Rust constants** compiled into the binary. The `GOOGLE_CLIENT_ID` (and related) values may be supplied at **compile time** via the build environment, but the shipped app must not depend on the client's machine having those vars set.

### RULE — Smart install checklist

Installer or first-run orchestration must account for this checklist (without showing PowerShell or terminal to Sandi):

- Check **Ollama** installed; if missing, documented headless or guided path per future ADR (never raw shell to user).
- Check **qwen2.5:7b** pulled; if missing, pull or document.
- Check **DB exists** — **never overwrite** existing `sandi_bot.db`.
- Check **previous version** — uninstall first when upgrade policy requires it.
- **Create desktop shortcut**.
- **Launch app** when install completes (existing R4).

### RULE — Delivery package contents

Standard client delivery folder must include at minimum:

1. **Installer EXE** (NSIS or agreed bundle).
2. **DB backup copy** (`sandi_bot.db` or agreed backup name).
3. **Setup Instructions PDF**.

All three live in a **Google Drive** folder shared with the client **before** the installation call.

---

## Mandatory rules supplement (session April 14 2026 — end of session)

These rules **add** to everything above. Never delete prior requirements.

### RULE — shortcutsDefaultDesktop is NOT valid

**shortcutsDefaultDesktop** is **NOT** a valid Tauri NsisConfig key. `tauri-utils` uses `deny_unknown_fields`. Adding it breaks config parsing entirely and prevents builds. Desktop shortcuts must be created in **`src-tauri/nsis/main.nsh`** only via **NSIS_HOOK_POSTINSTALL** calling **CreateOrUpdateDesktopShortcut**. **Never** put shortcut config in `tauri.conf.json` ever.

### RULE — Vision placeholder images before every Sandi build

Vision placeholder images must be swapped before every installer build for Sandi: **`public/coach-motivation-road.jpg`**, **`public/coach-motivation-cliff-you.jpg`**. Replace with Sandi's actual images keeping exact same filenames. No code change needed. Just file replacement.

### RULE — Always test on developer machine before delivery

Always test on developer machine before delivery. Run full test checklist **RUN-027** before every installer build. Never ship untested build.

### RULE — Ollama must be running during installer testing

Ollama must be running during installer testing. AI Ready must show green before running any AI tests. False failures occur when Ollama is not running.
