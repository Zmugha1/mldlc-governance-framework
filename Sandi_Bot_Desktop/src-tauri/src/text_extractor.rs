// Requires pdfium.dll in the same directory as the executable on Windows.
// Download from: https://github.com/bblanchon/pdfium-binaries/releases
// File: pdfium-win-x64.tgz → extract pdfium.dll
// Place at: src-tauri/pdfium.dll
// For development: place pdfium.dll in src-tauri/ directory.

use std::io::Read;
use std::path::Path;
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

pub struct ExtractionResult {
    pub text: String,
    pub format: String,
    pub success: bool,
    pub error: Option<String>,
}

impl ExtractionResult {
    fn success(text: String, format: &str) -> Self {
        ExtractionResult {
            text,
            format: format.to_string(),
            success: true,
            error: None,
        }
    }
    fn failure(format: &str, error: String) -> Self {
        ExtractionResult {
            text: String::new(),
            format: format.to_string(),
            success: false,
            error: Some(error),
        }
    }
}

pub fn extract_text(file_path: &str) -> ExtractionResult {
    let path = Path::new(file_path);
    let extension = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    match extension.as_str() {
        "pdf" => extract_pdf(file_path),
        "txt" | "md" | "log" => extract_plain_text(file_path),
        "docx" => extract_docx(file_path),
        "pptx" => extract_pptx(file_path),
        "xlsx" | "xls" => extract_excel(file_path),
        "csv" => extract_csv(file_path),
        _ => ExtractionResult::failure(
            &extension,
            format!("Unsupported file type: .{}", extension),
        ),
    }
}

fn extract_pdf(file_path: &str) -> ExtractionResult {
    // Attempt 1: lopdf raw stream parsing (Chrome-printed PDFs)
    let stream_result = try_pdf_stream_extraction(file_path);
    if stream_result.trim().len() > 50 {
        return ExtractionResult::success(stream_result, "pdf");
    }

    // Attempt 2: pdf-extract crate (standard PDFs)
    match std::fs::read(file_path) {
        Ok(bytes) => match pdf_extract::extract_text_from_mem(&bytes) {
            Ok(text) if text.trim().len() > 50 => {
                return ExtractionResult::success(text, "pdf");
            }
            Ok(_) => {}
            Err(e) => {
                return ExtractionResult::failure("pdf", e.to_string());
            }
        },
        Err(e) => return ExtractionResult::failure("pdf", e.to_string()),
    }

    // Both failed — image-based PDF
    ExtractionResult::failure(
        "pdf",
        "PDF appears to be image-based. \
         Text extraction not possible without OCR. \
         Please export the TTI report as a \
         text-selectable PDF."
            .to_string(),
    )
}

fn try_pdf_stream_extraction(file_path: &str) -> String {
    match lopdf::Document::load(file_path) {
        Err(_) => String::new(),
        Ok(doc) => {
            let mut text = String::new();
            let pages = doc.get_pages();
            for (_page_num, page_id) in &pages {
                if let Ok(content) = doc.get_page_content(*page_id) {
                    let raw = String::from_utf8_lossy(&content);
                    let extracted = extract_text_from_pdf_stream(&raw);
                    if !extracted.is_empty() {
                        text.push_str(&extracted);
                        text.push('\n');
                    }
                }
            }
            text
        }
    }
}

fn extract_text_from_pdf_stream(stream: &str) -> String {
    let mut result = String::new();
    let mut in_text_block = false;

    for line in stream.lines() {
        let trimmed = line.trim();
        if trimmed == "BT" {
            in_text_block = true;
            continue;
        }
        if trimmed == "ET" {
            in_text_block = false;
            continue;
        }
        if in_text_block {
            if trimmed.ends_with("Tj") || trimmed.ends_with("TJ") {
                let text = trimmed
                    .trim_end_matches("Tj")
                    .trim_end_matches("TJ")
                    .trim();
                let clean = text
                    .trim_start_matches('(')
                    .trim_end_matches(')')
                    .trim();
                if !clean.is_empty() && clean.chars().any(|c| c.is_alphanumeric()) {
                    result.push_str(clean);
                    result.push(' ');
                }
            }
        }
    }
    result.trim().to_string()
}

