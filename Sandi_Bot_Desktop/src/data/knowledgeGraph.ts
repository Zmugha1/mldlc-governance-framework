// Sandy Stahl Coaching Intelligence - Knowledge Graph
// Extracted from CLEAR Coaching Playbook, TES Resources, and Sandy's Transcripts

// ============================================
// CLEAR COACHING METHOD
// ============================================

export const clearFramework = {
  name: "CLEAR Coaching Method",
  description: "A proven connection and coaching model: Curiosity, Locating, Engagement, Accountability, Reflection. Think of this model as a sphere instead of linear.",
  
  curiosity: {
    title: "Curiosity",
    description: "The antidote to assumptions. Opens conversation and true connections.",
    keyPoints: [
      "Assumptions are shortcuts to understanding—but they usually lead us in the wrong direction",
      "Pay attention to your intuition and trust your gut instincts",
      "Be willing to ask things you may not know the answer to",
      "Lead from wonder—being willing to ask into what we're hearing and feeling"
    ],
    questions: {
      IC: [
        "Tell me a little bit about yourself and what piqued your interest to join our call today?",
        "Before I dive in, what do you think a career ownership coach is?",
        "What's prompting you to look for a change right now?",
        "How urgent is it for you to make a change?",
        "What do you hope to learn from the DISC assessment?",
        "What do you hope to learn from doing the You 2.0?"
      ],
      C1: [
        "What is your experience with coaching?",
        "Why do you think we review the DISC?",
        "What do you want more of in your life right now? What do you want less of?",
        "How do you define success?",
        "What beliefs have guided your career decisions so far?",
        "What's your ideal lifestyle?",
        "Which of your goals feel most pressing?"
      ],
      C2: [
        "How do you feel about investments?",
        "What's your comfort level in regard to investments?",
        "What do you like about potentially owning a business?",
        "What gives you pause about potentially owning a business?",
        "Why are you considering career transition now?",
        "What's the biggest reason for considering a change?",
        "What do you know about funding options?"
      ],
      C3: [
        "What does discovery mean to you?",
        "What are you most excited to learn about?",
        "How will you keep an open mind?",
        "What excites you about this possibility?",
        "What surprised you about this possibility?",
        "How does this possibility support your vision statement?",
        "How does the possibility align with your values and beliefs?"
      ],
      C4: [
        "What did you learn? Who do you feel? Could it reach your goals?",
        "What are your next steps?",
        "What insights have you gained from talking to franchise owners?"
      ]
    }
  },

  locating: {
    title: "Locating",
    description: "Ask where they are. Finding a person's mental and emotional coordinates.",
    keyPoints: [
      "Ask high-level, open-ended questions to find out where the other person's head is at",
      "Remove assumptions and enter their reality",
      "Trust and rapport will naturally be built",
      "Be silent and give space for them to answer",
      "Pay attention to the words they are saying"
    ],
    example: {
      coach: "How was it for you filling out the You 2.0?",
      seeker: "It was good.",
      followUp: "Tell me more what you mean by good."
    }
  },

  engagement: {
    title: "Engagement",
    description: "Follow-up questions that dig deeper. The Key is Three.",
    keyPoints: [
      "Use 1-3 exact words they spoke in your question",
      "Ask open-ended questions",
      "The Key is Three: 1 locating question + 2 engagement questions",
      "Dig below the surface to get to the heart of the matter",
      "Coach should not be talking more than 20% of the time"
    ],
    example: {
      coach: "How was it filling out the You 2.0?",
      seeker: "It was good. It had me think about what I truly want.",
      engagement1: "What do you truly want?",
      seeker2: "I think I'm ready to explore self-sufficiency.",
      engagement2: "Tell me more about exploring self-sufficiency."
    }
  },

  accountability: {
    title: "Accountability",
    description: "Connecting to their WHY. Their vision matters.",
    keyPoints: [
      "We don't hold people accountable to control them—we do it to remind them of what they want",
      "Sit on the same side of the table",
      "Ask WHAT and BY WHEN—follow up at the next meeting",
      "Get specific actions in specific time frames",
      "Accountability is a gift you're giving others"
    ],
    example: {
      coach: "How do you envision using your Vision Statement?",
      seeker: "I'll look at it every week or so to remind me of what's important.",
      followUp: "What day will you start looking at it? How will you remind yourself?",
      commitment: "Will you send me a note on Monday after you review it?"
    }
  },

  reflection: {
    title: "Reflection",
    description: "Ask about value, takeaways, a-ha's. Be intentional.",
    keyPoints: [
      "Ask at the START: 'What would make our time together today valuable?'",
      "Ask at the END: 'What insight or a-ha did you gain today?'",
      "Acknowledge what's new",
      "Use reflection when introducing exercises (DISC, You 2.0, TUMAY)"
    ],
    prompts: [
      "What would make our time together today valuable?",
      "What do you hope to get out of our conversation today?",
      "What insight or 'a-ha' did you gain today?",
      "How will that insight change—or has it changed—your thinking or actions?",
      "Of everything we covered, what do you value most—and why?",
      "What's one immediate action you're excited to take before next time?",
      "Reflecting on our conversation, what surprised you about your own responses?"
    ]
  }
};

