// Sandy Stahl Coaching Intelligence - Complete Client Profiles
// Each client has: DISC, You 2.0, Two May (TUMAY), Vision Statement, Fathom Notes

import type { ClientProfile } from '@/types';

// ============================================
// CLIENT 1: ANDREA KELLEHER (Original Profile)
// ============================================

export const andreaKelleher: ClientProfile = {
  id: "C001",
  name: "Andrea Kelleher",
  email: "andrea.kelleher@email.com",
  phone: "(555) 123-4567",
  company: "Tech Solutions Inc.",
  industry: "Technology",
  
  // Stage from Sandy's actual pipeline
  stage: "Possibilities",
  
  // DISC Profile
  disc: {
    style: "I",
    description: "Influencer - Enthusiastic, people-oriented, persuasive, optimistic",
    traits: ["Enthusiastic", "Optimistic", "Talkative", "Social", "Persuasive", "Adaptive"],
    coachingTips: [
      "Be friendly and warm",
      "Allow time for conversation and stories",
      "Recognize their ideas and enthusiasm",
      "Show excitement about possibilities",
      "Use testimonials and success stories"
    ],
    scores: {
      D: 45,
      I: 75,
      S: 25,
      C: 40
    }
  },
  
  // You 2.0 Profile
  you2: {
    statement: "I want to create a career that allows me to use my strengths in relationship building while achieving financial independence and having flexibility for my family.",
    dangers: [
      "Age discrimination in job market",
      "Health concerns and insurance transition",
      "Corporate burnout and lack of fulfillment",
      "Fear of starting over at this stage"
    ],
    opportunities: [
      "Strong network in tech industry",
      "Leadership experience transferable to business ownership",
      "Financial stability to invest",
      "Supportive spouse (Tom) who is retired"
    ],
    skills: {
      favorites: ["Relationship Building", "Project Management", "Communication", "Team Leadership"],
      delegate: ["Administrative Tasks", "Data Entry"],
      interested: ["Business Development", "Strategic Planning"]
    },
    priorities: ["Lifestyle", "Wealth", "Income", "Equity"]
  },
  
  // Two May (TUMAY) Profile
  tumay: {
    age: 53,
    spouse: {
      name: "Tom",
      occupation: "Retired",
      supportive: true,
      involvement: "Highly supportive, attends calls"
    },
    location: "Suburban area, open to relocation",
    workPreference: "Virtual/Remote work preferred",
    creditScore: 773,
    netWorth: "$250,000 - $500,000",
    liquidCapital: "$75,000 - $100,000",
    timeline: "0-6 months",
    industriesOfInterest: ["Health & Wellness", "Education", "Business Services"],
    skills: ["Project Management", "Leadership", "Business Development", "Coaching/Mentoring"],
    notInterestedIn: ["Sales-focused roles", "IT/Technical", "Customer Service"],
    whyNow: "Corporate burnout, desire for more control, health considerations"
  },
  
  // Vision Statement
  visionStatement: {
    paragraph: "I envision a future where I have the freedom to decide my own workday, balancing meaningful projects with time for my hobbies and family. By 2026-2027, I will build a business generating $150,000-$200,000 annually that leverages my strengths in relationship building and leadership.",
    journeyMindset: "I embrace this journey of growth, knowing that each challenge is an opportunity to learn. I am resilient, optimistic, and committed to continuous improvement.",
    successDefinition: "Success means growing as a leader and professional while being present for my family. I value collaboration, people-centered work, and creating positive impact.",
    motivators: {
      income: "$150,000-$200,000 annually",
      financialFreedom: "Build wealth, create passive income streams, achieve financial independence",
      workLife: "Control my schedule, be present for family, enjoy hobbies"
    }
  },
  
  // ILWE Goals
  ilwe: {
    income: {
      current: "$120,000/year",
      target: "$150,000-$200,000/year",
      timeline: "2-3 years"
    },
    lifestyle: {
      desired: "Flexible schedule, work from home, time for family and hobbies",
      current: "Corporate office, 50+ hours/week, limited flexibility",
      gap: "High - need control over time and location"
    },
    wealth: {
      strategy: "Build business equity, create multiple income streams",
      target: "$1M+ net worth by retirement"
    },
    equity: {
      goal: "Own a business that can be sold or passed on",
      timeline: "5-10 years"
    }
  },
  
  // Readiness Scores
  readiness: {
    identity: 4,      // Knows who she is and what she wants
    commitment: 5,    // Highly committed, taking action
    financial: 3,     // Good credit, some capital
    execution: 4      // Strong follow-through
  },
  
  // Persona & Recommendation
  persona: "Burning Bridge",
  recommendation: "PUSH",
  confidence: 87,
  
  // Fathom Notes (Call Notes)
  fathomNotes: [
    {
      date: "2026-03-10",
      stage: "C3 - Possibilities",
      notes: "Andrea is excited about exploring possibilities. Main blocker is health insurance transition. She's concerned about leaving corporate benefits but understands the trade-offs. Very engaged, asks great questions. Spouse Tom is fully supportive.",
      nextSteps: "Present 3 possibilities, focus on home services and wellness brands",
      blockers: ["Health insurance transition"],
      wins: ["High engagement", "Spouse alignment", "Financial readiness"]
    }
  ],
  
  // Coaching Notes
  notes: [
    "High I style - needs enthusiasm and stories",
    "Health insurance is the main blocker - address this directly",
    "Spouse Tom is retired and very supportive - include in process",
    "Strong PM background - emphasize systems and processes",
    "Timeline is 0-6 months - she's ready to move"
  ],
  
  lastContact: "2026-03-10",
  nextAction: "Present 3 possibilities in next call",
  createdAt: "2026-02-15",
  avatar: "AK"
};