/// Run Tesseract OCR on an image with configurable timeout (default 15s).
fn run_tesseract_ocr_with_timeout(
    image_path: &std::path::Path,
    timeout_secs: u64,
) -> Result<String, String> {
    let path_str = image_path
        .to_str()
        .ok_or_else(|| "Invalid path: non-UTF8 characters".to_string())?;
    let tesseract_exe = if cfg!(target_os = "windows") {
        let default = r"C:\Program Files\Tesseract-OCR\tesseract.exe";
        if std::path::Path::new(default).exists() {
            default
        } else {
            "tesseract"
        }
    } else {
        "tesseract"
    };

    let exe = tesseract_exe.to_string();
    let path_owned = path_str.to_string();
    let (tx, rx) = mpsc::channel();
    thread::spawn(move || {
        let output = std::process::Command::new(&exe)
            .arg(&path_owned)
            .arg("stdout")
            .arg("-l")
            .arg("eng")
            .output();
        let _ = tx.send(output);
    });

    match rx.recv_timeout(Duration::from_secs(timeout_secs)) {
        Ok(Ok(output)) => {
            if output.status.success() {
                Ok(String::from_utf8_lossy(&output.stdout).to_string())
            } else {
                Err(format!(
                    "Tesseract failed: {}",
                    String::from_utf8_lossy(&output.stderr)
                ))
            }
        }
        Ok(Err(e)) => Err(format!("Tesseract not found or failed to run: {}", e)),
        Err(_) => Err(format!(
            "OCR timeout after {} seconds — Tesseract may be slow on large images",
            timeout_secs
        )),
    }
}

fn run_tesseract_ocr(image_path: &std::path::Path) -> Result<String, String> {
    run_tesseract_ocr_with_timeout(image_path, 15)
}

fn pdfium_library_path() -> std::path::PathBuf {
    // Try executable directory first (bundled app, or dev with copied dll)
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            let dll = dir.join("pdfium.dll");
            if dll.exists() {
                return dir.to_path_buf();
            }
        }
    }
    // Try current directory
    if let Ok(cwd) = std::env::current_dir() {
        let dll = cwd.join("pdfium.dll");
        if dll.exists() {
            return cwd.clone();
        }
        // Try src-tauri for dev
        let src_tauri = cwd.join("src-tauri").join("pdfium.dll");
        if src_tauri.exists() {
            return cwd.join("src-tauri");
        }
    }
    std::path::PathBuf::from(".")
}

