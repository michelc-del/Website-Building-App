import React, { useEffect, useRef } from 'react';
import { DeviceMode } from '../types';
import { Bold, Italic, Underline, Heading1, Heading2, Heading3, Undo, Redo, MousePointerClick } from 'lucide-react';

interface PreviewFrameProps {
  html: string;
  deviceMode: DeviceMode;
  isEditing: boolean;
  onHtmlChange: (html: string) => void;
}

export const PreviewFrame: React.FC<PreviewFrameProps> = ({ html, deviceMode, isEditing, onHtmlChange }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getContainerWidth = () => {
    switch (deviceMode) {
      case 'mobile': return '375px'; // iPhone SE / generic mobile width
      case 'tablet': return '768px'; // iPad Portrait
      case 'desktop': return '100%';
      default: return '100%';
    }
  };

  // Initial render of HTML
  useEffect(() => {
    const iframe = iframeRef.current;
    if (iframe) {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(html);
        
        // Inject styles for edit mode
        doc.write(`
          <style>
            .gemini-edit-mode-active *:hover {
              outline: 2px dashed #3b82f6;
              cursor: text;
            }
            .gemini-edit-mode-active [contenteditable]:focus {
              outline: 2px solid #2563eb;
              background-color: rgba(59, 130, 246, 0.05);
            }
            /* Disable link clicks in edit mode */
            .gemini-edit-mode-active a {
              pointer-events: none;
            }
          </style>
          <script>
            window.setGeminiEditMode = (active) => {
               if (active) {
                 document.body.classList.add('gemini-edit-mode-active');
                 document.body.contentEditable = "true";
               } else {
                 document.body.classList.remove('gemini-edit-mode-active');
                 document.body.contentEditable = "false";
               }
            }
          </script>
        `);
        doc.close();

        if (isEditing && iframe.contentWindow) {
             (iframe.contentWindow as any).setGeminiEditMode(true);
        }
      }
    }
  }, [html]);

  // Handle Edit Mode Toggling
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;

    const win = iframe.contentWindow as any;

    if (isEditing) {
      if (win.setGeminiEditMode) win.setGeminiEditMode(true);
    } else {
      if (win.setGeminiEditMode) {
        win.setGeminiEditMode(false);
        const doc = iframe.contentDocument;
        if (doc) {
            const clone = doc.documentElement.cloneNode(true) as HTMLElement;
            // Cleanup injected scripts/styles
            const scripts = clone.querySelectorAll('script');
            scripts.forEach(s => {
                if (s.innerText.includes('setGeminiEditMode')) s.remove();
            });
            const styles = clone.querySelectorAll('style');
            styles.forEach(s => {
                if (s.innerText.includes('gemini-edit-mode-active')) s.remove();
            });
            const body = clone.querySelector('body');
            if(body) {
                body.classList.remove('gemini-edit-mode-active');
                body.removeAttribute('contenteditable');
            }

            onHtmlChange(clone.outerHTML);
        }
      }
    }
  }, [isEditing]);

  // Execute formatting commands in the iframe
  const execCmd = (command: string, value: string | undefined = undefined) => {
    const iframe = iframeRef.current;
    if (iframe?.contentDocument) {
      iframe.contentDocument.execCommand(command, false, value);
      iframe.contentWindow?.focus();
    }
  };

  return (
    <div className="flex-1 bg-slate-900/50 flex justify-center items-start overflow-hidden relative h-full w-full p-4">
      <div 
        ref={containerRef}
        className="transition-all duration-300 ease-in-out bg-white shadow-2xl h-full relative"
        style={{ 
          width: getContainerWidth(),
          border: deviceMode !== 'desktop' ? '12px solid #334155' : 'none',
          borderRadius: deviceMode !== 'desktop' ? '24px' : '0',
          overflow: 'hidden'
        }}
      >
        <iframe
          ref={iframeRef}
          title="Website Preview"
          className="w-full h-full bg-white"
          sandbox="allow-scripts allow-same-origin allow-forms"
          style={{ border: 'none' }}
        />
        
        {/* Visual Overlay for Editing State */}
        {isEditing && (
          <div className="absolute top-4 right-4 bg-blue-600 text-white text-xs px-3 py-1 rounded-full shadow-lg pointer-events-none opacity-90 font-medium z-50 flex items-center gap-1">
            <MousePointerClick className="w-3 h-3" />
            Editing Mode
          </div>
        )}

        {/* Formatting Toolbar - Only visible in Edit Mode */}
        {isEditing && (
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-2 py-2 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-1 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
                <button onClick={() => execCmd('bold')} className="p-2 hover:bg-slate-700 rounded-lg transition-colors" title="Bold">
                    <Bold className="w-4 h-4 text-slate-200" />
                </button>
                <button onClick={() => execCmd('italic')} className="p-2 hover:bg-slate-700 rounded-lg transition-colors" title="Italic">
                    <Italic className="w-4 h-4 text-slate-200" />
                </button>
                <button onClick={() => execCmd('underline')} className="p-2 hover:bg-slate-700 rounded-lg transition-colors" title="Underline">
                    <Underline className="w-4 h-4 text-slate-200" />
                </button>
                <div className="w-px h-6 bg-slate-600 mx-1" />
                <button onClick={() => execCmd('formatBlock', 'H1')} className="p-2 hover:bg-slate-700 rounded-lg transition-colors" title="Heading 1">
                    <Heading1 className="w-4 h-4 text-slate-200" />
                </button>
                <button onClick={() => execCmd('formatBlock', 'H2')} className="p-2 hover:bg-slate-700 rounded-lg transition-colors" title="Heading 2">
                    <Heading2 className="w-4 h-4 text-slate-200" />
                </button>
                <button onClick={() => execCmd('formatBlock', 'H3')} className="p-2 hover:bg-slate-700 rounded-lg transition-colors" title="Heading 3">
                    <Heading3 className="w-4 h-4 text-slate-200" />
                </button>
                <div className="w-px h-6 bg-slate-600 mx-1" />
                <button onClick={() => execCmd('undo')} className="p-2 hover:bg-slate-700 rounded-lg transition-colors" title="Undo">
                    <Undo className="w-4 h-4 text-slate-400 hover:text-white" />
                </button>
                <button onClick={() => execCmd('redo')} className="p-2 hover:bg-slate-700 rounded-lg transition-colors" title="Redo">
                    <Redo className="w-4 h-4 text-slate-400 hover:text-white" />
                </button>
            </div>
        )}
      </div>
    </div>
  );
};