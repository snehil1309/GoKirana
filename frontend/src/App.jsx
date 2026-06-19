import React, { useState, useEffect } from 'react';
import CustomerPortal from './components/CustomerPortal';
import MerchantHub from './components/MerchantHub';
import CommandCenter from './components/CommandCenter';

const BACKEND_URL = 'http://localhost:8000';

export default function App() {
  const [role, setRole] = useState('customer'); // customer, merchant, admin

  useEffect(() => {
    // Auto-seed database when App starts for smooth client demonstration
    fetch(`${BACKEND_URL}/api/seed`, { method: 'POST' })
      .then(res => res.json())
      .then(data => console.log('Auto-seed status:', data.message))
      .catch(err => console.warn('Could not auto-seed. Is the backend running?'));
  }, []);

  return (
    <div className="app-container">
      {/* Top Switcher for Demo Purposes */}
      <div className="role-switcher">
        <button
          className={`role-btn ${role === 'customer' ? 'active' : ''}`}
          onClick={() => setRole('customer')}
        >
          Customer Portal (Zomato/Swiggy style)
        </button>
        <button
          className={`role-btn ${role === 'merchant' ? 'active' : ''}`}
          onClick={() => setRole('merchant')}
        >
          Merchant Hub (Shop)
        </button>
        <button
          className={`role-btn ${role === 'admin' ? 'active' : ''}`}
          onClick={() => setRole('admin')}
        >
          Admin Console
        </button>
      </div>

      {/* Main Role Container */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', position: 'relative' }}>
        {role === 'customer' && <CustomerPortal backendUrl={BACKEND_URL} />}
        {role === 'merchant' && <MerchantHub backendUrl={BACKEND_URL} />}
        {role === 'admin' && <CommandCenter backendUrl={BACKEND_URL} />}
      </div>
    </div>
  );
}
