export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string; // This might be text or a description of the change
  type: 'text' | 'code_update';
  timestamp: number;
}

export interface Page {
  id: string;
  name: string; // e.g. "About Us"
  path: string; // e.g. "about.html"
  html: string;
}

export interface WebsiteState {
  html: string;
  version: number;
  lastUpdated: number;
}

export interface Project {
  id: string;
  name: string;
  // Deprecated single HTML support for migration, prefer pages array
  html?: string; 
  pages: Page[];
  messages: Message[];
  createdAt: number;
  lastUpdated: number;
  thumbnail?: string;
}

export type DeviceMode = 'desktop' | 'tablet' | 'mobile';

export interface ChatSessionConfig {
  apiKey: string;
}