// ============================================
// CLIENT EXPERIENCE / PINK FLAGS
// ============================================

export const clientExperience = {
  stages: [
    {
      compartment: "Business Development",
      name: "Initial Contact",
      color: "#FEF3C7", // yellow
      objective: "Seeker's curiosity is piqued about the coaching experience and exploring alternative options",
      experience: "Seeker is intrigued and wants to take the next step to learn more about their options",
      milestone: "Seeker commits to scheduling first coaching session",
      pinkFlags: [
        "Seeker avoids multiple contact attempts"
      ]
    },
    {
      compartment: "Compartment 1",
      name: "Seeker Connection (C1)",
      color: "#DBEAFE", // blue
      objective: "Seeker completes the DISC and Driving Forces and completes a true/false edit",
      experience: "Seeker feels an increased commitment from their Coach to truly connect with them as an individual",
      milestone: "Seeker understands their DISC and Driving Forces and sees the added value their Coach brings",
      pinkFlags: [
        "Seeker does not complete DISC",
        "Seeker does not complete You 2.0",
        "Seeker does not complete Empowerment Statement or gives minimal response",
        "Seeker is slow to develop rapport with Coach",
        "Seeker does not involve spouse",
        "Seeker does not show up for scheduled calls"
      ]
    },
    {
      compartment: "Compartment 2",
      name: "Seeker Clarification (C2)",
      color: "#FFEDD5", // orange
      objective: "Seeker understands the various Vehicles for Success available to achieve their ILWE",
      experience: "Seeker learns common options available including franchising",
      milestone: "Seeker articulates the vehicles they are open to exploring",
      pinkFlags: [
        "Seeker only talks about the Job Market and does not seem open to learning about other vehicles",
        "Seeker does not complete the TUMAY or willing to share basic financial information",
        "Seeker is not open to talking about funding options",
        "Spouse still not involved"
      ]
    },
    {
      compartment: "Compartment 3",
      name: "Coach, Client, Collaboration (C3)",
      color: "#E9D5FF", // purple
      objective: "Set expectations prior to presenting the three possibilities",
      experience: "Client understands expectation not to make any decisions or dismiss a possibility based on perceptions",
      milestone: "Client commits to having an open mind, dedicating time to discovery",
      pinkFlags: [
        "Client still not open-minded to franchise vehicle",
        "Client dismissed possibility prior to conversation",
        "Client still has limiting beliefs",
        "Client is not showing up for Zor calls",
        "Spouse not part of discovery"
      ]
    },
    {
      compartment: "Compartment 4",
      name: "Client Career 2.0 (C4)",
      color: "#DCFCE7", // green
      objective: "Client begins collaboration and has the initial call with the Franchisors",
      experience: "Simultaneously collaboration begins with franchisors",
      milestone: "Client has a debrief about each of the possibilities",
      pinkFlags: [
        "Client makes assumptive comments",
        "Client wants you to show them additional possibilities",
        "Spouse opposed"
      ]
    }
  ],
  note: "Pink Flags are an indicator of a potential coaching opportunity. Not all Pink Flags need to be addressed at the time you become aware of them. However, if you see a pattern of Pink Flags developing, you may need to do some further coaching."
};

// ============================================
// COACHING SESSION OUTLINES
// ============================================

