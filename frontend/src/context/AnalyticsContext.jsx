import { createContext, useContext, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { analyticsAPI } from "../lib/api";

const AnalyticsContext = createContext(null);

export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    return {
      trackAction: () => {},
      trackPageView: () => {},
    };
  }
  return context;
};

export const AnalyticsProvider = ({ children, user }) => {
  const location = useLocation();
  const sessionIdRef = useRef(null);
  const lastPageRef = useRef(null);
  const pageStartTimeRef = useRef(Date.now());
  const heartbeatIntervalRef = useRef(null);
  const isInitializedRef = useRef(false);

  // Start session when user is logged in
  useEffect(() => {
    if (user && !isInitializedRef.current) {
      isInitializedRef.current = true;
      
      const startSession = async () => {
        const sessionId = await analyticsAPI.startSession();
        if (sessionId) {
          sessionIdRef.current = sessionId;
        }
      };
      
      startSession();

      // End session on page unload
      const handleUnload = () => {
        analyticsAPI.endSession();
      };

      window.addEventListener("beforeunload", handleUnload);
      
      return () => {
        window.removeEventListener("beforeunload", handleUnload);
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
      };
    }
  }, [user]);

  // Track page views on route change
  useEffect(() => {
    if (!user) return;

    const currentPath = location.pathname;
    
    // Send heartbeat for the previous page
    if (lastPageRef.current && sessionIdRef.current) {
      const timeOnPage = Math.floor((Date.now() - pageStartTimeRef.current) / 1000);
      analyticsAPI.heartbeat(sessionIdRef.current, lastPageRef.current, timeOnPage);
    }

    // Track new page view
    const pageTitle = getPageTitle(currentPath);
    analyticsAPI.trackPageView(currentPath, pageTitle, document.referrer);
    
    // Update refs
    lastPageRef.current = currentPath;
    pageStartTimeRef.current = Date.now();

    // Setup heartbeat for current page (every 30 seconds)
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    heartbeatIntervalRef.current = setInterval(() => {
      if (sessionIdRef.current && lastPageRef.current) {
        const timeOnPage = Math.floor((Date.now() - pageStartTimeRef.current) / 1000);
        analyticsAPI.heartbeat(sessionIdRef.current, lastPageRef.current, timeOnPage);
      }
    }, 30000); // 30 seconds

  }, [location.pathname, user]);

  // Track action helper
  const trackAction = useCallback((actionType, actionTarget, actionDetails = {}) => {
    if (!user) return;
    analyticsAPI.trackAction(actionType, actionTarget, actionDetails, location.pathname);
  }, [user, location.pathname]);

  // Manual page view tracking (for SPAs with virtual pages)
  const trackPageView = useCallback((pagePath, pageTitle = '') => {
    if (!user) return;
    analyticsAPI.trackPageView(pagePath, pageTitle, document.referrer);
  }, [user]);

  const value = {
    trackAction,
    trackPageView,
    sessionId: sessionIdRef.current,
  };

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
};

// Helper function to get page title from path
function getPageTitle(path) {
  const titles = {
    "/dashboard": "Dashboard",
    "/settings": "Settings",
    "/proposals": "Proposals",
    "/talent": "Talent & Human Capital",
    "/talent/sourcing": "Talent Sourcing Tool",
    "/talent/database-search": "Database Search Tool",
    "/talent/candidates": "Candidate Database",
    "/talent/candidates/upload": "CV Upload",
    "/talent/sourcing/external": "External Sourcing",
    "/sales": "Sales & Business Development",
    "/marketing": "Marketing & Brand",
    "/advisory": "Advisory & Consulting",
    "/technology": "Technology & Build",
    "/operations": "Operations & Finance",
    "/academy": "Academy & Learning",
    "/client-delivery": "Client Delivery",
  };
  
  return titles[path] || path;
}

export default AnalyticsProvider;