// ============================================
// CLIENT 2: ALEX RAIYN (Original Profile)
// ============================================

export const alexRaiyn: ClientProfile = {
  id: "C002",
  name: "Alex Raiyn",
  email: "alex.raiyn@email.com",
  phone: "(555) 234-5678",
  company: "Marketing Dynamics",
  industry: "Marketing/Advertising",
  
  stage: "Possibilities",
  
  disc: {
    style: "D",
    description: "Dominance - Results-driven, direct, decisive, competitive",
    traits: ["Results-oriented", "Direct", "Decisive", "Competitive", "Takes charge", "Goal-focused"],
    coachingTips: [
      "Be direct and get to the point quickly",
      "Focus on results and outcomes",
      "Provide options and let them choose",
      "Respect their authority and competence",
      "Don't waste time with small talk"
    ],
    scores: {
      D: 63,
      I: 75,
      S: 25,
      C: 45
    }
  },
  
  you2: {
    statement: "I want to build something enduring - a business, a legacy, a future where my family thrives and I'm in control of my destiny.",
    dangers: [
      "Analysis paralysis from too many options",
      "Moving too fast without proper due diligence",
      "Overconfidence in abilities",
      "Neglecting family during transition"
    ],
    opportunities: [
      "Strong marketing and sales background",
      "High energy and drive",
      "Financial resources to invest",
      "Supportive spouse (Sydne) and family"
    ],
    skills: {
      favorites: ["Strategic Planning", "Sales", "Marketing", "Team Building"],
      delegate: ["Bookkeeping", "Administrative details"],
      interested: ["Operations Management", "Business Development"]
    },
    priorities: ["Income", "Wealth", "Lifestyle", "Equity"]
  },
  
  tumay: {
    age: 42,
    spouse: {
      name: "Sydne",
      occupation: "Professional",
      supportive: true,
      involvement: "Supportive, involved in decision-making"
    },
    location: "Urban area, considering relocation to Southeast",
    workPreference: "Semi-absentee ownership preferred",
    creditScore: 760,
    netWorth: "$500,000 - $750,000",
    liquidCapital: "$100,000 - $150,000",
    timeline: "6-12 months",
    industriesOfInterest: ["Home Services", "Health & Wellness", "Business Services", "Food & Beverage"],
    skills: ["Sales", "Marketing", "Leadership", "Strategic Planning"],
    notInterestedIn: ["Retail", "Hospitality", "Healthcare direct care"],
    whyNow: "Ready for next chapter, want to build legacy, family relocation plans"
  },
  
  visionStatement: {
    paragraph: "By 2026-2027, I will build a business generating $190,000-$250,000+ annually that creates lasting value for my family and community. This business will provide the foundation for our relocation to the Southeast and support our family's growth and dreams.",
    journeyMindset: "I embrace the entrepreneurial journey with confidence and resilience. Every challenge is an opportunity to learn and grow stronger.",
    successDefinition: "Success means building something enduring - a thriving business, a secure future for my family, and the ability to make a positive impact in my community.",
    motivators: {
      income: "$190,000-$250,000+ annually",
      financialFreedom: "Build wealth, create financial security, fund family goals",
      workLife: "Control my destiny, build legacy, be present for family milestones"
    }
  },
  
  ilwe: {
    income: {
      current: "$150,000/year",
      target: "$190,000-$250,000+/year",
      timeline: "2-3 years"
    },
    lifestyle: {
      desired: "Semi-absentee ownership, flexibility for family, control over schedule",
      current: "Corporate demands, travel, limited control",
      gap: "High - need autonomy and flexibility"
    },
    wealth: {
      strategy: "Build business equity, create generational wealth",
      target: "$2M+ net worth"
    },
    equity: {
      goal: "Build sellable business, create legacy asset",
      timeline: "7-10 years"
    }
  },
  
  readiness: {
    identity: 5,
    commitment: 5,
    financial: 4,
    execution: 5
  },
  
  persona: "Strategic",
  recommendation: "PUSH",
  confidence: 92,
  
  fathomNotes: [
    {
      date: "2026-03-08",
      stage: "C3 - Possibilities",
      notes: "Alex is highly engaged and ready to move. Strong D/I profile - wants results and is enthusiastic. Has done extensive research. Spouse Sydne is supportive. Main focus is finding the right business model for semi-absentee ownership.",
      nextSteps: "Present 3 possibilities with strong manager-run models",
      blockers: ["Finding right semi-absentee model"],
      wins: ["High readiness", "Financially prepared", "Spouse alignment", "Clear timeline"]
    }
  ],
  
  notes: [
    "High D/I - direct, results-focused, but also enthusiastic",
    "Wants semi-absentee model - emphasize manager-run businesses",
    "Relocation to Southeast is part of the plan",
    "Strong sales/marketing background - great for business ownership",
    "Timeline is 6-12 months - not rushed but committed"
  ],
  
  lastContact: "2026-03-08",
  nextAction: "Present 3 semi-absentee possibilities",
  createdAt: "2026-01-20",
  avatar: "AR"
};

