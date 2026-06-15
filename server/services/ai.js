import { Anthropic } from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const { ANTHROPIC_API_KEY } = process.env;

let anthropicClient = null;
const isMockMode = !ANTHROPIC_API_KEY || ANTHROPIC_API_KEY.includes('...') || ANTHROPIC_API_KEY === 'sk-ant-';

if (!isMockMode) {
  try {
    anthropicClient = new Anthropic({
      apiKey: ANTHROPIC_API_KEY
    });
  } catch (err) {
    console.warn(`Anthropic client failed to initialize: ${err.message}. Running in mock mode.`);
  }
} else {
  console.log('ANTHROPIC_API_KEY is not set or is a placeholder. Anthropic AI service running in MOCK mode.');
}

/**
 * Call Anthropic API to generate content.
 * Helper function with timeout and fallback logic.
 */
const callClaude = async (systemPrompt, userPrompt, mockCallback) => {
  if (isMockMode || !anthropicClient) {
    await new Promise((resolve) => setTimeout(resolve, 500)); // simulate delay
    return mockCallback();
  }

  try {
    const message = await anthropicClient.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      temperature: 0.7,
      system: systemPrompt + '\nIMPORTANT: You must respond ONLY with raw, valid JSON. Do not write any preamble, explanation, markdown blocks, or trailing text.',
      messages: [{ role: 'user', content: userPrompt }]
    });

    const text = message.content[0].text.trim();
    // Strip markdown formatting if present
    const cleanText = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    return JSON.parse(cleanText);
  } catch (err) {
    console.error(`Anthropic API call failed: ${err.message}`);
    // If real API fails, return the mock as safe fallback
    return mockCallback();
  }
};

/**
 * Write campaign based on topic, tone, and target audience
 */
export const writeCampaign = async (topic, tone, audience) => {
  const systemPrompt = `You are a professional conversion copywriter. Write a highly engaging bulk email campaign. Your response must be a JSON object with keys: "subject" (string) and "body" (HTML formatted string). Do not include any greeting placeholders in body, assume user personalization is handled separately.`;
  const userPrompt = `Write an email campaign about "${topic}" in a "${tone}" tone, tailored to "${audience}".`;
  
  const mockCallback = () => ({
    subject: `Boost Your Success: ${topic.slice(0, 30)}...`,
    body: `<p>Hi {{name}},</p>
<p>Are you looking to get the most out of <strong>${topic}</strong>? If you are part of our "${audience}" community, you know how hard it can be to succeed in this area.</p>
<p>Here are three key things you can do today to improve:</p>
<ol>
  <li>Focus on consistency rather than intensity.</li>
  <li>Leverage tools to automate administrative tasks.</li>
  <li>Listen closely to feedback from your community.</li>
</ol>
<p>We'd love to hear your thoughts on this! Reply directly to this email to let us know.</p>
<p>Best regards,<br/>The Team</p>`
  });

  return callClaude(systemPrompt, userPrompt, mockCallback);
};

/**
 * Optimize a subject line, score it, and provide recommendations
 */
export const optimizeSubject = async (subjectLine) => {
  const systemPrompt = `You are an email marketing analytics expert. Evaluate the given email subject line. Rate its effectiveness from 0 to 100, explain why (reason), and provide exactly 3 specific, improved subject line alternatives (suggestions). Your response must be a JSON object with keys: "score" (number), "reason" (string), and "suggestions" (array of 3 strings).`;
  const userPrompt = `Optimize this subject line: "${subjectLine}"`;

  const mockCallback = () => {
    const score = Math.floor(Math.random() * 20) + 70; // 70-90
    return {
      score,
      reason: `The subject line "${subjectLine}" is clear but could benefit from more curiosity-inducing angles or urgent phrasing to increase open rates.`,
      suggestions: [
        `💡 Quick question about your progress: ${subjectLine}`,
        `Stop missing out on this major opportunity`,
        `The truth about: ${subjectLine}`
      ]
    };
  };

  return callClaude(systemPrompt, userPrompt, mockCallback);
};

/**
 * Analyze campaign delivery stats and provide actionable recommendations
 */
export const analyzeCampaign = async (stats) => {
  const systemPrompt = `You are an email analytics strategist. Read the following campaign stats and return exactly 3 actionable key insights to improve the creator's next campaigns. Your response must be a JSON object with key: "insights" (array of 3 strings).`;
  const userPrompt = `Analyze these campaign statistics: ${JSON.stringify(stats)}`;

  const mockCallback = () => ({
    insights: [
      `Your open rate indicates strong subject line resonance; keep using curiosity-driven hooks in future subject lines.`,
      `The click-to-open ratio suggests you should place your primary call-to-action button higher in the email (above the fold) to capture more traffic.`,
      `We detected a slight rise in soft bounces. Consider running a list-cleaning campaign to prune inactive subscribers and protect your deliverability score.`
    ]
  });

  return callClaude(systemPrompt, userPrompt, mockCallback);
};
