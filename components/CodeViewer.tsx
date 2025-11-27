import React, { useState, useEffect } from 'react';

interface CodeViewerProps {
  code: string;
  onCodeChange: (newCode: string) => void;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({ code, onCodeChange }) => {
  const [localCode, setLocalCode] = useState(code);

  // Sync local state when prop changes (e.g. from AI)
  useEffect(() => {
    setLocalCode(code);
  }, [code]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setLocalCode(newVal);
    onCodeChange(newVal);
  };

  return (
    <div className="flex-1 bg-slate-900 p-4 overflow-hidden h-full flex flex-col">
      <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2">
             <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500"/>
                <span className="w-3 h-3 rounded-full bg-yellow-500"/>
                <span className="w-3 h-3 rounded-full bg-green-500"/>
             </div>
             <span className="text-xs text-slate-400 ml-2 font-mono">index.html</span>
          </div>
          <span className="text-xs text-slate-500">Editable</span>
      </div>
      
      <div className="w-full flex-1 rounded-xl bg-[#1e1e1e] border border-slate-700 overflow-hidden relative">
        <textarea
          value={localCode}
          onChange={handleChange}
          spellCheck={false}
          className="w-full h-full bg-[#1e1e1e] text-gray-300 font-mono text-sm p-4 resize-none focus:outline-none custom-scrollbar leading-relaxed"
          style={{ fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace' }}
        />
      </div>
    </div>
  );
};