export const sessionOutlines = {
  IC: {
    name: "Introduction Call",
    before: [
      "Review LinkedIn or any CES notes"
    ],
    during: [
      "Set Agenda of call",
      "Caller: Why are you here, what is going on, and Why did you accept this call?",
      "Me: The Journey: What can I do, what it means to you?",
      "Explain next Steps: Insight Assessment/You 2.0",
      "Set Time for C1"
    ],
    after: [
      "Send YCBM/Zoom Invite for C1",
      "Send Email with Portal Login Credentials",
      "Update Notes in ESC2 or upload Fathom notes",
      "Connect on LinkedIn with Seeker",
      "Set Stage for future Referrals"
    ]
  },

  C1: {
    name: "Seeker Connection",
    prep: [
      "Open You 2.0 and Disc for easy access",
      "Review LinkedIn and any notes"
    ],
    during: [
      "Print Disc: Summary Page, Behavior Characteristics, and Driving Force Clusters",
      "Go to Behavioral Characteristics - Read Paragraph and ask their version",
      "Go to Driving Forces Clusters",
      "Go to You 2.0 - Review Statement, Dangers, Opportunities, Skills",
      "Words of Encouragement and Value",
      "Did they find value in our discussion today?",
      "Next Steps (TUMAY) and set next meeting"
    ],
    after: [
      "Send Zoom Invite for C2 Call",
      "Upload into ChatGPT for Vision Statement",
      "Add Disc, You 2.0, and any notes",
      "Send TUMAY w/Full Disc, Vision Statement",
      "Send Book with Vision Statement",
      "Update ESC2 Notes"
    ]
  },

  C2: {
    name: "Seeker Clarification",
    prep: [
      "Open TUMAY for easy access",
      "Review notes/You 2.0/LinkedIn"
    ],
    during: [
      "Set the Agenda for call",
      "Vision Statement - Review and look for changes/feedback",
      "Does this emphasize your true goals and ILWE?",
      "Go to TUMAY - Review each section, ask questions, dig deeper",
      "Discuss Various Vehicles for Success",
      "Discuss Types of Business Models",
      "Discuss Funding options",
      "If Ready, Send to Funding Affiliates/RFC",
      "Next Steps: Ready for Possibilities?"
    ],
    after: [
      "Send Zoom Invite for C3",
      "Send Possibility Prep Email",
      "Send Vehicles of Success Podcast",
      "Send Funding Information",
      "Send Vision Statement",
      "Update ESC2 Notes",
      "Start looking for Possibilities"
    ]
  },

  C3: {
    name: "Coach, Client, Collaboration",
    prep: [
      "Register Discover Center",
      "Review notes/You 2.0/TUMAY",
      "Select Possibilities (more than 3)",
      "Check Territory Availability",
      "Prepare Presentation Slides (Add Vision Statement)"
    ],
    during: [
      "Set the Agenda - Education only, NO decisions, Open Mind",
      "Review Expectations: 95% rule, keep open mind",
      "Discuss Possibilities one by one with NO names",
      "Explain next steps: RFC call",
      "Set Next Meeting to Debrief (7-10 Days)"
    ],
    after: [
      "Send Zoom Invite for C4",
      "Add dates and switch toggle for Client to view Discovery Center",
      "Update ESC2 Notes",
      "Prep TUMAY and send RFC's"
    ]
  },

  C4: {
    name: "Client Career 2.0",
    prep: [
      "Review notes/You 2.0/TUMAY/LinkedIn",
      "Open Vision Statement"
    ],
    during: [
      "Set Stage for call",
      "Review Vision Statement (any changes?)",
      "Go over each Possibility (one by one)",
      "What did you learn? How do you feel? Could it reach your goals?",
      "What are your next steps?",
      "Set Next Meeting"
    ],
    after: [
      "Send Zoom Invite",
      "Update ESC2 Notes/Spreadsheet",
      "Ask again for the Referral"
    ]
  }
};

// ============================================
// DISC COACHING TIPS
// ============================================

export const discCoaching = {
  D: {
    style: "D (Dominance)",
    traits: ["Results-oriented", "Direct", "Decisive", "Competitive", "Takes charge"],
    coachingTips: [
      "Be direct and get to the point quickly",
      "Focus on results and outcomes",
      "Provide options and let them choose",
      "Respect their authority and competence",
      "Don't waste time with small talk"
    ],
    language: "Use words like: results, achieve, win, success, goals, bottom line"
  },
  I: {
    style: "I (Influence)",
    traits: ["Enthusiastic", "Optimistic", "Talkative", "Social", "Persuasive"],
    coachingTips: [
      "Be friendly and warm",
      "Allow time for conversation and stories",
      "Recognize their ideas and enthusiasm",
      "Show excitement about possibilities",
      "Use testimonials and success stories"
    ],
    language: "Use words like: exciting, fun, people, team, popular, recognition"
  },
  S: {
    style: "S (Steadiness)",
    traits: ["Patient", "Reliable", "Supportive", "Calm", "Good listener"],
    coachingTips: [
      "Be patient and calm",
      "Show sincere interest in them as a person",
      "Provide reassurance and support",
      "Give time to process and decide",
      "Emphasize stability and security"
    ],
    language: "Use words like: support, team, stable, secure, reliable, trust"
  },
  C: {
    style: "C (Conscientiousness)",
    traits: ["Analytical", "Precise", "Systematic", "Careful", "Detail-oriented"],
    coachingTips: [
      "Be thorough and accurate",
      "Provide data, facts, and research",
      "Allow time for analysis",
      "Be organized and structured",
      "Answer questions with detail"
    ],
    language: "Use words like: analyze, research, data, facts, proven, accurate"
  }
};

