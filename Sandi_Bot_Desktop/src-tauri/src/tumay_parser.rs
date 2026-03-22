use regex::Regex;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct TumayData {
    pub contact_name: String,
    pub email: String,
    pub phone: String,
    pub city: String,
    pub state: String,
    pub spouse_name: String,
    pub spouse_role: String,
    pub spouse_on_calls: String,
    pub spouse_mindset: String,
    pub reasons_for_change: Vec<String>,
    pub location_preference: String,
    pub time_commitment: String,
    pub self_sufficiency_explored: String,
    pub self_sufficiency_excitement: String,
    pub launch_timeline: String,
    pub areas_of_interest: Vec<String>,
    pub financial_net_worth_range: String,
    pub credit_score: String,
}

impl Default for TumayData {
    fn default() -> Self {
        Self {
            contact_name: String::new(),
            email: String::new(),
            phone: String::new(),
            city: String::new(),
            state: String::new(),
            spouse_name: String::new(),
            spouse_role: String::new(),
            spouse_on_calls: String::new(),
            spouse_mindset: String::new(),
            reasons_for_change: Vec::new(),
            location_preference: String::new(),
            time_commitment: String::new(),
            self_sufficiency_explored: String::new(),
            self_sufficiency_excitement: String::new(),
            launch_timeline: String::new(),
            areas_of_interest: Vec::new(),
            financial_net_worth_range: String::new(),
            credit_score: String::new(),
        }
    }
}

pub fn parse_tumay_deterministic(text: &str) -> TumayData {
    match std::panic::catch_unwind(|| parse_tumay_impl(text)) {
        Ok(result) => result,
        Err(_) => TumayData::default(),
    }
}

