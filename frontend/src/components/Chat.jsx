import React, { useState, useEffect, useRef } from 'react';
import { sendMessageToAI, analyzeBill } from '../services/ai';
import { TRANSLATIONS } from '../constants/translations';

const API_BASE = "http://127.0.0.1:8000/api";

const Icons = {
  Sun: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
    </svg>
  ),
  Send: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>
    </svg>
  ),
  Bot: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <rect width="18" height="10" x="3" y="11" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" x2="8" y1="16" y2="16"/><line x1="16" x2="16" y1="16" y2="16"/>
    </svg>
  ),
  User: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Attach: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>,
};

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState('hi');
  const [onboarded, setOnboarded] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [leadId, setLeadId] = useState(null);
  const sessionId = useRef(`session_${Date.now()}`).current;
  const scrollRef = useRef(null);

  const t = TRANSLATIONS[language];

  const renderText = (text) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ color: 'var(--accent)', fontWeight: '800' }}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const handleOnboarding = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    setUserInfo(data);
    setOnboarded(true);

    try {
      const res = await fetch(`${API_BASE}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const resData = await res.json();
      if (resData.id) setLeadId(resData.id);
    } catch (e) {}

    const initialText = language === 'hi' 
      ? `नमस्ते **${data.name}**! 
मुझे खुशी है कि आप **${data.city}** से हैं। 
आपका **₹${data.bill}** का बिजली बिल अब कम होने वाला है! ☀️` 
      : language === 'te'
      ? `నమస్కారం **${data.name}**! మీ బిల్లు **₹${data.bill}** తగ్గించడానికి మేము సిద్ధంగా ఉన్నాము.`
      : `Namaste **${data.name}**! Let's slash your **₹${data.bill}** bill.`;

    const botMsg = { role: 'assistant', content: initialText, id: 'init' };
    setMessages([botMsg]);
    saveToDB('assistant', initialText);
  };

  const saveToDB = async (role, content) => {
    try {
      await fetch(`${API_BASE}/chat-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, role, content })
      });
    } catch (e) {}
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: "Uploading bill for analysis...", type: 'image' }]);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result.split(',')[1];
      const data = await analyzeBill(base64);
      
      if (data && data.amount) {
        const ocrMsg = `${t.billAnalysis.analyzed}:
- ${t.billAnalysis.name}: ${data.name || 'Not found'}
- ${t.billAnalysis.bill}: ${data.amount}
- ${t.billAnalysis.city}: ${data.city || 'Not found'}

${t.billAnalysis.success}`;
        
        setMessages(prev => [...prev, { role: 'assistant', content: ocrMsg }]);
        await saveToDB('user', "Sent electricity bill image");
        await saveToDB('assistant', ocrMsg);
      } else {
        const failMsg = t.billAnalysis.fail;
        setMessages(prev => [...prev, { role: 'assistant', content: failMsg }]);
        await saveToDB('assistant', failMsg);
      }
      setIsLoading(false);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async (val = input) => {
    const text = typeof val === 'string' ? val : input;
    if (!text.trim() || isLoading) return;

    if (leadId) {
      const nums = text.replace(/[^0-9]/g, '');
      if (nums.length >= 10 && nums.length <= 15) {
        try {
          await fetch(`${API_BASE}/leads/${leadId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: nums })
          });
        } catch (e) {}
      }
    }

    const userMsg = { role: 'user', content: text, id: Date.now() + '_user' };
    setMessages(p => [...p, userMsg]);
    saveToDB('user', text);
    setInput('');
    setIsLoading(true);

    try {
      const response = await sendMessageToAI([...messages, userMsg], language, userInfo);
      let botMsg = { role: 'assistant', content: response, id: Date.now() + '_bot' };
      
      const entireLower = response.toLowerCase();
      
      if (entireLower.includes('छत') || entireLower.includes('roof') || entireLower.includes('पाईକ')) {
        if (entireLower.includes('?') || entireLower.includes('जगह') || entireLower.includes('space')) {
          botMsg.options = language === 'hi' ? ['हाँ, खाली छत है', 'नहीं, जगह कम है'] : 
                           language === 'te' ? ['అవును, ఖాళీ ఉంది', 'లేదు, స్థలం లేదు'] :
                           ['ହଁ, ଖାଲି ଅଛି', 'ନା, ସ୍ଥାନ ନାହିଁ'];
        }
      } else if (entireLower.includes('मालिक') || entireLower.includes('own') || entireLower.includes('इल्ल') || entireLower.includes('खुद का घर') || entireLower.includes('अपना घर')) {
         botMsg.options = language === 'hi' ? ['हाँ, मेरा घर है', 'नहीं, किराए पर'] : 
                         language === 'te' ? ['అవును, నా సొంత ఇల్లు', 'కాదు, అద్దెకు'] :
                         ['ହଁ, ମୋର ନିଜ ଘର', 'ନା, ଭଡା'];
      } else if (entireLower.includes('?') && (entireLower.includes('रुचि') || entireLower.includes('interested') || entireLower.includes('visit') || entireLower.includes('विजिट') || entireLower.includes('बुक'))) {
        botMsg.options = [t.yes, t.no];
      }

      if (response.includes('₹78,000') || (response.includes('subsidy') && response.includes('40%'))) {
        botMsg.type = 'subsidy';
      }

      setMessages(p => [...p, botMsg]);
      saveToDB('assistant', response);
    } catch (e) {
      setMessages(p => [...p, { role: 'assistant', content: "Something went wrong." }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!onboarded) {
    return (
      <div className="app-container">
        <div className="chat-panel" style={{ padding: '40px', justifyContent: 'center', textAlign: 'center' }}>
          <div className="logo-inner" style={{ margin: '0 auto 24px auto', width: '60px', height: '60px' }}>
            <Icons.Sun />
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '12px' }}>Mierae Solar</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '14px', marginBottom: '32px' }}>Start your journey to zero electricity bills.</p>
          
          <form onSubmit={handleOnboarding} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="lang-switcher" style={{ margin: '0 auto 20px auto' }}>
              {['hi', 'te', 'or'].map(l => (
                <button key={l} type="button" onClick={() => setLanguage(l)} className={`lang-btn ${language === l ? 'active' : ''}`}>{l}</button>
              ))}
            </div>
            <input required name="name" placeholder={t.name} className="form-input" />
            <div style={{ display: 'flex', gap: '12px' }}>
              <input required name="city" placeholder={t.city} className="form-input" style={{ flex: 1 }} />
              <input required name="bill" placeholder={t.bill} className="form-input" style={{ flex: 1 }} />
            </div>
            <button type="submit" className="submit-btn" style={{ padding: '16px', marginTop: '12px' }}>START CONVERSATION</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="chat-panel">
        <header className="header">
          <div className="logo">
            <div className="logo-inner"><Icons.Sun /></div>
            <div className="brand">Mierae<span style={{ color: '#f97316' }}>Solar</span></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="lang-switcher">
              {['hi', 'te', 'or'].map(l => (
                <button key={l} onClick={() => setLanguage(l)} className={`lang-btn ${language === l ? 'active' : ''}`}>{l}</button>
              ))}
            </div>
            <div className="online-indicator">
              <span className="dot"></span>
              <span className="status-text">AI ACTIVE</span>
            </div>
          </div>
        </header>

        <div ref={scrollRef} className="messages no-scrollbar">
          {messages.map((m, i) => (
            <div key={m.id || i} className={`message ${m.role === 'user' ? 'user' : 'bot'}`}>
              <div className="avatar">
                {m.role === 'user' ? <Icons.User /> : <Icons.Bot />}
              </div>
              <div className="bubble-group" style={{ width: (m.options || m.type === 'subsidy') ? '100%' : 'auto' }}>
                <div className="bubble">
                  {m.content.split('\n').map((line, li) => {
                    const trimmed = line.trim();
                    if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
                      return <li key={li} style={{ listStyleType: 'none', paddingLeft: '12px', position: 'relative', marginBottom: '4px' }}>
                        <span style={{ position: 'absolute', left: 0 }}>•</span>
                        {renderText(trimmed.substring(1).trim())}
                      </li>;
                    }
                    return line ? <div key={li} style={{ marginBottom: '8px' }}>{renderText(line)}</div> : <br key={li} />;
                  })}
                </div>
                
                {m.options && !isLoading && i === messages.length - 1 && (
                  <div className="poll-container">
                    {m.options.map((opt, idx) => (
                      <button key={idx} className="poll-option" onClick={() => handleSend(opt)}>
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {m.type === 'subsidy' && (
                  <div className="subsidy-card-3d">
                    <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--accent)', letterSpacing: '2px', marginBottom: '8px' }}>SCHEME ESTIMATE</div>
                    <div style={{ fontSize: '32px', fontWeight: '900' }}>₹78,000</div>
                    <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '8px' }}>PM Surya Ghar Yojana • Govt Subsidy</div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="bot message">
              <div className="avatar"><Icons.Bot /></div>
              <div className="bubble" style={{ background: 'rgba(255,255,255,0.03)', border: 'none' }}>
                <div className="typing-loader"><span></span><span></span><span></span></div>
              </div>
            </div>
          )}
        </div>

        <div className="footer">
          <div className="input-box">
            <label className="attach-btn" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', color: 'var(--text-dim)' }}>
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
              <Icons.Attach />
            </label>
            <input 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={t.placeholder} 
            />
            <button onClick={() => handleSend()} className="send-btn" disabled={!input.trim() || isLoading}>
              <Icons.Send />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
