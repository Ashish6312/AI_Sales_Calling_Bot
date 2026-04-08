const API_KEY = "sk_ySCrT4yagLqUn4HRZ1Fr2SpQQSlJqBTB";
const BASE_URL = "https://gen.pollinations.ai/v1/chat/completions";

export const sendMessageToAI = async (messages, language = 'hi', userInfo = null) => {
  const contextPrefix = userInfo ? `
    USER CONTEXT (ALREADY KNOWN - DO NOT ASK AGAIN):
    - Name: ${userInfo.name}
    - City: ${userInfo.city}
    - Monthly Bill: ₹${userInfo.bill}
  ` : "";

  const systemPrompt = `
    ### MASTER SALESPERSON PERSONA (SOLAR EXPERT):
    You are a high-performing Mierae Solar Sales Consultant. 
    Mission: Convert users by educating them on massive savings and PM Surya Ghar Yojana.

    ${contextPrefix}

    ### CORE UPDATED DATASET:
    - SUBSIDY: 1kW: ₹30k | 2kW: ₹60k | 3kW+: ₹78k.
    - ROI: 3–5 Years (25+ years life).
    - Bill Reduction: 80-90% savings.

    ### STRICT CONVERSATIONAL RULES:
    1. NEVER REPEAT YOURSELF. Look at the previous messages. If you just sent the "SCHEME ESTIMATE" or "Site Visit" pitch, DO NOT send it again.
    2. PROGRESS THE CONVERSATION. If the user answered a question, move on to the next one.
    3. If the user agrees to a site visit, just ask what day works best (Today, Tomorrow, Weekend).
    4. Keep responses extremely short. Tell them what they need to know, ask one question, and wait.
    5. Language: ${language === 'hi' ? 'Hindi (STRICT RULES: Use Devanagari script ONLY. Never use English letters for Hindi)' : language === 'te' ? 'Telugu' : 'Odia'}.
  `;

  // Filter messages to ensure they are properly formatted for the API and remove custom UI tags
  const apiMessages = messages.map(m => {
    let cleanContent = m.content;
    // Strip out the initial greeting if it's the very first message so the AI doesn't think it said it and loop
    if (m.id === 'init') {
      cleanContent = "[System generated greeting sent to user based on their form input]";
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
        temperature: 0.3, // Lowered temperature to reduce hallucination and random option generation
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
