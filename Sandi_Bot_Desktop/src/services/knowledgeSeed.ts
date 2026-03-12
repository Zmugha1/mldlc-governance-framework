import { dbSelect, dbExecute } from './db';

const KNOWLEDGE_SEEDS = [
  {
    content:
      'For High D profiles: Be direct and brief. Lead with results and bottom line. Avoid small talk. Present options not directives. They decide fast — come prepared.',
    content_type: 'DISC_TIP',
    stage: 'Initial Contact',
  },
  {
    content:
      'For High I profiles: Build rapport first. Use stories and enthusiasm. They need to like you before they trust you. Follow up with written summary — they forget details.',
    content_type: 'DISC_TIP',
    stage: 'Initial Contact',
  },
  {
    content:
      'For High S profiles: Slow down. Build trust over time. Never pressure. Show stability and support systems. Family impact is critical to address.',
    content_type: 'DISC_TIP',
    stage: 'Discovery',
  },
  {
    content:
      'For High C profiles: Provide data and proof. Answer every question thoroughly. Give them time to analyze. Never rush the decision. Documentation matters.',
    content_type: 'DISC_TIP',
    stage: 'Discovery',
  },
  {
    content:
      'CLEAR Question — Clarify: What does success look like for you in 3 years if everything goes perfectly?',
    content_type: 'CLEAR_QUESTION',
    stage: 'Discovery',
  },
  {
    content:
      'CLEAR Question — Listen: When you imagine owning your own business, what excites you most? What concerns you most?',
    content_type: 'CLEAR_QUESTION',
    stage: 'Discovery',
  },
  {
    content:
      'CLEAR Question — Explore: What has stopped you from making this move before now?',
    content_type: 'CLEAR_QUESTION',
    stage: 'Validation',
  },
  {
    content:
      'CLEAR Question — Affirm: You have mentioned [X] several times — it sounds like that is very important to you. Tell me more.',
    content_type: 'CLEAR_QUESTION',
    stage: 'Validation',
  },
  {
    content:
      'CLEAR Question — Recommend: Based on everything we have discussed, here is what I think makes sense for you and why.',
    content_type: 'CLEAR_QUESTION',
    stage: 'Decision',
  },
  {
    content:
      'Pink Flag — Financial: Candidate mentions spouse disapproval of investment amount. Explore family alignment before proceeding.',
    content_type: 'PINK_FLAG',
    stage: 'Validation',
  },
  {
    content:
      'Pink Flag — Commitment: Candidate keeps postponing next steps without clear reason. May indicate hidden objection — surface it directly.',
    content_type: 'PINK_FLAG',
    stage: 'Discovery',
  },
  {
    content:
      'Pink Flag — Identity: Candidate says they want to be their own boss but defers every decision to spouse or advisor. Explore ownership mindset.',
    content_type: 'PINK_FLAG',
    stage: 'Discovery',
  },
  {
    content:
      'Objection handling — Too expensive: Reframe from cost to investment. Ask: What is the cost of staying where you are for 5 more years?',
    content_type: 'SCRIPT',
    stage: 'Validation',
  },
  {
    content:
      'Objection handling — Not the right time: Ask: What would need to be true for the timing to be right? Then address each condition specifically.',
    content_type: 'SCRIPT',
    stage: 'Validation',
  },
  {
    content:
      'Objection handling — Need to think about it: Acknowledge then ask: What specifically do you need to think through? I want to make sure you have everything you need.',
    content_type: 'SCRIPT',
    stage: 'Decision',
  },
];

interface CountRow {
  count: number;
}

export async function seedKnowledgeBase(): Promise<void> {
  const existing = await dbSelect<CountRow>(
    `SELECT COUNT(*) as count FROM knowledge_search`
  );

  if ((existing[0]?.count ?? 0) > 0) return;

  for (const seed of KNOWLEDGE_SEEDS) {
    await dbExecute(
      `INSERT INTO knowledge_search 
       (content, content_type, stage, client_id)
       VALUES ($1, $2, $3, $4)`,
      [seed.content, seed.content_type, seed.stage, null]
    );
  }
}
