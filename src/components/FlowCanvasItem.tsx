
import React, { useEffect, useRef } from 'react';
import { WorkflowStatus } from '../types';
import { downloadUrlAsFile } from '../services/utils';
import type { WorkItem } from '../types';

interface FlowCanvasItemProps {
  item: WorkItem;
  onRetry?: (id: string) => void;
  onRemove?: (id: string) => void;
  onPreview?: (url: string) => void;
}

export const FlowCanvasItem: React.FC<FlowCanvasItemProps> = ({ item, onRetry, onRemove, onPreview }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && item.status === WorkflowStatus.ANALYZING) {
      el.scrollTop = el.scrollHeight;
    }
  }, [item.originalPrompt, item.status]);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.generatedImageUrl) {
      await downloadUrlAsFile(item.generatedImageUrl, `refine-${item.file.name}`);
    }
  };

  const Arrow = ({ active, label }: { active: boolean, label: string }) => (
    <div className="flex flex-col items-center justify-center mx-2 w-16 md:w-24 shrink-0 transition-opacity duration-300">
      <div className={`text-[10px] uppercase font-bold mb-1 tracking-widest ${active ? 'text-indigo-400' : 'text-gray-600'}`}>
        {label}
      </div>
      <div className="relative w-full h-8 flex items-center">
        <div className="w-full h-0.5 bg-gray-700"></div>
        <div className={`absolute top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 w-full origin-left transition-transform duration-300 ${active ? 'scale-x-100 animate-pulse' : 'scale-x-0'}`}></div>
        <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 border-t-2 border-r-2 transform rotate-45 ${active ? 'border-purple-500' : 'border-gray-700'}`}></div>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-6 relative overflow-hidden group hover:bg-gray-800/60 transition-all shadow-xl animate-fade-in">
      <div className={`absolute top-0 left-0 w-1 h-full transition-colors duration-500
        ${item.status === WorkflowStatus.COMPLETED ? 'bg-green-500' : ''}
        ${item.status === WorkflowStatus.ERROR ? 'bg-red-500' : ''}
        ${item.status === WorkflowStatus.ANALYZING || item.status === WorkflowStatus.GENERATING ? 'bg-indigo-500 animate-pulse' : 'bg-gray-700'}
      `} />

      <div className="absolute top-2 right-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        {item.status === WorkflowStatus.ERROR && onRetry && (
          <button onClick={() => onRetry(item.id)} className="p-2 bg-blue-900/50 hover:bg-blue-600 text-blue-200 rounded-lg transition-colors text-xs font-bold">RETRY</button>
        )}
        {onRemove && (
           <button onClick={() => onRemove(item.id)} className="p-2 bg-gray-700 hover:bg-red-600 text-gray-300 hover:text-white rounded-lg transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        )}
      </div>

      <div className="flex flex-col xl:flex-row items-center justify-between gap-6 pl-4">
        <div className="flex flex-col gap-2 w-full xl:w-64 shrink-0">
          <div className="relative aspect-square rounded-xl overflow-hidden border border-gray-700 bg-gray-900 shadow-inner cursor-pointer" onClick={() => onPreview && onPreview(item.previewUrl)}>
            <img src={item.previewUrl} alt="Input" className="w-full h-full object-cover" />
          </div>
          <div className="text-[10px] text-gray-500 truncate text-center font-mono uppercase tracking-tighter">{item.file.name}</div>
        </div>

        <div className="hidden xl:block">
           <Arrow active={item.status !== WorkflowStatus.PENDING} label="Analysis" />
        </div>

        <div className="flex flex-col gap-2 w-full shrink min-w-0 self-stretch">
          <div ref={scrollRef} className={`flex-1 min-h-[120px] bg-black/30 border border-gray-700 rounded-xl p-4 font-mono text-sm overflow-y-auto custom-scrollbar relative transition-all duration-300 ${item.status === WorkflowStatus.ANALYZING ? 'border-indigo-500/50 shadow-[0_0_15px_rgba(79,70,229,0.1)]' : ''}`}>
            {item.originalPrompt ? (
               <div className="whitespace-pre-wrap text-gray-400 leading-relaxed text-xs">
                 {item.originalPrompt}
                 {item.status === WorkflowStatus.ANALYZING && <span className="inline-block w-2 h-4 bg-indigo-500 ml-1 animate-pulse align-middle"></span>}
               </div>
            ) : (
               <div className="flex items-center justify-center h-full text-gray-600 italic text-xs">
                 {item.status === WorkflowStatus.PENDING ? 'Waiting for analysis...' : 'No prompt generated.'}
               </div>
            )}
          </div>
        </div>

        <div className="hidden xl:block">
           <Arrow active={item.status === WorkflowStatus.GENERATING || item.status === WorkflowStatus.COMPLETED} label="Gen Node" />
        </div>

        <div className="flex flex-col gap-2 w-full xl:w-64 shrink-0">
          <div className={`relative aspect-square rounded-xl overflow-hidden border border-gray-700 bg-gray-900 shadow-inner flex items-center justify-center ${item.status === WorkflowStatus.GENERATING ? 'animate-pulse border-purple-500/50' : ''}`}>
             {item.generatedImageUrl ? (
                <div className="w-full h-full relative group/img">
                   <div className="w-full h-full cursor-pointer" onClick={() => onPreview && onPreview(item.generatedImageUrl!)}>
                     <img src={item.generatedImageUrl} className="w-full h-full object-cover" alt="Result" />
                   </div>
                   <div className="absolute top-2 right-2 opacity-0 group-hover/img:opacity-100 transition-opacity">
                      <button onClick={handleDownload} className="bg-gray-900/80 hover:bg-indigo-600 text-white p-2 rounded-lg backdrop-blur shadow-lg transition-colors border border-gray-700"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></button>
                   </div>
                </div>
             ) : (
                <div className="text-center p-4">
                   {item.status === WorkflowStatus.GENERATING ? (
                      <div className="flex flex-col items-center gap-2">
                         <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                         <span className="text-[10px] text-indigo-400 uppercase font-bold">Rendering...</span>
                      </div>
                   ) : <span className="text-[10px] text-gray-700 font-bold uppercase tracking-widest">Awaiting Output</span>}
                </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};
