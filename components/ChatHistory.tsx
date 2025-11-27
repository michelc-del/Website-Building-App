import React, { useRef, useEffect } from 'react';
import { Message } from '../types';
import { Bot, User, Terminal } from 'lucide-react';

interface ChatHistoryProps {
  messages: Message[];
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({ messages }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
      {messages.length === 0 && (
        <div className="text-center text-slate-500 mt-10">
            <div className="bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Terminal className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-sm font-medium text-slate-400">Start building your website</p>
            <p className="text-xs mt-2 max-w-[200px] mx-auto">Try prompts like:</p>
            <ul className="text-xs mt-2 space-y-2 text-blue-400/80">
                <li className="bg-slate-800/50 p-2 rounded cursor-pointer hover:bg-slate-800 border border-slate-700/50">"A portfolio for a photographer"</li>
                <li className="bg-slate-800/50 p-2 rounded cursor-pointer hover:bg-slate-800 border border-slate-700/50">"Landing page for a SaaS startup"</li>
                <li className="bg-slate-800/50 p-2 rounded cursor-pointer hover:bg-slate-800 border border-slate-700/50">"Dark themed blog layout"</li>
            </ul>
        </div>
      )}
      
      {messages.map((msg) => (
        <div 
          key={msg.id} 
          className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
            msg.role === 'user' ? 'bg-blue-600' : 'bg-purple-600'
          }`}>
            {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
          </div>
          
          <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            msg.role === 'user' 
              ? 'bg-blue-600 text-white rounded-tr-none' 
              : 'bg-slate-700 text-slate-200 rounded-tl-none border border-slate-600'
          }`}>
             {msg.type === 'code_update' ? (
                <div className="flex items-center gap-2 text-purple-300 font-medium">
                    <Terminal className="w-4 h-4" />
                    <span>Generated new version</span>
                </div>
             ) : (
                 <p className="whitespace-pre-wrap">{msg.content}</p>
             )}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};
