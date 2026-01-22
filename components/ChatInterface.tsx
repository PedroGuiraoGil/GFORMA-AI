import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, ChatState, Sender, Lead } from '../types';
import { searchTeachers } from '../data/db';
import { generateSyllabus, deduceSector, analyzeChallenge } from '../services/geminiService';

interface ChatInterfaceProps {
  onLeadCaptured: (lead: Lead) => void;
  onAdminClick: () => void;
}

const INITIAL_STATE: ChatState = {
  step: 'INIT',
  companyName: '',
  sector: '',
  department: '',
  challenge: '',
  generatedSyllabus: ''
};

const ChatInterface: React.FC<ChatInterfaceProps> = ({ onLeadCaptured, onAdminClick }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  
  const [chatState, setChatState] = useState<ChatState>(INITIAL_STATE);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, loadingAction]);

  // Initial Greeting
  useEffect(() => {
    if (chatState.step === 'INIT' && messages.length === 0) {
      const initialMsg: ChatMessage = {
        id: 'init',
        sender: Sender.BOT,
        text: 'Bienvenido a GForma. Soy tu consultor de formación inteligente.',
        type: 'options',
        options: ['Ver ejemplo de funcionamiento']
      };
      setMessages([initialMsg]);
    }
  }, []); 

  const handleRestart = () => {
    setChatState(INITIAL_STATE);
    setMessages([{
      id: Date.now().toString(),
      sender: Sender.BOT,
      text: 'Sesión reiniciada. Bienvenido de nuevo a GForma. ¿Cuál es el nombre de tu empresa?'
    }]);
    setChatState(prev => ({ ...prev, step: 'COMPANY_NAME' }));
  };

  const handleOptionClick = (option: string) => {
    if (option === 'Ver ejemplo de funcionamiento') {
      const exampleMsg: ChatMessage = { id: Date.now().toString(), sender: Sender.USER, text: "Ver ejemplo" };
      setMessages(prev => [...prev, exampleMsg]);
      
      setTimeout(() => {
        addBotMessage("Ejemplo: Una empresa 'TechSolutions' del sector 'Tecnología' necesita formación en 'Ventas B2B' para su equipo comercial. Nosotros generamos el temario y asignamos el formador.\n\n¡Empecemos! ¿Cuál es el nombre de tu empresa?");
        setChatState(prev => ({ ...prev, step: 'COMPANY_NAME' }));
      }, 600);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userText = input;
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: Sender.USER,
      text: userText
    };

    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setIsTyping(true);

    // Flow Logic
    setTimeout(() => processChatFlow(userText), 800);
  };

  const processChatFlow = async (userText: string) => {
    setIsTyping(false);

    switch (chatState.step) {
      case 'INIT':
        // If user types instead of clicking option
        setChatState(prev => ({ ...prev, companyName: userText, step: 'SECTOR_CONFIRM' }));
        await processSectorPrediction(userText);
        break;

      case 'COMPANY_NAME':
        setChatState(prev => ({ ...prev, companyName: userText, step: 'SECTOR_CONFIRM' }));
        await processSectorPrediction(userText);
        break;

      case 'SECTOR_CONFIRM':
        const lower = userText.toLowerCase();
        if (lower.includes('sí') || lower.includes('si') || lower.includes('correcto') || lower.includes('ok')) {
          setChatState(prev => ({ ...prev, step: 'DEP_CHALLENGE' }));
          addBotMessage(`Perfecto. ¿Para qué departamento o colectivo es la formación y cuál es el reto principal que queréis resolver?`);
        } else {
          setChatState(prev => ({ ...prev, step: 'SECTOR_MANUAL' }));
          addBotMessage("Disculpa. ¿Podrías indicarme a qué sector pertenece vuestra actividad?");
        }
        break;
      
      case 'SECTOR_MANUAL':
        setChatState(prev => ({ ...prev, sector: userText, step: 'DEP_CHALLENGE' }));
        addBotMessage(`Entendido, sector ${userText}. ¿Para qué departamento es la formación y cuál es el reto específico?`);
        break;

      case 'DEP_CHALLENGE':
        await processChallenge(userText);
        break;

      case 'CONTACT_INFO':
        await processContact(userText);
        break;
        
      default:
        break;
    }
  };

  // --- Logic Helpers ---

  const processSectorPrediction = async (company: string) => {
    setIsTyping(true);
    const predictedSector = await deduceSector(company);
    setIsTyping(false);

    if (predictedSector) {
      setChatState(prev => ({ ...prev, companyName: company, sector: predictedSector, step: 'SECTOR_CONFIRM' }));
      addBotMessage(`He identificado que ${company} pertenece al sector ${predictedSector}, ¿es correcto?`);
    } else {
      setChatState(prev => ({ ...prev, companyName: company, step: 'SECTOR_MANUAL' }));
      addBotMessage(`Gracias. ¿A qué sector pertenece ${company}?`);
    }
  };

  const processChallenge = async (userText: string) => {
    setIsTyping(true);
    const analysis = await analyzeChallenge(userText);
    setIsTyping(false);

    if (analysis.isVague) {
      addBotMessage("Entiendo que buscáis formación, pero necesito ser un poco más preciso para ayudarte. ¿Podrías detallar un poco más el reto? (Ej: 'El equipo de ventas necesita cerrar más acuerdos')");
      return; // Stay in same step
    }

    const department = analysis.department || "Equipo General";
    const challenge = analysis.challenge || userText;

    // Search Teacher (DB lookup)
    const matchedTeacher = searchTeachers(challenge); // Search by challenge/specialty

    setChatState(prev => ({ 
      ...prev, 
      department, 
      challenge, 
      step: 'SYLLABUS_OFFER' 
    }));

    const responseMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: Sender.BOT,
      text: matchedTeacher 
        ? `He registrado el reto para el dpto. de ${department}.\nTenemos especialistas disponibles (ID ${matchedTeacher.id}).\n\n¿Quieres que prepare una propuesta de contenidos?`
        : `He registrado el reto: "${challenge}" para ${department}.\nAunque no tengo un formador exacto para esto ahora mismo, puedo diseñarte el temario.`,
      matchedTeacherId: matchedTeacher?.id, // Only set if found, otherwise empty
      type: 'syllabus-action'
    };
    setMessages(prev => [...prev, responseMsg]);
  };

  const handleGenerateSyllabus = async () => {
    setLoadingAction(true);
    const syllabus = await generateSyllabus(
      chatState.companyName, 
      chatState.sector, 
      chatState.department, 
      chatState.challenge
    );
    setLoadingAction(false);
    
    setChatState(prev => ({ ...prev, generatedSyllabus: syllabus, step: 'CONTACT_INFO' }));

    const syllabusMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: Sender.BOT,
      text: "Propuesta de Temario GForma:",
      syllabusContent: syllabus,
      type: 'text'
    };
    setMessages(prev => [...prev, syllabusMsg]);

    setTimeout(() => {
        addBotMessage("Para finalizar y guardar esta propuesta, por favor facilita: Nombre, Email y Teléfono.");
    }, 800);
  };

  const processContact = async (userText: string) => {
    // Basic Validation logic
    const hasEmail = userText.includes('@');
    const hasPhone = /\d{6,}/.test(userText);
    
    if (!hasEmail && !hasPhone) {
      addBotMessage("Por favor, necesito al menos un email o teléfono válido para poder enviarte la información.");
      return;
    }

    // Capture Data
    const lines = userText.split(/,|;|\n/);
    const contactName = lines[0] || "No name";
    const contactEmail = lines.find(s => s.includes('@')) || "No email";
    const contactPhone = lines.find(s => /\d{6,}/.test(s)) || "No phone";

    const newLead: Lead = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      companyName: chatState.companyName,
      sector: chatState.sector,
      department: chatState.department,
      challenge: chatState.challenge,
      syllabus: chatState.generatedSyllabus,
      contactName: contactName.trim(),
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim()
    };

    onLeadCaptured(newLead);
    setChatState(prev => ({ ...prev, step: 'COMPLETED' }));
    
    const finalMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: Sender.BOT,
      text: "¡Registro completado! Hemos guardado tu solicitud en GForma. Recibirás noticias pronto.",
      type: 'restart-action'
    };
    setMessages(prev => [...prev, finalMsg]);
  };

  const addBotMessage = (text: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      sender: Sender.BOT,
      text
    }]);
  };

  return (
    <div className="flex flex-col h-[700px] w-full max-w-3xl bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200 relative">
      {/* Header Corporativo */}
      <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center font-bold text-lg">G</div>
          <div>
            <h2 className="font-bold text-lg tracking-wide">GForma</h2>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Corporate Training AI</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRestart}
            className="text-xs text-slate-300 hover:text-white transition-colors flex items-center gap-1"
            title="Reiniciar Sesión"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            RESTART
          </button>
          <div className="h-4 w-px bg-slate-700"></div>
          <button 
            onClick={onAdminClick}
            className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded border border-slate-700 transition-colors"
          >
            Admin Access
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 scrollbar-hide">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex flex-col ${msg.sender === Sender.USER ? 'items-end' : 'items-start'}`}
          >
            <div 
              className={`max-w-[85%] px-5 py-4 rounded-xl shadow-sm text-sm leading-relaxed ${
                msg.sender === Sender.USER 
                  ? 'bg-blue-900 text-white rounded-br-none' 
                  : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
              }`}
            >
              {msg.text.split('\n').map((line, i) => (
                <p key={i} className={i > 0 ? 'mt-2' : ''}>{line}</p>
              ))}
              
              {msg.matchedTeacherId && (
                <div className="mt-4 p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs flex items-center gap-2">
                   <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                   <span className="font-semibold">Match Encontrado:</span> Formador ID {msg.matchedTeacherId}
                </div>
              )}

              {msg.syllabusContent && (
                <div className="mt-4 bg-slate-50 p-4 rounded border-l-4 border-blue-900 text-slate-700 shadow-sm">
                  <pre className="whitespace-pre-wrap font-sans text-sm">{msg.syllabusContent}</pre>
                </div>
              )}
            </div>
            
            {msg.type === 'options' && msg.options && (
              <div className="mt-3 flex gap-2">
                {msg.options.map(opt => (
                  <button
                    key={opt}
                    onClick={() => handleOptionClick(opt)}
                    className="bg-white border border-blue-200 text-blue-900 px-4 py-2 rounded-full text-sm hover:bg-blue-50 transition-colors shadow-sm"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {msg.type === 'syllabus-action' && chatState.step === 'SYLLABUS_OFFER' && (
              <button
                onClick={handleGenerateSyllabus}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded shadow-md transition-all flex items-center gap-2 text-sm font-semibold"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
                Generar Temario a Medida
              </button>
            )}

            {msg.type === 'restart-action' && (
               <button
                 onClick={handleRestart}
                 className="mt-4 bg-slate-800 text-white px-6 py-3 rounded shadow hover:bg-slate-900 transition-colors text-sm"
               >
                 Iniciar Nuevo Registro
               </button>
            )}
          </div>
        ))}
        
        {/* Loading Indicators */}
        {(isTyping || loadingAction) && (
          <div className="flex items-start">
             <div className="bg-white px-4 py-3 rounded-xl rounded-bl-none border border-slate-200 shadow-sm flex items-center space-x-1">
                <span className="text-xs text-slate-400 font-medium mr-2">GForma está pensando</span>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></div>
             </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-5 bg-white border-t border-slate-200 shrink-0">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
          className="flex gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loadingAction || chatState.step === 'COMPLETED'}
            placeholder={chatState.step === 'COMPLETED' ? "Registro completado. Pulsa Restart." : "Escribe aquí..."}
            className="flex-1 border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent transition-all disabled:bg-slate-50 disabled:text-slate-400 placeholder-slate-400 text-slate-700"
          />
          <button
            type="submit"
            disabled={!input.trim() || loadingAction || chatState.step === 'COMPLETED'}
            className="bg-blue-900 text-white rounded-lg px-6 py-3 hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
          >
            ENVIAR
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;