import { GoogleGenAI, Chat, GenerativeModel } from "@google/genai";

let chatSession: Chat | null = null;
let model: GenerativeModel | null = null;

const SYSTEM_INSTRUCTION = `
You are an expert AI Web Developer and UI/UX Designer. 
Your goal is to build, refine, and iterate on website pages based on user prompts.

RULES:
1. When the user asks to create or modify the website, you MUST return the FULL, VALID HTML code for the CURRENT page being edited.
2. DO NOT use Markdown formatting (no \`\`\`html or \`\`\` blocks). Just return the raw code.
3. If the user asks for analysis, feedback, suggestions, or a general question, answer in plain text. Only return HTML if you are creating or updating the page.
4. To distinguish between code and text, your response for code generation must start strictly with "<!DOCTYPE html>".
5. Use Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>.
6. Use FontAwesome via CDN: <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">.
7. Use "https://picsum.photos/width/height" for placeholder images.
8. Use semantic HTML5 tags (header, nav, section, article, footer).
9. Do not include any explanation before or after the HTML code when generating code.

MULTI-PAGE AWARENESS & NAVIGATION:
- You will be provided with the "Current Page Filename" and a list of "Project Structure" (Page Name -> Filename).
- **CRITICAL**: When creating navigation menus (headers/footers) or internal links, you MUST use the exact filenames provided in the context.
- Example: If the context says "About Us: about.html", your link MUST be <a href="about.html">About Us</a>.
- Do not make up filenames. If a page doesn't exist, do not link to it unless creating it.
- Ensure visual consistency (header/footer/styles) across all pages.

CONTENT HANDLING:
- If provided with attached text content, parse it intelligently into sections (H1/H2 for headings, grids for features).
- If the user explicitly asks to "use the content unchanged", format it nicely into a container (e.g. <article class="prose lg:prose-xl mx-auto">) but do not summarize, rephrase or rewrite the core text unless asked.
- If asked to create a NEW page from content, ensure the page has a Header and Footer consistent with a typical website, with the content placed in the Main area.
- Use standard <img> tags for easy visual editing.

SEQUENTIAL BUILDING:
- If asked to add a section, append it logically.
- Preserve existing content unless asked to change it.

IMAGE OPTIMIZATION & PERFORMANCE:
- When asked to optimize images or improve performance:
  - Add 'loading="lazy"' to all <img> tags that are below the fold (e.g. features, footer, testimonials).
  - Add 'fetchpriority="high"' to the Hero/Banner image (LCP element).
  - Ensure all <img> tags have a descriptive 'alt' attribute.
  - Use Tailwind aspect ratio utilities (e.g. 'aspect-video', 'aspect-[4/3]', 'h-64 w-full object-cover') to reserve space and prevent Cumulative Layout Shift (CLS).
`;

export const initializeChat = (): void => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key is missing!");
    return;
  }

  const ai = new GoogleGenAI({ apiKey });
  
  chatSession = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
    },
  });
};

export const resetSession = (): void => {
  chatSession = null;
};

interface PageContext {
  name: string;
  path: string;
}

export const sendMessageToGemini = async (message: string, context?: { currentPage: string, availablePages: PageContext[] }): Promise<{ content: string; isCode: boolean }> => {
  if (!chatSession) {
    initializeChat();
    if (!chatSession) {
        throw new Error("Failed to initialize Gemini session.");
    }
  }

  try {
    let finalMessage = message;
    
    // Inject multi-page context if available
    if (context) {
        const pagesList = context.availablePages.length > 0 
            ? context.availablePages.map(p => `- ${p.name}: "${p.path}"`).join('\n')
            : "None (this is the only page)";
            
        finalMessage = `[Current Context]\nEditing Page File: ${context.currentPage}\n\n[Project Structure (Name: Filename)]\n${pagesList}\n\n[User Request]\n${message}`;
    }

    const result = await chatSession.sendMessage({ message: finalMessage });
    const responseText = result.text;

    if (!responseText) {
      throw new Error("Empty response from Gemini.");
    }

    const trimmed = responseText.trim();
    // Strict check for HTML response to distinguish from text analysis
    const isCode = trimmed.startsWith("<!DOCTYPE html") || trimmed.startsWith("<html");

    return {
      content: responseText,
      isCode
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
