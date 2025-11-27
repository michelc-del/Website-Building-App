import { get, set } from 'idb-keyval';
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
                const projects = JSON.parse(lsData);
                await set(STORAGE_KEY, projects);
                console.log("Migrated projects to IndexedDB");
                
                const activeId = localStorage.getItem(ACTIVE_ID_KEY);
                if (activeId) {
                    await set(ACTIVE_ID_KEY, activeId);
                }
                
                // Optional: Clear LS after successful migration
                // localStorage.removeItem(STORAGE_KEY);
                // localStorage.removeItem(ACTIVE_ID_KEY);
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

  const projects = await getProjects();
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
  
  await set(STORAGE_KEY, projects);
  await set(ACTIVE_ID_KEY, project.id);
};

export const deleteProject = async (id: string): Promise<Project[]> => {
  let projects = await getProjects();
  projects = projects.filter(p => p.id !== id);
  await set(STORAGE_KEY, projects);
  
  const activeId = await getLastActiveProjectId();
  if (activeId === id) {
    await set(ACTIVE_ID_KEY, null);
  }
  
  return projects;
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
