# Coaching best practices - Layer 1 of Knowledge Brain

CLEAR_METHOD = {
    "Curiosity": {
        "definition": "Ask open-ended questions",
        "examples": [
            "What brought you to this call today?",
            "How do you feel about your current situation?",
            "What would need to be true for you to move forward?",
        ],
    },
    "Locating": {
        "definition": "Understand where client is",
        "examples": [
            "On a scale of 1-10, how ready are you?",
            "Where do you see yourself in 2 years?",
        ],
    },
    "Accountability": {
        "definition": "Hold to commitments",
        "examples": [
            "You said you'd complete U 2.0 by Friday - how did it go?",
            "What will you commit to before our next call?",
        ],
    },
    "Reflection": {
        "definition": "Help see own thinking",
        "examples": [
            "What patterns do you notice?",
            "What would you regret more?",
        ],
    },
    "Engagement": {
        "definition": "Keep actively involved",
        "examples": [
            "What questions do you have?",
            "How can I best support you?",
        ],
    },
}

DISC_STYLES = {
    "D": {
        "name": "Dominance",
        "traits": "Direct, results-oriented, competitive",
        "coaching": ["Get to point quickly", "Focus on results", "Be confident"],
        "questions": ["What results do you want?", "What's your timeline?"],
    },
    "I": {
        "name": "Influence",
        "traits": "Enthusiastic, people-oriented, persuasive",
        "coaching": ["Be warm and friendly", "Use stories", "Recognize ideas"],
        "questions": ["How do you feel?", "What excites you?"],
    },
    "S": {
        "name": "Steadiness",
        "traits": "Patient, reliable, supportive",
        "coaching": ["Build rapport slowly", "Provide stability", "Give time"],
        "questions": ["What concerns you?", "How affects family?"],
    },
    "C": {
        "name": "Compliance",
        "traits": "Analytical, accurate, systematic",
        "coaching": ["Provide data", "Be thorough", "Answer precisely"],
        "questions": ["What data do you need?", "What research done?"],
    },
}

RED_FLAGS = [
    {"flag": "Spouse not on board", "impact": "Deal killer", "response": "Schedule spouse meeting"},
    {"flag": "Can't envision business ownership", "impact": "Job mentality", "response": "Explore what ownership means"},
    {"flag": "Living paycheck to paycheck", "impact": "No runway", "response": "Address funding options"},
    {"flag": "Not following through", "impact": "Low commitment", "response": "Address accountability"},
    {"flag": "Health concerns", "impact": "Blocker", "response": "Focus on health first"},
]

COMPARTMENTS = {
    "IC": {"name": "Introduction", "next": "C1", "question": "Why this call?"},
    "C1": {"name": "Discovery", "next": "C2", "question": "Did I bring value?"},
    "C2": {"name": "Preferences", "next": "C3", "question": "What are your preferences?"},
    "C3": {"name": "Presenting", "next": "C4", "question": "Which resonates?"},
    "C4": {"name": "Follow-up", "next": "C5", "question": "What are you learning?"},
    "C5": {"name": "Weekly", "next": "CLOSED", "question": "Path forward?"},
    "CLOSED": {"name": "Closed", "next": None, "question": None},
}
