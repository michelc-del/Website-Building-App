import React, { useState, useEffect, useCallback } from 'react';
import JSZip from 'jszip';
import { Header } from './components/Header';
import { PreviewFrame } from './components/PreviewFrame';
import { PromptInput } from './components/PromptInput';
import { ChatHistory } from './components/ChatHistory';
import { CodeViewer } from './components/CodeViewer';
import { ProjectsList } from './components/ProjectsList';
import { PageManager } from './components/PageManager';
import { sendMessageToGemini, resetSession } from './services/gemini';
import { Message, DeviceMode, Project, Page } from './types';
import * as Storage from './services/storage';
import { TEMPLATES, DEFAULT_TEMPLATE } from './services/templates';
import { Loader2, MessageSquare, Layout } from 'lucide-react';

export default function App() {
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  
  // Project State
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [activePageId, setActivePageId] = useState<string>('');
  const [showProjectsModal, setShowProjectsModal] = useState(false);
  const [projectsList, setProjectsList] = useState<Project[]>([]);

  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'chat' | 'pages'>('chat');

  // Initialize
  useEffect(() => {
    const allProjects = Storage.getProjects();
    setProjectsList(allProjects);

    const lastId = Storage.getLastActiveProjectId();
    let initialProject: Project;

    if (lastId) {
      const found = allProjects.find(p => p.id === lastId);
      if (found) {
        initialProject = found;
      } else {
        initialProject = Storage.createNewProject(DEFAULT_TEMPLATE.html);
        Storage.saveProject(initialProject);
        setProjectsList(prev => [...prev, initialProject]);
      }
    } else {
      if (allProjects.length > 0) {
        initialProject = allProjects[0];
        Storage.saveProject(initialProject);
      } else {
        initialProject = Storage.createNewProject(DEFAULT_TEMPLATE.html);
        Storage.saveProject(initialProject);
        setProjectsList([initialProject]);
      }
    }
    
    setCurrentProject(initialProject);
    // Safe initialization of activePageId
    if (initialProject && initialProject.pages.length > 0) {
        setActivePageId(initialProject.pages[0].id);
    }
    
    // Ensure session is clean on load
    resetSession();
  }, []);

  // Auto-save
  useEffect(() => {
    if (currentProject) {
      // Safety: Do not autosave if pages array is corrupted or empty
      if (!currentProject.pages || currentProject.pages.length === 0) {
          console.warn("Project has no pages. Autosave skipped to prevent data loss.");
          return;
      }

      const timeoutId = setTimeout(() => {
        Storage.saveProject(currentProject);
        setProjectsList(prev => prev.map(p => p.id === currentProject.id ? currentProject : p));
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [currentProject]);

  // Safety: Recover from invalid activePageId
  useEffect(() => {
    if (currentProject && currentProject.pages.length > 0) {
        const isValid = currentProject.pages.some(p => p.id === activePageId);
        if (!isValid) {
            console.warn("Active page not found, resetting to home.");
            setActivePageId(currentProject.pages[0].id);
        }
    }
  }, [currentProject, activePageId]);

  // Derived state for the active page
  const activePage = currentProject?.pages.find(p => p.id === activePageId);

  const handleSendMessage = async (prompt: string, newPageOptions?: { name: string; filename: string }) => {
    if (!currentProject) return;
    
    let targetPageId = activePageId;
    let targetPage = activePage;

    // Handle "Create as new page" flow
    if (newPageOptions) {
        // Validation: Check if filename exists
        if (currentProject.pages.some(p => p.path.toLowerCase() === newPageOptions.filename.toLowerCase())) {
            alert("A page with this filename already exists.");
            return;
        }

        const newId = Storage.generateId();
        const newPage: Page = {
            id: newId,
            name: newPageOptions.name,
            path: newPageOptions.filename,
            html: TEMPLATES[0].html // Start blank
        };

        // Optimistically add the new page to state immediately
        setCurrentProject(prev => {
            if (!prev) return null;
            return {
                ...prev,
                pages: [...prev.pages, newPage]
            };
        });
        
        // Set context to the new page
        setActivePageId(newId);
        targetPageId = newId;
        targetPage = newPage;
        
        // Force sidebar to chat to show progress
        if (sidebarTab !== 'chat') setSidebarTab('chat');
    }

    if (!targetPage) return; // Should not happen given logic above
    if (isEditing) setIsEditing(false);

    const userMsg: Message = {
      id: Storage.generateId(),
      role: 'user',
      content: prompt,
      type: 'text',
      timestamp: Date.now(),
    };

    // Update state with user message
    setCurrentProject(prev => prev ? ({
        ...prev,
        messages: [...prev.messages, userMsg]
    }) : null);
    
    setIsLoading(true);

    try {
      // Build context for AI about the files in the project
      // NOTE: We use the *current* project state for context, assuming the new page is added if applicable
      const allPages = newPageOptions 
         ? [...currentProject.pages, { name: newPageOptions.name, path: newPageOptions.filename, id: 'temp', html: '' }] 
         : currentProject.pages;

      const availablePages = allPages.map(p => ({ name: p.name, path: p.path }));
      const context = {
          currentPage: targetPage.path,
          availablePages: availablePages
      };

      // If it's a new page, the HTML is blank, so we rely on the prompt to generate it.
      const currentHtml = newPageOptions ? "" : targetPage.html;
      const fullPrompt = `Current HTML content of ${targetPage.path}:\n${currentHtml}\n\nUser Request: ${prompt}`;
      
      const response = await sendMessageToGemini(fullPrompt, context);
      
      const botMsg: Message = {
        id: Storage.generateId(),
        role: 'model',
        content: response.isCode ? `Updated code for ${targetPage.path}.` : response.content,
        type: response.isCode ? 'code_update' : 'text',
        timestamp: Date.now(),
      };

      let newHtml = targetPage.html;
      if (response.isCode) {
        newHtml = response.content.replace(/```html/g, '').replace(/```/g, '');
        setViewMode('preview'); 
      }

      // CRITICAL FIX: Use functional update to ensure we don't overwrite pages added during generation
      setCurrentProject(prev => {
        if (!prev) return null;
        
        const updatedPages = prev.pages.map(p => 
            p.id === targetPageId ? { ...p, html: newHtml } : p
        );

        return {
            ...prev,
            pages: updatedPages,
            messages: [...prev.messages, botMsg]
        };
      });

    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: Storage.generateId(),
        role: 'model',
        content: "Sorry, I encountered an error. Please try again.",
        type: 'text',
        timestamp: Date.now(),
      };
      setCurrentProject(prev => prev ? ({
          ...prev,
          messages: [...prev.messages, errorMsg]
      }) : null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (newCode: string) => {
    // CRITICAL FIX: Use functional update here too
    setCurrentProject(prev => {
        if (!prev || !activePageId) return prev;
        const updatedPages = prev.pages.map(p => 
            p.id === activePageId ? { ...p, html: newCode } : p
        );
        return { ...prev, pages: updatedPages };
    });
  };

  const handleCreateProject = (type: 'blank' | 'template' | 'ai' = 'blank', promptOrTemplate?: string) => {
    resetSession();

    let initialHtml = DEFAULT_TEMPLATE.html;

    if (type === 'template' && promptOrTemplate) {
        const t = TEMPLATES.find(t => t.id === promptOrTemplate);
        if (t) initialHtml = t.html;
    }

    const newProject = Storage.createNewProject(initialHtml);
    Storage.saveProject(newProject);
    setProjectsList(prev => [...prev, newProject]);
    setCurrentProject(newProject);
    setActivePageId(newProject.pages[0].id);
    setShowProjectsModal(false);

    if (type === 'ai' && promptOrTemplate) {
        setTimeout(() => handleSendMessage(promptOrTemplate), 500);
    }
  };

  const handleSelectProject = (project: Project) => {
    resetSession();
    setCurrentProject(project);
    Storage.saveProject(project);
    if (project.pages.length > 0) {
        setActivePageId(project.pages[0].id);
    }
    setShowProjectsModal(false);
  };

  const handleDeleteProject = (id: string) => {
    const updatedList = Storage.deleteProject(id);
    setProjectsList(updatedList);
    
    if (currentProject?.id === id) {
      resetSession();
      if (updatedList.length > 0) {
        handleSelectProject(updatedList[0]);
      } else {
        handleCreateProject('blank');
      }
    }
  };

  const handleRenameProject = (id: string, newName: string) => {
      const updated = Storage.updateProjectName(id, newName);
      setProjectsList(updated);
      if (currentProject?.id === id) {
          setCurrentProject(prev => prev ? ({ ...prev, name: newName }) : null);
      }
  };

  // --- Page Management ---

  const handleAddPage = (name: string, path: string) => {
    setCurrentProject(prev => {
        if (!prev) return null;
        if (prev.pages.some(p => p.path === path)) {
            alert("A page with this filename already exists.");
            return prev;
        }

        const newPage: Page = {
            id: Storage.generateId(),
            name,
            path,
            html: TEMPLATES[0].html 
        };

        const updatedPages = [...prev.pages, newPage];
        return { ...prev, pages: updatedPages };
    });
  };

  const handleUpdatePage = (id: string, name: string, path: string) => {
      if (!currentProject) return;

      const oldPage = currentProject.pages.find(p => p.id === id);
      const oldPath = oldPage?.path;

      // 1. Update the metadata of the target page
      let updatedProject = Storage.updatePage(currentProject.id, id, { name, path });
      
      // 2. Refactor links in ALL pages if path changed
      if (updatedProject && oldPath && oldPath !== path) {
          // Escape regex special chars in filename
          const safeOldPath = oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          
          // Regex matches href="oldPath" or href='oldPath'
          // We use simple quote matching to avoid destroying content
          const regex = new RegExp(`href=(["'])${safeOldPath}(["'])`, 'g');
          
          const updatedPages = updatedProject.pages.map(p => {
              // Replace with new path
              const newHtml = p.html.replace(regex, `href=$1${path}$2`);
              return { ...p, html: newHtml };
          });
          
          updatedProject = { ...updatedProject, pages: updatedPages };
          
          // Persist the bulk HTML updates to storage
          Storage.saveProject(updatedProject);
      }

      if (updatedProject) {
          setCurrentProject(updatedProject);
          setProjectsList(prev => prev.map(p => p.id === updatedProject!.id ? updatedProject! : p));
      }
  };

  const handleDeletePage = (pageId: string) => {
      if (!currentProject) return;
      if (currentProject.pages.length <= 1) {
          alert("Cannot delete the last page.");
          return;
      }

      setCurrentProject(prev => {
          if (!prev) return null;
          const updatedPages = prev.pages.filter(p => p.id !== pageId);
          return { ...prev, pages: updatedPages };
      });
      
      if (activePageId === pageId) {
          const fallback = currentProject.pages.find(p => p.id !== pageId);
          if (fallback) setActivePageId(fallback.id);
      }
  };

  const handleDownload = async () => {
    if (!currentProject) return;

    try {
        const zip = new JSZip();
        currentProject.pages.forEach(page => {
            zip.file(page.path, page.html);
        });
        const blob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentProject.name.replace(/\s+/g, '-').toLowerCase()}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Export failed:", error);
        alert("Failed to create ZIP file. Please try again.");
    }
  };

  const handleExternalPreview = () => {
    if (!activePage) return;
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(activePage.html);
      newWindow.document.close();
    }
  };

  if (!currentProject) return <div className="h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>;

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-200 overflow-hidden">
      <Header 
        deviceMode={deviceMode} 
        setDeviceMode={setDeviceMode} 
        viewMode={viewMode}
        setViewMode={(mode) => {
            setViewMode(mode);
            if (mode === 'code') setIsEditing(false);
        }}
        onDownload={handleDownload}
        hasCode={!!activePage?.html}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        onPreviewExternal={handleExternalPreview}
        onOpenProjects={() => setShowProjectsModal(true)}
        projectName={currentProject.name}
      />

      <main className="flex-1 flex overflow-hidden relative">
        {/* Sidebar */}
        <div 
          className={`
            border-r border-slate-700 bg-slate-900 flex flex-col 
            absolute md:relative h-full z-20 
            transition-all duration-300 ease-in-out
            ${isSidebarOpen ? 'w-full md:w-[400px] translate-x-0' : '-translate-x-full w-0 opacity-0 overflow-hidden'}
          `}
        >
          {/* Sidebar Tabs */}
          <div className="flex border-b border-slate-700 bg-slate-800/50 shrink-0">
             <button 
                onClick={() => setSidebarTab('chat')}
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${
                    sidebarTab === 'chat' 
                    ? 'border-blue-500 text-white bg-slate-800' 
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
             >
                 <MessageSquare className="w-4 h-4" />
                 AI Assistant
             </button>
             <button 
                onClick={() => setSidebarTab('pages')}
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${
                    sidebarTab === 'pages' 
                    ? 'border-blue-500 text-white bg-slate-800' 
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
             >
                 <Layout className="w-4 h-4" />
                 Pages
             </button>
          </div>
          
          {/* Sidebar Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
              {sidebarTab === 'chat' ? (
                 <>
                    <ChatHistory messages={currentProject.messages} />
                    {isLoading && (
                        <div className="px-6 py-2 flex items-center gap-2 text-slate-400 text-sm animate-pulse shrink-0">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Working on {activePage ? activePage.path : 'current page'}...</span>
                        </div>
                    )}
                 </>
              ) : (
                  <PageManager 
                    pages={currentProject.pages}
                    activePageId={activePageId}
                    onSelectPage={setActivePageId}
                    onAddPage={handleAddPage}
                    onUpdatePage={handleUpdatePage}
                    onDeletePage={handleDeletePage}
                  />
              )}
          </div>

          <PromptInput onSend={handleSendMessage} isLoading={isLoading} />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 relative bg-slate-950 flex flex-col min-w-0 transition-all duration-300">
            {activePage ? (
                viewMode === 'preview' ? (
                    <PreviewFrame 
                        html={activePage.html} 
                        deviceMode={deviceMode} 
                        isEditing={isEditing}
                        onHtmlChange={handleCodeChange}
                    />
                ) : (
                    <CodeViewer code={activePage.html} onCodeChange={handleCodeChange} />
                )
            ) : (
                <div className="flex-1 flex items-center justify-center flex-col gap-4 text-slate-500">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                    <p>Loading active page...</p>
                </div>
            )}
        </div>
      </main>

      {/* Projects Modal */}
      {showProjectsModal && (
        <ProjectsList 
            projects={projectsList}
            activeProjectId={currentProject.id}
            onSelectProject={handleSelectProject}
            onCreateProject={handleCreateProject}
            onDeleteProject={handleDeleteProject}
            onRenameProject={handleRenameProject}
            onClose={() => setShowProjectsModal(false)}
        />
      )}
    </div>
  );
}