// ============================================
// CLIENT 3: MARCUS CHEN (New Profile)
// ============================================

export const marcusChen: ClientProfile = {
  id: "C003",
  name: "Marcus Chen",
  email: "marcus.chen@email.com",
  phone: "(555) 345-6789",
  company: "Global Finance Corp",
  industry: "Finance",
  
  stage: "Seeker Clarification",
  
  disc: {
    style: "C",
    description: "Conscientiousness - Analytical, precise, systematic, careful",
    traits: ["Analytical", "Precise", "Systematic", "Careful", "Detail-oriented", "Thorough"],
    coachingTips: [
      "Be thorough and accurate",
      "Provide data, facts, and research",
      "Allow time for analysis",
      "Be organized and structured",
      "Answer questions with detail"
    ],
    scores: {
      D: 55,
      I: 45,
      S: 60,
      C: 75
    }
  },
  
  you2: {
    statement: "I want to leverage my analytical skills to build a business that provides stability and growth potential while allowing me to work with precision and excellence.",
    dangers: [
      "Analysis paralysis - overthinking decisions",
      "Perfectionism slowing progress",
      "Risk aversion preventing action",
      "Corporate mindset limiting creativity"
    ],
    opportunities: [
      "Strong analytical and financial skills",
      "Detail-oriented approach to business",
      "Methodical decision-making process",
      "Deep understanding of financial metrics"
    ],
    skills: {
      favorites: ["Financial Analysis", "Data Analysis", "Process Improvement", "Risk Assessment"],
      delegate: ["Sales", "Marketing", "Creative tasks"],
      interested: ["Operations", "Quality Control", "Systems Design"]
    },
    priorities: ["Wealth", "Income", "Equity", "Lifestyle"]
  },
  
  tumay: {
    age: 47,
    spouse: {
      name: "Jennifer",
      occupation: "Healthcare Administrator",
      supportive: true,
      involvement: "Supportive, wants detailed information"
    },
    location: "Suburban, stable community",
    workPreference: "Brick & Mortar with structured operations",
    creditScore: 780,
    netWorth: "$400,000 - $600,000",
    liquidCapital: "$80,000 - $120,000",
    timeline: "6-12 months",
    industriesOfInterest: ["Business Services", "Automotive", "Home Services"],
    skills: ["Financial Analysis", "Process Improvement", "Operations", "Risk Management"],
    notInterestedIn: ["Retail", "Food Service", "Sales-heavy businesses"],
    whyNow: "Corporate restructuring concerns, desire for control, want to build something tangible"
  },
  
  visionStatement: {
    paragraph: "I will build a business that leverages my analytical strengths and provides financial security for my family. By 2027, I will own a profitable business with strong systems and processes that operates efficiently and generates $150,000+ annually.",
    journeyMindset: "I approach this journey methodically, knowing that thorough preparation and careful execution lead to success.",
    successDefinition: "Success means building a well-run business with strong financials, reliable systems, and sustainable growth.",
    motivators: {
      income: "$150,000+ annually",
      financialFreedom: "Build assets, create financial security, reduce risk",
      workLife: "Control over work environment, structured schedule, quality focus"
    }
  },
  
  ilwe: {
    income: {
      current: "$140,000/year",
      target: "$150,000-$180,000/year",
      timeline: "2-3 years"
    },
    lifestyle: {
      desired: "Structured schedule, quality over quantity, professional environment",
      current: "Long hours, high stress, corporate politics",
      gap: "Moderate - need more control and less politics"
    },
    wealth: {
      strategy: "Build business equity, diversify investments",
      target: "$1.5M net worth"
    },
    equity: {
      goal: "Own business with strong valuation potential",
      timeline: "7-10 years"
    }
  },
  
  readiness: {
    identity: 4,
    commitment: 4,
    financial: 4,
    execution: 3
  },
  
  persona: "Overthinker",
  recommendation: "NURTURE",
  confidence: 72,
  
  fathomNotes: [
    {
      date: "2026-03-05",
      stage: "C2 - Seeker Clarification",
      notes: "Marcus is very analytical and asks detailed questions. Needs data and research to feel comfortable. Spouse Jennifer is supportive but also wants detailed information. He's concerned about leaving the security of corporate finance.",
      nextSteps: "Provide detailed financial projections, share FDDs, connect with funding partner",
      blockers: ["Risk aversion", "Need for extensive data", "Corporate security comfort"],
      wins: ["Strong financial acumen", "Supportive spouse", "Clear goals"]
    }
  ],
  
  notes: [
    "High C style - needs data, facts, and thorough information",
    "Provide detailed financials and research",
    "Allow time for analysis - don't rush",
    "Address risk concerns with data",
    "Emphasize systems and processes"
  ],
  
  lastContact: "2026-03-05",
  nextAction: "Send detailed financial projections and FDD",
  createdAt: "2026-02-01",
  avatar: "MC"
};

