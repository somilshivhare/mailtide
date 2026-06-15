import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const { GEMINI_API_KEY } = process.env;

let geminiClient = null;
const isMockMode = !GEMINI_API_KEY || GEMINI_API_KEY.includes('...') || GEMINI_API_KEY.includes('mock');

if (!isMockMode) {
  try {
    geminiClient = new GoogleGenerativeAI(GEMINI_API_KEY);
  } catch (err) {
    console.warn(`Gemini client failed to initialize: ${err.message}. Running in mock mode.`);
  }
} else {
  console.log('GEMINI_API_KEY is not set or is a placeholder. Gemini AI service running in MOCK mode.');
}

/**
 * Call Gemini API to generate content.
 * Helper function with native JSON mode constraint and fallback logic.
 */
const callGemini = async (systemPrompt, userPrompt, mockCallback) => {
  if (isMockMode || !geminiClient) {
    await new Promise((resolve) => setTimeout(resolve, 500)); // simulate delay
    return mockCallback();
  }

  try {
    const model = geminiClient.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: systemPrompt + '\nIMPORTANT: You must respond ONLY with raw, valid JSON. Do not write any markdown blocks (like ```json), preamble, explanation, or trailing text.'
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.7
      }
    });

    const text = result.response.text().trim();
    return JSON.parse(text);
  } catch (err) {
    console.error(`Gemini API call failed: ${err.message}`);
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

  return callGemini(systemPrompt, userPrompt, mockCallback);
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

  return callGemini(systemPrompt, userPrompt, mockCallback);
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

  return callGemini(systemPrompt, userPrompt, mockCallback);
};

/**
 * Rewrite email content based on a selected tone/option while preserving HTML format.
 */
export const rewriteCampaign = async (body, option) => {
  const systemPrompt = `You are a professional email copywriter. Rewrite the provided email body content to match the requested style: "${option}". Enforce these rules:
1. Preserve all HTML tags, structure, styling, and links EXACTLY as they are.
2. Only rewrite the textual content inside the tags.
3. Do not change personalization variables like {{name}} or {{unsubscribe}}.
4. Return ONLY a JSON object with a single key "rewrittenBody" containing the rewritten HTML body string.`;

  const userPrompt = `Email HTML to rewrite:\n${body}`;

  const mockCallback = () => {
    let prefix = '';
    switch (option) {
      case 'professional':
        prefix = '<p><em>[Rewritten: More Professional]</em></p>';
        break;
      case 'casual':
        prefix = '<p><em>[Rewritten: More Casual]</em></p>';
        break;
      case 'persuasive':
        prefix = '<p><em>[Rewritten: More Persuasive]</em></p>';
        break;
      case 'shorter':
        prefix = '<p><em>[Rewritten: Shorter & Conciser]</em></p>';
        break;
      case 'longer':
        prefix = '<p><em>[Rewritten: Longer & More Detailed]</em></p>';
        break;
      case 'urgent':
        prefix = '<p><em>[Rewritten: More Urgent]</em></p>';
        break;
      case 'friendly':
        prefix = '<p><em>[Rewritten: More Friendly]</em></p>';
        break;
      default:
        prefix = '<p><em>[Rewritten]</em></p>';
    }
    // Simple mock rewrite: prepend the style and slightly alter the body
    return {
      rewrittenBody: prefix + body
    };
  };

  return callGemini(systemPrompt, userPrompt, mockCallback);
};

/**
 * Generate 5 alternative subject lines and reasoning based on topic and content.
 */
export const suggestSubjects = async (topic, body) => {
  const systemPrompt = `You are an expert email marketer. Generate exactly 5 diverse subject line alternatives for the given campaign topic and body preview. For each suggestion, provide a brief reasoning (under 15 words) explaining its open-rate benefit. Also recommend which one is the single best subject.
Your response must be a JSON object with keys:
"suggestions": array of 5 objects, where each object has "subject" (string) and "reasoning" (string)
"bestSubject": string (matching one of the suggestions)`;

  const userPrompt = `Campaign Topic: "${topic}"\nBody Preview:\n${body ? body.slice(0, 400) : ''}`;

  const mockCallback = () => {
    const suggestions = [
      { subject: `Quick question about ${topic || 'your newsletter'}`, reasoning: "Generates high curiosity, feels like a personal 1-to-1 email." },
      { subject: `The secret to mastering ${topic || 'email marketing'}`, reasoning: "Leverages the curiosity gap to drive immediate clicks." },
      { subject: `Don't miss out on these new ${topic || 'updates'}`, reasoning: "Uses urgency and FOMO (Fear of Missing Out)." },
      { subject: `How we solved our biggest ${topic || 'hurdle'}`, reasoning: "Story-driven hook, highly clickable and relatable." },
      { subject: `A simpler way to handle ${topic || 'campaigns'}`, reasoning: "Offers direct, high-value solution to a common pain point." }
    ];
    return {
      suggestions,
      bestSubject: suggestions[0].subject
    };
  };

  return callGemini(systemPrompt, userPrompt, mockCallback);
};
