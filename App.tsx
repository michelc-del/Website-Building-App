import React, { useState, useEffect, useCallback, useRef } from 'react';
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

  // Refs for async access to state
  const projectRef = useRef<Project | null>(null);

  // UI State
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'chat' | 'pages'>('chat');

  // Keep ref synced with state
  useEffect(() => {
    projectRef.current = currentProject;
  }, [currentProject]);

  // Prevent closing window while saving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSaving) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isSaving]);

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
            // We don't need to update projectsList here explicitly as getProjects will fetch fresh on next modal open,
            // but updating local state helps UI consistency if we display list immediately
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

  // Handle Internal Preview Navigation
  const handlePreviewNavigate = (path: string) => {
    if (!currentProject) return;
    
    // Normalize path: clean hash, query params, and leading slash
    const normalizedPath = path.split('#')[0].split('?')[0].replace(/^(\.\/|\/)/, '');
    
    const targetPage = currentProject.pages.find(p => p.path === normalizedPath);
    if (targetPage) {
        setActivePageId(targetPage.id);
        // If we are in 'Pages' tab, this updates the visual selection automatically
    } else {
        console.warn(`Page not found for path: ${path} (normalized: ${normalizedPath})`);
        // Optional: Could trigger a toast here saying "Page not found"
    }
  };

  // Helper to inject a master header/footer into a page's HTML using DOMParser
  const injectMasterNav = (html: string, header: string, footer: string) => {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Helper to create node from string safely
        const createNode = (str: string) => {
            const tempDoc = parser.parseFromString(str, 'text/html');
            return tempDoc.body.firstElementChild;
        };

        const newHeader = createNode(header);
        const newFooter = createNode(footer);

        // Header Logic
        if (newHeader) {
            const oldHeader = doc.querySelector('header');
            if (oldHeader) {
                oldHeader.replaceWith(newHeader);
            } else {
                // Try to find a nav bar to replace if no semantic header
                const oldNav = doc.querySelector('nav');
                if (oldNav && oldNav.parentElement === doc.body) {
                    oldNav.replaceWith(newHeader);
                } else {
                    doc.body.prepend(newHeader);
                }
            }
        }

        // Footer Logic
        if (newFooter) {
            const oldFooter = doc.querySelector('footer');
            if (oldFooter) {
                oldFooter.replaceWith(newFooter);
            } else {
                doc.body.append(newFooter);
            }
        }

        return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
    } catch (e) {
        console.error("DOM Injection failed, falling back to basic replace", e);
        // Fallback to simple replace if DOM parsing fails significantly
        let newHtml = html;
        if (newHtml.match(/<header[\s\S]*?<\/header>/i)) {
            newHtml = newHtml.replace(/<header[\s\S]*?<\/header>/i, header);
        } else {
            newHtml = newHtml.replace(/<body.*?>/, `$&${header}`);
        }
        if (newHtml.match(/<footer[\s\S]*?<\/footer>/i)) {
            newHtml = newHtml.replace(/<footer[\s\S]*?<\/footer>/i, footer);
        } else {
             newHtml = newHtml.replace('</body>', `${footer}</body>`);
        }
        return newHtml;
    }
  };

  const refreshGlobalNavigation = async (proj: Project) => {
    try {
        // Silent loading state handled by UI if needed, but this is usually background
        const pagesList = proj.pages.map(p => `- ${p.name}: "${p.path}"`).join('\n');
        
        // Ask AI for a Master Header/Footer
        const prompt = `
        Generate a standardized website Header and Footer based on this project structure:
        ${pagesList}

        1. The Header must contain a Navigation Menu with links to ALL pages listed above.
        2. The Footer must contain copyright info and simple links.
        3. Use semantic <header> and <footer> tags.
        4. Use Tailwind CSS for styling (responsive, modern, dark/light theme match).
        5. Return ONLY the HTML for the <header> and the <footer>. Do not wrap in <html> or <body>.
        `;

        const response = await sendMessageToGemini(prompt);
        
        // Clean markdown if present
        const content = response.content.replace(/```html/g, '').replace(/```/g, '');

        // Extract using basic regex to separate header/footer from AI response blob
        const headerMatch = content.match(/<header[\s\S]*?<\/header>/i);
        const footerMatch = content.match(/<footer[\s\S]*?<\/footer>/i);

        if (headerMatch || footerMatch) {
            const newHeader = headerMatch ? headerMatch[0] : '';
            const newFooter = footerMatch ? footerMatch[0] : '';

            setCurrentProject(prev => {
                if (!prev) return null;
                const updatedPages = prev.pages.map(page => {
                    return { 
                        ...page, 
                        html: injectMasterNav(page.html, newHeader, newFooter)
                    };
                });
                return { ...prev, pages: updatedPages };
            });
        }
    } catch (e) {
        console.error("Global Nav Sync Failed", e);
    }
  };

  const handleSendMessage = async (prompt: string, newPageOptions?: { name: string; filename: string; initialHtml?: string }): Promise<void> => {
    // Use Ref to ensure we have latest project even in async closures
    const currentProj = projectRef.current;
    if (!currentProj) return;
    
    let targetPageId = activePageId;
    let targetPage = currentProj.pages.find(p => p.id === activePageId);

    // Handle creation of a new page context if requested
    if (newPageOptions) {
        if (currentProj.pages.some(p => p.path.toLowerCase() === newPageOptions.filename.toLowerCase())) {
            alert("A page with this filename already exists.");
            return;
        }

        const newId = Storage.generateId();
        const newPage: Page = {
            id: newId,
            name: newPageOptions.name,
            path: newPageOptions.filename,
            html: newPageOptions.initialHtml || TEMPLATES[0].html 
        };

        // Immediate state update for the new page
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
      // Re-fetch project from Ref to ensure we have the new page included
      const latestProj = projectRef.current || currentProj;
      let allPages = latestProj.pages;

      // Double check if new page is in the list (in case state update hasn't propagated to ref yet)
      if (newPageOptions && targetPage && !allPages.find(p => p.id === targetPage.id)) {
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
      
      const projects = await Storage.getProjects();
      const p = projects.find(p => p.id === id);
      if (p) {
          p.name = newName;
          await Storage.saveProject(p);
      }
  };

  const handleRecoverData = async () => {
      const result = await Storage.recoverLegacyProjects();
      if (result.recovered > 0) {
          setProjectsList(result.projects);
          alert(`Deep Scan Complete!\n\nFound and restored ${result.recovered} project(s) that were missing.\n\nPlease check your project list.`);
      } else {
          alert("Deep Scan Complete.\n\nNo additional lost projects were found in this browser's storage.");
      }
  };

  const handleAddPage = async (name: string, path: string) => {
    if (!currentProject) return;
    
    // 1. Validation
    if (currentProject.pages.some(p => p.path === path)) {
        alert("A page with this filename already exists.");
        return;
    }

    // 2. Preparation: Clone the Home page
    const sourcePage = currentProject.pages.find(p => p.path === 'index.html') || currentProject.pages[0];
    const initialHtml = sourcePage ? sourcePage.html : TEMPLATES[0].html;
    
    // 3. Prompt Construction for New Page Content
    const prompt = `I am creating a new page named "${name}" with filename "${path}".
    
    ACTIONS REQUIRED:
    1. START with the layout provided.
    2. CLEAR the main content area (middle section) so it is ready for new content.
    3. KEEP the Header and Footer temporarily.
    4. UPDATE the Page Title to "${name}".
    
    Return the complete, valid HTML for this new page.`;

    // 4. Create the page and generate content (Atomic)
    await handleSendMessage(prompt, { name, filename: path, initialHtml });

    // 5. AUTOMATIC NAVIGATION REFRESH
    // Update links on ALL pages now that the new page exists
    if (projectRef.current) {
        await refreshGlobalNavigation(projectRef.current);
    }
  };

  const handleUpdatePage = async (id: string, name: string, path: string) => {
      if (!currentProject) return;

      const oldPage = currentProject.pages.find(p => p.id === id);
      const oldPath = oldPage?.path;

      setCurrentProject(prev => {
          if (!prev) return null;
          
          let updatedPages = prev.pages.map(p => 
              p.id === id ? { ...p, name, path } : p
          );

          // Simple link refactor for inline changes
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
      
      // Allow state to settle, then refresh navigation for consistency
      setTimeout(() => {
          if (projectRef.current) {
               refreshGlobalNavigation(projectRef.current);
          }
      }, 500);
  };

  const handleDeletePage = async (pageId: string) => {
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
      
      // Auto-refresh nav after delete
      setTimeout(() => {
          if (projectRef.current) {
              refreshGlobalNavigation(projectRef.current);
          }
      }, 500);
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
                        onNavigate={handlePreviewNavigate}
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
            onRecoverData={handleRecoverData}
        />
      )}
    </div>
  );
}