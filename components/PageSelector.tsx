import React, { useState } from 'react';
import { Page } from '../types';
import { ChevronDown, Plus, File, Trash2, X, Check } from 'lucide-react';

interface PageSelectorProps {
  pages: Page[];
  activePageId: string;
  onSelectPage: (id: string) => void;
  onAddPage: (name: string, path: string) => void;
  onDeletePage: (id: string) => void;
}

export const PageSelector: React.FC<PageSelectorProps> = ({ 
  pages, 
  activePageId, 
  onSelectPage, 
  onAddPage, 
  onDeletePage 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [newPagePath, setNewPagePath] = useState('');

  const activePage = pages.find(p => p.id === activePageId);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPageName && newPagePath) {
      let path = newPagePath.trim();
      if (!path.endsWith('.html')) path += '.html';
      
      onAddPage(newPageName, path);
      setNewPageName('');
      setNewPagePath('');
      setIsAdding(false);
      setIsOpen(false);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this page?')) {
      onDeletePage(id);
    }
  };

  return (
    <div className="relative z-50">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-200 transition-colors text-sm font-medium border border-slate-600/50"
      >
        <File className="w-4 h-4 text-blue-400" />
        <span className="max-w-[120px] truncate">{activePage?.name || 'Unknown Page'}</span>
        <span className="text-slate-500 text-xs truncate max-w-[100px] hidden sm:inline">
            ({activePage?.path})
        </span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => { setIsOpen(false); setIsAdding(false); }}
          />
          <div className="absolute top-full left-0 mt-2 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Page List */}
            <div className="max-h-60 overflow-y-auto py-2">
              <div className="px-3 pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Project Pages
              </div>
              {pages.map(page => (
                <div 
                  key={page.id}
                  onClick={() => {
                    onSelectPage(page.id);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-slate-700/50 transition-colors ${
                    activePageId === page.id ? 'bg-blue-900/20 text-blue-400 border-l-2 border-blue-500' : 'text-slate-300 border-l-2 border-transparent'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="font-medium text-sm truncate">{page.name}</div>
                    <div className="text-xs text-slate-500 truncate">{page.path}</div>
                  </div>
                  
                  {pages.length > 1 && (
                    <button 
                      onClick={(e) => handleDelete(e, page.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
                      title="Delete Page"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add New Section */}
            <div className="border-t border-slate-700 bg-slate-900/50 p-3">
              {!isAdding ? (
                <button 
                  onClick={() => setIsAdding(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors border border-dashed border-slate-700 hover:border-slate-500"
                >
                  <Plus className="w-4 h-4" />
                  Add New Page
                </button>
              ) : (
                <form onSubmit={handleAddSubmit} className="space-y-2">
                  <input
                    type="text"
                    placeholder="Page Name (e.g. About)"
                    value={newPageName}
                    onChange={e => setNewPageName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                  <input
                    type="text"
                    placeholder="Filename (e.g. about.html)"
                    value={newPagePath}
                    onChange={e => setNewPagePath(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                  <div className="flex gap-2 pt-1">
                    <button 
                      type="submit"
                      disabled={!newPageName || !newPagePath}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs py-1.5 rounded disabled:opacity-50"
                    >
                      Create
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIsAdding(false)}
                      className="px-3 bg-slate-700 hover:bg-slate-600 text-white text-xs py-1.5 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};