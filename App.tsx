
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateId, delay, downloadUrlAsFile } from './services/utils';
import { describeImage, generateVariation } from './services/apiService';
import { UploadZone } from './components/UploadZone';
import { FlowCanvasItem } from './components/FlowCanvasItem';
import { SettingsModal } from './components/SettingsModal';
import { DebugConsole } from './components/DebugConsole';
import { ImagePreviewModal } from './components/ImagePreviewModal';
import { WorkflowStatus } from './types';
import type { WorkItem, ProcessingStats, AppSettings, SystemLog } from './types';

const DEFAULT_SETTINGS: AppSettings = {
  analysisConfig: {
    apiKey: '',
    baseUrl: '', 
    model: '', 
    systemInstruction: 'Describe this image in detail to create a stable diffusion prompt. Focus on artistic style, composition, and subjects.',
  },
  generationConfig: {
    apiKey: '',
    baseUrl: '', 
    model: '',
    aspectRatio: '1024x1024',
    systemInstruction: '',
  }
};

const App: React.FC = () => {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('app_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const isProcessingRef = useRef(false);
  const itemsRef = useRef<WorkItem[]>([]);
  const settingsRef = useRef<AppSettings>(settings);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    settingsRef.current = settings;
    localStorage.setItem('app_settings', JSON.stringify(settings));
  }, [settings]);

  const addLog = useCallback((type: SystemLog['type'], message: string, details?: any) => {
    const newLog: SystemLog = {
      id: generateId(),
      timestamp: new Date(),
      type,
      message,
      details
    };
    setLogs(prev => [...prev, newLog]);
  }, []);

  const handleFilesSelected = useCallback((files: File[]) => {
    const newItems: WorkItem[] = files.map((file) => ({
      id: generateId(),
      file,
      previewUrl: URL.createObjectURL(file),
      status: WorkflowStatus.PENDING,
      progressLog: ['Queued...'],
    }));
    setItems((prev) => [...prev, ...newItems]);
    addLog('info', `Added ${files.length} images.`);
  }, [addLog]);

  const updateItem = (id: string, updates: Partial<WorkItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const handleBatchDownload = async () => {
    const completedItems = items.filter(i => i.status === WorkflowStatus.COMPLETED && i.generatedImageUrl);
    if (completedItems.length === 0) return;
    
    setIsDownloading(true);
    addLog('info', `Starting batch download for ${completedItems.length} items...`);
    
    for (const item of completedItems) {
      if (item.generatedImageUrl) {
        await downloadUrlAsFile(item.generatedImageUrl, `processed-${item.file.name}`);
        // Small delay to prevent browser download queue issues
        await delay(300);
      }
    }
    
    setIsDownloading(false);
    addLog('success', 'Batch download complete.');
  };

  const handleRetryItem = (id: string) => {
    updateItem(id, { 
      status: WorkflowStatus.PENDING, 
      error: undefined,
      generatedImageUrl: undefined,
      originalPrompt: undefined,
      progressLog: ['Retrying...']
    });
  };

  const processQueue = async () => {
    if (isProcessingRef.current) return;
    
    const conf = settingsRef.current;
    if (!conf.analysisConfig.apiKey || !conf.analysisConfig.baseUrl || !conf.generationConfig.apiKey || !conf.generationConfig.baseUrl) {
      addLog('error', 'Configuration missing! Set Base URLs & Keys.');
      setShowSettings(true);
      return;
    }

    isProcessingRef.current = true;
    setIsProcessing(true);

    try {
      let currentIndex = itemsRef.current.findIndex(i => i.status === WorkflowStatus.PENDING);

      while (currentIndex !== -1 && isProcessingRef.current) {
        const item = itemsRef.current[currentIndex];
        
        try {
          updateItem(item.id, { status: WorkflowStatus.ANALYZING, originalPrompt: '' });
          const prompt = await describeImage(
            item.file, 
            conf.analysisConfig,
            (text) => updateItem(item.id, { originalPrompt: text })
          );
          
          updateItem(item.id, { status: WorkflowStatus.GENERATING, originalPrompt: prompt });
          const resultUrl = await generateVariation(item.file, prompt, conf.generationConfig);
          
          updateItem(item.id, {
            status: WorkflowStatus.COMPLETED,
            generatedImageUrl: resultUrl,
          });

        } catch (error: any) {
          updateItem(item.id, { status: WorkflowStatus.ERROR, error: error.message });
          addLog('error', `Failed ${item.file.name}: ${error.message}`);
        }

        await delay(300);
        currentIndex = itemsRef.current.findIndex(i => i.status === WorkflowStatus.PENDING);
      }
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  };

  const stats: ProcessingStats = items.reduce(
    (acc, item) => {
      acc.total++;
      if (item.status === WorkflowStatus.COMPLETED) acc.completed++;
      if (item.status === WorkflowStatus.ERROR) acc.failed++;
      if (item.status === WorkflowStatus.PENDING) acc.pending++;
      return acc;
    },
    { total: 0, completed: 0, failed: 0, pending: 0 }
  );

  return (
    <div className="flex flex-col h-full bg-[#0d1117] text-gray-200 font-sans relative">
      <div className="absolute inset-0 z-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #4f46e5 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

      <ImagePreviewModal isOpen={!!previewImage} imageUrl={previewImage} onClose={() => setPreviewImage(null)} />
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)}
        currentSettings={settings}
        onSave={(s) => { setSettings(s); setShowSettings(false); }}
      />
      <DebugConsole isOpen={showDebug} onClose={() => setShowDebug(false)} logs={logs} onClear={() => setLogs([])} />

      <header className="flex-none p-4 border-b border-gray-800 bg-[#0d1117]/90 backdrop-blur z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 text-indigo-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            <h1 className="text-xl font-bold tracking-tight text-white">Universal Flow</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-gray-800 rounded-lg border border-gray-700 text-gray-400 hover:text-white transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m10 0a2 2 0 100-4m0 4a2 2 0 110-4" /></svg></button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 z-10">
        <div className="max-w-7xl mx-auto">
          {items.length === 0 ? (
            <div className="mt-20"><UploadZone onFilesSelected={handleFilesSelected} /></div>
          ) : (
            <div className="flex flex-col gap-6 pb-20">
              {items.map(item => (
                <FlowCanvasItem 
                  key={item.id} 
                  item={item} 
                  onRetry={handleRetryItem} 
                  onRemove={(id) => setItems(prev => prev.filter(i => i.id !== id))}
                  onPreview={setPreviewImage} 
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {items.length > 0 && (
        <footer className="p-4 bg-gray-900 border-t border-gray-800 sticky bottom-0 z-20">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="text-xs text-gray-500 font-mono">
                DONE: <span className="text-green-400">{stats.completed}</span> / {stats.total}
              </div>
              {stats.completed > 0 && (
                <button 
                  onClick={handleBatchDownload}
                  disabled={isDownloading}
                  className="flex items-center gap-2 text-xs bg-indigo-900/30 text-indigo-300 px-3 py-1.5 rounded border border-indigo-500/30 hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-50"
                >
                  {isDownloading ? (
                    <div className="w-3 h-3 border-2 border-indigo-300 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  )}
                  {isDownloading ? 'Downloading...' : 'Download All'}
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDebug(!showDebug)} className="px-4 py-2 text-xs text-gray-400 border border-gray-700 rounded-lg hover:text-white transition-colors">Logs</button>
              {!isProcessing ? (
                <button onClick={processQueue} disabled={stats.pending === 0} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-2 rounded-lg font-bold disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-indigo-900/20">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg>
                  START
                </button>
              ) : (
                <button onClick={() => { isProcessingRef.current = false; setIsProcessing(false); }} className="bg-red-600 hover:bg-red-500 text-white px-8 py-2 rounded-lg font-bold shadow-lg shadow-red-900/20">STOP</button>
              )}
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default App;