// ============================================
// CLIENT 4: SARAH WILLIAMS (New Profile)
// ============================================

export const sarahWilliams: ClientProfile = {
  id: "C004",
  name: "Sarah Williams",
  email: "sarah.williams@email.com",
  phone: "(555) 456-7890",
  company: "Retail Management Group",
  industry: "Retail",
  
  stage: "Seeker Connection",
  
  disc: {
    style: "S",
    description: "Steadiness - Patient, reliable, supportive, calm",
    traits: ["Patient", "Reliable", "Supportive", "Calm", "Good listener", "Team-oriented"],
    coachingTips: [
      "Be patient and calm",
      "Show sincere interest in them as a person",
      "Provide reassurance and support",
      "Give time to process and decide",
      "Emphasize stability and security"
    ],
    scores: {
      D: 35,
      I: 55,
      S: 72,
      C: 45
    }
  },
  
  you2: {
    statement: "I want to find a career path that values my experience and allows me to contribute meaningfully while providing stability and work-life balance.",
    dangers: [
      "Age discrimination in job market",
      "Fear of starting over",
      "Financial insecurity",
      "Lack of confidence in abilities"
    ],
    opportunities: [
      "Extensive retail management experience",
      "Strong customer service skills",
      "Team leadership background",
      "Understanding of operations"
    ],
    skills: {
      favorites: ["Team Leadership", "Customer Service", "Operations", "Training"],
      delegate: ["Technology", "Financial Analysis"],
      interested: ["Community-focused work", "Helping others"]
    },
    priorities: ["Lifestyle", "Income", "Wealth", "Equity"]
  },
  
  tumay: {
    age: 58,
    spouse: {
      name: "N/A",
      occupation: "N/A",
      supportive: false,
      involvement: "Single, no spouse"
    },
    location: "Urban area",
    workPreference: "Virtual/Remote work preferred",
    creditScore: 680,
    netWorth: "$200,000 - $350,000",
    liquidCapital: "$40,000 - $60,000",
    timeline: "12-18 months",
    industriesOfInterest: ["Education", "Senior Care", "Non-profit"],
    skills: ["Management", "Customer Service", "Training", "Operations"],
    notInterestedIn: ["High-tech", "Sales", "Physical labor"],
    whyNow: "Corporate restructuring, want to prove value, need flexibility"
  },
  
  visionStatement: {
    paragraph: "I will create a career that honors my experience and allows me to make a meaningful contribution. By 2027, I will be engaged in work that values my skills, provides financial stability, and gives me the flexibility I need.",
    journeyMindset: "I am open to new possibilities and willing to learn. My experience is valuable, and I have much to contribute.",
    successDefinition: "Success means being valued for my contributions, having financial security, and enjoying work-life balance.",
    motivators: {
      income: "$80,000-$100,000 annually",
      financialFreedom: "Stability, security, peace of mind",
      workLife: "Flexibility, meaningful work, being valued"
    }
  },
  
  ilwe: {
    income: {
      current: "$75,000/year",
      target: "$80,000-$100,000/year",
      timeline: "2-3 years"
    },
    lifestyle: {
      desired: "Flexible schedule, meaningful work, less stress",
      current: "Retail hours, physical demands, high stress",
      gap: "High - need change in work environment"
    },
    wealth: {
      strategy: "Build savings, create stability",
      target: "Secure retirement"
    },
    equity: {
      goal: "Build something of value",
      timeline: "Flexible"
    }
  },
  
  readiness: {
    identity: 3,
    commitment: 3,
    financial: 2,
    execution: 3
  },
  
  persona: "Quiet Decider",
  recommendation: "NURTURE",
  confidence: 58,
  
  fathomNotes: [
    {
      date: "2026-03-01",
      stage: "C1 - Seeker Connection",
      notes: "Sarah is cautious but open. Age discrimination is a real concern for her. She needs reassurance and support. Not very confident about starting over but willing to explore. Single, so no spouse to consider.",
      nextSteps: "Build confidence, emphasize value of her experience, explore options",
      blockers: ["Age concerns", "Lack of confidence", "Limited capital"],
      wins: ["Open to exploring", "Valuable experience", "Willing to learn"]
    }
  ],
  
  notes: [
    "High S style - needs patience, support, and reassurance",
    "Age discrimination is a real concern - address with empathy",
    "Build confidence in her experience and value",
    "Emphasize stability and security",
    "Give time to process - don't rush"
  ],
  
  lastContact: "2026-03-01",
  nextAction: "Follow up on DISC and You 2.0 completion",
  createdAt: "2026-02-10",
  avatar: "SW"
};

