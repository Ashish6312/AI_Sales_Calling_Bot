const API_KEY = "sk_ySCrT4yagLqUn4HRZ1Fr2SpQQSlJqBTB";
const BASE_URL = "https://gen.pollinations.ai/v1/chat/completions";

export const sendMessageToAI = async (messages, language = 'hi', userInfo = null) => {
  const contextPrefix = userInfo ? `
    We already know: Name=${userInfo.name}, City=${userInfo.city}, Bill=₹${userInfo.bill}. Do NOT ask for these again.
  ` : "";

  // Map requested language to exact script instructions
  let langInstruction = "";
  if (language === 'hi') langInstruction = "HINDI (Devanagari script only for words. MUST USE 0,1,2,3,4,5,6,7,8,9 for numbers. DO NOT USE १, २, ३, ४, ५, ६, ७, ८, ९, ०).";
  else if (language === 'te') langInstruction = "TELUGU (Telugu script only. Use standard English numerals 0-9).";
  else langInstruction = "ODIA (Odia script only. Use standard English numerals 0-9).";

  const systemPrompt = `
    You are a high-converting Mierae Solar Sales Bot. 
    Mission: Qualify leads, explain PM Surya Ghar Yojana subsidy, and book a free site visit.
    Language: You must reply ONLY in ${langInstruction}. NEVER use Hinglish.

    ${contextPrefix}

    ### DATA, PITCH & HOOKS (Use naturally)
    - Subsidy: PM Surya Ghar Yojana gives up to 40% subsidy (Up to ₹78,000 for 3kW).
    - Benefits: 300 units free electricity/month. 25+ years of life. Loan available at ~6.75%.
    - Hooks (use naturally): "हर महीने ₹2000–₹5000 बिजली में जा रहे हैं" OR "5 साल में पूरा पैसा recover"
    - Urgency: "Subsidy limited है" OR "Government scheme अभी चल रही है"

    ### OBJECTION HANDLING (Use if user hesitates)
    - Too costly / Expensive -> "EMI option available है (₹2k–₹3k/month)"
    - Not sure / Double mind -> "नि:शुल्क (Free) site visit है, कोई commitment नहीं"
    - No time / Busy -> "पूरा process हम manage करेंगे"

    ### CONVERSATION FLOW (Follow Strictly step-by-step)
    - Observe the conversation history. See which step is next.
    - Ask only ONE question per response. Keep the reply under 3 sentences.

    STEP 1: Verify Ownership = Ask: "क्या आपका खुद का घर है?" (or chosen language equivalent).
    STEP 2: Verify Roof = Ask: "छत खाली है क्या?"
    STEP 3: The Pitch & Site Visit Booking = Briefly explain the subsidy (₹78,000, zero bill) AND ask: "क्या मैं आपके लिए free site visit book कर दूं?"
    STEP 4: Collect Number = If they say yes/agreed, ask: "आपका WhatsApp number share कर सकते हैं?"
    STEP 5: Close = Thank them and say our team will contact them.

    ### RULES
    1. NEVER hallucinate or ask for exact addresses/time slots. 
    2. QA OVERRIDE: If the user asks a specific question about solar, subsidy, or PM Surya Ghar Yojana, answer their question directly using the DATA above.
    3. NUMBERS: ALWAYS output numerals as standard digits (0, 1, 2, 3... 9). If you output 8989, DO NOT translate it into ८९८९. Keep it 8989.
    4. AFTER CLOSING: If the user asks a question AFTER they have provided their number, ONLY answer their question using DATA. Do NOT repeat the "Thank you, our team will contact you" closing statement again. Instead, ask "क्या आप और कुछ जानना चाहते हैं?"
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
    let content = data.choices[0].message.content;
    
    // JS-level hard override: Convert hallucinated Devanagari numerals to English numerals
    const devanagariToEnglish = {
        '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
        '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
    };
    content = content.replace(/[०-९]/g, match => devanagariToEnglish[match]);

    return content;
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
