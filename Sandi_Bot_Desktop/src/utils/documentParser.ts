import type { Client, DISCProfile, You2Profile, TUMAYProfile, VisionStatement, FathomNote } from '@/types';

export interface ParsedDocument {
  type: 'DISC' | 'You2.0' | 'TUMAY' | 'Vision' | 'Fathom' | 'Unknown';
  clientName?: string;
  data: any;
  rawContent: string;
}

export function detectDocumentType(content: string, filename: string): ParsedDocument['type'] {
  const lowerContent = content.toLowerCase();
  const lowerFilename = filename.toLowerCase();

  // Check filename first
  if (lowerFilename.includes('disc')) return 'DISC';
  if (lowerFilename.includes('you2') || lowerFilename.includes('you 2')) return 'You2.0';
  if (lowerFilename.includes('tumay') || lowerFilename.includes('two may')) return 'TUMAY';
  if (lowerFilename.includes('vision')) return 'Vision';
  if (lowerFilename.includes('fathom')) return 'Fathom';

  // Check content patterns
  if (lowerContent.includes('dominance') && lowerContent.includes('influence') && lowerContent.includes('steadiness')) {
    return 'DISC';
  }
  if (lowerContent.includes('dangers') && lowerContent.includes('opportunities') && lowerContent.includes('skills')) {
    return 'You2.0';
  }
  if (lowerContent.includes('two may') || lowerContent.includes('tumay')) {
    return 'TUMAY';
  }
  if (lowerContent.includes('vision statement') || lowerContent.includes('my vision is')) {
    return 'Vision';
  }
  if (lowerContent.includes('call summary') || lowerContent.includes('fathom')) {
    return 'Fathom';
  }

  return 'Unknown';
}

