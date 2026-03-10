# Layer 1: Foundation Knowledge - Coaching Best Practices

CLEAR_METHOD = {
    "name": "CLEAR Coaching Method",
    "description": "Five-step coaching framework for franchise coaches",
    "steps": {
        "Curiosity": {
            "definition": "Ask open-ended questions to explore client's thinking",
            "examples": [
                "What brought you to this call today?",
                "How do you feel about your current situation?",
                "What would need to be true for you to move forward?",
                "What excites you most about this opportunity?"
            ],
            "tips": "Start with What, How, Why. Avoid yes/no questions."
        },
        "Locating": {
            "definition": "Understand where the client is in their journey",
            "examples": [
                "On a scale of 1-10, how ready are you for change?",
                "Where do you see yourself in 2 years?",
                "What stage are you at in your decision process?"
            ],
            "tips": "Assess current state before suggesting next steps."
        },
        "Accountability": {
            "definition": "Hold clients to their commitments",
            "examples": [
                "You said you'd complete the U 2.0 by Friday - how did it go?",
                "What got in the way of completing that?",
                "What will you commit to before our next call?"
            ],
            "tips": "Follow-through is the biggest indicator of investment."
        },
        "Reflection": {
            "definition": "Help clients see their own thinking",
            "examples": [
                "What patterns do you notice in your career choices?",
                "What concerns you most about this path?",
                "What would you regret more - trying or not trying?"
            ],
            "tips": "Let clients arrive at their own insights."
        },
        "Engagement": {
            "definition": "Keep clients actively involved",
            "examples": [
                "What questions do you have for me?",
                "What would be most helpful right now?",
                "How can I best support you?"
            ],
            "tips": "This is a dialogue, not a presentation."
        }
    }
}

DISC_PROFILES = {
    "D_Style": {
        "name": "Dominance",
        "traits": "Direct, results-oriented, competitive, decisive",
        "coaching_approach": [
            "Get to the point quickly",
            "Focus on results and outcomes",
            "Be confident and assertive",
            "Provide options, let them choose"
        ],
        "motivators": ["Winning", "Results", "Control", "Challenge"],
        "stress_response": "Becomes aggressive, impatient, demanding",
        "questions_to_ask": [
            "What results are you looking for?",
            "What is your timeline?",
            "What challenges excite you?"
        ]
    },
    "I_Style": {
        "name": "Influence",
        "traits": "Enthusiastic, people-oriented, persuasive, optimistic",
        "coaching_approach": [
            "Be warm and friendly",
            "Allow time for socializing",
            "Use stories and examples",
            "Recognize and praise their ideas"
        ],
        "motivators": ["Recognition", "Social approval", "Fun", "Freedom"],
        "stress_response": "Becomes overly optimistic, talkative, poor listener",
        "questions_to_ask": [
            "How do you feel about this?",
            "What excites you most?",
            "Who else is involved in this decision?"
        ]
    },
    "S_Style": {
        "name": "Steadiness",
        "traits": "Patient, reliable, team-oriented, supportive",
        "coaching_approach": [
            "Build rapport slowly",
            "Show genuine interest",
            "Provide stability and security",
            "Give them time to process"
        ],
        "motivators": ["Stability", "Team harmony", "Support", "Appreciation"],
        "stress_response": "Becomes resistant to change, passive-aggressive",
        "questions_to_ask": [
            "What concerns you about this change?",
            "How will this affect your family?",
            "What support do you need?"
        ]
    },
    "C_Style": {
        "name": "Compliance",
        "traits": "Analytical, accurate, systematic, cautious",
        "coaching_approach": [
            "Provide data and facts",
            "Be thorough and detailed",
            "Answer questions precisely",
            "Give time for analysis"
        ],
        "motivators": ["Accuracy", "Quality", "Expertise", "Logic"],
        "stress_response": "Becomes critical, withdrawn, perfectionist",
        "questions_to_ask": [
            "What data do you need to make this decision?",
            "What are your concerns?",
            "What research have you done?"
        ]
    }
}