pub fn extract_pages_by_numbers(
    file_path: &str,
    page_numbers: Vec<u32>,
) -> ExtractionResult {
    let filename = Path::new(file_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(file_path);
    println!("[DISC] Starting extraction for: {}", filename);

    let path = Path::new(file_path);
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    if ext != "pdf" {
        let msg = format!("extract_pages_by_numbers supports PDF only, got .{}", ext);
        println!("[DISC] {}", msg);
        return ExtractionResult::failure(&ext, msg);
    }

    // Verify file exists before attempting extraction
    if !path.exists() {
        let msg = format!("File not found at path: {}", path.display());
        println!("[DISC] ERROR: {}", msg);
        return ExtractionResult::failure(
            "pdf",
            msg,
        );
    }

    // Try pdfium-render first
    match extract_with_pdfium(path, &page_numbers) {
        Ok(text) => {
            let len = text.trim().len();
            println!("[DISC] pdfium returned {} chars", len);
            if len > 100 {
                println!("[DISC] Text above threshold, using pdfium result");
                ExtractionResult {
                    text,
                    format: "pdf".to_string(),
                    success: true,
                    error: None,
                }
            } else {
                println!("[DISC] Text below threshold ({}), triggering OCR fallback...", len);
                match extract_with_ocr(path, &page_numbers) {
                    Ok(ocr_text) => {
                        let ocr_len = ocr_text.trim().len();
                        println!("[DISC] OCR completed, returned {} chars", ocr_len);
                        ExtractionResult {
                            text: ocr_text,
                            format: "pdf_ocr".to_string(),
                            success: true,
                            error: None,
                        }
                    }
                    Err(e) => {
                        println!("[DISC] OCR failed: {}", e);
                        ExtractionResult {
                            text: String::new(),
                            format: "pdf".to_string(),
                            success: false,
                            error: Some(format!("Both pdfium and OCR failed: {}", e)),
                        }
                    }
                }
            }
        }
        Err(e) => {
            println!("[DISC] pdfium failed: {}, triggering OCR fallback...", e);
            match extract_with_ocr(path, &page_numbers) {
                Ok(ocr_text) => {
                    let ocr_len = ocr_text.trim().len();
                    println!("[DISC] OCR completed, returned {} chars", ocr_len);
                    ExtractionResult {
                        text: ocr_text,
                        format: "pdf_ocr".to_string(),
                        success: true,
                        error: None,
                    }
                }
                Err(ocr_err) => {
                    println!("[DISC] OCR failed: {}", ocr_err);
                    ExtractionResult {
                        text: String::new(),
                        format: "pdf".to_string(),
                        success: false,
                        error: Some(format!(
                            "PDFium failed: {}. OCR fallback failed: {}",
                            e, ocr_err
                        )),
                    }
                }
            }
        }
    }
}

fn extract_with_pdfium(
    path: &Path,
    page_numbers: &[u32],
) -> Result<String, String> {
    use pdfium_render::prelude::*;

    let lib_path = pdfium_library_path();
    let bindings = Pdfium::bind_to_library(
        Pdfium::pdfium_platform_library_name_at_path(&lib_path),
    )
    .map_err(|e| format!("PDFium library load failed: {}", e))?;

    let pdfium = Pdfium::new(bindings);
    let doc = pdfium
        .load_pdf_from_file(path, None)
        .map_err(|e| format!("PDF load failed (file may be corrupted or not a valid PDF): {}", e))?;

    let mut collected = String::new();

    for &page_num in page_numbers {
        let idx = (page_num as usize).saturating_sub(1);

        if let Ok(page) = doc.pages().get(idx as u16) {
            let text = page
                .text()
                .map_err(|e| format!("Page {} text extraction failed: {}", page_num, e))?
                .all();

            if !text.trim().is_empty() {
                collected.push_str(&format!("\n--- PAGE {} ---\n{}", page_num, text));
            }
        }
    }

    Ok(collected)
}

fn extract_with_ocr(path: &Path, page_numbers: &[u32]) -> Result<String, String> {
    use pdfium_render::prelude::*;

    let lib_path = pdfium_library_path();
    let bindings = Pdfium::bind_to_library(
        Pdfium::pdfium_platform_library_name_at_path(&lib_path),
    )
    .map_err(|e| format!("PDFium library load failed (OCR path): {}", e))?;

    let pdfium = Pdfium::new(bindings);
    let doc = pdfium
        .load_pdf_from_file(path, None)
        .map_err(|e| format!("PDF load failed for OCR (file may be corrupted): {}", e))?;

    let mut collected = String::new();

    for &page_num in page_numbers {
        let idx = (page_num as usize).saturating_sub(1);

        if let Ok(page) = doc.pages().get(idx as u16) {
            let bitmap = page
                .render_with_config(
                    &PdfRenderConfig::new()
                        .set_target_width(2480)
                        .set_maximum_height(3508),
                )
                .map_err(|e| format!("Page {} render failed: {}", page_num, e))?;

            let temp_path = std::env::temp_dir().join(format!("disc_page_{}.png", page_num));

            bitmap
                .as_image()
                .save(&temp_path)
                .map_err(|e| format!("Failed to save temp image for page {}: {}", page_num, e))?;

            let tesseract_path = temp_path.to_string_lossy();
            println!("[DISC] OCR command: tesseract {} stdout -l eng", tesseract_path);

            let text = run_tesseract_ocr(&temp_path)
                .map_err(|e| format!("Tesseract OCR failed for page {}: {}", page_num, e))?;

            let _ = std::fs::remove_file(&temp_path);

            if !text.trim().is_empty() {
                collected.push_str(&format!(
                    "\n--- PAGE {} (OCR) ---\n{}",
                    page_num, text
                ));
            }
        }
    }

    Ok(collected)
}

fn extract_plain_text(file_path: &str) -> ExtractionResult {
    match std::fs::read_to_string(file_path) {
        Ok(text) => ExtractionResult::success(text, "txt"),
        Err(e) => match std::fs::read(file_path) {
            Ok(bytes) => {
                let text = String::from_utf8_lossy(&bytes).to_string();
                ExtractionResult::success(text, "txt")
            }
            Err(_) => ExtractionResult::failure("txt", e.to_string()),
        },
    }
}

fn extract_docx(file_path: &str) -> ExtractionResult {
    match std::fs::read(file_path) {
        Err(e) => ExtractionResult::failure("docx", e.to_string()),
        Ok(bytes) => match extract_xml_from_zip(&bytes, "word/document.xml") {
            Ok(xml) => ExtractionResult::success(strip_xml_tags(&xml), "docx"),
            Err(e) => ExtractionResult::failure("docx", e),
        },
    }
}

fn extract_pptx(file_path: &str) -> ExtractionResult {
    match std::fs::read(file_path) {
        Err(e) => ExtractionResult::failure("pptx", e.to_string()),
        Ok(bytes) => match extract_all_slides_from_pptx(&bytes) {
            Ok(text) => ExtractionResult::success(text, "pptx"),
            Err(e) => ExtractionResult::failure("pptx", e),
        },
    }
}

fn extract_all_slides_from_pptx(bytes: &[u8]) -> Result<String, String> {
    let cursor = std::io::Cursor::new(bytes);
    let mut archive = zip::ZipArchive::new(cursor).map_err(|e| e.to_string())?;
    let mut all_text = String::new();
    let file_count = archive.len();
    for i in 0..file_count {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        let name = file.name().to_string();
        if name.starts_with("ppt/slides/slide") && name.ends_with(".xml") {
            let mut xml = String::new();
            file.read_to_string(&mut xml).map_err(|e| e.to_string())?;
            let slide_text = strip_xml_tags(&xml);
            if !slide_text.trim().is_empty() {
                all_text.push_str(&slide_text);
                all_text.push('\n');
            }
        }
        if name.starts_with("ppt/notesSlides/") && name.ends_with(".xml") {
            let mut xml = String::new();
            file.read_to_string(&mut xml).map_err(|e| e.to_string())?;
            let notes = strip_xml_tags(&xml);
            if !notes.trim().is_empty() {
                all_text.push_str("[Notes] ");
                all_text.push_str(&notes);
                all_text.push('\n');
            }
        }
    }
    if all_text.trim().is_empty() {
        return Err("No text found in PPTX".to_string());
    }
    Ok(all_text)
}

fn extract_excel(file_path: &str) -> ExtractionResult {
    use calamine::{open_workbook_auto, Reader};
    match open_workbook_auto(file_path) {
        Err(e) => ExtractionResult::failure("xlsx", e.to_string()),
        Ok(mut workbook) => {
            let mut all_text = String::new();
            let sheet_names = workbook.sheet_names().to_vec();
            for sheet_name in &sheet_names {
                if let Ok(range) = workbook.worksheet_range(sheet_name) {
                    all_text.push_str(&format!("[Sheet: {}]\n", sheet_name));
                    for row in range.rows() {
                        let row_text: Vec<String> = row
                            .iter()
                            .map(|cell| cell.to_string())
                            .filter(|s| !s.is_empty())
                            .collect();
                        if !row_text.is_empty() {
                            all_text.push_str(&row_text.join(" | "));
                            all_text.push('\n');
                        }
                    }
                    all_text.push('\n');
                }
            }
            if all_text.trim().is_empty() {
                ExtractionResult::failure("xlsx", "No data found".to_string())
            } else {
                ExtractionResult::success(all_text, "xlsx")
            }
        }
    }
}

fn extract_csv(file_path: &str) -> ExtractionResult {
    match std::fs::read_to_string(file_path) {
        Err(e) => ExtractionResult::failure("csv", e.to_string()),
        Ok(content) => {
            let mut text = String::new();
            let mut reader = csv::Reader::from_reader(content.as_bytes());
            if let Ok(headers) = reader.headers() {
                text.push_str(&headers.iter().collect::<Vec<_>>().join(" | "));
                text.push('\n');
            }
            for record in reader.records().flatten() {
                let row: Vec<&str> = record.iter().collect();
                text.push_str(&row.join(" | "));
                text.push('\n');
            }
            ExtractionResult::success(text, "csv")
        }
    }
}

fn extract_xml_from_zip(bytes: &[u8], entry_name: &str) -> Result<String, String> {
    let cursor = std::io::Cursor::new(bytes);
    let mut archive = zip::ZipArchive::new(cursor).map_err(|e| e.to_string())?;
    let mut file = archive
        .by_name(entry_name)
        .map_err(|_| format!("Entry not found: {}", entry_name))?;
    let mut xml = String::new();
    file.read_to_string(&mut xml).map_err(|e| e.to_string())?;
    Ok(xml)
}

fn strip_xml_tags(xml: &str) -> String {
    let mut result = String::new();
    let mut in_tag = false;
    let mut last_was_space = false;
    for ch in xml.chars() {
        match ch {
            '<' => in_tag = true,
            '>' => {
                in_tag = false;
                if !last_was_space {
                    result.push(' ');
                    last_was_space = true;
                }
            }
            _ if !in_tag => {
                if ch.is_whitespace() {
                    if !last_was_space && !result.is_empty() {
                        result.push(' ');
                        last_was_space = true;
                    }
                } else {
                    result.push(ch);
                    last_was_space = false;
                }
            }
            _ => {}
        }
    }
    result.trim().to_string()
}