fn parse_tumay_impl(text: &str) -> TumayData {
    let mut result = TumayData::default();
    let normalized = text.replace('\r', "");
    let q2_section = extract_section(
        &normalized,
        r"(?im)^\s*Q2\s*[-:]\s*Who Else\??\s*$",
        r"(?im)^\s*Q3\s*[-:]",
    );
    let q8_section = extract_section(
        &normalized,
        r"(?im)^\s*Q8\s*[-:]\s*Self-Sufficiency.*$",
        r"(?im)^\s*Q9\s*[-:]",
    );
    let q11_section = extract_section(
        &normalized,
        r"(?im)^\s*Q11\s*[-:]\s*Areas of Interest.*$",
        r"(?im)^\s*Q13\s*[-:]",
    );

    result.contact_name = extract_single(
        &normalized,
        &[r"(?im)^\s*Name\s*:\s*(.+)$"],
    );
    result.email = extract_single(
        &normalized,
        &[r"(?im)^\s*Email\s*Address\s*:\s*(.+)$"],
    );
    result.phone = extract_single(
        &normalized,
        &[r"(?im)^\s*Best\s*Phone\s*:\s*(.+)$"],
    );

    let address = extract_single(
        &normalized,
        &[r"(?im)^\s*Address/City/State/Zip\s*:\s*(.+)$"],
    );
    if let Ok(address_re) =
        Regex::new(r"(?i)^\s*[^,]+,\s*([^,]+),\s*([A-Za-z]{2})\b")
    {
        if let Some(caps) = address_re.captures(&address) {
            result.city = clean(caps.get(1).map_or("", |m| m.as_str()));
            result.state = clean(caps.get(2).map_or("", |m| m.as_str())).to_uppercase();
        }
    }

    result.spouse_name = extract_single(
        &q2_section,
        &[r"(?im)^\s*Name\s*:\s*(.+)$"],
    );
    result.spouse_role = extract_single(
        &q2_section,
        &[r"(?im)^\s*Will your spouse.*have a role.*:\s*(Yes|No|Unsure)\s*$"],
    );
    result.spouse_on_calls = extract_single(
        &q2_section,
        &[r"(?im)^\s*Will they be involved in future calls.*:\s*(Yes|No)\s*$"],
    );
    result.spouse_mindset = extract_single(
        &q2_section,
        &[r"(?im)^\s*Their mindset about business ownership\s*:\s*(.+)$"],
    );

    result.reasons_for_change = extract_yes_lines(
        &normalized,
        &[
            "I'm tired of the corporate world",
            "I want more independence",
            "Improving my lifestyle is important",
            "I'd like to increase my income",
            "I want to increase my wealth & equity",
            "I'd like to own my own business",
            "I desire more flexibility",
        ],
    );

    result.location_preference = extract_location_preference(&normalized);
    result.time_commitment = extract_single(
        &normalized,
        &[r"(?im)^\s*Q7.*?\n[\s\S]*?^\s*Selected\s*:\s*(.+)$"],
    );
    result.self_sufficiency_explored = extract_single(
        &q8_section,
        &[r"(?im)^\s*Yes/No\s*:\s*(Yes|No)\s*$"],
    );
    result.self_sufficiency_excitement = extract_single(
        &q8_section,
        &[r"(?im)^\s*.*what excites you.*:\s*(.+)$"],
    );
    result.launch_timeline = extract_single(
        &normalized,
        &[r"(?im)^\s*Q9.*?\n[\s\S]*?^\s*Selected\s*:\s*(.+)$"],
    );
    result.areas_of_interest = extract_yes_fields(&q11_section);
    result.financial_net_worth_range = extract_single(
        &normalized,
        &[r"(?im)^\s*Estimated\s*Net\s*Worth\s*:\s*(.+)$"],
    );
    result.credit_score = extract_single(
        &normalized,
        &[r"(?im)^\s*Estimated\s*Credit\s*Score\s*:\s*([0-9]{3,4})\s*$"],
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

fn extract_section(text: &str, start_pattern: &str, end_pattern: &str) -> String {
    let start = if let Ok(start_re) = Regex::new(start_pattern) {
        start_re.find(text).map(|m| m.end()).unwrap_or(0)
    } else {
        0
    };
    if start == 0 || start >= text.len() {
        return String::new();
    }
    let tail = &text[start..];
    if let Ok(end_re) = Regex::new(end_pattern) {
        if let Some(m) = end_re.find(tail) {
            return tail[..m.start()].to_string();
        }
    }
    tail.to_string()
}

fn extract_yes_lines(text: &str, prompts: &[&str]) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    for prompt in prompts {
        let pattern = format!(r"(?im)^\s*{}\s*:\s*(Yes|No)\s*$", regex::escape(prompt));
        if let Ok(re) = Regex::new(&pattern) {
            if let Some(caps) = re.captures(text) {
                let answer = caps.get(1).map_or("", |m| m.as_str());
                if answer.eq_ignore_ascii_case("yes") {
                    out.push((*prompt).to_string());
                }
            }
        }
    }
    out
}

fn extract_location_preference(text: &str) -> String {
    let options = [
        "Virtual - Work from anywhere",
        "Home based / remote",
        "Office space / building",
        "Brick and Mortar",
        "Mobile",
    ];
    let mut ranked: Vec<(String, i32)> = Vec::new();
    for opt in options {
        let pattern = format!(r"(?im)^\s*{}\s*:\s*([0-9]+)\s*$", regex::escape(opt));
        if let Ok(re) = Regex::new(&pattern) {
            if let Some(caps) = re.captures(text) {
                if let Some(rank_match) = caps.get(1) {
                    if let Ok(rank) = rank_match.as_str().trim().parse::<i32>() {
                        ranked.push((opt.to_string(), rank));
                    }
                }
            }
        }
    }
    if ranked.is_empty() {
        return String::new();
    }
    ranked.sort_by_key(|(_, rank)| *rank);
    ranked.first().map(|(label, _)| label.clone()).unwrap_or_default()
}

fn extract_yes_fields(section: &str) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    if let Ok(re) = Regex::new(r"(?im)^\s*([A-Za-z0-9/&,\-().+ ]+)\s*:\s*(Yes|No)\s*$") {
        for caps in re.captures_iter(section) {
            let field = clean(caps.get(1).map_or("", |m| m.as_str()));
            let answer = clean(caps.get(2).map_or("", |m| m.as_str()));
            if !field.is_empty() && answer.eq_ignore_ascii_case("yes") {
                out.push(field);
            }
        }
    }
    out
}

fn clean(s: &str) -> String {
    s.split_whitespace().collect::<Vec<_>>().join(" ").trim().to_string()
}
