import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY must be set');
}

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ---------------------------------------------------------------------------
// Exec briefing — steering committee summary of open Critical/High items
// ---------------------------------------------------------------------------
export async function generateExecBriefing(items) {
  const prompt = `You are a senior program manager for a Lead to Cash transformation \
program. Based on the following open RAID items, write a concise \
3-paragraph executive briefing suitable for a steering committee.
Cover: (1) current risk posture, (2) top 3 items needing exec \
decision or action, (3) recommended next steps.
Be direct, business-focused, and avoid technical jargon.
Tone: professional, confident, clear.

RAID DATA:
${JSON.stringify(items, null, 2)}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 800,
  });

  return response.choices[0].message.content;
}

// ---------------------------------------------------------------------------
// Mitigation suggestion — practical strategy for a single risk
// ---------------------------------------------------------------------------
export async function generateMitigationSuggestion({ title, stage, workstream, description }) {
  const prompt = `You are an expert project manager specialising in Lead to Cash \
Salesforce transformations. A new risk has been identified:

Title: ${title}
Stage: ${stage}
Workstream: ${workstream}
Description: ${description}

Suggest a practical mitigation strategy in 2-3 sentences. \
Be specific to the LTC domain. No bullet points.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 300,
  });

  return response.choices[0].message.content;
}

// ---------------------------------------------------------------------------
// Weekly digest — stakeholder email draft from programme stats
// ---------------------------------------------------------------------------
export async function generateWeeklyDigest({ total, critical, resolved, due_soon }) {
  const prompt = `You are a project manager writing a weekly stakeholder update email \
for a Lead to Cash transformation program.

Program status summary:
- Total items: ${total}
- Critical/Escalated: ${critical}
- Resolved this week: ${resolved}
- Upcoming due dates: ${due_soon}

Write a professional 3-paragraph update email with subject line.
Tone: confident, transparent, action-oriented.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 500,
  });

  return response.choices[0].message.content;
}