RED_FLAGS = {
    "critical": [
        {
            "flag": "Spouse not on board",
            "impact": "Deal killer - 80% of deals fail without spousal support",
            "detection": "Client mentions spouse hesitation or avoids spouse topic",
            "response": "Schedule spouse meeting before moving forward"
        },
        {
            "flag": "Cannot envision business ownership",
            "impact": "Fundamental mismatch - client has job mentality",
            "detection": "Client focuses on salary, benefits, security",
            "response": "Explore what business ownership means to them"
        },
        {
            "flag": "Living paycheck to paycheck",
            "impact": "No financial runway for business investment",
            "detection": "Client mentions financial stress, no savings",
            "response": "Address funding options or refer to financial advisor"
        }
    ],
    "medium": [
        {
            "flag": "Not following through",
            "impact": "Indicates low commitment",
            "detection": "Misses deadlines, does not complete exercises",
            "response": "Address accountability directly"
        },
        {
            "flag": "Timeline keeps shifting",
            "impact": "Indecision or external blockers",
            "detection": "Client keeps pushing dates back",
            "response": "Explore what is really holding them back"
        },
        {
            "flag": "Health concerns",
            "impact": "May be temporary blocker or deal killer",
            "detection": "Client mentions health issues affecting decision",
            "response": "Focus on health first, keep business warm"
        }
    ]
}

GREEN_FLAGS = {
    "strong": [
        {
            "flag": "Follows through on commitments",
            "meaning": "High investment, likely to close",
            "leverage": "Recognize and praise their reliability"
        },
        {
            "flag": "Spouse is supportive",
            "meaning": "Major decision blocker resolved",
            "leverage": "Include spouse in key conversations"
        },
        {
            "flag": "Does research and asks questions",
            "meaning": "Engaged and serious",
            "leverage": "Provide detailed information, answer thoroughly"
        }
    ]
}

ILWE_FRAMEWORK = {
    "Income": {
        "description": "How much money do you want to make?",
        "questions": [
            "What is your target annual income?",
            "How much do you need to maintain your lifestyle?",
            "What would financial freedom look like?"
        ]
    },
    "Lifestyle": {
        "description": "How do you want to live your life?",
        "questions": [
            "How many hours do you want to work per week?",
            "Do you want to work from home or an office?",
            "What does your ideal day look like?"
        ]
    },
    "Wealth": {
        "description": "What do you want to build for the future?",
        "questions": [
            "What legacy do you want to leave?",
            "How do you want to build net worth?",
            "What are your long-term financial goals?"
        ]
    },
    "Equity": {
        "description": "What do you want to own?",
        "questions": [
            "Do you want to own your business?",
            "What does ownership mean to you?",
            "How important is building something you can sell?"
        ]
    }
}

COMPARTMENTS = {
    "IC": {
        "name": "Introduction Call",
        "purpose": "Find interest, qualify prospect",
        "key_questions": ["Why did you accept this call?"],
        "success_signal": "Client wants to learn more",
        "move_to": "C1"
    },
    "C1": {
        "name": "Discovery",
        "purpose": "DISC + U 2.0 + I.L.W.E. goals",
        "key_questions": ["Did I bring value to our discussion?"],
        "success_signal": "Client found value",
        "move_to": "C2"
    },
    "C2": {
        "name": "Preferences",
        "purpose": "2May document - business fit",
        "key_questions": ["What are your business preferences?"],
        "success_signal": "Clear business direction",
        "move_to": "C3"
    },
    "C3": {
        "name": "Presenting",
        "purpose": "Show 3 franchise options",
        "key_questions": ["Which option resonates most?"],
        "success_signal": "Client excited about options",
        "move_to": "C4"
    },
    "C4": {
        "name": "Follow-up",
        "purpose": "Franchisor conversations",
        "key_questions": ["What are you learning?", "Any concerns?"],
        "success_signal": "Engaged with franchisors",
        "move_to": "C5"
    },
    "C5": {
        "name": "Weekly",
        "purpose": "Funding, roadblocks, close",
        "key_questions": ["What is the path forward?"],
        "success_signal": "Ready to commit",
        "move_to": "CLOSED"
    }
}
