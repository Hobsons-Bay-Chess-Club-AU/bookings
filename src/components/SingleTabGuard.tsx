'use client'

import { useEffect, useState, useRef } from 'react';
import { HiExclamationTriangle } from 'react-icons/hi2';

const TAB_KEY = 'single-tab-guard-active-tab5';

function generateTabId() {
  return `${Date.now()}-${Math.random()}`;
}

export default function SingleTabGuard({ children }: { children: React.ReactNode }) {
  const [blocked, setBlocked] = useState(false);
  const tabIdRef = useRef<string>(generateTabId());

  useEffect(() => {
    const tabId = tabIdRef.current;
    
    // Always try to claim the slot first
    const existing = localStorage.getItem(TAB_KEY);
    
    if (existing && existing !== tabId) {
      // Another tab is active, block this one
      setBlocked(true);
    } else {
      // Either no active tab or this tab is already active
      localStorage.setItem(TAB_KEY, tabId);
      setBlocked(false);
    }

    // Listen for changes from other tabs
    const onStorage = (e: StorageEvent) => {
      if (e.key === TAB_KEY) {
        if (e.newValue === tabId) {
          setBlocked(false);
        } else if (e.newValue && e.newValue !== tabId) {
          setBlocked(true);
        } else if (!e.newValue) {
          localStorage.setItem(TAB_KEY, tabId);
          setBlocked(false);
        }
      }
    };
    window.addEventListener('storage', onStorage);

    // On unload, release the slot if this tab is the active one
    const onUnload = () => {
      if (localStorage.getItem(TAB_KEY) === tabId) {
        localStorage.removeItem(TAB_KEY);
      }
    };
    window.addEventListener('beforeunload', onUnload);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('beforeunload', onUnload);
      if (localStorage.getItem(TAB_KEY) === tabId) {
        localStorage.removeItem(TAB_KEY);
      }
    };
  }, []);

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
                  Multiple Tabs Detected
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Application restriction
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
                Single Tab Required
              </h4>
              
              <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                This application is designed to work with only one tab open at a time to ensure data consistency and prevent conflicts.
              </p>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-medium mb-1">To continue using this application:</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-300">
                      <li>Close all other tabs of this application</li>
                      <li>Refresh this page after closing other tabs</li>
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