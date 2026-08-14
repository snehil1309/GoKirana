import React, { useState, useEffect } from 'react';
import LandingWebsite from './components/LandingWebsite';
import CustomerPortal from './components/CustomerPortal';
import MerchantHub from './components/MerchantHub';
import CommandCenter from './components/CommandCenter';

const BACKEND_URL = `${window.location.protocol}//${window.location.hostname}:8000`;


export default function App() {
  const [activeView, setActiveView] = useState(() => {
    try {
      const hash = window.location.hash.replace('#', '');
      if (['consumer', 'merchant', 'admin'].includes(hash)) return hash;
      const saved = localStorage.getItem('ziplo_active_view');
      return saved || 'website';
    } catch (e) {
      return 'website';
    }
  });

  const updateActiveView = (newView) => {
    setActiveView(newView);
    try {
      localStorage.setItem('ziplo_active_view', newView);
      if (newView !== 'website') {
        window.location.hash = newView;
      } else {
        history.pushState("", document.title, window.location.pathname + window.location.search);
      }
    } catch (e) {
      // ignore
    }
  };


  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('ziplo_user');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      
      const now = Date.now();
      const TWENTY_DAYS_MS = 20 * 24 * 60 * 60 * 1000;
      const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

      if (parsed.role === 'merchant') {
        const loginTime = parsed.loginTimestamp || 0;
        if (now - loginTime > TWENTY_FOUR_HOURS_MS) {
          console.warn('[Session] Merchant session expired after 24 hours');
          localStorage.removeItem('ziplo_user');
          return null;
        }
      } else {
        const lastAccess = parsed.lastAccessTimestamp || parsed.loginTimestamp || 0;
        if (now - lastAccess > TWENTY_DAYS_MS) {
          console.warn('[Session] Consumer session expired after 20 days of inactivity');
          localStorage.removeItem('ziplo_user');
          return null;
        }
      }

      const updated = { ...parsed, lastAccessTimestamp: now };
      localStorage.setItem('ziplo_user', JSON.stringify(updated));
      return updated;
    } catch (e) {
      localStorage.removeItem('ziplo_user');
      return null;
    }
  });

  useEffect(() => {
    // Auto-seed database when App starts for smooth client demonstration
    fetch(`${BACKEND_URL}/api/seed`, { method: 'POST' })
      .then(res => res.json())
      .then(data => console.log('Auto-seed status:', data.message))
      .catch(err => console.warn('Could not auto-seed. Is the backend running?'));
  }, []);

  // Check session validity periodically (every minute)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!user) return;
      const now = Date.now();
      const TWENTY_DAYS_MS = 20 * 24 * 60 * 60 * 1000;
      const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

      if (user.role === 'merchant') {
        const loginTime = user.loginTimestamp || 0;
        if (now - loginTime > TWENTY_FOUR_HOURS_MS) {
          alert("Your 24-hour merchant session has expired. Please log in again.");
          localStorage.removeItem('ziplo_user');
          setUser(null);
          setActiveView('website');
        }
      } else {
        const lastAccess = user.lastAccessTimestamp || user.loginTimestamp || 0;
        if (now - lastAccess > TWENTY_DAYS_MS) {
          alert("Your consumer session expired due to 20 days of inactivity. Please log in again.");
          localStorage.removeItem('ziplo_user');
          setUser(null);
        }
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [user]);

  // Update activity timestamp whenever user interacts
  const handleUserActivity = () => {
    const saved = localStorage.getItem('ziplo_user');
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      const now = Date.now();
      const updated = { ...parsed, lastAccessTimestamp: now };
      localStorage.setItem('ziplo_user', JSON.stringify(updated));
    } catch (e) {
      // ignore
    }
  };

  return (
    <div className="app-container" onClick={handleUserActivity}>
      {/* Top Floating Switch Bar to Return to Main Website */}
      {activeView !== 'website' && (
        <div style={{
          backgroundColor: '#0f172a',
          borderBottom: '1px solid #1e293b',
          padding: '8px 16px',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          zIndex: 9999
        }}>
          <button 
            onClick={() => setActiveView('website')}
            style={{
              background: '#1e293b',
              color: '#34d399',
              border: '1px solid #334155',
              padding: '6px 14px',
              borderRadius: '20px',
              fontWeight: 'bold',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>← Back to Ziplo Website</span>
          </button>
          <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}>
            Current Mode: <span style={{ color: '#38bdf8', textTransform: 'uppercase' }}>{activeView}</span>
          </span>
        </div>
      )}

      {/* Main View Container */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', position: 'relative' }}>
        {activeView === 'website' && (
          <LandingWebsite 
            backendUrl={BACKEND_URL}
            onSelectView={updateActiveView}
          />
        )}
        {activeView === 'consumer' && (
          <CustomerPortal 
            backendUrl={BACKEND_URL} 
            user={user} 
            setUser={setUser} 
            activeView={activeView} 
            setActiveView={updateActiveView} 
          />
        )}
        {activeView === 'merchant' && (
          <MerchantHub 
            backendUrl={BACKEND_URL} 
            user={user} 
            setUser={setUser} 
            activeView={activeView} 
            setActiveView={updateActiveView} 
          />
        )}
        {activeView === 'admin' && (
          <CommandCenter 
            backendUrl={BACKEND_URL} 
            user={user} 
            setUser={setUser} 
            setActiveView={updateActiveView} 
          />
        )}
      </div>
    </div>
  );
}

