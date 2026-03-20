use regex::Regex;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct TumayResult {
    pub candidate_name: String,
    pub current_occupation: String,
    pub reason_for_change: String,
    pub ideal_work_environment: String,
    pub income_goal: String,
    pub investment_range: String,
    pub timeline: String,
    pub key_motivators: Vec<String>,
    pub concerns: Vec<String>,
}

impl Default for TumayResult {
    fn default() -> Self {
        Self {
            candidate_name: String::new(),
            current_occupation: String::new(),
            reason_for_change: String::new(),
            ideal_work_environment: String::new(),
            income_goal: String::new(),
            investment_range: String::new(),
            timeline: String::new(),
            key_motivators: Vec::new(),
            concerns: Vec::new(),
        }
    }
}

pub fn parse_tumay_deterministic(text: &str) -> TumayResult {
    match std::panic::catch_unwind(|| parse_tumay_impl(text)) {
        Ok(result) => result,
        Err(_) => TumayResult::default(),
    }
}

fn parse_tumay_impl(text: &str) -> TumayResult {
    let mut result = TumayResult::default();
    let normalized = text.replace('\r', "");

    result.candidate_name = extract_single(
        &normalized,
        &[
            r"(?im)^\s*(?:candidate\s*name|name)\s*[:\-]\s*(.+)$",
            r"(?im)^\s*client\s*name\s*[:\-]\s*(.+)$",
        ],
    );
    result.current_occupation = extract_single(
        &normalized,
        &[
            r"(?im)^\s*(?:current\s*occupation|occupation)\s*[:\-]\s*(.+)$",
            r"(?im)^\s*what\s+do\s+you\s+currently\s+do\??\s*[:\-]\s*(.+)$",
        ],
    );
    result.reason_for_change = extract_block(
        &normalized,
        &[
            r"(?im)^\s*(?:reason(?:s)?\s*for\s*change|why\s+are\s+you\s+looking\s+for\s+a\s+change)\s*[:\-]?\s*$",
            r"(?im)^\s*reason(?:s)?\s*for\s*change\s*[:\-]\s*(.+)$",
        ],
    );
    result.ideal_work_environment = extract_block(
        &normalized,
        &[
            r"(?im)^\s*(?:ideal\s*work\s*environment|preferred\s*work\s*environment)\s*[:\-]?\s*$",
            r"(?im)^\s*ideal\s*work\s*environment\s*[:\-]\s*(.+)$",
        ],
    );
    result.income_goal = extract_single(
        &normalized,
        &[
            r"(?im)^\s*(?:income\s*goal|target\s*income)\s*[:\-]\s*(.+)$",
            r"(?im)^\s*what\s+is\s+your\s+income\s+goal\??\s*[:\-]\s*(.+)$",
        ],
    );
    result.investment_range = extract_single(
        &normalized,
        &[
            r"(?im)^\s*(?:investment\s*range|investment)\s*[:\-]\s*(.+)$",
            r"(?im)^\s*financial\s*investment\s*range\s*[:\-]\s*(.+)$",
        ],
    );
    result.timeline = extract_single(
        &normalized,
        &[
            r"(?im)^\s*(?:timeline|launch\s*timeline|timeframe)\s*[:\-]\s*(.+)$",
            r"(?im)^\s*when\s+would\s+you\s+like\s+to\s+start\??\s*[:\-]\s*(.+)$",
        ],
    );
    result.key_motivators = extract_list(
        &normalized,
        &[
            r"(?im)^\s*(?:key\s*motivators|motivators)\s*[:\-]?\s*$",
            r"(?im)^\s*what\s+motivates\s+you\??\s*[:\-]?\s*$",
        ],
    );
    result.concerns = extract_list(
        &normalized,
        &[
            r"(?im)^\s*(?:concerns|primary\s*concerns)\s*[:\-]?\s*$",
            r"(?im)^\s*what\s+are\s+your\s+concerns\??\s*[:\-]?\s*$",
        ],
    );

    result
}

fn extract_single(text: &str, patterns: &[&str]) -> String {
    for pattern in patterns {
        if let Ok(re) = Regex::new(pattern) {
            if let Some(caps) = re.captures(text) {
                if let Some(m) = caps.get(1) {
                    let v = clean(m.as_str());
                    if !v.is_empty() {
                        return v;
                    }
                }
            }
        }
    }
    String::new()
}

fn extract_block(text: &str, patterns: &[&str]) -> String {
    let lines: Vec<&str> = text.lines().collect();
    for pattern in patterns {
        if let Ok(re) = Regex::new(pattern) {
            for idx in 0..lines.len() {
                let line = lines[idx];
                if let Some(caps) = re.captures(line) {
                    if let Some(m) = caps.get(1) {
                        let inline = clean(m.as_str());
                        if !inline.is_empty() {
                            return inline;
                        }
                    }
                    let mut collected: Vec<String> = Vec::new();
                    let mut j = idx + 1;
                    while j < lines.len() {
                        let candidate = clean(lines[j]);
                        if candidate.is_empty() {
                            if !collected.is_empty() {
                                break;
                            }
                            j += 1;
                            continue;
                        }
                        if is_heading(&candidate) && !collected.is_empty() {
                            break;
                        }
                        collected.push(candidate);
                        if collected.len() >= 4 {
                            break;
                        }
                        j += 1;
                    }
                    if !collected.is_empty() {
                        return clean(&collected.join(" "));
                    }
                }
            }
        }
    }
    String::new()
}

fn extract_list(text: &str, patterns: &[&str]) -> Vec<String> {
    let lines: Vec<&str> = text.lines().collect();
    for pattern in patterns {
        if let Ok(re) = Regex::new(pattern) {
            for idx in 0..lines.len() {
                let line = clean(lines[idx]);
                if re.is_match(&line) {
                    let mut items: Vec<String> = Vec::new();
                    let mut j = idx + 1;
                    while j < lines.len() {
                        let candidate = clean(lines[j]);
                        if candidate.is_empty() {
                            if !items.is_empty() {
                                break;
                            }
                            j += 1;
                            continue;
                        }
                        if is_heading(&candidate) && !items.is_empty() {
                            break;
                        }
                        let normalized = candidate
                            .trim_start_matches(['-', '*', '•', '·'])
                            .trim()
                            .to_string();
                        if !normalized.is_empty() {
                            items.push(normalized);
                        }
                        if items.len() >= 8 {
                            break;
                        }
                        j += 1;
                    }
                    if !items.is_empty() {
                        return items;
                    }
                }
            }
        }
    }
    Vec::new()
}

fn is_heading(s: &str) -> bool {
    let lower = s.to_lowercase();
    [
        "candidate name",
        "name",
        "occupation",
        "current occupation",
        "reason for change",
        "reasons for change",
        "ideal work environment",
        "income goal",
        "investment range",
        "timeline",
        "key motivators",
        "motivators",
        "concerns",
    ]
    .iter()
    .any(|h| lower.starts_with(h))
}

fn clean(s: &str) -> String {
    s.split_whitespace().collect::<Vec<_>>().join(" ").trim().to_string()
}
