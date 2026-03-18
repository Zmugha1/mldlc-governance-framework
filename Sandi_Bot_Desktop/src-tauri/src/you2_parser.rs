// Deterministic You2 extraction — vision + top 3 Dangers, Strengths, Opportunities.
// Mirrors documentExtractionService.ts extractYou2VisionDeterministic.

use regex::Regex;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct You2DeterministicResult {
    pub vision: String,
    pub top_3_dangers: Vec<DangerGoal>,
    pub top_3_strengths: Vec<StrengthGoal>,
    pub top_3_opportunities: Vec<OpportunityGoal>,
    pub found: bool,
}

#[derive(Debug, Serialize)]
pub struct DangerGoal {
    pub danger: String,
    pub goal: String,
}

#[derive(Debug, Serialize)]
pub struct StrengthGoal {
    pub strength: String,
    pub goal: String,
}

#[derive(Debug, Serialize)]
pub struct OpportunityGoal {
    pub opportunity: String,
    pub goal: String,
}

pub fn extract_you2_vision_deterministic(text: &str) -> You2DeterministicResult {
    let mut result = You2DeterministicResult {
        vision: String::new(),
        top_3_dangers: Vec::new(),
        top_3_strengths: Vec::new(),
        top_3_opportunities: Vec::new(),
        found: false,
    };

    let lines: Vec<String> = text
        .lines()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();

    if lines.is_empty() {
        return result;
    }

    // Vision: text between first line (client name) and "Dangers" section
    let dangers_re = Regex::new(r"^(?i)dangers\b|^(?i)top\s*3\s*dangers").unwrap();
    let dangers_idx = lines.iter().position(|l| dangers_re.is_match(l));

    if let Some(idx) = dangers_idx {
        if idx > 1 {
            result.vision = lines[1..idx]
                .join(" ")
                .split_whitespace()
                .collect::<Vec<_>>()
                .join(" ");
        }
    }

    // Extract paired Danger:/Goal: blocks (top 3)
    result.top_3_dangers = extract_danger_goal(&lines);

    // Extract paired Strength:/Goal: blocks (top 3)
    result.top_3_strengths = extract_strength_goal(&lines);

    // Extract paired Opportunity:/Goal: blocks (top 3)
    result.top_3_opportunities = extract_opportunity_goal(&lines);

    result.found = result.vision.len() > 20
        || !result.top_3_dangers.is_empty()
        || !result.top_3_strengths.is_empty()
        || !result.top_3_opportunities.is_empty();

    result
}

fn extract_danger_goal(lines: &[String]) -> Vec<DangerGoal> {
    let danger_re = Regex::new(r"^(?i)danger:\s*(.+)$").unwrap();
    let goal_re = Regex::new(r"^(?i)goal:\s*(.+)$").unwrap();
    let mut pairs = Vec::new();
    let mut current: Option<DangerGoal> = None;

    for line in lines {
        if let Some(caps) = danger_re.captures(line) {
            if let Some(c) = current.take() {
                pairs.push(c);
            }
            current = Some(DangerGoal {
                danger: caps[1].trim().to_string(),
                goal: String::new(),
            });
        } else if let Some(caps) = goal_re.captures(line) {
            if let Some(mut c) = current.take() {
                c.goal = caps[1].trim().to_string();
                pairs.push(c);
            }
        }
    }
    if let Some(c) = current {
        pairs.push(c);
    }
    pairs.into_iter().take(3).collect()
}

fn extract_strength_goal(lines: &[String]) -> Vec<StrengthGoal> {
    let strength_re = Regex::new(r"^(?i)strength:\s*(.+)$").unwrap();
    let goal_re = Regex::new(r"^(?i)goal:\s*(.+)$").unwrap();
    let mut pairs = Vec::new();
    let mut current: Option<StrengthGoal> = None;

    for line in lines {
        if let Some(caps) = strength_re.captures(line) {
            if let Some(c) = current.take() {
                pairs.push(c);
            }
            current = Some(StrengthGoal {
                strength: caps[1].trim().to_string(),
                goal: String::new(),
            });
        } else if let Some(caps) = goal_re.captures(line) {
            if let Some(mut c) = current.take() {
                c.goal = caps[1].trim().to_string();
                pairs.push(c);
            }
        }
    }
    if let Some(c) = current {
        pairs.push(c);
    }
    pairs.into_iter().take(3).collect()
}

fn extract_opportunity_goal(lines: &[String]) -> Vec<OpportunityGoal> {
    let opp_re = Regex::new(r"^(?i)opportunity:\s*(.+)$").unwrap();
    let goal_re = Regex::new(r"^(?i)goal:\s*(.+)$").unwrap();
    let mut pairs = Vec::new();
    let mut current: Option<OpportunityGoal> = None;

    for line in lines {
        if let Some(caps) = opp_re.captures(line) {
            if let Some(c) = current.take() {
                pairs.push(c);
            }
            current = Some(OpportunityGoal {
                opportunity: caps[1].trim().to_string(),
                goal: String::new(),
            });
        } else if let Some(caps) = goal_re.captures(line) {
            if let Some(mut c) = current.take() {
                c.goal = caps[1].trim().to_string();
                pairs.push(c);
            }
        }
    }
    if let Some(c) = current {
        pairs.push(c);
    }
    pairs.into_iter().take(3).collect()
}
