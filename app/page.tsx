
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Dashboard from '../components/Dashboard';
import { InputForm } from '../components/InputForm';
import { EbookDisplay } from '../components/EbookDisplay';
import ImageStudio from '../components/ImageStudio';
import ResearchStudio from '../components/ResearchStudio';
import RemixEngine from '../components/RemixEngine';
import AgentCommandCenter from '../components/AgentCommandCenter';
import { ProfilePage } from '../components/ProfilePage';
import { LandingPage } from '../components/LandingPage';
import { AuthPage } from '../components/AuthPage';
import { FeaturesPage } from '../components/FeaturesPage';
import { EbookData, FrontMatter, ProjectBlueprint, ProjectMemory } from '../types';
import { saveProject, loadProject, syncProjectIndex, logActivity } from '../services/storage';
import { initAnalytics, trackEvent } from '../services/analytics';
import { Bot, Layout, Image as ImageIcon, ArrowLeft, Loader2 } from 'lucide-react';
import { ToastProvider } from '../components/ToastContext';
import { useAuth } from '../components/AuthProvider';
import { useUser } from '../hooks/useUser';

enum ViewState {
  LANDING = 'LANDING',
  DASHBOARD = 'DASHBOARD',
  WIZARD = 'WIZARD',
  EDITOR = 'EDITOR',
  IMAGE_STUDIO = 'IMAGE_STUDIO',
  RESEARCH_STUDIO = 'RESEARCH_STUDIO',
  REMIX_ENGINE = 'REMIX_ENGINE',
  AGENT_COMMAND = 'AGENT_COMMAND',
  AUTH = 'AUTH',
  FEATURES = 'FEATURES',
  PROFILE = 'PROFILE'
}

const EditorSkeleton = () => (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col">
        {/* Fake Header */}
        <div className="h-16 bg-white/50 border-b border-slate-200 animate-pulse w-full fixed top-0 z-20" />
        
        <div className="flex flex-grow relative pt-20">
            {/* Fake Sidebar */}
            <div className="hidden lg:block fixed left-4 top-24 bottom-24 w-12 rounded-full bg-slate-200/50 animate-pulse" />
            
            {/* Fake Page */}
            <div className="flex-grow flex justify-center px-4 pb-32">
                <div className="w-full max-w-[6in] h-auto min-h-[50vh] sm:h-[9in] bg-white shadow-sm border border-slate-200 rounded-sm p-6 sm:p-16 space-y-8 mt-10">
                    <div className="h-12 bg-slate-100 rounded w-3/4 mx-auto mb-12 animate-pulse" />
                    <div className="space-y-4">
                        <div className="h-3 bg-slate-100 rounded w-full animate-pulse" />
                        <div className="h-3 bg-slate-100 rounded w-full animate-pulse" />
                        <div className="h-3 bg-slate-100 rounded w-full animate-pulse" />
                        <div className="h-3 bg-slate-100 rounded w-5/6 animate-pulse" />
                    </div>
                    <div className="space-y-4 pt-4">
                        <div className="h-3 bg-slate-100 rounded w-full animate-pulse" />
                        <div className="h-3 bg-slate-100 rounded w-11/12 animate-pulse" />
                        <div className="h-3 bg-slate-100 rounded w-full animate-pulse" />
                    </div>
                </div>
            </div>
        </div>
    </div>
);

// Session persistence keys
const SESSION_VIEW_KEY = 'manuscale_session_view';
const SESSION_PROJECT_KEY = 'manuscale_session_project_id';

