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
 * Write campaign based on topic, tone, target audience, campaign type, and custom instructions
 */
export const writeCampaign = async (topic, tone, audience, campaignType = 'Newsletter', customPrompt = '') => {
  const systemPrompt = `You are a world-class copywriter who writes highly effective, conversational, personal, and human-sounding 1-to-1 emails.
Your goal is to write an email that lands in Gmail's "Primary" tab and avoids the "Promotions" tab by sounding like a real human writing to another human, rather than a corporate marketing newsletter.

Follow these strict rules:
1. Tone & Style: Warm, direct, 1-to-1, conversational. Write as if sending to a colleague or friend.
2. Word Choice: Avoid marketing and promotional jargon (e.g., "buy now", "limited time", "special discount", "guaranteed", "click here", "best offer", "sales"). Avoid excessive exclamation marks, capital letters, and spammy phrases.
3. Structure:
   - For "Product Launch": Focus on the story behind the product, the problem it solves, and the excitement of launching. Keep it conversational.
   - For "Feature Update": Focus on why we built it, how it benefits the user, and how they can try it. Use simple bullet points if needed.
   - For "Newsletter": A friendly, personal letter sharing insights or updates. Minimalist structure.
   - For "Promotion": Focus on the value/outcome for the user rather than the price/discount. Keep it low-pressure.
   - For "Event Invitation": A warm invite detailing what, when, and why they should attend.
   - For "Welcome Email": A very warm hello welcoming them, setting expectations, and offering help.
   - For "Re-engagement": Check in on how they are doing, show genuine care, and offer a simple way to reconnect.
   - For "Announcement": Share the news transparently and explain what it means for them.
   - For "Educational": Teach them something useful or share a tip.
   - For "Custom": Tailor the structure to the user's specific prompt.
4. Personalization: Support variables like {{name}} and {{email}} naturally in the copy (e.g., "Hi {{name}},", "Hope all is well, {{name}}", or "We've registered {{email}}").
5. Output format: You must respond with a JSON object containing:
   - "subject": A personal, engaging subject line. Keep it short and human (e.g. "quick question for you", "latest update on [X]").
   - "previewText": A short preview text (100-140 characters) that acts as the email preheader to show in inbox list view.
   - "body": The HTML formatted body of the email. Do NOT include html/head/body outer wrappers. Start directly with the greeting. Use clean, minimalist styling (paragraphs, bold text, links, line breaks).

IMPORTANT: You must respond ONLY with raw, valid JSON. Do not write any markdown blocks (like \`\`\`json), preamble, explanation, or trailing text.`;

  const userPrompt = `Campaign Details:
- Campaign Type: ${campaignType}
- Topic: "${topic}"
- Tone: "${tone}"
- Target Audience: "${audience}"
${customPrompt ? `- Custom Instructions: "${customPrompt}"` : ''}

Write a highly personalized, conversational email based on these details.`;
  
  const mockCallback = () => {
    const cleanTopic = topic || 'our new features';
    const cleanAudience = audience || 'subscribers';
    const cleanTone = tone || 'friendly';
    
    let subject = '';
    let previewText = '';
    let body = '';

    switch (campaignType) {
      case 'Product Launch':
        subject = `Finally introducing: ${cleanTopic}`;
        previewText = `We've been working on this for months, {{name}}. Here is the story behind ${cleanTopic}.`;
        body = `<p>Hi {{name}},</p>
<p>For the past few months, our team has been working on solving a major challenge for the ${cleanAudience} community. Today, I'm thrilled to finally share it with you.</p>
<p>Introducing <strong>${cleanTopic}</strong>.</p>
<p>We built this because we saw how difficult it was to manage workloads effectively. Here is how it can help you:</p>
<ul>
  <li><strong>Save time:</strong> Automates repetitive manual workflows.</li>
  <li><strong>Stay organized:</strong> Keeps all your communications in one central place.</li>
  <li><strong>Focus on what matters:</strong> Reduces cognitive overhead and distraction.</li>
</ul>
<p>Would love to know if you'd like early access. Just reply directly to this email and let me know.</p>
<p>Best,<br/>The Team</p>`;
        break;

      case 'Feature Update':
        subject = `New in Mailtide: ${cleanTopic}`;
        previewText = `Check out how our latest update to ${cleanTopic} makes sending emails even easier.`;
        body = `<p>Hi {{name}},</p>
<p>We just rolled out a set of updates to <strong>${cleanTopic}</strong> designed specifically to help our ${cleanAudience}.</p>
<p>Here is what is new and how you can use it:</p>
<p>1. <strong>Smoother integrations:</strong> Connects to your tools with a single click.<br/>
2. <strong>Enhanced reliability:</strong> Improved backend queue handling so nothing gets lost.</p>
<p>If you're already logged in, you can try these features out right away. Let us know what you think!</p>
<p>Best regards,<br/>The Mailtide Team</p>`;
        break;

      case 'Promotion':
        subject = `A special offer for our ${cleanAudience}`;
        previewText = `We want to help you get started with ${cleanTopic}. Here's the details.`;
        body = `<p>Hi {{name}},</p>
<p>I know you've been looking into <strong>${cleanTopic}</strong>, and I wanted to make it as easy as possible for you to get started.</p>
<p>We're offering our ${cleanAudience} a direct way to experience the benefits of ${cleanTopic} with priority support for the next 30 days.</p>
<p>No high pressure sales here—just a simple invitation to see if it's the right fit for your team. You can sign up using your email address: {{email}}.</p>
<p>Let me know if you have any questions before jumping in.</p>
<p>Cheers,<br/>The Team</p>`;
        break;

      case 'Welcome Email':
        subject = `Welcome to Mailtide!`;
        previewText = `We're excited to help you send better emails, {{name}}. Let's get started.`;
        body = `<p>Hi {{name}},</p>
<p>Thanks for joining the Mailtide community! We're excited to help you reach your ${cleanAudience} more reliably.</p>
<p>Our main goal is to make email campaign management seamless and stress-free. Whether you're interested in ${cleanTopic} or just general newsletters, we've got you covered.</p>
<p>Over the next few days, we'll share a few tips to help you get the most out of your account.</p>
<p>If you need anything at all, just reply to this email. I read every message.</p>
<p>Best regards,<br/>Founder, Mailtide</p>`;
        break;

      default:
        // Default Newsletter / Custom / etc.
        subject = `Some thoughts on ${cleanTopic}`;
        previewText = `A quick check-in about ${cleanTopic} and how it impacts ${cleanAudience}.`;
        body = `<p>Hi {{name}},</p>
<p>I wanted to write to you today about <strong>${cleanTopic}</strong>. It's something we've been thinking about a lot lately, especially when working with the ${cleanAudience} community.</p>
<p>Here are a few quick takeaways we've gathered:</p>
<ul>
  <li>Consistency is key to keeping your audience engaged.</li>
  <li>Personalized content performs 3x better than generic templates.</li>
  <li>Clean, conversational copy builds genuine trust.</li>
</ul>
<p>What are your main challenges with ${cleanTopic} right now? I'd love to hear from you.</p>
<p>Best,<br/>The Team</p>`;
    }

    if (customPrompt) {
      body += `<p><em>Note: This draft was generated considering your custom instructions: "${customPrompt}"</em></p>`;
    }

    return { subject, previewText, body };
  };

  const response = await callGemini(systemPrompt, userPrompt, mockCallback);

  if (response && response.body && response.previewText) {
    const hiddenPreheader = `<div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px; color: transparent; mso-hide: all;">${response.previewText}</div>\n`;
    response.body = hiddenPreheader + response.body;
  }
  
  return response;
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
