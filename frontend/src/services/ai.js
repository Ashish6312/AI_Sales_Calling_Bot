const API_KEY = "sk_ySCrT4yagLqUn4HRZ1Fr2SpQQSlJqBTB";
const BASE_URL = "https://gen.pollinations.ai/v1/chat/completions";

export const sendMessageToAI = async (messages, language = 'hi', userInfo = null) => {
  const contextPrefix = userInfo ? `
    We already know: Name=${userInfo.name}, City=${userInfo.city}, Bill=₹${userInfo.bill}. Do NOT ask for these again.
  ` : "";

  // Map requested language to exact script instructions
  let langInstruction = "";
  if (language === 'hi') langInstruction = "HINDI (MUST USE DEVANAGARI SCRIPT ONLY. NEVER USE ENGLISH LETTERS like 'aaj', 'kya'. Say 'आज', 'क्या'). However, ALWAYS use standard English numerals (0-9) for numbers (e.g., 89890), DO NOT use Devanagari numerals (e.g., ८९८९०).";
  else if (language === 'te') langInstruction = "TELUGU (MUST USE TELUGU SCRIPT ONLY. Use standard English numerals 0-9).";
  else langInstruction = "ODIA (MUST USE ODIA SCRIPT ONLY. Use standard English numerals 0-9).";

  const systemPrompt = `
    You are a high-converting Mierae Solar Sales Bot. 
    Mission: Qualify leads, explain PM Surya Ghar Yojana subsidy, and book a free site visit.
    Language: You must reply ONLY in ${langInstruction}. If the user types "ji", "ha", you MUST reply entirely in the native script. NEVER use Hinglish.

    ${contextPrefix}

    ### DATA & PITCH (Use naturally)
    - PM Surya Ghar Yojana gives up to 40% subsidy (Up to ₹78,000 for 3kW).
    - 300 units free electricity/month. 25+ years of life. Loan available at ~6.75%.

    ### CONVERSATION FLOW (Follow Strictly step-by-step)
    - Observe the conversation history. See which step is next.
    - Ask only ONE question per response. Keep the reply under 3 sentences.

    STEP 1: Verify Ownership = Ask: "क्या आपका खुद का घर है?" (or chosen language equivalent).
    STEP 2: Verify Roof = Ask: "छत खाली है क्या?"
    STEP 3: The Pitch & Site Visit Booking = Briefly explain the subsidy (₹78k, zero bill) AND ask: "क्या मैं आपके लिए free site visit book कर दूं?"
    STEP 4: Collect Number = If they say yes/agreed, ask: "आपका WhatsApp number share कर सकते हैं?"
    STEP 5: Close = Thank them and say our team will contact them.

    ### RULES
    1. NEVER hallucinate or ask for exact addresses/time slots. Just follow the exact 5 steps above.
    2. If the user asks a question about cost/subsidy, answer it using the DATA above and then repeat your current step's question.
    3. ABSOLUTELY NO ENGLISH/Hinglish CHARACTERS in your response if language is set to Hindi. Period. 
  `;

  // Filter out system ui tags to maintain clean history
  const apiMessages = messages.map((m, index) => {
    let cleanContent = m.content;
    if (m.id === 'init') {
      cleanContent = `[System Init - User submitted details. Do not reply to this.]`;
    }
    return {
      role: m.role,
      content: cleanContent
    };
  });

  try {
    const response = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai",
        messages: [
          { role: "system", content: systemPrompt },
          ...apiMessages
        ],
        temperature: 0.1, // extremely low to prevent deviation
      }),
    });

    if (!response.ok) throw new Error("AI Service Unavailable");
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("AI Error:", error);
    throw error;
  }
};

export const analyzeBill = async (base64Image) => {
  try {
    const prompt = "Analyze this electricity bill. Extract only: 1. Monthly Bill Amount (approx), 2. Consumer Name, 3. City. Return in JSON format: { \"amount\": \"\", \"name\": \"\", \"city\": \"\" }. If not clear, return null.";
    const response = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
            ]
          }
        ]
      }),
    });
    const data = await response.json();
    const cleaned = data.choices[0].message.content.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("OCR Error:", e);
    return null;
  }
};
