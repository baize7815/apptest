
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const getEnv = (key: string): string => {
  const meta = import.meta as any;
  if (meta && meta.env && meta.env[`VITE_${key}`]) {
    return meta.env[`VITE_${key}`];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] || '';
  }
  return '';
};

/**
 * Force browser to download a file even if it's cross-origin
 */
export const downloadUrlAsFile = async (url: string, filename: string) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
  } catch (error) {
    console.error("Download failed:", error);
    // Fallback: Open in new tab if blob fetch fails
    window.open(url, '_blank');
  }
};
