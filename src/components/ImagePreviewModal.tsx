
import React, { useEffect } from 'react';
import { downloadUrlAsFile } from '../services/utils';

interface ImagePreviewModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  onClose: () => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  isOpen,
  imageUrl,
  onClose,
}) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen || !imageUrl) return null;

  const handleDownload = async () => {
    if (imageUrl) {
      await downloadUrlAsFile(imageUrl, `preview-${Date.now()}.png`);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div className="absolute top-4 right-4 z-[70]">
        <button
          onClick={onClose}
          className="p-2 bg-gray-800 text-gray-400 hover:text-white rounded-full transition-colors hover:bg-gray-700"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div 
        className="relative max-w-[95vw] max-h-[95vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt="Preview"
          className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl border border-white/5"
        />
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4">
             <button 
                onClick={handleDownload}
                className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold shadow-2xl shadow-indigo-500/20 transition-all hover:scale-105"
             >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                SAVE TO LOCAL
             </button>
        </div>
      </div>
    </div>
  );
};
