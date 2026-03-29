
import { get, set, del, keys, clear } from 'idb-keyval';
import { EbookData, ProjectMetadata } from '../types';
import { auth } from './firebase';

// SECURITY: Helper to get current authenticated user
// Used for validation checks to prevent unauthorized access
export const getCurrentAuthUser = () => {
  try {
    return auth.currentUser;
  } catch (e) {
    console.warn('[Storage Security] Error getting current auth user:', e);
    return null;
  }
};

// SECURITY: Prefix all IndexedDB keys with the user's UID so each account
// has completely isolated storage, even on the same browser.
const getUserScopedKey = (key: string): string => {
  const user = auth.currentUser;
  if (user) {
    return `${user.uid}_${key}`;
  }
  return key;
};

export const STORAGE_KEYS = {
  EBOOK_DATA: 'manuscript_ebook_data', // Legacy key
  PROJECT_INDEX: 'manuscript_projects_index',
  INPUT_FORM: 'manuscript_input_form',
  ONBOARDING_SEEN: 'manuscript_coauthor_onboarding_seen'
};

export const getProjectKey = (id: string) => `manuscript_project_${id}`;
export const getProjectChatKey = (id: string) => `manuscript_chat_${id}`;
export const getProjectMemoryKey = (id: string) => `manuscript_memory_${id}`;
export const getProjectDraftKey = (id: string) => `manuscript_draft_${id}`;
export const getProjectSettingsKey = (id: string) => `manuscript_settings_${id}`;

// --- IndexedDB Wrappers (Async) ---

export const saveToDB = async (key: string, data: any) => {
  if (typeof window === 'undefined') return;
  try {
    await set(getUserScopedKey(key), data);
  } catch (e) {
    console.error(`IDB Save Failed for ${key}:`, e);
  }
};

export const loadFromDB = async <T>(key: string, fallback: T): Promise<T> => {
  if (typeof window === 'undefined') return fallback;
  try {
    const val = await get(getUserScopedKey(key));
    return val === undefined ? fallback : val;
  } catch (e) {
    console.error(`IDB Load Failed for ${key}:`, e);
    return fallback;
  }
};

export const deleteFromDB = async (key: string) => {
    if (typeof window === 'undefined') return;
    try {
        await del(getUserScopedKey(key));
    } catch (e) {
        console.error(`IDB Delete Failed for ${key}:`, e);
    }
};

// --- Project Management ---

export const getProjects = async (): Promise<ProjectMetadata[]> => {
    // Project Index is crucial, so we try to load it from IDB.
    // If missing, return empty.
    return loadFromDB<ProjectMetadata[]>(STORAGE_KEYS.PROJECT_INDEX, []);
};

export const loadProject = async (id: string): Promise<EbookData | null> => {
    return loadFromDB<EbookData | null>(getProjectKey(id), null);
};

export const saveProject = async (data: EbookData) => {
    // 1. Save full project data to IDB
    await saveToDB(getProjectKey(data.id), data);

    // 2. Update Index
    const projects = await getProjects();
    const existingIndex = projects.findIndex(p => p.id === data.id);
    
    const metadata: ProjectMetadata = {
        id: data.id,
        title: data.title,
        coverImage: data.coverImage,
        lastModified: Date.now(),
        wordCount: data.wordCount || 0,
        author: data.author,
        status: data.status 
    };

    if (existingIndex >= 0) {
        projects[existingIndex] = metadata;
    } else {
        projects.unshift(metadata); 
    }
    
    await saveToDB(STORAGE_KEYS.PROJECT_INDEX, projects);
};

export const deleteProject = async (id: string) => {
    // 1. Remove from Index
    const projects = await getProjects();
    const updatedProjects = projects.filter(p => p.id !== id);
    await saveToDB(STORAGE_KEYS.PROJECT_INDEX, updatedProjects);

    // 2. Remove all related data keys
    await deleteFromDB(getProjectKey(id));
    await deleteFromDB(getProjectChatKey(id));
    await deleteFromDB(getProjectMemoryKey(id));
    await deleteFromDB(getProjectDraftKey(id));
    await deleteFromDB(getProjectSettingsKey(id));
};

export const syncProjectIndex = async (): Promise<ProjectMetadata[]> => {
  const projects = await getProjects();
  let hasChanges = false;
  
  // We need to iterate sequentially or use Promise.all to load details
  const updatedProjects = await Promise.all(projects.map(async (meta) => {
      const fullProject = await loadProject(meta.id);
      
      if (fullProject) {
          const needsUpdate = 
            fullProject.coverImage !== meta.coverImage || 
            fullProject.title !== meta.title ||
            fullProject.status !== meta.status ||
            (fullProject.wordCount !== undefined && fullProject.wordCount !== meta.wordCount);

          if (needsUpdate) {
              hasChanges = true;
              return {
                  ...meta,
                  title: fullProject.title,
                  coverImage: fullProject.coverImage,
                  wordCount: fullProject.wordCount || meta.wordCount,
                  status: fullProject.status,
                  lastModified: Math.max(fullProject.lastModified, meta.lastModified)
              };
          }
      }
      return meta;
  }));

  if (hasChanges) {
      await saveToDB(STORAGE_KEYS.PROJECT_INDEX, updatedProjects);
  }

  return updatedProjects;
};

// DEPRECATED: Use saveToDB and loadFromDB directly. These aliases are kept for backwards compatibility
// but will be removed in the next major version. Migrate to the new names when updating code.
/** @deprecated Use saveToDB instead */
export const saveLocal = saveToDB;
/** @deprecated Use loadFromDB instead */
export const loadLocal = loadFromDB;

// --- Activity Tracking ---

export interface ActivityEntry {
  id: string;
  action: string;
  detail: string;
  timestamp: number;
}

const ACTIVITY_KEY = 'manuscript_user_activity';
const MAX_ACTIVITY_ENTRIES = 50;

export const logActivity = async (action: string, detail: string) => {
  const entries = await loadFromDB<ActivityEntry[]>(ACTIVITY_KEY, []);
  const entry: ActivityEntry = {
    id: crypto.randomUUID(),
    action,
    detail,
    timestamp: Date.now(),
  };
  entries.unshift(entry);
  // Keep only the most recent entries
  await saveToDB(ACTIVITY_KEY, entries.slice(0, MAX_ACTIVITY_ENTRIES));
};

export const getActivity = async (): Promise<ActivityEntry[]> => {
  return loadFromDB<ActivityEntry[]>(ACTIVITY_KEY, []);
};

// --- User Preferences ---

export interface UserPreferences {
  autosaveEnabled: boolean;
  autosaveInterval: number; // minutes
  defaultVoice: string;
  showWordCount: boolean;
  compactSidebar: boolean;
  confirmBeforeDelete: boolean;
}

const PREFERENCES_KEY = 'manuscript_user_preferences';

export const DEFAULT_PREFERENCES: UserPreferences = {
  autosaveEnabled: true,
  autosaveInterval: 5,
  defaultVoice: 'Kore',
  showWordCount: true,
  compactSidebar: false,
  confirmBeforeDelete: true,
};

export const getPreferences = async (): Promise<UserPreferences> => {
  return loadFromDB<UserPreferences>(PREFERENCES_KEY, DEFAULT_PREFERENCES);
};

export const savePreferences = async (prefs: UserPreferences) => {
  await saveToDB(PREFERENCES_KEY, prefs);
};
