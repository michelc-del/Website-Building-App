import { get, set, update } from 'idb-keyval';
import { Project, Page } from '../types';

const STORAGE_KEY = 'gemini_web_architect_projects';
const ACTIVE_ID_KEY = 'gemini_web_architect_active_id';

export const generateId = () => Math.random().toString(36).substr(2, 9);

// Initialize storage and migrate from localStorage if needed
export const initStorage = async (): Promise<void> => {
    try {
        const existingIdbData = await get(STORAGE_KEY);
        if (!existingIdbData) {
            console.log("Checking for legacy data in localStorage...");
            const lsData = localStorage.getItem(STORAGE_KEY);
            if (lsData) {
                try {
                    const projects = JSON.parse(lsData);
                    // Ensure pages array exists on legacy data
                    const migratedProjects = Array.isArray(projects) ? projects.map((p: any) => {
                        if (!p.pages || !Array.isArray(p.pages) || p.pages.length === 0) {
                            return {
                                ...p,
                                pages: [{
                                    id: 'home',
                                    name: 'Home',
                                    path: 'index.html',
                                    html: p.html || '<!DOCTYPE html><html><body><h1>Home</h1></body></html>'
                                }]
                            };
                        }
                        return p;
                    }) : [];

                    if (migratedProjects.length > 0) {
                        await set(STORAGE_KEY, migratedProjects);
                        console.log("Migrated projects to IndexedDB");
                    }
                    
                    const activeId = localStorage.getItem(ACTIVE_ID_KEY);
                    if (activeId) {
                        await set(ACTIVE_ID_KEY, activeId);
                    }
                } catch (e) {
                    console.error("Migration parse error", e);
                }
            }
        }
    } catch (e) {
        console.error("Storage initialization failed", e);
    }
};

export const getProjects = async (): Promise<Project[]> => {
  try {
    const projects = (await get<Project[]>(STORAGE_KEY)) || [];
    
    // Migration/Repair logic
    return projects.map(p => {
      if (!p.pages || !Array.isArray(p.pages) || p.pages.length === 0) {
        return {
          ...p,
          pages: [{
            id: 'home',
            name: 'Home',
            path: 'index.html',
            html: p.html || '<!DOCTYPE html><html><body><h1>Home</h1></body></html>'
          }]
        };
      }
      return p;
    });
  } catch (e) {
    console.error("Failed to load projects", e);
    return [];
  }
};

export const saveProject = async (project: Project): Promise<void> => {
  if (!project.pages || project.pages.length === 0) {
      console.warn("Attempted to save project with no pages. Aborting save to protect data.");
      return;
  }

  // Use atomic update to prevent race conditions
  await update(STORAGE_KEY, (val) => {
    const projects = (val as Project[]) || [];
    const index = projects.findIndex(p => p.id === project.id);
    
    const projectToSave = { ...project, lastUpdated: Date.now() };
    if (projectToSave.pages.length > 0) {
        delete projectToSave.html;
    }

    if (index >= 0) {
        projects[index] = projectToSave;
    } else {
        projects.push(projectToSave);
    }
    return projects;
  });
  
  await set(ACTIVE_ID_KEY, project.id);
};

export const deleteProject = async (id: string): Promise<Project[]> => {
  await update(STORAGE_KEY, (val) => {
      const projects = (val as Project[]) || [];
      return projects.filter(p => p.id !== id);
  });
  
  const activeId = await getLastActiveProjectId();
  if (activeId === id) {
    await set(ACTIVE_ID_KEY, null);
  }
  
  return getProjects();
};

export const getLastActiveProjectId = async (): Promise<string | null> => {
  return await get<string>(ACTIVE_ID_KEY) || null;
};

export const createNewProject = (defaultHtml: string): Project => {
  const newProject: Project = {
    id: generateId(),
    name: 'Untitled Project',
    pages: [{
      id: generateId(),
      name: 'Home',
      path: 'index.html',
      html: defaultHtml
    }],
    messages: [],
    createdAt: Date.now(),
    lastUpdated: Date.now()
  };
  return newProject;
};

// --- Backup & Restore ---

export const recoverLegacyProjects = async (): Promise<{ recovered: number, projects: Project[] }> => {
    console.log("Starting Deep Scan Recovery...");
    try {
        const currentProjects = await getProjects();
        const currentIds = new Set(currentProjects.map(p => p.id));
        let restoredCount = 0;
        const updatedProjects = [...currentProjects];

        // Helper to process a potential project string
        const processPotentialData = (dataString: string | null) => {
            if (!dataString) return;
            try {
                const parsed = JSON.parse(dataString);
                const candidates = Array.isArray(parsed) ? parsed : [parsed];
                
                candidates.forEach((proj: any) => {
                    // Check if it looks like a project
                    if (proj && typeof proj === 'object' && proj.id && (proj.name || proj.html)) {
                        if (!currentIds.has(proj.id)) {
                             // Repair structure
                             const recoveredProject = { ...proj };
                             if (!recoveredProject.pages || recoveredProject.pages.length === 0) {
                                  recoveredProject.pages = [{
                                     id: 'home',
                                     name: 'Home',
                                     path: 'index.html',
                                     html: recoveredProject.html || '<!DOCTYPE html><html><body><h1>Restored</h1></body></html>'
                                  }];
                             }
                             
                             // Ensure it has a name
                             if (!recoveredProject.name) recoveredProject.name = "Recovered Project";

                             updatedProjects.push(recoveredProject);
                             currentIds.add(recoveredProject.id); // Prevent dupes within this loop
                             restoredCount++;
                             console.log(`Recovered project: ${recoveredProject.name} (${recoveredProject.id})`);
                        }
                    }
                });
            } catch (e) {
                // Ignore parsing errors for random keys
            }
        };

        // 1. Check Standard Keys
        processPotentialData(localStorage.getItem(STORAGE_KEY));
        
        // 2. Deep Scan ALL keys in localStorage
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key !== STORAGE_KEY && key !== ACTIVE_ID_KEY) {
                // Try to parse everything just in case
                const val = localStorage.getItem(key);
                processPotentialData(val);
            }
        }

        if (restoredCount > 0) {
            await set(STORAGE_KEY, updatedProjects);
            console.log(`Deep scan complete. Saved ${restoredCount} recovered projects.`);
        } else {
            console.log("Deep scan complete. No new projects found.");
        }
        
        return { recovered: restoredCount, projects: updatedProjects };
    } catch (e) {
        console.error("Recovery failed", e);
        return { recovered: 0, projects: [] };
    }
};

export const exportAllData = async (): Promise<string> => {
    const projects = await getProjects();
    return JSON.stringify(projects, null, 2);
};

export const importData = async (jsonString: string): Promise<boolean> => {
    try {
        if (!jsonString || typeof jsonString !== 'string') return false;

        let projects: any;
        try {
            projects = JSON.parse(jsonString);
        } catch (e) {
            console.error("JSON Parse Error", e);
            return false;
        }

        if (!Array.isArray(projects)) {
             if (projects && typeof projects === 'object' && projects.id) {
                 projects = [projects];
             } else {
                 return false;
             }
        }
        
        // Basic validation
        const valid = projects.every((p: any) => p && typeof p === 'object' && p.id && p.name);
        
        if (!valid) {
            return false;
        }

        await set(STORAGE_KEY, projects);
        return true;
    } catch (e) {
        console.error("Import logic failed", e);
        return false;
    }
};