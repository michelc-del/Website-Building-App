import React, { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2, Paperclip, X, FileText, PlusCircle } from 'lucide-react';

interface PromptInputProps {
  onSend: (prompt: string, newPageOptions?: { name: string; filename: string }) => void;
  isLoading: boolean;
}

export const PromptInput: React.FC<PromptInputProps> = ({ onSend, isLoading }) => {
  const [input, setInput] = useState('');
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string } | null>(null);
  
  // New Page creation state
  const [createAsPage, setCreateAsPage] = useState(false);
  const [newPageName, setNewPageName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      // Auto-populate page name from filename if attached
      if (attachedFile && !newPageName) {
          const name = attachedFile.name.substring(0, attachedFile.name.lastIndexOf('.')) || attachedFile.name;
          setNewPageName(name.replace(/[^a-zA-Z0-9 ]/g, ' '));
      }
  }, [attachedFile]);

  const handleSend = () => {
    if ((input.trim() || attachedFile) && !isLoading) {
      
      let fullPrompt = input;
      if (attachedFile) {
        fullPrompt += `\n\n[Attached Content from file: ${attachedFile.name}]:\n${attachedFile.content}\n\n[Instruction]: Use the content above to populate the website sections appropriately.`;
      }
      
      if (createAsPage && newPageName.trim()) {
          // Construct filename
          const safeName = newPageName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const filename = safeName.endsWith('.html') ? safeName : safeName + '.html';
          
          fullPrompt += `\n\n[Action]: Create a new page named "${newPageName}" with filename "${filename}". Use the attached content as the primary content for this page.`;
          
          onSend(fullPrompt, { name: newPageName, filename: filename });
      } else {
          onSend(fullPrompt);
      }

      setInput('');
      setAttachedFile(null);
      setCreateAsPage(false);
      setNewPageName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Handle Word Documents (.docx)
    if (file.name.endsWith('.docx')) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          try {
             // Access global mammoth instance
             // @ts-ignore
             if (window.mammoth) {
                 // @ts-ignore
                 const result = await window.mammoth.extractRawText({ arrayBuffer });
                 setAttachedFile({
                     name: file.name,
                     content: result.value // The raw text
                 });
             } else {
                 alert("Document parser is still loading. Please try again in a moment.");
             }
          } catch (err) {
             console.error("Failed to parse docx", err);
             alert("Error reading Word document. Please ensure it is a valid .docx file.");
          }
        };
        reader.readAsArrayBuffer(file);
        return;
    }

    // Handle text-based files
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        setAttachedFile({
          name: file.name,
          content: text
        });
      }
    };
    reader.readAsText(file);
  };

  const removeFile = () => {
    setAttachedFile(null);
    setCreateAsPage(false);
    setNewPageName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="p-4 border-t border-slate-700 bg-slate-800">
      {/* File Attachment Indicator */}
      {attachedFile && (
        <div className="mb-3 animate-in fade-in slide-in-from-bottom-2 space-y-2">
            <div className="inline-flex items-center gap-2 bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200">
                <div className="p-1 bg-blue-500/20 rounded">
                    <FileText className="w-4 h-4 text-blue-400" />
                </div>
                <span className="truncate max-w-[200px]">{attachedFile.name}</span>
                <button 
                    onClick={removeFile}
                    className="ml-1 p-1 hover:bg-slate-600 rounded-full text-slate-400 hover:text-slate-200 transition-colors"
                >
                    <X className="w-3 h-3" />
                </button>
            </div>

            {/* Create as new page option */}
            <div className="flex items-center gap-3 pl-1">
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={createAsPage} 
                        onChange={(e) => setCreateAsPage(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
                    />
                    <span>Create as new page</span>
                </label>
                
                {createAsPage && (
                    <input 
                        type="text"
                        value={newPageName}
                        onChange={(e) => setNewPageName(e.target.value)}
                        placeholder="Page Title (e.g. Portfolio)"
                        className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500 w-48"
                        autoFocus
                    />
                )}
            </div>
        </div>
      )}

      <div className="relative">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={attachedFile ? "Instructions for the content (e.g. 'Format this as a dark themed portfolio')..." : "Describe your website or sections... (e.g. 'Add a contact form')"}
          className="w-full bg-slate-900 text-slate-100 rounded-xl pl-4 pr-24 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-14 min-h-[56px] max-h-32 text-sm md:text-base placeholder-slate-500 scrollbar-hide"
          disabled={isLoading}
        />
        
        <div className="absolute right-2 top-2 flex items-center gap-1">
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".txt,.md,.json,.csv,.js,.html,.css,.docx"
          />
          <button
            onClick={handleFileClick}
            disabled={isLoading}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors"
            title="Upload content (Text or Word Doc)"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          
          <button
            onClick={handleSend}
            disabled={(!input.trim() && !attachedFile) || (createAsPage && !newPageName) || isLoading}
            className={`p-2 rounded-lg transition-colors ${
              (!input.trim() && !attachedFile) || (createAsPage && !newPageName) || isLoading
                ? 'text-slate-600 cursor-not-allowed'
                : 'text-blue-400 hover:bg-slate-700 hover:text-blue-300'
            }`}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
        <Sparkles className="w-3 h-3" />
        <span>Gemini 2.5 Flash is powered to build.</span>
      </div>
    </div>
  );
};