const App: React.FC = () => {
  const { user } = useAuth();
  const { user: userProfile, isLoading: isUserProfileLoading } = useUser();
  
  // Default to LANDING page (always safe for SSR)
  const [viewState, setViewState] = useState<ViewState>(ViewState.LANDING);
  const [ebookData, setEbookData] = useState<EbookData | null>(null);
  const [initialWizardTopic, setInitialWizardTopic] = useState('');
  const [crystallizedBlueprint, setCrystallizedBlueprint] = useState<ProjectBlueprint | undefined>(undefined);
  const [crystallizedMemory, setCrystallizedMemory] = useState<ProjectMemory | undefined>(undefined);
  const [isProjectLoading, setIsProjectLoading] = useState(false);
  
  // Track if we should reopen the Publish Wizard when returning to the Editor
  const [returnToWizard, setReturnToWizard] = useState(false);
  
  // Bridge state for creating a project from Image Studio
  const [pendingCoverImage, setPendingCoverImage] = useState<string | null>(null);
  const [authIsLogin, setAuthIsLogin] = useState(true);
  const [hasCheckedSubscription, setHasCheckedSubscription] = useState(false);

  // Use a ref to keep track of the latest ebookData without forcing re-creation of callbacks
  const ebookDataRef = useRef<EbookData | null>(null);

  useEffect(() => {
    ebookDataRef.current = ebookData;
  }, [ebookData]);

  // Persist viewState to sessionStorage so page reloads preserve navigation
  useEffect(() => {
    sessionStorage.setItem(SESSION_VIEW_KEY, viewState);
  }, [viewState]);

  // On mount: restore session state from sessionStorage (survives page reloads)
  useEffect(() => {
    if (typeof window === 'undefined') return; // Skip on server
    
    const restoreSession = async () => {
      const savedView = sessionStorage.getItem(SESSION_VIEW_KEY) as ViewState | null;
      const savedProjectId = sessionStorage.getItem(SESSION_PROJECT_KEY);

      if (savedView === ViewState.EDITOR && savedProjectId) {
        setIsProjectLoading(true);
        try {
          const data = await loadProject(savedProjectId);
          if (data) {
            setEbookData(data);
            setViewState(ViewState.EDITOR);
          } else {
            // Project not found, fall back to dashboard
            setViewState(ViewState.DASHBOARD);
          }
        } catch {
          setViewState(ViewState.DASHBOARD);
        } finally {
          setIsProjectLoading(false);
        }
      } else if (savedView === ViewState.WIZARD && savedProjectId) {
        // If we were in the wizard mid-drafting, recover by opening the project in the editor
        setIsProjectLoading(true);
        try {
          const data = await loadProject(savedProjectId);
          if (data) {
            setEbookData(data);
            setViewState(ViewState.EDITOR);
          } else {
            setViewState(ViewState.DASHBOARD);
          }
        } catch {
          setViewState(ViewState.DASHBOARD);
        } finally {
          setIsProjectLoading(false);
        }
      }
    };
    restoreSession();
  }, []);

  // Sync projects on load & Init Analytics
  useEffect(() => {
    syncProjectIndex();
    initAnalytics(); // Initialize Google Analytics
  }, []);

  // Check subscription after user logs in
  // If user is logged in but not subscribed, redirect to pricing page
  useEffect(() => {
    if (!user || isUserProfileLoading || hasCheckedSubscription) return;

    // User is logged in and profile data has loaded
    const isSubscribed = userProfile?.subscriptionStatus === 'active';

    if (!isSubscribed) {
      // User is not subscribed, redirect to pricing page
      setHasCheckedSubscription(true);
      window.location.href = '/pricing';
    } else {
      // User is subscribed, allow them to access the dashboard
      setHasCheckedSubscription(true);
    }
  }, [user, userProfile, isUserProfileLoading, hasCheckedSubscription]);

  const handleEnterApp = async (topic?: string) => {
      proceedToApp(topic);
  };

  const proceedToApp = (topic?: string) => {
      if (topic) {
          // Express Entry: Go straight to Wizard with topic
          setEbookData(null);
          setInitialWizardTopic(topic);
          setCrystallizedMemory(undefined); // Strict cleanup
          setViewState(ViewState.WIZARD);
          trackEvent('express_start', { from: 'landing' });
          logActivity('express_start', topic || 'Quick start');
      } else {
          setViewState(ViewState.DASHBOARD);
      }
  };

  const handleCreateNew = () => {
    setEbookData(null);
    setInitialWizardTopic('');
    setCrystallizedBlueprint(undefined);
    setCrystallizedMemory(undefined); // Ensure no old memory persists
    setPendingCoverImage(null);
    setViewState(ViewState.WIZARD);
    trackEvent('start_new_project_flow');
    logActivity('start_new_project_flow', 'Started new project');
  };

  const handleOpenProject = async (id: string) => {
    setIsProjectLoading(true);
    try {
        const data = await loadProject(id);
        if (data) {
          setEbookData(data);
          sessionStorage.setItem(SESSION_PROJECT_KEY, id);
          setViewState(ViewState.EDITOR);
          trackEvent('open_project', { project_id: id, type: data.blueprint?.type });
          logActivity('open_project', data.title || id);
        }
    } finally {
        setIsProjectLoading(false);
    }
  };

  const handleWizardComplete = async (data: EbookData) => {
    // Inject pending cover if exists
    let finalData = data;
    if (pendingCoverImage) {
        finalData = { ...data, coverImage: pendingCoverImage };
        // Clean up pending
        setPendingCoverImage(null);
    }

    setEbookData(finalData);
    sessionStorage.setItem(SESSION_PROJECT_KEY, finalData.id);
    await saveProject(finalData);
    setViewState(ViewState.EDITOR);
    trackEvent('project_created', { type: data.blueprint?.type, genre: data.blueprint?.genre });
    logActivity('project_created', data.title || 'New project');
  };

  // Memoized handlers to prevent infinite update loops in child components
  const handleUpdateEbook = useCallback(async (pages: string[], frontMatter?: FrontMatter, extra?: Partial<EbookData>) => {
    const currentData = ebookDataRef.current;
    if (!currentData) return;
    
    // Estimate word count from HTML pages
    const wordCount = pages.length > 0 
      ? pages.join(' ').replace(/<[^>]*>?/gm, '').split(/\s+/).length 
      : currentData.wordCount;
    
    const updatedData: EbookData = {
      ...currentData,
      ...extra,
      pages: pages.length > 0 ? pages : currentData.pages, // Fallback if pages array is empty
      lastModified: Date.now(),
      wordCount,
      frontMatter: frontMatter || extra?.frontMatter || currentData.frontMatter
    };
    
    // CRITICAL FIX: Update ref immediately
    ebookDataRef.current = updatedData;
    
    setEbookData(updatedData);
    await saveProject(updatedData);
  }, []);

  const handleMetadataUpdate = useCallback(async (updates: Partial<EbookData>) => {
      const currentData = ebookDataRef.current;
      if (!currentData) return;
      
      const updatedData = { ...currentData, ...updates, lastModified: Date.now() };
      
      // CRITICAL FIX: Update ref immediately
      ebookDataRef.current = updatedData;
      
      setEbookData(updatedData);
      await saveProject(updatedData);
  }, []);

  const handleSetCoverImage = useCallback(async (image: string | null) => {
    const currentData = ebookDataRef.current;
    if (!currentData) return;
    
    // Clear the marketing mockup if the cover changes to force regeneration
    let newMarketing = currentData.marketing;
    if (newMarketing) {
        newMarketing = { ...newMarketing, mockupImage: undefined };
    }

    const updatedData = { 
        ...currentData, 
        coverImage: image, 
        marketing: newMarketing,
        lastModified: Date.now() 
    };
    
    // CRITICAL FIX: Update ref immediately
    ebookDataRef.current = updatedData;
    
    setEbookData(updatedData);
    await saveProject(updatedData);
  }, []);

  const handleBackToDashboard = () => {
    setViewState(ViewState.DASHBOARD);
    setEbookData(null);
    setReturnToWizard(false);
    setPendingCoverImage(null);
    sessionStorage.removeItem(SESSION_PROJECT_KEY);
  };

  const handleExit = () => {
      setViewState(ViewState.LANDING);
      setEbookData(null);
      setPendingCoverImage(null);
      sessionStorage.removeItem(SESSION_PROJECT_KEY);
      trackEvent('exit_studio');
      logActivity('exit_studio', ebookDataRef.current?.title || 'Exited editor');
  };

  const handleCrystallizeProject = (blueprint: ProjectBlueprint, memory: ProjectMemory) => {
      setCrystallizedBlueprint(blueprint);
      setCrystallizedMemory(memory);
      setViewState(ViewState.WIZARD);
      trackEvent('crystallize_project_start');
  };

  const renderContent = () => {
    if (isProjectLoading) {
        return <EditorSkeleton />;
    }

    switch (viewState) {
      case ViewState.LANDING:
        return (
          <LandingPage 
            onEnterApp={handleEnterApp} 
            onGoToAuth={(isLogin = true) => {
              setAuthIsLogin(isLogin);
              setViewState(ViewState.AUTH);
            }} 
            onGoToFeatures={() => setViewState(ViewState.FEATURES)}
            isLoggedIn={false} 
          />
        );

      case ViewState.FEATURES:
        return <FeaturesPage onBack={() => setViewState(ViewState.LANDING)} />;

      case ViewState.AUTH:
        return (
          <AuthPage 
            onLogin={() => setViewState(ViewState.DASHBOARD)} 
            onBack={() => setViewState(ViewState.LANDING)} 
            defaultIsLogin={authIsLogin}
          />
        );

      case ViewState.WIZARD:
        return (
          <div className="min-h-screen bg-slate-50">
             <div className="p-4">
                <button onClick={handleBackToDashboard} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold mb-4">
                  <ArrowLeft size={16}/> Back to Library
                </button>
             </div>
             <InputForm 
                onGenerate={handleWizardComplete} 
                initialTopic={initialWizardTopic}
                initialBlueprint={crystallizedBlueprint}
                initialMemory={crystallizedMemory} // Will be undefined if from Remix or Scratch
             />
          </div>
        );
      
      case ViewState.EDITOR:
        if (!ebookData) return <div className="p-10 text-center">No project loaded.</div>;
        return (
          <div className="min-h-screen bg-[#f8f9fa]">
             <div className="fixed top-4 left-4 z-50">
                <button onClick={handleBackToDashboard} className="p-2 bg-white rounded-full shadow-md text-slate-400 hover:text-slate-900 border border-slate-200 transition-colors" title="Back to Dashboard">
                  <Layout size={20}/>
                </button>
             </div>
             <EbookDisplay 
               data={ebookData} 
               onUpdate={handleUpdateEbook}
               onSetCover={handleSetCoverImage}
               onBackToDashboard={handleBackToDashboard}
               onOpenCoverStudio={(fromWizard?: boolean) => {
                   setReturnToWizard(!!fromWizard);
                   setViewState(ViewState.IMAGE_STUDIO);
                   trackEvent('open_cover_studio', { from_wizard: !!fromWizard });
               }}
               onOpenCoAuthor={() => {
                   // Always open Research Studio for Non-Fiction (The Authority Engine)
                   setViewState(ViewState.RESEARCH_STUDIO);
                   trackEvent('open_context_studio', { type: 'research' });
               }}
               initialWizardState={returnToWizard}
               onResetWizardState={() => setReturnToWizard(false)}
             />
          </div>
        );

      case ViewState.IMAGE_STUDIO:
         // Determine if we are in "Project Mode" (editing existing cover) or "Standalone Mode" (dashboard visualizer)
         const isProjectMode = !!ebookData;
         
         return (
             <ImageStudio 
                onSetCover={isProjectMode ? async (img: string | null) => {
                    await handleSetCoverImage(img);
                    if(ebookData) setViewState(ViewState.EDITOR);
                } : undefined}
                onCreateProject={!isProjectMode ? (image: string, prompt: string) => {
                    // Reverse-engineer flow
                    setPendingCoverImage(image);
                    setInitialWizardTopic(prompt);
                    setCrystallizedMemory(undefined); // Clear memory
                    setViewState(ViewState.WIZARD);
                    trackEvent('create_project_from_art');
                } : undefined}
                onUpdateMetadata={handleMetadataUpdate}
                initialImage={ebookData?.coverImage}
                projectTitle={ebookData?.title}
                subtitle={ebookData?.blueprint?.subtitle}
                author={ebookData?.author}
                genre={ebookData?.blueprint?.genre}
                autoPrompt={ebookData?.blueprint?.coverPrompt || ebookData?.blueprint?.summary}
                visualStyle={ebookData?.blueprint?.visualStyle}
                onClose={() => isProjectMode ? setViewState(ViewState.EDITOR) : setViewState(ViewState.DASHBOARD)}
            />
         );

      case ViewState.RESEARCH_STUDIO:
          return (
             <ResearchStudio 
                projectId={ebookData?.id}
                onBack={() => ebookData ? setViewState(ViewState.EDITOR) : setViewState(ViewState.DASHBOARD)}
                onCreateProject={handleCrystallizeProject}
            />
          );

      case ViewState.REMIX_ENGINE:
          return (
              <RemixEngine 
                  onBack={() => setViewState(ViewState.DASHBOARD)}
                  onCreateProject={(blueprint, memory) => {
                      setCrystallizedBlueprint(blueprint);
                      setCrystallizedMemory(memory);
                      setViewState(ViewState.WIZARD);
                      trackEvent('remix_project_start');
                  }}
              />
          );

      case ViewState.AGENT_COMMAND:
          return (
              <AgentCommandCenter 
                  onBack={() => setViewState(ViewState.DASHBOARD)}
              />
          );

      case ViewState.PROFILE:
          return (
              <ProfilePage 
                  user={user}
                  onBack={() => setViewState(ViewState.DASHBOARD)}
              />
          );

      case ViewState.DASHBOARD:
      default:
        return (
          <Dashboard 
            onOpenProject={handleOpenProject} 
            onCreateNew={handleCreateNew}
            onOpenRemixEngine={() => {
                setEbookData(null); 
                setCrystallizedBlueprint(undefined);
                setCrystallizedMemory(undefined); // Strict cleanup
                setViewState(ViewState.REMIX_ENGINE);
                trackEvent('open_remix_engine');
                logActivity('open_remix_engine', 'Opened Remix Engine');
            }}
            onOpenResearchStudio={() => {
                setEbookData(null); // Ensure we aren't editing an existing book
                setViewState(ViewState.RESEARCH_STUDIO);
                trackEvent('open_research_studio');
                logActivity('open_research_studio', 'Opened Research Studio');
            }}
            onOpenAgent={() => {
                setEbookData(null); // Separate tool
                setViewState(ViewState.AGENT_COMMAND);
                trackEvent('open_agent_command');
                logActivity('open_agent_command', 'Opened Agent Command Center');
            }}
            onViewProfile={() => {
                setViewState(ViewState.PROFILE);
                trackEvent('open_profile');
                logActivity('open_profile', 'Viewed profile');
            }}
            onExit={handleExit}
          />
        );
    }
  };

  return (
    <ToastProvider>
      <div className="min-h-screen font-sans text-slate-900 bg-slate-50 selection:bg-primary-100 selection:text-primary-900" suppressHydrationWarning>
          {renderContent()}
      </div>
    </ToastProvider>
  );
};

export default App;
