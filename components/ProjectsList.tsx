import React, { useState, useRef } from 'react';
import { Project } from '../types';
import { TEMPLATES } from '../services/templates';
import { Folder, Trash2, Plus, Clock, FileCode, Edit2, X, Check, Sparkles, Layout, ChevronRight, ArrowLeft, Download, Upload, Save } from 'lucide-react';
import * as Storage from '../services/storage';

interface ProjectsListProps {
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (project: Project) => void;
  onCreateProject: (type: 'blank' | 'template' | 'ai', promptOrTemplate?: string) => void;
  onDeleteProject: (id: string) => void;
  onRenameProject: (id: string, newName: string) => void;
  onClose: () => void;
}

export const ProjectsList: React.FC<ProjectsListProps> = ({
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  onRenameProject,
  onClose
}) => {
  const [view, setView] = useState<'list' | 'create_method'>('list');
  const [aiPrompt, setAiPrompt] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const startEditing = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setEditingId(project.id);
    setEditName(project.name);
  };

  const saveEditing = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (editName.trim()) {
      onRenameProject(id, editName.trim());
    }
    setEditingId(null);
  };

  const cancelEditing = (e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingId(null);
  };

  const handleExport = async () => {
      const data = await Storage.exportAllData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gemini-web-architect-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
          const content = event.target?.result as string;
          if (content) {
              const success = await Storage.importData(content);
              if (success) {
                  alert("Backup restored successfully! The page will reload.");
                  window.location.reload();
              } else {
                  alert("Failed to restore backup. The file must be a valid JSON export.");
              }
          }
      };
      reader.readAsText(file);
      e.target.value = '';
  };

  const renderCreateMethod = () => (
    <div className="p-6 h-full flex flex-col">
       <button onClick={() => setView('list')} className="self-start flex items-center gap-1 text-slate-400 hover:text-white mb-6 text-sm">
           <ArrowLeft className="w-4 h-4" /> Back to projects
       </button>
       
       <h2 className="text-2xl font-bold text-white mb-2">How do you want to start?</h2>
       <p className="text-slate-400 mb-8">Choose a starting point for your new website.</p>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           {/* Option 1: AI */}
           <div className="flex flex-col gap-4">
               <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 p-5 rounded-xl">
                   <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg">
                       <Sparkles className="w-6 h-6 text-white" />
                   </div>
                   <h3 className="text-lg font-bold text-white mb-2">Generate with AI</h3>
                   <p className="text-sm text-slate-400 mb-4">Describe your dream site and let Gemini build it for you instantly.</p>
                   <textarea 
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="e.g. A portfolio for a wildlife photographer with a dark theme..."
                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500 resize-none h-24 mb-3"
                   />
                   <button 
                        onClick={() => onCreateProject('ai', aiPrompt)}
                        disabled={!aiPrompt.trim()}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                   >
                       Generate Site <ChevronRight className="w-4 h-4" />
                   </button>
               </div>
           </div>

           {/* Option 2: Template */}
           <div className="flex flex-col gap-4">
               <div className="bg-slate-800/50 border border-slate-700 p-5 rounded-xl h-full flex flex-col">
                   <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center mb-4">
                       <Layout className="w-6 h-6 text-slate-300" />
                   </div>
                   <h3 className="text-lg font-bold text-white mb-2">Use a Template</h3>
                   <p className="text-sm text-slate-400 mb-4">Start with a professional, pre-designed structure.</p>
                   
                   <div className="flex-1 space-y-2 overflow-y-auto max-h-[200px] pr-2 custom-scrollbar">
                       {TEMPLATES.filter(t => t.id !== 'blank').map(t => (
                           <button
                                key={t.id}
                                onClick={() => onCreateProject('template', t.id)}
                                className="w-full text-left p-3 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 hover:bg-slate-800 transition-all flex items-center gap-3 group"
                           >
                               <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500 group-hover:text-slate-300">T</div>
                               <span className="text-sm text-slate-300 group-hover:text-white truncate">{t.name}</span>
                           </button>
                       ))}
                   </div>
               </div>
           </div>

           {/* Option 3: Blank */}
           <div className="flex flex-col gap-4">
                <button 
                    onClick={() => onCreateProject('blank')}
                    className="bg-slate-800/50 border border-slate-700 p-5 rounded-xl h-full flex flex-col text-left hover:bg-slate-800 hover:border-slate-600 transition-all group"
                >
                   <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                       <FileCode className="w-6 h-6 text-slate-300" />
                   </div>
                   <h3 className="text-lg font-bold text-white mb-2">Blank Canvas</h3>
                   <p className="text-sm text-slate-400">Start from scratch with a clean HTML5 boilerplate.</p>
                   <div className="mt-auto pt-4 flex items-center text-blue-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                       Create Blank Project <ChevronRight className="w-4 h-4 ml-1" />
                   </div>
               </button>
           </div>
       </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh] animate-in fade-in zoom-in-95 duration-200 h-[650px]">
        
        {view === 'create_method' ? renderCreateMethod() : (
            <>
                <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600/20 p-2.5 rounded-xl">
                    <Folder className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                    <h2 className="text-xl font-bold text-white">Your Projects</h2>
                    <p className="text-slate-400 text-sm">Manage your website builds</p>
                    </div>
                </div>
                <button 
                    onClick={onClose}
                    className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <button
                    onClick={() => setView('create_method')}
                    className="group flex flex-col items-center justify-center gap-4 min-h-[160px] rounded-xl border-2 border-dashed border-slate-700 hover:border-blue-500 bg-slate-800/30 hover:bg-slate-800/50 transition-all"
                >
                    <div className="p-3 bg-slate-800 rounded-full group-hover:scale-110 transition-transform">
                    <Plus className="w-6 h-6 text-blue-400" />
                    </div>
                    <span className="font-medium text-slate-300 group-hover:text-blue-400">Create New Project</span>
                </button>

                {projects.sort((a, b) => b.lastUpdated - a.lastUpdated).map((project) => (
                    <div
                    key={project.id}
                    onClick={() => onSelectProject(project)}
                    className={`relative group rounded-xl border transition-all cursor-pointer flex flex-col overflow-hidden ${
                        activeProjectId === project.id
                        ? 'bg-slate-800 border-blue-500/50 shadow-[0_0_0_1px_rgba(59,130,246,0.5)]'
                        : 'bg-slate-800 border-slate-700 hover:border-slate-600 hover:shadow-lg'
                    }`}
                    >
                    <div className="p-4 flex-1">
                        <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1 mr-2">
                            <FileCode className={`w-5 h-5 ${activeProjectId === project.id ? 'text-blue-400' : 'text-slate-500'}`} />
                            
                            {editingId === project.id ? (
                                <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                                    <input 
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-white w-full focus:outline-none focus:border-blue-500"
                                        autoFocus
                                    />
                                    <button onClick={(e) => saveEditing(e, project.id)} className="p-1 hover:bg-slate-700 rounded text-green-400">
                                        <Check className="w-4 h-4" />
                                    </button>
                                    <button onClick={cancelEditing} className="p-1 hover:bg-slate-700 rounded text-red-400">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <h3 className="font-semibold text-slate-200 truncate" title={project.name}>
                                    {project.name}
                                </h3>
                            )}
                        </div>
                        </div>
                        
                        <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-4">
                        <Clock className="w-3.5 h-3.5" />
                        Last edited {formatDate(project.lastUpdated)}
                        </p>
                    </div>

                    <div className="bg-slate-900/50 px-4 py-3 flex items-center justify-end gap-2 border-t border-slate-700/50">
                        <button
                            onClick={(e) => startEditing(e, project)}
                            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg transition-colors"
                            title="Rename"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDeleteProject(project.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                        title="Delete"
                        >
                        <Trash2 className="w-4 h-4" />
                        </button>
                    </div>

                    {activeProjectId === project.id && (
                        <div className="absolute top-0 right-0 w-0 h-0 border-t-[40px] border-t-blue-500 border-l-[40px] border-l-transparent">
                            <div className="absolute top-[-36px] right-[4px]">
                                <Check className="w-3 h-3 text-white" />
                            </div>
                        </div>
                    )}
                    </div>
                ))}
                </div>

                <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                         <div className="p-2 bg-slate-800 rounded-lg border border-slate-700">
                             <Save className="w-4 h-4 text-slate-400" />
                         </div>
                         <div className="flex flex-col">
                             <span className="text-xs font-bold text-slate-300">Backup & Restore</span>
                             <span className="text-[10px] text-slate-500">Save your workspace safely</span>
                         </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleExport}
                            className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 hover:text-white transition-colors"
                        >
                            <Download className="w-3 h-3" />
                            Export Data
                        </button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleImportFile} 
                            className="hidden" 
                            accept=".json" 
                        />
                        <button 
                            onClick={handleImportClick}
                            className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 hover:text-white transition-colors"
                        >
                            <Upload className="w-3 h-3" />
                            Import Data
                        </button>
                    </div>
                </div>
            </>
        )}
      </div>
    </div>
  );
};