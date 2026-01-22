import React, { useState } from 'react';
import ChatInterface from './components/ChatInterface';
import AdminPanel from './components/AdminPanel';
import { Lead } from './types';

const App: React.FC = () => {
  const [view, setView] = useState<'chat' | 'admin'>('chat');
  const [leads, setLeads] = useState<Lead[]>([]);

  const handleLeadCaptured = (newLead: Lead) => {
    setLeads(prev => [newLead, ...prev]);
  };

  if (view === 'admin') {
    return <AdminPanel leads={leads} onClose={() => setView('chat')} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4">
      <ChatInterface 
        onLeadCaptured={handleLeadCaptured}
        onAdminClick={() => setView('admin')}
      />
    </div>
  );
};

export default App;