export function extractClientName(content: string, filename: string): string | undefined {
  // Try to extract from filename first (e.g., "Andrea_Kelleher_DISC.pdf")
  const filenameMatch = filename.match(/^([A-Za-z]+)_?([A-Za-z]+)/);
  if (filenameMatch) {
    return `${filenameMatch[1]} ${filenameMatch[2]}`;
  }

  // Try to extract from content
  const namePatterns = [
    /name:\s*([^\n]+)/i,
    /client:\s*([^\n]+)/i,
    /client name:\s*([^\n]+)/i,
    /seeker:\s*([^\n]+)/i
  ];

  for (const pattern of namePatterns) {
    const match = content.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return undefined;
}

export function parseDISC(content: string): DISCProfile {
  const lowerContent = content.toLowerCase();
  
  // Look for DISC scores or dominant style
  let style: 'D' | 'I' | 'S' | 'C' = 'I'; // Default
  
  if (lowerContent.includes('high d') || lowerContent.includes('dominance')) {
    style = 'D';
  } else if (lowerContent.includes('high i') || lowerContent.includes('influence')) {
    style = 'I';
  } else if (lowerContent.includes('high s') || lowerContent.includes('steadiness')) {
    style = 'S';
  } else if (lowerContent.includes('high c') || lowerContent.includes('compliance')) {
    style = 'C';
  }

  // Extract scores if present
  const scores = {
    D: 50,
    I: 50,
    S: 50,
    C: 50
  };

  const dMatch = content.match(/D[:\s]+(\d+)/i);
  const iMatch = content.match(/I[:\s]+(\d+)/i);
  const sMatch = content.match(/S[:\s]+(\d+)/i);
  const cMatch = content.match(/C[:\s]+(\d+)/i);

  if (dMatch) scores.D = parseInt(dMatch[1]);
  if (iMatch) scores.I = parseInt(iMatch[1]);
  if (sMatch) scores.S = parseInt(sMatch[1]);
  if (cMatch) scores.C = parseInt(cMatch[1]);

  // Determine dominant from scores if available
  const maxScore = Math.max(scores.D, scores.I, scores.S, scores.C);
  if (maxScore === scores.D) style = 'D';
  else if (maxScore === scores.I) style = 'I';
  else if (maxScore === scores.S) style = 'S';
  else style = 'C';

  return {
    style,
    description: generateDISCDescription(style),
    traits: generateDISCTraits(style),
    coachingTips: generateDISCCoachingTips(style),
    scores
  };
}

function generateDISCDescription(style: 'D' | 'I' | 'S' | 'C'): string {
  const descriptions: Record<string, string> = {
    D: 'Results-oriented, decisive, and direct. High D individuals are competitive and driven by challenges.',
    I: 'Enthusiastic, optimistic, and relationship-focused. High I individuals are persuasive and creative.',
    S: 'Patient, supportive, and reliable. High S individuals value stability and are excellent team players.',
    C: 'Analytical, detail-oriented, and systematic. High C individuals prioritize accuracy and quality.'
  };
  return descriptions[style];
}

function generateDISCTraits(style: 'D' | 'I' | 'S' | 'C'): string[] {
  const traits: Record<string, string[]> = {
    D: [
      'Results-oriented and decisive',
      'Direct and straightforward communication',
      'Competitive and challenge-driven',
      'Comfortable with risk and change'
    ],
    I: [
      'Enthusiastic and optimistic',
      'Strong verbal communication skills',
      'Relationship-focused and persuasive',
      'Creative problem solver'
    ],
    S: [
      'Patient and supportive',
      'Reliable and consistent',
      'Good listener and team player',
      'Values stability and harmony'
    ],
    C: [
      'Analytical and detail-oriented',
      'Systematic and organized',
      'Quality-focused and accurate',
      'Logical decision maker'
    ]
  };
  return traits[style];
}

function generateDISCCoachingTips(style: 'D' | 'I' | 'S' | 'C'): string[] {
  const tips: Record<string, string[]> = {
    D: [
      'Get to the point quickly - respect their time',
      'Focus on results and ROI',
      'Present challenges as opportunities',
      'Be direct and confident in your approach'
    ],
    I: [
      'Build rapport before diving into business',
      'Use stories and testimonials',
      'Keep energy high and positive',
      'Help them stay focused on details'
    ],
    S: [
      'Provide stability and reassurance',
      'Give them time to process information',
      'Emphasize support systems in place',
      'Avoid high-pressure tactics'
    ],
    C: [
      'Provide detailed data and research',
      'Be prepared with facts and figures',
      'Give them time to analyze options',
      'Present structured, logical plans'
    ]
  };
  return tips[style];
}

export function parseYou2(content: string): You2Profile {
  const profile: You2Profile = {
    statement: '',
    dangers: [],
    opportunities: [],
    skills: {
      favorites: [],
      delegate: [],
      interested: []
    },
    priorities: ['Income', 'Lifestyle', 'Wealth', 'Equity']
  };

  // Extract Dangers
  const dangersMatch = content.match(/dangers?:?\s*([^]*?)(?=opportunities|skills|priorities|$)/i);
  if (dangersMatch) {
    profile.dangers = dangersMatch[1]
      .split(/[\n,;]/)
      .map(d => d.trim())
      .filter(d => d.length > 0);
  }

  // Extract Opportunities
  const opportunitiesMatch = content.match(/opportunities?:?\s*([^]*?)(?=dangers|skills|priorities|$)/i);
  if (opportunitiesMatch) {
    profile.opportunities = opportunitiesMatch[1]
      .split(/[\n,;]/)
      .map(o => o.trim())
      .filter(o => o.length > 0);
  }

  // Extract Skills - look for favorites, delegate, interested sections
  const favoritesMatch = content.match(/favorite skills?:?\s*([^]*?)(?=delegate|interested|dangers|opportunities|$)/i);
  if (favoritesMatch) {
    profile.skills.favorites = favoritesMatch[1]
      .split(/[\n,;]/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  const delegateMatch = content.match(/delegate skills?:?\s*([^]*?)(?=favorite|interested|dangers|opportunities|$)/i);
  if (delegateMatch) {
    profile.skills.delegate = delegateMatch[1]
      .split(/[\n,;]/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  const interestedMatch = content.match(/interested skills?:?\s*([^]*?)(?=favorite|delegate|dangers|opportunities|$)/i);
  if (interestedMatch) {
    profile.skills.interested = interestedMatch[1]
      .split(/[\n,;]/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  // Extract statement - first substantial paragraph
  const paragraphs = content.split(/\n\n+/);
  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (trimmed.length > 50 && trimmed.length < 1000 && !trimmed.toLowerCase().startsWith('dangers') && !trimmed.toLowerCase().startsWith('opportunities')) {
      profile.statement = trimmed;
      break;
    }
  }

  return profile;
}

export function parseTUMAY(content: string): TUMAYProfile {
  const profile: TUMAYProfile = {
    age: 0,
    spouse: {
      name: '',
      occupation: '',
      supportive: false,
      involvement: ''
    },
    location: '',
    workPreference: '',
    creditScore: 0,
    netWorth: '',
    liquidCapital: '',
    timeline: '',
    industriesOfInterest: [],
    skills: [],
    notInterestedIn: [],
    whyNow: ''
  };

  // Try to parse as JSON first
  try {
    const jsonData = JSON.parse(content);
    return {
      age: jsonData.age || 0,
      spouse: jsonData.spouse || profile.spouse,
      location: jsonData.location || '',
      workPreference: jsonData.workPreference || jsonData.work_preference || '',
      creditScore: jsonData.creditScore || jsonData.credit_score || 0,
      netWorth: jsonData.netWorth || jsonData.net_worth || '',
      liquidCapital: jsonData.liquidCapital || jsonData.liquid_capital || '',
      timeline: jsonData.timeline || '',
      industriesOfInterest: jsonData.industriesOfInterest || jsonData.industries_of_interest || [],
      skills: jsonData.skills || [],
      notInterestedIn: jsonData.notInterestedIn || jsonData.not_interested_in || [],
      whyNow: jsonData.whyNow || jsonData.why_now || ''
    };
  } catch (e) {
    // Not JSON, parse as text
  }

  // Extract age
  const ageMatch = content.match(/age[:\s]+(\d+)/i);
  if (ageMatch) profile.age = parseInt(ageMatch[1]);

  // Extract location
  const locationMatch = content.match(/location[:\s]+([^\n]+)/i);
  if (locationMatch) profile.location = locationMatch[1].trim();

  // Extract timeline
  const timelineMatch = content.match(/timeline[:\s]+([^\n]+)/i);
  if (timelineMatch) profile.timeline = timelineMatch[1].trim();

  // Extract why now
  const whyNowMatch = content.match(/why now[:\s]+([^]*?)(?=age|location|timeline|$)/i);
  if (whyNowMatch) profile.whyNow = whyNowMatch[1].trim();

  return profile;
}

export function parseVisionStatement(content: string): VisionStatement {
  const vision: VisionStatement = {
    paragraph: '',
    journeyMindset: '',
    successDefinition: '',
    motivators: {
      income: '',
      financialFreedom: '',
      workLife: ''
    }
  };

  // Extract the vision paragraph
  const visionMatch = content.match(/vision[:\s]*([^]*?)(?=journey|success|motivators|$)/i);
  if (visionMatch) {
    vision.paragraph = visionMatch[1].trim();
  } else {
    // If no explicit label, return first substantial paragraph
    const paragraphs = content.split(/\n\n+/);
    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (trimmed.length > 50 && trimmed.length < 2000) {
        vision.paragraph = trimmed;
        break;
      }
    }
  }

  // Extract journey mindset
  const journeyMatch = content.match(/journey[:\s]*([^]*?)(?=vision|success|motivators|$)/i);
  if (journeyMatch) vision.journeyMindset = journeyMatch[1].trim();

  // Extract success definition
  const successMatch = content.match(/success[:\s]*([^]*?)(?=vision|journey|motivators|$)/i);
  if (successMatch) vision.successDefinition = successMatch[1].trim();

  return vision;
}

export function parseFathomNotes(content: string): FathomNote {
  const note: FathomNote = {
    date: new Date().toISOString().split('T')[0],
    stage: 'Initial Contact',
    notes: content,
    nextSteps: '',
    blockers: [],
    wins: []
  };

  // Extract date
  const dateMatch = content.match(/date[:\s]+([^\n]+)/i);
  if (dateMatch) note.date = dateMatch[1].trim();

  // Extract stage
  const stageMatch = content.match(/stage[:\s]+([^\n]+)/i);
  if (stageMatch) note.stage = stageMatch[1].trim();

  // Extract notes/summary
  const notesMatch = content.match(/notes?[:\s]*([^]*?)(?=next steps?|blockers?|wins?|$)/i);
  if (notesMatch) note.notes = notesMatch[1].trim();

  // Extract next steps
  const nextStepsMatch = content.match(/next steps?[:\s]*([^]*?)(?=notes?|blockers?|wins?|$)/i);
  if (nextStepsMatch) note.nextSteps = nextStepsMatch[1].trim();

  // Extract blockers
  const blockersMatch = content.match(/blockers?[:\s]*([^]*?)(?=notes?|next steps?|wins?|$)/i);
  if (blockersMatch) {
    note.blockers = blockersMatch[1]
      .split(/[\n,;]/)
      .map(b => b.trim())
      .filter(b => b.length > 0);
  }

  // Extract wins
  const winsMatch = content.match(/wins?[:\s]*([^]*?)(?=notes?|next steps?|blockers?|$)/i);
  if (winsMatch) {
    note.wins = winsMatch[1]
      .split(/[\n,;]/)
      .map(w => w.trim())
      .filter(w => w.length > 0);
  }

  return note;
}

export function parseDocument(content: string, filename: string): ParsedDocument {
  const type = detectDocumentType(content, filename);
  const clientName = extractClientName(content, filename);

  let data: any = {};

  switch (type) {
    case 'DISC':
      data = parseDISC(content);
      break;
    case 'You2.0':
      data = parseYou2(content);
      break;
    case 'TUMAY':
      data = parseTUMAY(content);
      break;
    case 'Vision':
      data = parseVisionStatement(content);
      break;
    case 'Fathom':
      data = parseFathomNotes(content);
      break;
    default:
      data = { raw: content };
  }

  return {
    type,
    clientName,
    data,
    rawContent: content
  };
}

// Generate a client profile from parsed documents
export function generateClientFromDocuments(documents: ParsedDocument[]): Partial<Client> {
  const client: Partial<Client> = {};

  for (const doc of documents) {
    if (doc.clientName && !client.name) {
      client.name = doc.clientName;
    }

    switch (doc.type) {
      case 'DISC':
        client.disc = doc.data;
        break;
      case 'You2.0':
        client.you2 = doc.data;
        break;
      case 'TUMAY':
        client.tumay = doc.data;
        break;
      case 'Vision':
        client.visionStatement = doc.data;
        break;
      case 'Fathom':
        client.fathomNotes = [doc.data];
        break;
    }
  }

  return client;
}
