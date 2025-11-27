import React from 'react';
import { LayoutTemplate, Smartphone, Tablet, Monitor, Code, Eye, Download, Pencil, Check, ExternalLink, PanelLeftClose, PanelLeftOpen, FolderOpen } from 'lucide-react';
import { DeviceMode, Page } from '../types';

interface HeaderProps {
  deviceMode: DeviceMode;
  setDeviceMode: (mode: DeviceMode) => void;
  viewMode: 'preview' | 'code';
  setViewMode: (mode: 'preview' | 'code') => void;
  onDownload: () => void;
  hasCode: boolean;
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  onPreviewExternal: () => void;
  onOpenProjects: () => void;
  projectName: string;
}

export const Header: React.FC<HeaderProps> = ({ 
  deviceMode, 
  setDeviceMode, 
  viewMode, 
  setViewMode,
  onDownload,
  hasCode,
  isEditing,
  setIsEditing,
  isSidebarOpen,
  setIsSidebarOpen,
  onPreviewExternal,
  onOpenProjects,
  projectName
}) => {
  return (
    <header className="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4 md:px-6 z-10 shrink-0">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
          title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
        </button>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
            <LayoutTemplate className="text-white w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <h1 className="hidden md:block font-bold text-lg leading-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              Web Architect
            </h1>
            <div 
                onClick={onOpenProjects}
                className="text-xs text-slate-400 flex items-center gap-1 hover:text-blue-400 cursor-pointer transition-colors"
            >
                <FolderOpen className="w-3 h-3" />
                <span className="max-w-[150px] truncate font-medium">{projectName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Device Toggles - Centered */}
      <div className={`hidden lg:flex items-center bg-slate-900 rounded-lg p-1 border border-slate-700 transition-opacity duration-200 ${isEditing ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        <button
          onClick={() => setDeviceMode('mobile')}
          className={`p-2 rounded-md transition-all ${deviceMode === 'mobile' ? 'bg-slate-700 text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
          title="Mobile View"
        >
          <Smartphone className="w-4 h-4" />
        </button>
        <button
          onClick={() => setDeviceMode('tablet')}
          className={`p-2 rounded-md transition-all ${deviceMode === 'tablet' ? 'bg-slate-700 text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
          title="Tablet View"
        >
          <Tablet className="w-4 h-4" />
        </button>
        <button
          onClick={() => setDeviceMode('desktop')}
          className={`p-2 rounded-md transition-all ${deviceMode === 'desktop' ? 'bg-slate-700 text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
          title="Desktop View"
        >
          <Monitor className="w-4 h-4" />
        </button>
      </div>

      {/* View Toggles & Actions */}
      <div className="flex items-center gap-2 md:gap-3">
        
        {viewMode === 'preview' && hasCode && (
           <button
             onClick={() => setIsEditing(!isEditing)}
             className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-sm font-bold transition-all border ${
               isEditing 
                 ? 'bg-blue-600 text-white border-blue-500 hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.5)]' 
                 : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'
             }`}
           >
             {isEditing ? <Check className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
             <span className="hidden md:inline">{isEditing ? 'Done' : 'Edit'}</span>
           </button>
        )}

        <div className={`hidden xl:flex items-center bg-slate-900 rounded-lg p-1 border border-slate-700 mr-2 ${isEditing ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            <button
                onClick={() => setViewMode('preview')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'preview' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
            >
                <Eye className="w-4 h-4" />
                <span className="hidden lg:inline">Preview</span>
            </button>
            <button
                onClick={() => setViewMode('code')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'code' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
            >
                <Code className="w-4 h-4" />
                <span className="hidden lg:inline">Code</span>
            </button>
        </div>

        <button 
          onClick={onPreviewExternal}
          disabled={!hasCode}
          className="p-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
          title="Open in New Tab"
        >
          <ExternalLink className="w-5 h-5" />
        </button>

        <button 
          onClick={onDownload}
          disabled={!hasCode || isEditing}
          className="bg-purple-600 hover:bg-purple-500 text-white px-3 md:px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Download Project (ZIP)"
        >
            <Download className="w-4 h-4" />
            <span className="hidden lg:inline">Export</span>
        </button>
      </div>
    </header>
  );
};