// ============================================
// CLIENT 5: DAVID PARK (New Profile)
// ============================================

export const davidPark: ClientProfile = {
  id: "C005",
  name: "David Park",
  email: "david.park@email.com",
  phone: "(555) 567-8901",
  company: "Construction Solutions LLC",
  industry: "Construction",
  
  stage: "Client Career 2.0",
  
  disc: {
    style: "D",
    description: "Dominance - Results-driven, direct, decisive, competitive",
    traits: ["Results-oriented", "Direct", "Decisive", "Competitive", "Takes charge", "Action-oriented"],
    coachingTips: [
      "Be direct and get to the point quickly",
      "Focus on results and outcomes",
      "Provide options and let them choose",
      "Respect their authority and competence",
      "Don't waste time with small talk"
    ],
    scores: {
      D: 78,
      I: 50,
      S: 40,
      C: 50
    }
  },
  
  you2: {
    statement: "I want to build a legacy business that I can pass on to my children and that provides financial security for my family for generations.",
    dangers: [
      "Spouse skepticism about business ownership",
      "Moving too fast without proper research",
      "Overconfidence in construction background",
      "Financial risk concerns"
    ],
    opportunities: [
      "Strong construction industry knowledge",
      "Leadership experience",
      "Financial resources to invest",
      "Clear vision for legacy"
    ],
    skills: {
      favorites: ["Project Management", "Leadership", "Negotiation", "Problem-solving"],
      delegate: ["Administrative tasks", "Marketing"],
      interested: ["Business Development", "Strategic Growth"]
    },
    priorities: ["Equity", "Wealth", "Income", "Lifestyle"]
  },
  
  tumay: {
    age: 45,
    spouse: {
      name: "Michelle",
      occupation: "Teacher",
      supportive: false,
      involvement: "Skeptical, needs convincing"
    },
    location: "Suburban, family-oriented community",
    workPreference: "Mobile or Brick & Mortar",
    creditScore: 750,
    netWorth: "$400,000 - $600,000",
    liquidCapital: "$100,000 - $150,000",
    timeline: "3-6 months",
    industriesOfInterest: ["Home Services", "Construction", "Automotive"],
    skills: ["Project Management", "Construction", "Leadership", "Vendor Relations"],
    notInterestedIn: ["Retail", "Food Service", "Office-based"],
    whyNow: "Want to build legacy, tired of working for others, spouse still needs convincing"
  },
  
  visionStatement: {
    paragraph: "I will build a successful business that creates a lasting legacy for my family. By 2027, I will own a thriving business that my children can be proud of and potentially join, generating $200,000+ annually.",
    journeyMindset: "I am committed to building something great. Challenges are opportunities to grow stronger.",
    successDefinition: "Success means building a business that provides for my family, creates opportunities for my children, and stands as a testament to hard work and determination.",
    motivators: {
      income: "$200,000+ annually",
      financialFreedom: "Build generational wealth, secure family's future",
      workLife: "Build legacy, provide for family, create opportunities for children"
    }
  },
  
  ilwe: {
    income: {
      current: "$130,000/year",
      target: "$200,000+/year",
      timeline: "2-3 years"
    },
    lifestyle: {
      desired: "Control over business, flexibility for family, build legacy",
      current: "Long hours, working for others, limited control",
      gap: "High - need ownership and control"
    },
    wealth: {
      strategy: "Build business equity, create generational wealth",
      target: "$2M+ net worth"
    },
    equity: {
      goal: "Build business to pass to children",
      timeline: "10-15 years"
    }
  },
  
  readiness: {
    identity: 5,
    commitment: 4,
    financial: 4,
    execution: 5
  },
  
  persona: "Strategic",
  recommendation: "PUSH",
  confidence: 85,
  
  fathomNotes: [
    {
      date: "2026-03-09",
      stage: "C4 - Client Career 2.0",
      notes: "David is highly motivated and ready to move. He's done his research and knows what he wants. Main blocker is spouse Michelle who is skeptical about leaving the security of her teaching job and his current income. Need to address spouse concerns.",
      nextSteps: "Include spouse in next call, address concerns with data, move toward Point of Clarity",
      blockers: ["Spouse skepticism"],
      wins: ["High motivation", "Clear vision", "Financially prepared", "Industry knowledge"]
    }
  ],
  
  notes: [
    "High D style - direct, results-focused, decisive",
    "Spouse alignment is critical - Michelle is skeptical",
    "Include spouse in all future communications",
    "Address concerns with data and facts",
    "Emphasize legacy and family benefits"
  ],
  
  lastContact: "2026-03-09",
  nextAction: "Schedule call with spouse included",
  createdAt: "2025-12-15",
  avatar: "DP"
};

// ============================================
// ALL CLIENTS EXPORT
// ============================================

export const allClients: ClientProfile[] = [
  andreaKelleher,
  alexRaiyn,
  marcusChen,
  sarahWilliams,
  davidPark
];

export default allClients;
