use std::io::Read;
use std::path::Path;

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
    match lopdf::Document::load(file_path) {
        Err(e) => ExtractionResult::failure("pdf", e.to_string()),
        Ok(doc) => {
            let mut text = String::new();
            let pages = doc.get_pages();

            // First pass: pdf_extract (works for standard PDFs)
            match std::fs::read(file_path) {
                Ok(bytes) => {
                    if let Ok(extracted) = pdf_extract::extract_text_from_mem(&bytes) {
                        if !extracted.trim().is_empty() {
                            text = extracted;
                            text.push('\n');
                        }
                    }
                }
                Err(_) => {}
            }

            // Second pass: raw content stream if first pass got too little
            // Chrome-printed TTI DISC PDFs need this
            if text.trim().len() < 100 {
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
            }

            if text.trim().len() > 5 {
                ExtractionResult::success(text, "pdf")
            } else {
                ExtractionResult::failure(
                    "pdf",
                    "PDF has no extractable text. \
                     May be image-only or encrypted."
                        .to_string(),
                )
            }
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
