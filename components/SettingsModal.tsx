
import React, { useState, useEffect } from 'react';
import type { AppSettings, ServiceConfig } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, currentSettings, onSave }) => {
  const [activeTab, setActiveTab] = useState<'analysis' | 'generation'>('analysis');
  const [formData, setFormData] = useState<AppSettings>(currentSettings);

  useEffect(() => { if (isOpen) setFormData(currentSettings); }, [isOpen, currentSettings]);

  if (!isOpen) return null;

  const handleChange = (section: 'analysisConfig' | 'generationConfig', field: keyof ServiceConfig, value: string) => {
    setFormData(prev => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
  };

  const currentSection = activeTab === 'analysis' ? 'analysisConfig' : 'generationConfig';
  const config = formData[currentSection];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">Node Configuration</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>

        <div className="flex bg-gray-800/50">
          <button onClick={() => setActiveTab('analysis')} className={`flex-1 py-3 text-sm font-medium border-b-2 transition-all ${activeTab === 'analysis' ? 'border-indigo-500 text-white bg-indigo-500/10' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>1. Vision Node</button>
          <button onClick={() => setActiveTab('generation')} className={`flex-1 py-3 text-sm font-medium border-b-2 transition-all ${activeTab === 'generation' ? 'border-indigo-500 text-white bg-indigo-500/10' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>2. Generation Node</button>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Provider Base URL</label>
            <input type="text" value={config.baseUrl || ''} onChange={e => handleChange(currentSection, 'baseUrl', e.target.value)} placeholder="https://api.siliconflow.cn/v1" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none transition-all placeholder:text-gray-600" />
            <p className="text-[10px] text-gray-600">Must include /v1. Supports OpenRouter, SiliconFlow, API2D, etc.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Model ID</label>
              <input type="text" value={config.model} onChange={e => handleChange(currentSection, 'model', e.target.value)} placeholder={activeTab === 'analysis' ? "gpt-4o-mini" : "flux.1-schnell"} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">API Key</label>
              <input type="password" value={config.apiKey} onChange={e => handleChange(currentSection, 'apiKey', e.target.value)} placeholder="sk-..." className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none font-mono" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Context / Instructions</label>
            <textarea value={config.systemInstruction || ''} onChange={e => handleChange(currentSection, 'systemInstruction', e.target.value)} rows={3} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none resize-none placeholder:text-gray-600" placeholder="Custom instructions for this node..." />
          </div>
        </div>

        <div className="p-6 border-t border-gray-800 flex justify-end gap-3 bg-gray-900/50">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Close</button>
          <button onClick={() => onSave(formData)} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-indigo-900/20 transition-all">Save Config</button>
        </div>
      </div>
    </div>
  );
};
