'use client'

import { useEffect, useState, useRef } from 'react';
import { HiExclamationTriangle } from 'react-icons/hi2';

const TAB_KEY = 'single-tab-guard-active-tab5';
const TAB_TIMESTAMP_KEY = 'single-tab-guard-timestamp';

function generateTabId() {
  return `${Date.now()}-${Math.random()}`;
}

export default function SingleTabGuard({ children }: { children: React.ReactNode }) {
  const [blocked, setBlocked] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [showChoice, setShowChoice] = useState(false);
  const tabIdRef = useRef<string>(generateTabId());

  useEffect(() => {
    const tabId = tabIdRef.current;
    const now = Date.now();
    const TIMEOUT_MS = 30000; // 30 seconds timeout
    
    console.log('🔍 [SINGLE-TAB] Initializing tab guard for tab:', tabId);
    
    // Check if there's an existing active tab
    const existingTabId = localStorage.getItem(TAB_KEY);
    const existingTimestamp = localStorage.getItem(TAB_TIMESTAMP_KEY);
    const existingTime = existingTimestamp ? parseInt(existingTimestamp) : 0;
    
    // If there's an existing tab, check if it's still active (not timed out)
    if (existingTabId && existingTabId !== tabId) {
      const timeSinceLastActivity = now - existingTime;
      
      if (timeSinceLastActivity < TIMEOUT_MS) {
        // Another tab is still active, show choice to user
        console.log('🔍 [SINGLE-TAB] Another tab is active, showing choice');
        setShowChoice(true);
        setInitialized(true);
        return;
      } else {
        // The existing tab has timed out, we can take over
        console.log('🔍 [SINGLE-TAB] Existing tab timed out, taking over');
        localStorage.removeItem(TAB_KEY);
        localStorage.removeItem(TAB_TIMESTAMP_KEY);
      }
    }
    
    // Claim the slot for this tab
    localStorage.setItem(TAB_KEY, tabId);
    localStorage.setItem(TAB_TIMESTAMP_KEY, now.toString());
    setBlocked(false);
    setInitialized(true);
    console.log('🔍 [SINGLE-TAB] Tab guard initialized successfully');

    // Update timestamp periodically to show this tab is still active
    const updateTimestamp = () => {
      if (localStorage.getItem(TAB_KEY) === tabId) {
        localStorage.setItem(TAB_TIMESTAMP_KEY, Date.now().toString());
      }
    };

    // Update timestamp every 10 seconds
    const timestampInterval = setInterval(updateTimestamp, 10000);

    // Listen for changes from other tabs
    const onStorage = (e: StorageEvent) => {
      if (e.key === TAB_KEY) {
        console.log('🔍 [SINGLE-TAB] Storage event - key:', e.key, 'newValue:', e.newValue, 'oldValue:', e.oldValue);
        
        if (e.newValue === tabId) {
          // This tab is now active
          setBlocked(false);
          setShowChoice(false);
          localStorage.setItem(TAB_TIMESTAMP_KEY, Date.now().toString());
        } else if (e.newValue && e.newValue !== tabId) {
          // Another tab is now active - show choice instead of blocking immediately
          if (!blocked) {
            setShowChoice(true);
          }
        } else if (!e.newValue) {
          // No active tab, we can take over
          localStorage.setItem(TAB_KEY, tabId);
          localStorage.setItem(TAB_TIMESTAMP_KEY, Date.now().toString());
          setBlocked(false);
          setShowChoice(false);
        }
      }
    };
    
    window.addEventListener('storage', onStorage);

    // On unload, release the slot if this tab is the active one
    const onUnload = () => {
      if (localStorage.getItem(TAB_KEY) === tabId) {
        console.log('🔍 [SINGLE-TAB] Tab unloading, releasing slot');
        localStorage.removeItem(TAB_KEY);
        localStorage.removeItem(TAB_TIMESTAMP_KEY);
      }
    };
    
    window.addEventListener('beforeunload', onUnload);

    return () => {
      clearInterval(timestampInterval);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('beforeunload', onUnload);
      if (localStorage.getItem(TAB_KEY) === tabId) {
        localStorage.removeItem(TAB_KEY);
        localStorage.removeItem(TAB_TIMESTAMP_KEY);
      }
    };
  }, []);

  const handleUseThisTab = () => {
    const tabId = tabIdRef.current;
    console.log('🔍 [SINGLE-TAB] User chose to use this tab:', tabId);
    
    // Force take over by clearing existing tab and claiming this one
    localStorage.removeItem(TAB_KEY);
    localStorage.removeItem(TAB_TIMESTAMP_KEY);
    
    // Small delay to ensure cleanup, then claim
    setTimeout(() => {
      localStorage.setItem(TAB_KEY, tabId);
      localStorage.setItem(TAB_TIMESTAMP_KEY, Date.now().toString());
      setShowChoice(false);
      setBlocked(false);
    }, 100);
  };

  const handleUseOtherTab = () => {
    console.log('🔍 [SINGLE-TAB] User chose to use other tab, blocking this one');
    setShowChoice(false);
    setBlocked(true);
  };

  // Don't show blocked state until we've initialized
  if (!initialized) {
    return (
      <div className="fixed inset-0 bg-gray-900/75 dark:bg-black/75 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full mx-auto transform transition-all duration-300 ease-out animate-fadeIn border border-gray-200 dark:border-gray-700">
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">Initializing...</p>
          </div>
        </div>
      </div>
    );
  }

  if (showChoice) {
    return (
      <div className="fixed inset-0 bg-gray-900/75 dark:bg-black/75 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full mx-auto transform transition-all duration-300 ease-out animate-fadeIn border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Multiple Tabs Detected
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Choose which tab to use
                </p>
              </div>
            </div>
            <button
              onClick={handleUseOtherTab}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              
              <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                Choose Your Tab
              </h4>
              
              <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                Another tab of this application is currently active. You can choose which tab to continue using.
              </p>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-medium mb-1">Choose your preference:</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-300">
                      <li><strong>Use This Tab:</strong> Continue here (other tab will be blocked)</li>
                      <li><strong>Use Other Tab:</strong> Keep using the existing active tab</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleUseThisTab}
                  className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                >
                  Use This Tab
                </button>
                
                <button
                  onClick={handleUseOtherTab}
                  className="w-full bg-gray-600 hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                >
                  Use Other Tab
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="fixed inset-0 bg-gray-900/75 dark:bg-black/75 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full mx-auto transform transition-all duration-300 ease-out animate-fadeIn border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                  <HiExclamationTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Tab Blocked
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Another tab is active
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              
              <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                This Tab is Blocked
              </h4>
              
              <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                Another tab is currently active. Please use that tab or close it to continue here.
              </p>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-medium mb-1">To continue using this tab:</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-300">
                      <li>Close the other active tab</li>
                      <li>Refresh this page</li>
                    </ul>
                  </div>
                </div>
              </div>

              <button
                onClick={() => window.location.reload()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}