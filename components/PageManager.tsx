import React, { useState } from 'react';
import { Page } from '../types';
import { File, Home, Trash2, Plus, Edit2, X, AlertCircle, RefreshCw } from 'lucide-react';

interface PageManagerProps {
  pages: Page[];
  activePageId: string;
  onSelectPage: (id: string) => void;
  onAddPage: (name: string, path: string) => void;
  onUpdatePage: (id: string, name: string, path: string) => void;
  onDeletePage: (id: string) => void;
  onSyncLinks?: () => void;
  isSyncing?: boolean;
}

export const PageManager: React.FC<PageManagerProps> = ({
  pages,
  activePageId,
  onSelectPage,
  onAddPage,
  onUpdatePage,
  onDeletePage,
  onSyncLinks,
  isSyncing
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [newPagePath, setNewPagePath] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPath, setEditPath] = useState('');

  // Auto-generate slug from name
  const handleNameChange = (val: string, isNew: boolean) => {
    if (isNew) {
        setNewPageName(val);
        // Simple slugify: "About Us" -> "about-us.html"
        const slug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.html';
        setNewPagePath(slug);
        setError(null);
    } else {
        setEditName(val);
    }
  };

  const validatePath = (path: string, currentId?: string): string | null => {
      const cleanPath = path.trim().toLowerCase();
      if (!cleanPath) return "Filename is required";
      if (!cleanPath.endsWith('.html')) return "Must end with .html";
      if (pages.some(p => p.path.toLowerCase() === cleanPath && p.id !== currentId)) {
          return "Filename already exists";
      }
      return null;
  };

  const handleAddSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    let path = newPagePath.trim().toLowerCase();
    if (path && !path.endsWith('.html')) path += '.html';

    const validationError = validatePath(path);
    if (validationError) {
        setError(validationError);
        return;
    }

    if (newPageName && path) {
      onAddPage(newPageName, path);
      setNewPageName('');
      setNewPagePath('');
      setIsAdding(false);
      setError(null);
    }
  };

  const startEditing = (e: React.MouseEvent, page: Page) => {
      e.stopPropagation();
      setEditingId(page.id);
      setEditName(page.name);
      setEditPath(page.path);
      setError(null);
  };

  const saveEditing = (e?: React.MouseEvent | React.KeyboardEvent, id?: string) => {
      if (e) e.stopPropagation();
      const targetId = id || editingId;
      
      if (targetId && editName && editPath) {
          const validationError = validatePath(editPath, targetId);
          if (validationError) {
              alert(validationError); // Simple alert for inline edit for now, or could use a toast
              return;
          }
          
          onUpdatePage(targetId, editName, editPath);
          setEditingId(null);
      }
  };

  const handleKeyDown = (e: React.KeyboardEvent, isNew: boolean) => {
      if (e.key === 'Enter') {
          if (isNew) handleAddSubmit();
          else saveEditing(e);
      } else if (e.key === 'Escape') {
          if (isNew) {
            setIsAdding(false);
            setError(null);
          } else {
            setEditingId(null);
          }
      }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900">
      
      {/* Header with Sync Button */}
      <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Structure</span>
          {onSyncLinks && (
              <button 
                onClick={onSyncLinks}
                disabled={isSyncing}
                className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-blue-400 transition-colors flex items-center gap-1.5"
                title="Update Navigation Links"
              >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-blue-500' : ''}`} />
                  <span className="text-[10px]">Sync Nav</span>
              </button>
          )}
      </div>

      {/* Page List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {pages.map(page => {
          const isHome = page.path === 'index.html';
          const isActive = activePageId === page.id;
          const isEditing = editingId === page.id;

          return (
            <div 
              key={page.id}
              onClick={() => !isEditing && onSelectPage(page.id)}
              className={`
                group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border
                ${isActive 
                  ? 'bg-blue-900/20 border-blue-500/50 shadow-sm' 
                  : 'bg-transparent border-transparent hover:bg-slate-800 hover:border-slate-700'
                }
              `}
            >
              {/* Icon */}
              <div className={`p-2 rounded-md ${isActive ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                {isHome ? <Home className="w-4 h-4" /> : <File className="w-4 h-4" />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {isEditing ? (
                   <div className="space-y-2" onClick={e => e.stopPropagation()}>
                       <input 
                           value={editName}
                           onChange={e => handleNameChange(e.target.value, false)}
                           onKeyDown={e => handleKeyDown(e, false)}
                           className="w-full bg-slate-950 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:border-blue-500 outline-none"
                           placeholder="Page Name"
                           autoFocus
                       />
                       <input 
                           value={editPath}
                           onChange={e => setEditPath(e.target.value)}
                           onKeyDown={e => handleKeyDown(e, false)}
                           className="w-full bg-slate-950 border border-slate-600 rounded px-2 py-1 text-xs text-slate-400 focus:border-blue-500 outline-none font-mono"
                           placeholder="filename.html"
                           disabled={isHome} // Index.html path should generally not be changed
                       />
                       <div className="flex gap-2">
                           <button onClick={(e) => saveEditing(e, page.id)} className="flex-1 bg-blue-600 text-white text-[10px] py-1 rounded hover:bg-blue-500">Save</button>
                           <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }} className="flex-1 bg-slate-700 text-white text-[10px] py-1 rounded hover:bg-slate-600">Cancel</button>
                       </div>
                   </div>
                ) : (
                    <div>
                        <div className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-slate-300'}`}>
                            {page.name}
                        </div>
                        <div className="text-xs text-slate-500 font-mono truncate">
                            {page.path}
                        </div>
                    </div>
                )}
              </div>

              {/* Actions */}
              {!isEditing && (
                  <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? 'opacity-100' : ''}`}>
                    <button 
                        onClick={(e) => startEditing(e, page)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                        title="Edit Page"
                    >
                        <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {!isHome && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                if(confirm('Delete this page?')) onDeletePage(page.id);
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
                            title="Delete Page"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                  </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Page Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        {isAdding ? (
            <div className="bg-slate-800 rounded-xl p-3 border border-slate-700 shadow-lg animate-in slide-in-from-bottom-2">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-300">New Page</span>
                    <button onClick={() => { setIsAdding(false); setError(null); }} className="text-slate-500 hover:text-white"><X className="w-3 h-3" /></button>
                </div>
                
                {error && (
                    <div className="mb-2 flex items-center gap-1 text-xs text-red-400 bg-red-400/10 p-1.5 rounded">
                        <AlertCircle className="w-3 h-3" />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleAddSubmit} className="space-y-2">
                    <input
                        type="text"
                        placeholder="Name (e.g. Services)"
                        value={newPageName}
                        onChange={e => handleNameChange(e.target.value, true)}
                        onKeyDown={e => handleKeyDown(e, true)}
                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 placeholder-slate-600"
                        autoFocus
                    />
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="services.html"
                            value={newPagePath}
                            onChange={e => { setNewPagePath(e.target.value); setError(null); }}
                            onKeyDown={e => handleKeyDown(e, true)}
                            className={`w-full bg-slate-900 border rounded px-3 py-1.5 text-sm text-slate-400 focus:outline-none focus:border-blue-500 font-mono placeholder-slate-700 ${error ? 'border-red-500' : 'border-slate-600'}`}
                        />
                    </div>
                    <button 
                        type="submit"
                        disabled={!newPageName || !newPagePath}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-medium py-2 rounded-lg transition-all shadow-md disabled:opacity-50"
                    >
                        Create Page
                    </button>
                </form>
            </div>
        ) : (
            <button 
                onClick={() => setIsAdding(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 hover:border-slate-500 transition-all group"
            >
                <div className="p-1 bg-blue-500/10 rounded group-hover:bg-blue-500/20">
                    <Plus className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-sm font-medium">Add New Page</span>
            </button>
        )}
      </div>
    </div>
  );
};