// ============================================
// VISION STATEMENT STRUCTURE
// ============================================

export const visionStatement = {
  structure: [
    {
      section: "Vision Paragraph",
      description: "Life/career goals, income target, timeline, relocation plans",
      example: "Build something enduring - a business, a legacy, a future where my family thrives. Income goal: $190-250k+ by 2026-2027."
    },
    {
      section: "Journey Mindset",
      description: "Progress through challenge, resilience, continuous improvement",
      example: "I embrace the journey of growth, knowing that each challenge is an opportunity to learn and become stronger."
    },
    {
      section: "Success Definition",
      description: "Growth as leader/professional/family person, values",
      example: "Success means growing as a leader, providing for my family, and living my values every day."
    },
    {
      section: "Key Motivators",
      description: "Income, Financial Freedom, Work/Life balance bullet points",
      example: [
        "Income: $XXX target",
        "Financial Freedom: Stability, Flexibility, Building wealth",
        "Work/Life: Being Present for Family, controlling my schedule"
      ]
    }
  ],
  prompt: "Create a Vision Statement that captures: 1) What you want to achieve, 2) Why it matters, 3) How you'll get there, 4) What success looks like"
};

// ============================================
// ILWE FRAMEWORK
// ============================================

export const ilweFramework = {
  name: "ILWE - Income, Lifestyle, Wealth, Equity",
  description: "The four dimensions of career and life goals",
  
  income: {
    title: "Income",
    description: "Current earnings and target income goals",
    questions: [
      "What is your current annual income?",
      "What income level would you like to achieve?",
      "By when do you want to reach this income?"
    ]
  },
  
  lifestyle: {
    title: "Lifestyle",
    description: "How you want to live and work",
    questions: [
      "What does your ideal work week look like?",
      "How much control do you want over your schedule?",
      "What activities do you want more/less of in your life?"
    ]
  },
  
  wealth: {
    title: "Wealth",
    description: "Building assets and financial security",
    questions: [
      "What are your wealth-building goals?",
      "How important is creating passive income?",
      "What does financial freedom mean to you?"
    ]
  },
  
  equity: {
    title: "Equity",
    description: "Building something you own",
    questions: [
      "Do you want to own your business outright?",
      "What kind of legacy do you want to build?",
      "How important is building sellable assets?"
    ]
  }
};

// ============================================
// TOP 5 CAREER/BUSINESS MATCHER
// ============================================

export const careerBusinessMatcher = {
  businessOwnership: {
    title: "Top 5 Business Ownership Options",
    description: "Franchise and business opportunities matched to client profile",
    factors: [
      "Investment level alignment",
      "Industry interest match",
      "Skills transferability",
      "Lifestyle compatibility",
      "Growth potential"
    ]
  },
  
  employmentRoles: {
    title: "Top 5 Employment Roles",
    description: "Career positions matched to client skills and goals",
    factors: [
      "Skill set alignment",
      "Income potential",
      "Growth trajectory",
      "Industry fit",
      "Work-life balance"
    ]
  }
};

// ============================================
// COACHING STRATEGY TEMPLATES
// ============================================

export const coachingStrategies = {
  do: [
    "Ask, Don't Tell - Shift from advice-giving to question-asking",
    "Build Self-Awareness - Help clients see their patterns clearly",
    "Focus on What Matters - Eliminate distractions, prioritize",
    "Explore Limiting Beliefs - Go beneath the surface",
    "Stay Curious and Present - Let silence work",
    "Normalize Rejection - Reframe failure as data",
    "Peel the Onion - Use layered questioning",
    "Ask Locating Questions - Anchor the conversation",
    "Balance Accountability - Let clients set the pace",
    "Coach the Whole Person - Acknowledge personal elements"
  ],
  
  dont: [
    "Don't assume you know what they mean",
    "Don't talk more than 20% of the time",
    "Don't rush to fill silence",
    "Don't push your own agenda",
    "Don't rescue or solve for them",
    "Don't skip the reflection step",
    "Don't ignore pink flags"
  ]
};

// ============================================
// CHAT KNOWLEDGE GRAPH EXPORT
// ============================================

export const knowledgeGraph = {
  clearFramework,
  clientExperience,
  sessionOutlines,
  discCoaching,
  visionStatement,
  ilweFramework,
  careerBusinessMatcher,
  coachingStrategies
};

export default knowledgeGraph;
