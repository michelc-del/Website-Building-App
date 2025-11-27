import { Project, Message, Page } from '../types';

const STORAGE_KEY = 'gemini_web_architect_projects';
const ACTIVE_ID_KEY = 'gemini_web_architect_active_id';

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const getProjects = (): Project[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const projects: Project[] = data ? JSON.parse(data) : [];
    
    // Migration: If old projects exist without pages, or pages array is empty/malformed, repair them.
    return projects.map(p => {
      // Check if pages is missing OR if it's not an array OR if it's an empty array
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

export const saveProject = (project: Project): void => {
  // SAFETY CHECK: Never save a project that has 0 pages. 
  // This prevents bugs from wiping out project data with an empty state.
  if (!project.pages || project.pages.length === 0) {
      console.warn("Attempted to save project with no pages. Aborting save to protect data.");
      return;
  }

  const projects = getProjects();
  const index = projects.findIndex(p => p.id === project.id);
  
  // Ensure we don't save the deprecated root html if pages exist
  const projectToSave = { ...project, lastUpdated: Date.now() };
  if (projectToSave.pages.length > 0) {
     delete projectToSave.html;
  }

  if (index >= 0) {
    projects[index] = projectToSave;
  } else {
    projects.push(projectToSave);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  localStorage.setItem(ACTIVE_ID_KEY, project.id);
};

export const deleteProject = (id: string): Project[] => {
  const projects = getProjects().filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  
  const activeId = localStorage.getItem(ACTIVE_ID_KEY);
  if (activeId === id) {
    localStorage.removeItem(ACTIVE_ID_KEY);
  }
  
  return projects;
};

export const getLastActiveProjectId = (): string | null => {
  return localStorage.getItem(ACTIVE_ID_KEY);
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

export const updateProjectName = (id: string, name: string): Project[] => {
    const projects = getProjects();
    const index = projects.findIndex(p => p.id === id);
    if (index >= 0) {
        projects[index].name = name;
        projects[index].lastUpdated = Date.now();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    }
    return projects;
};

export const updatePage = (projectId: string, pageId: string, updates: Partial<Page>): Project | null => {
    const projects = getProjects();
    const pIndex = projects.findIndex(p => p.id === projectId);
    
    if (pIndex >= 0) {
        const project = projects[pIndex];
        const pageIndex = project.pages.findIndex(p => p.id === pageId);
        
        if (pageIndex >= 0) {
            project.pages[pageIndex] = { ...project.pages[pageIndex], ...updates };
            project.lastUpdated = Date.now();
            projects[pIndex] = project;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
            return project;
        }
    }
    return null;
};

// --- Backup & Restore ---

export const exportAllData = (): string => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data || '[]';
};

export const importData = (jsonString: string): boolean => {
    try {
        const projects = JSON.parse(jsonString);
        if (!Array.isArray(projects)) throw new Error("Invalid format");
        
        // Basic validation
        const valid = projects.every(p => p.id && p.name && Array.isArray(p.pages));
        if (!valid) throw new Error("Invalid project structure");

        localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
        return true;
    } catch (e) {
        console.error("Import failed", e);
        return false;
    }
};