// layouts/CashierLayout.jsx - UPDATED FOR 1-HOUR TIMEOUT

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import activityService from '../services/activityService';
import { message } from 'antd';

const CashierLayout = ({ children }) => {
  const navigate = useNavigate();
  const [lastActivity, setLastActivity] = useState(Date.now());

  useEffect(() => {
    console.log('🔄 CashierLayout mounted - initializing activity tracking');
    
    // Initialize activity tracking for cashier
    activityService.init('cashier');
    
    // Set custom logout callback
    activityService.setLogoutCallback((reason, redirectPath) => {
      message.error({
        content: reason || 'Session expired after 1 hour of inactivity',
        duration: 5,
        key: 'session-expired'
      });
      navigate(redirectPath, { 
        replace: true,
        state: { 
          message: reason,
          expired: true 
        }
      });
    });

    // Set up activity monitoring
    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    
    const handleUserActivity = () => {
      setLastActivity(Date.now());
      activityService.recordActivity();
    };

    // Add event listeners for user activity
    activityEvents.forEach(event => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    // Periodic check for session validity (local fallback)
    const activityInterval = setInterval(async () => {
      try {
        const remaining = activityService.getRemainingTime();
        
        // Log remaining time every minute for debugging
        if (remaining < 60) { // Less than 1 minute remaining
          console.log(`⚠️ Session will expire in ${remaining} seconds`);
        }
        
        const isValid = await activityService.checkSession();
        if (!isValid) {
          // Session expired due to inactivity
          message.warning({
            content: 'Session expired due to inactivity. Please login again.',
            duration: 3,
            key: 'session-expired-warning'
          });
          navigate('/cashier/login?expired=inactivity', { 
            replace: true 
          });
        }
      } catch (error) {
        console.error('Session check failed:', error);
      }
    }, 30000); // Check every 30 seconds

    // Listen for forced logout
    const handleForceLogout = (event) => {
      const reason = event.detail?.reason || 'Session terminated';
      message.error({
        content: reason,
        duration: 5,
        key: 'force-logout'
      });
      
      // Small delay to show message before redirect
      setTimeout(() => {
        navigate('/cashier/login?expired=true', { 
          replace: true,
          state: { message: reason }
        });
      }, 500);
    };

    window.addEventListener('force-logout', handleForceLogout);

    // Cleanup function
    return () => {
      console.log('🧹 CashierLayout cleanup');
      
      // Remove event listeners
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
      
      // Clear intervals
      clearInterval(activityInterval);
      
      // Remove event listeners
      window.removeEventListener('force-logout', handleForceLogout);
      
      // Stop activity tracking
      activityService.stop();
    };
  }, [navigate]);

  return (
    <>
      {children}
    </>
  );
};

export default CashierLayout;