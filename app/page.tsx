
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
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';

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
const SESSION_VIEW_KEY = 'typoscale_session_view';
const SESSION_PROJECT_KEY = 'typoscale_session_project_id';

const App: React.FC = () => {
  const { user } = useAuth();
  const { user: userProfile, isLoading: isUserProfileLoading } = useUser();
  
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
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
  const [isJustLoggedIn, setIsJustLoggedIn] = useState(false);

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
  // CRITICAL: Only restore DASHBOARD/EDITOR if user is authenticated - prevent showing dashboard to logged-out users
  useEffect(() => {
    if (typeof window === 'undefined') return; // Skip on server
    
    const restoreSession = async () => {
      const savedView = sessionStorage.getItem(SESSION_VIEW_KEY) as ViewState | null;
      const savedProjectId = sessionStorage.getItem(SESSION_PROJECT_KEY);

      // CRITICAL: Only restore protected views (EDITOR/DASHBOARD) if user is authenticated
      if (!user && (savedView === ViewState.EDITOR || savedView === ViewState.DASHBOARD)) {
        console.log('[Session] User not authenticated but saved view is protected view, staying on LANDING');
        sessionStorage.removeItem(SESSION_VIEW_KEY);
        sessionStorage.removeItem(SESSION_PROJECT_KEY);
        return;
      }

      if (savedView === ViewState.EDITOR && savedProjectId && user) {
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
      } else if (savedView === ViewState.WIZARD && savedProjectId && user) {
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
  }, [user]);

  // Sync projects on load & Init Analytics
  useEffect(() => {
    syncProjectIndex();
    initAnalytics(); // Initialize Google Analytics
  }, []);

  // Reset logging out flag when user actually logs out (auth state cleared by Firebase)
  useEffect(() => {
    if (!user && isLoggingOut) {
      console.log('[Logout] Auth state cleared, logout complete');
      setIsLoggingOut(false);
    }
  }, [user, isLoggingOut]);

  // CRITICAL SECURITY: Detect user changes and clear IndexedDB to prevent data leakage
  // When User A logs out and User B logs in on the same browser:
  // 1. Firebase auth state changes from User A to User B
  // 2. IndexedDB still contains User A's projects
  // 3. This effect detects the user change and clears IndexedDB
  useEffect(() => {
    if (!user) return; // Not logged in
    
    const currentUserId = user.uid;
    const storedUserId = sessionStorage.getItem('_current_user_session_id');
    
    if (storedUserId && storedUserId !== currentUserId) {
      // User changed - clear IndexedDB to prevent data leakage
      console.log('[Security] User changed (was:', storedUserId, 'now:', currentUserId, ') - clearing IndexedDB');
      try {
        // Delete the IndexedDB database to clear all projects
        const deleteRequest = window.indexedDB.deleteDatabase('DefaultDatabase');
        deleteRequest.onsuccess = () => {
          console.log('[Security] IndexedDB cleared successfully');
          // Clear session storage too
          sessionStorage.removeItem(SESSION_VIEW_KEY);
          sessionStorage.removeItem(SESSION_PROJECT_KEY);
        };
        deleteRequest.onerror = () => {
          console.warn('[Security] Failed to clear IndexedDB, but continuing');
        };
      } catch (e) {
        console.warn('[Security] Error clearing IndexedDB:', e);
      }
    }
    
    // Always update the stored user ID for future comparisons
    sessionStorage.setItem('_current_user_session_id', currentUserId);
  }, [user?.uid]);

  // SINGLE UNIFIED ROUTING DECISION - Runs ONCE when subscription data loads
  // After routing decision is made, this effect stops interfering
  useEffect(() => {
    // Don't run if we're logging out
    if (isLoggingOut) return;
    
    // Only run when we have the auth data we need
    if (!user || isUserProfileLoading || hasCheckedSubscription) return;
    
    // Mark that we've made a routing decision (prevents this effect from running again)
    setHasCheckedSubscription(true);
    
    // Route based on subscription status - SINGLE URL CHANGE, NO FLASHING
    if (isJustLoggedIn) {
      setIsJustLoggedIn(false);
      
      // CRITICAL SECURITY CHECK: Is this a NEW account with NO subscription data?
      // New users should NOT see dashboard - they need to subscribe first
      // Check for subscriptionStatus (not just userProfile existence)
      // because new accounts have a userProfile object but no subscriptionStatus property
      if (!userProfile?.subscriptionStatus) {
        console.log('[Routing] New account detected - no subscription data exists, redirecting to pricing');
        window.location.href = '/pricing?from=login';
        return;
      }
      
      const isSubscribed = userProfile.subscriptionStatus === 'active';
      
      if (isSubscribed) {
        console.log('[Routing] Login - subscribed user → DASHBOARD');
        setViewState(ViewState.DASHBOARD);
      } else {
        console.log('[Routing] Login - unsubscribed user → PRICING');
        window.location.href = '/pricing?from=login';
      }
    } else {
      // Returning authenticated user
      const isSubscribed = userProfile?.subscriptionStatus === 'active';
      if (isSubscribed && viewState === ViewState.LANDING) {
        console.log('[Routing] Returning - subscribed user viewing LANDING → DASHBOARD');
        setViewState(ViewState.DASHBOARD);
      }
    }
  }, [user, userProfile, isUserProfileLoading, isJustLoggedIn, hasCheckedSubscription, isLoggingOut]);

  // Handle direct=dashboard query param (from pricing page redirect when user is subscribed)
  // This allows subscribed users to skip LANDING page and go straight to DASHBOARD
  useEffect(() => {
    if (typeof window === 'undefined' || !user) return;
    
    const params = new URLSearchParams(window.location.search);
    const directDashboard = params.get('direct') === 'dashboard';
    
    if (directDashboard && viewState === ViewState.LANDING && user) {
      console.log('[Auth] Direct redirect from pricing, going to dashboard');
      setViewState(ViewState.DASHBOARD);
      // Clean up the query param from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user, viewState]);

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
    // Keep DASHBOARD in sessionStorage since user is still logged in and in dashboard
    sessionStorage.removeItem(SESSION_PROJECT_KEY);
  };

  const handleExit = () => {
      // Signal that we're logging out - prevents routing effects from interfering
      setIsLoggingOut(true);
      
      // CRITICAL SECURITY: Clear IndexedDB and all user session data
      // This prevents the next user who logs in on this browser from seeing this user's data
      console.log('[Logout] Clearing user data from browser storage');
      try {
        // Delete the IndexedDB database to clear all projects
        const deleteRequest = window.indexedDB.deleteDatabase('DefaultDatabase');
        deleteRequest.onsuccess = () => {
          console.log('[Logout] IndexedDB cleared');
        };
        deleteRequest.onerror = () => {
          console.warn('[Logout] Failed to clear IndexedDB');
        };
      } catch (e) {
        console.warn('[Logout] Error clearing IndexedDB:', e);
      }
      
      // Clear all session state
      sessionStorage.removeItem(SESSION_VIEW_KEY);
      sessionStorage.removeItem(SESSION_PROJECT_KEY);
      sessionStorage.removeItem('_current_user_session_id'); // Clear stored user ID
      
      // Reset routing state for next login
      setHasCheckedSubscription(false);
      setIsJustLoggedIn(false);
      
      // Update UI to LANDING
      setViewState(ViewState.LANDING);
      setEbookData(null);
      setPendingCoverImage(null);
      
      // Sign out from Firebase - this will trigger auth state changes
      signOut(auth)
        .then(() => {
          console.log('[Logout] Successfully signed out');
          // Logging out flag will be reset by the useEffect that watches `user`
        })
        .catch(err => console.error('[Logout] Sign out error:', err));
      
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
            onLogin={() => {
              // DON'T set viewState here - let the routing effect handle routing decisions
              // Setting it here causes a race condition where Dashboard renders before subscription check
              setIsJustLoggedIn(true);
              // Keep view state as is - the routing effect will decide where to send the user
            }} 
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
