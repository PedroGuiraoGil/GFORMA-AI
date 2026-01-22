import React, { useState } from 'react';
import { Lead } from '../types';

interface AdminPanelProps {
  leads: Lead[];
  onClose: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ leads, onClose }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'GForma2026') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Contraseña incorrecta');
    }
  };

  const downloadCSV = () => {
    const headers = [
      "ID", "Fecha", "Empresa", "Sector", "Departamento", "Reto/Necesidad", "Temario", "Nombre", "Email", "Teléfono"
    ];
    
    const rows = leads.map(lead => [
      lead.id,
      lead.date,
      `"${lead.companyName}"`,
      `"${lead.sector}"`,
      `"${lead.department}"`,
      `"${lead.challenge}"`,
      `"${lead.syllabus.replace(/\n/g, ' | ')}"`,
      `"${lead.contactName}"`,
      lead.contactEmail,
      lead.contactPhone
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `gforma_leads_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Acceso GForma Admin</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-900 focus:outline-none"
                placeholder="Ingrese contraseña..."
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={onClose}
                className="flex-1 bg-slate-200 text-slate-700 py-2 rounded-lg hover:bg-slate-300 font-medium"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="flex-1 bg-blue-900 text-white py-2 rounded-lg hover:bg-blue-800 font-medium"
              >
                Entrar
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">GForma Leads</h1>
            <p className="text-slate-500">Panel de Administración Corporativo</p>
          </div>
          <div className="space-x-4 flex">
            <button 
              onClick={downloadCSV}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Exportar CSV
            </button>
            <button 
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Empresa / Sector</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Reto y Dept.</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Temario</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Contacto</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                      No hay datos registrados en esta sesión.
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {new Date(lead.date).toLocaleDateString()} <br/>
                        <span className="text-xs">{new Date(lead.date).toLocaleTimeString()}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        {lead.companyName}
                        <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {lead.sector}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 max-w-xs">
                        <div className="font-semibold text-slate-800 mb-1">{lead.department}</div>
                        <div className="text-slate-600 truncate" title={lead.challenge}>
                          {lead.challenge}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <div className="max-h-24 overflow-y-auto whitespace-pre-wrap text-xs bg-slate-50 p-2 rounded border border-slate-200">
                          {lead.syllabus}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                        <div className="font-medium">{lead.contactName}</div>
                        <a href={`mailto:${lead.contactEmail}`} className="text-blue-600 hover:underline text-xs block">{lead.contactEmail}</a>
                        <div className="text-slate-500 text-xs">{lead.contactPhone}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;