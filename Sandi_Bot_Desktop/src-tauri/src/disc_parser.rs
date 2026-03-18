use regex::Regex;

#[derive(Debug, serde::Serialize)]
pub struct DiscScores {
    pub adapted_d: Option<u32>,
    pub adapted_i: Option<u32>,
    pub adapted_s: Option<u32>,
    pub adapted_c: Option<u32>,
    pub natural_d: Option<u32>,
    pub natural_i: Option<u32>,
    pub natural_s: Option<u32>,
    pub natural_c: Option<u32>,
    pub found: bool,
}

pub fn parse_disc_scores(text: &str) -> DiscScores {
    // Pattern 1: SIA: 38-18-78-75 (20)  SIN: 42-15-84-71 (20)
    let pattern1 = Regex::new(
        r"SIA[:\s]+(\d+)-(\d+)-(\d+)-(\d+)\s*\(\d+\)\s*SIN[:\s]+(\d+)-(\d+)-(\d+)-(\d+)"
    ).unwrap();

    if let Some(caps) = pattern1.captures(text) {
        return DiscScores {
            adapted_d: caps[1].parse().ok(),
            adapted_i: caps[2].parse().ok(),
            adapted_s: caps[3].parse().ok(),
            adapted_c: caps[4].parse().ok(),
            natural_d: caps[5].parse().ok(),
            natural_i: caps[6].parse().ok(),
            natural_s: caps[7].parse().ok(),
            natural_c: caps[8].parse().ok(),
            found: true,
        };
    }

    // Pattern 2: Adapted/Natural on separate lines
    let pattern2 = Regex::new(
        r"(?i)adapted[^0-9]*(\d+)[^0-9]+(\d+)[^0-9]+(\d+)[^0-9]+(\d+)[^0-9]*natural[^0-9]*(\d+)[^0-9]+(\d+)[^0-9]+(\d+)[^0-9]+(\d+)"
    ).unwrap();

    if let Some(caps) = pattern2.captures(text) {
        return DiscScores {
            adapted_d: caps[1].parse().ok(),
            adapted_i: caps[2].parse().ok(),
            adapted_s: caps[3].parse().ok(),
            adapted_c: caps[4].parse().ok(),
            natural_d: caps[5].parse().ok(),
            natural_i: caps[6].parse().ok(),
            natural_s: caps[7].parse().ok(),
            natural_c: caps[8].parse().ok(),
            found: true,
        };
    }

    // Pattern 3: Four numbers in sequence (38)(18)(78)(75) format
    let pattern3 = Regex::new(
        r"\((\d+)\)\s*\((\d+)\)\s*\((\d+)\)\s*\((\d+)\)"
    ).unwrap();

    let mut last_match: Option<DiscScores> = None;

    for caps in pattern3.captures_iter(text) {
        last_match = Some(DiscScores {
            adapted_d: None,
            adapted_i: None,
            adapted_s: None,
            adapted_c: None,
            natural_d: caps[1].parse().ok(),
            natural_i: caps[2].parse().ok(),
            natural_s: caps[3].parse().ok(),
            natural_c: caps[4].parse().ok(),
            found: true,
        });
    }

    if let Some(scores) = last_match {
        return scores;
    }

    DiscScores {
        adapted_d: None,
        adapted_i: None,
        adapted_s: None,
        adapted_c: None,
        natural_d: None,
        natural_i: None,
        natural_s: None,
        natural_c: None,
        found: false,
    }
}
