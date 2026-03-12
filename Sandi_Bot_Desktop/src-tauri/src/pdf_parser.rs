use regex::Regex;

#[tauri::command]
pub fn parse_pdf(path: String) -> Result<String, String> {
    let bytes = std::fs::read(&path).map_err(|e| e.to_string())?;

    // Primary: pdf-extract
    match pdf_extract::extract_text_from_mem(&bytes) {
        Ok(text) if !text.trim().is_empty() => return Ok(text),
        _ => {}
    }

    // Fallback: lopdf — get raw content stream bytes, parse parenthesized text tokens
    let doc = lopdf::Document::load_mem(&bytes).map_err(|e| e.to_string())?;
    let mut extracted = Vec::new();
    let re = Regex::new(r"\(([^)]+)\)").map_err(|e| e.to_string())?;

    for (_page_num, page_id) in doc.get_pages() {
        if let Ok(content) = doc.get_page_content(page_id) {
            let content_str = String::from_utf8_lossy(&content);
            for cap in re.captures_iter(&content_str) {
                if let Some(m) = cap.get(1) {
                    extracted.push(m.as_str().to_string());
                }
            }
        }
    }

    Ok(extracted.join(" "))
}
