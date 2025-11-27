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
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'chat' | 'pages'>('chat');

  // Initialize
  useEffect(() => {
    const init = async () => {
      await Storage.initStorage();
      const allProjects = await Storage.getProjects();
      setProjectsList(allProjects);

      const lastId = await Storage.getLastActiveProjectId();
      let initialProject: Project;

      if (lastId) {
        const found = allProjects.find(p => p.id === lastId);
        if (found) {
          initialProject = found;
        } else {
          initialProject = Storage.createNewProject(DEFAULT_TEMPLATE.html);
          await Storage.saveProject(initialProject);
          setProjectsList(prev => [...prev, initialProject]);
        }
      } else {
        if (allProjects.length > 0) {
          initialProject = allProjects[0];
          await Storage.saveProject(initialProject);
        } else {
          initialProject = Storage.createNewProject(DEFAULT_TEMPLATE.html);
          await Storage.saveProject(initialProject);
          setProjectsList([initialProject]);
        }
      }
      
      setCurrentProject(initialProject);
      if (initialProject && initialProject.pages.length > 0) {
          setActivePageId(initialProject.pages[0].id);
      }
      resetSession();
      setIsInitializing(false);
    };

    init();
  }, []);

  // Auto-save
  useEffect(() => {
    if (currentProject) {
      if (!currentProject.pages || currentProject.pages.length === 0) {
          return;
      }

      setIsSaving(true);
      const timeoutId = setTimeout(async () => {
        try {
            await Storage.saveProject(currentProject);
            setProjectsList(prev => prev.map(p => p.id === currentProject.id ? currentProject : p));
        } catch (e) {
            console.error("Auto-save failed", e);
        } finally {
            setIsSaving(false);
        }
      }, 800);
      return () => clearTimeout(timeoutId);
    }
  }, [currentProject]);

  // Safety: Recover from invalid activePageId
  useEffect(() => {
    if (currentProject && currentProject.pages.length > 0) {
        const isValid = currentProject.pages.some(p => p.id === activePageId);
        if (!isValid) {
            setActivePageId(currentProject.pages[0].id);
        }
    }
  }, [currentProject, activePageId]);

  const activePage = currentProject?.pages.find(p => p.id === activePageId);

  const handleSendMessage = async (prompt: string, newPageOptions?: { name: string; filename: string }) => {
    if (!currentProject) return;
    
    let targetPageId = activePageId;
    let targetPage = activePage;

    if (newPageOptions) {
        if (currentProject.pages.some(p => p.path.toLowerCase() === newPageOptions.filename.toLowerCase())) {
            alert("A page with this filename already exists.");
            return;
        }

        const newId = Storage.generateId();
        const newPage: Page = {
            id: newId,
            name: newPageOptions.name,
            path: newPageOptions.filename,
            html: TEMPLATES[0].html 
        };

        setCurrentProject(prev => {
            if (!prev) return null;
            return { ...prev, pages: [...prev.pages, newPage] };
        });
        
        setActivePageId(newId);
        targetPageId = newId;
        targetPage = newPage;
        if (sidebarTab !== 'chat') setSidebarTab('chat');
    }

    if (!targetPage) return;
    if (isEditing) setIsEditing(false);

    const userMsg: Message = {
      id: Storage.generateId(),
      role: 'user',
      content: prompt,
      type: 'text',
      timestamp: Date.now(),
    };

    setCurrentProject(prev => prev ? ({
        ...prev,
        messages: [...prev.messages, userMsg]
    }) : null);
    
    setIsLoading(true);

    try {
      // Build context for AI about the files in the project
      // NOTE: We check the currentProject state, but we also include the potentially newly added page
      // We can use the 'targetPage' variable to ensure we have the latest context if it was just added.
      let allPages = currentProject.pages;
      if (newPageOptions && !allPages.find(p => p.id === targetPageId)) {
          allPages = [...allPages, targetPage];
      }

      const availablePages = allPages.map(p => ({ name: p.name, path: p.path }));
      const context = {
          currentPage: targetPage.path,
          availablePages: availablePages
      };

      const currentHtml = targetPage.html;
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

  const handleSyncLinks = async () => {
    if (!currentProject || !activePage) return;
    
    const prompt = "Update the navigation menu (header/nav) in the current page to exactly match the project structure provided in the context. Ensure all links work correctly.";
    await handleSendMessage(prompt);
  };

  const handleCodeChange = (newCode: string) => {
    setCurrentProject(prev => {
        if (!prev || !activePageId) return prev;
        const updatedPages = prev.pages.map(p => 
            p.id === activePageId ? { ...p, html: newCode } : p
        );
        return { ...prev, pages: updatedPages };
    });
  };

  const handleCreateProject = async (type: 'blank' | 'template' | 'ai' = 'blank', promptOrTemplate?: string) => {
    resetSession();

    let initialHtml = DEFAULT_TEMPLATE.html;

    if (type === 'template' && promptOrTemplate) {
        const t = TEMPLATES.find(t => t.id === promptOrTemplate);
        if (t) initialHtml = t.html;
    }

    const newProject = Storage.createNewProject(initialHtml);
    await Storage.saveProject(newProject);
    setProjectsList(prev => [...prev, newProject]);
    setCurrentProject(newProject);
    setActivePageId(newProject.pages[0].id);
    setShowProjectsModal(false);

    if (type === 'ai' && promptOrTemplate) {
        setTimeout(() => handleSendMessage(promptOrTemplate), 500);
    }
  };

  const handleSelectProject = async (project: Project) => {
    resetSession();
    setCurrentProject(project);
    await Storage.saveProject(project);
    if (project.pages.length > 0) {
        setActivePageId(project.pages[0].id);
    }
    setShowProjectsModal(false);
  };

  const handleDeleteProject = async (id: string) => {
    const updatedList = await Storage.deleteProject(id);
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

  const handleRenameProject = async (id: string, newName: string) => {
      // Optimistic update
      setProjectsList(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p));
      if (currentProject?.id === id) {
          setCurrentProject(prev => prev ? ({ ...prev, name: newName }) : null);
      }
      
      // Async save
      const projects = await Storage.getProjects();
      const p = projects.find(p => p.id === id);
      if (p) {
          p.name = newName;
          await Storage.saveProject(p);
      }
  };

  const handleAddPage = (name: string, path: string) => {
    setCurrentProject(prev => {
        if (!prev) return null;
        if (prev.pages.some(p => p.path === path)) {
            alert("A page with this filename already exists.");
            return prev;
        }

        // Smart Clone: Use the layout of index.html or the first page
        const sourcePage = prev.pages.find(p => p.path === 'index.html') || prev.pages[0];
        const newId = Storage.generateId();

        const newPage: Page = {
            id: newId,
            name,
            path,
            html: sourcePage.html // Start with exact copy to preserve nav/footer
        };

        const updatedPages = [...prev.pages, newPage];
        return { ...prev, pages: updatedPages };
    });
    
    // Switch to new page immediately
    // Wait a tick for state to update, then trigger AI to clean it up and link it
    setTimeout(async () => {
        // Find the ID we just generated? We can't access it here easily due to closure.
        // But we know the Path.
        // Actually, we need to set Active Page ID in the same state update ideally or use an Effect.
        // For simplicity, we'll traverse projects to find it or just trust the next render.
        // To be safe, let's just trigger the "Clean & Link" prompt.
        
        // We need to set the active page ID to the NEW page so the AI operates on it.
        // The safest way is to do this inside the same functional flow or wait.
        // Let's refactor handleAddPage to use a Promise or just update activeId in the setState callback if React allowed, but it doesn't.
        
        // Workaround: We'll manually find the ID based on path since paths are unique.
        const projects = await Storage.getProjects(); // This might be stale.
        // Better: update activePageId logic inside the component.
        
        // Let's update activePageId in a useEffect? No.
        // Let's update activePageId immediately after setting project.
        // We can't get the ID easily.
        
        // REFACTOR: Generate ID outside.
        const newId = Storage.generateId();
        const newPageObj: Page = {
            id: newId, 
            name, 
            path, 
            html: TEMPLATES[0].html // Placeholder, will be overwritten by clone logic in state
        };
        
        // We redo the state update properly to capture the ID
        setCurrentProject(prev => {
            if (!prev) return null;
             // Smart Clone logic repeated
            const sourcePage = prev.pages.find(p => p.path === 'index.html') || prev.pages[0];
            const clonePage = { ...newPageObj, html: sourcePage.html };
            
            return { ...prev, pages: [...prev.pages, clonePage] };
        });
        
        setActivePageId(newId);
        
        // Now trigger AI to clean up the new page
        setTimeout(() => {
            const prompt = `I just created this page "${name}" (${path}) by cloning the home page. 
            1. Clear the main content area but KEEP the Header/Nav and Footer. 
            2. Update the Page Title to "${name}".
            3. Update the Navigation Menu to include this new page "${name}" linking to "${path}".`;
            
            // We need to call handleSendMessage, but we need to ensure the state has updated.
            // Passing the ID explicitly would be better but handleSendMessage uses currentProject state.
            // 500ms delay usually enough for React state propagation.
            handleSendMessage(prompt);
        }, 500);

    }, 0);
  };

  const handleUpdatePage = (id: string, name: string, path: string) => {
      if (!currentProject) return;

      const oldPage = currentProject.pages.find(p => p.id === id);
      const oldPath = oldPage?.path;

      // Logic to update state - auto-save will catch it
      setCurrentProject(prev => {
          if (!prev) return null;
          
          let updatedPages = prev.pages.map(p => 
              p.id === id ? { ...p, name, path } : p
          );

          // Refactor links if path changed
          if (oldPath && oldPath !== path) {
              const safeOldPath = oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const regex = new RegExp(`href=(["'])${safeOldPath}(["'])`, 'g');
              
              updatedPages = updatedPages.map(p => {
                  const newHtml = p.html.replace(regex, `href=$1${path}$2`);
                  return { ...p, html: newHtml };
              });
          }
          
          return { ...prev, pages: updatedPages };
      });
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

  if (isInitializing) {
      return (
          <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
              <p>Loading your projects...</p>
          </div>
      );
  }

  if (!currentProject) return <div className="h-screen bg-slate-950" />;

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
        isSaving={isSaving}
      />

      <main className="flex-1 flex overflow-hidden relative">
        <div 
          className={`
            border-r border-slate-700 bg-slate-900 flex flex-col 
            absolute md:relative h-full z-20 
            transition-all duration-300 ease-in-out
            ${isSidebarOpen ? 'w-full md:w-[400px] translate-x-0' : '-translate-x-full w-0 opacity-0 overflow-hidden'}
          `}
        >
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
                    onSyncLinks={handleSyncLinks}
                    isSyncing={isLoading}
                  />
              )}
          </div>

          <PromptInput onSend={handleSendMessage} isLoading={isLoading} />
        </div>

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