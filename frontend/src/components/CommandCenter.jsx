import React, { useState, useEffect } from 'react';
import { Activity, Users, Store, DollarSign, ListOrdered, RefreshCw } from 'lucide-react';

export default function CommandCenter({ backendUrl }) {
  const [metrics, setMetrics] = useState({
    total_shops: 0,
    total_products: 0,
    total_orders: 0,
    total_sales: 0,
    success_rate: 0
  });
  const [shops, setShops] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      // Metrics
      const metRes = await fetch(`${backendUrl}/api/admin/metrics`);
      if (metRes.ok) {
        const metData = await metRes.json();
        setMetrics(metData);
      }
      // Shops
      const shopRes = await fetch(`${backendUrl}/api/admin/shops`);
      if (shopRes.ok) {
        const shopData = await shopRes.json();
        setShops(shopData);
      }
      // Orders
      const orderRes = await fetch(`${backendUrl}/api/admin/orders`);
      if (orderRes.ok) {
        const orderData = await orderRes.json();
        setOrders(orderData);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--background-color)' }}>
      {/* Admin Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '16px', color: '#ffffff', fontWeight: 'bold' }}>Command Center</h2>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Platform operations console</span>
        </div>
        <button onClick={fetchAdminData} className="add-btn" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <RefreshCw size={12} /> Refresh
        </button>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', backgroundColor: 'transparent' }}>
        <button onClick={() => setActiveTab('overview')} style={{
          flex: 1,
          padding: '12px',
          background: 'transparent',
          border: 'none',
          borderBottom: activeTab === 'overview' ? '3px solid var(--primary-color)' : 'none',
          fontWeight: 'bold',
          color: activeTab === 'overview' ? 'var(--primary-color)' : 'var(--text-muted)',
          cursor: 'pointer',
          fontFamily: 'var(--font-family)',
          fontSize: '12px'
        }}>Overview</button>
        <button onClick={() => setActiveTab('shops')} style={{
          flex: 1,
          padding: '12px',
          background: 'transparent',
          border: 'none',
          borderBottom: activeTab === 'shops' ? '3px solid var(--primary-color)' : 'none',
          fontWeight: 'bold',
          color: activeTab === 'shops' ? 'var(--primary-color)' : 'var(--text-muted)',
          cursor: 'pointer',
          fontFamily: 'var(--font-family)',
          fontSize: '12px'
        }}>Shops</button>
        <button onClick={() => setActiveTab('transactions')} style={{
          flex: 1,
          padding: '12px',
          background: 'transparent',
          border: 'none',
          borderBottom: activeTab === 'transactions' ? '3px solid var(--primary-color)' : 'none',
          fontWeight: 'bold',
          color: activeTab === 'transactions' ? 'var(--primary-color)' : 'var(--text-muted)',
          cursor: 'pointer',
          fontFamily: 'var(--font-family)',
          fontSize: '12px'
        }}>Transactions</button>
      </div>

      <main style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
        {activeTab === 'overview' && (
          <div>
            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
              <div style={{ backgroundColor: 'var(--card-bg)', padding: '12px', borderRadius: '16px', border: '1px solid var(--card-border)' }}>
                <DollarSign size={20} color="var(--primary-color)" />
                <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '6px', color: '#ffffff' }}>₹{metrics.total_sales}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Daily Sales Volume</div>
              </div>
              <div style={{ backgroundColor: 'var(--card-bg)', padding: '12px', borderRadius: '16px', border: '1px solid var(--card-border)' }}>
                <Activity size={20} color="var(--primary-color)" />
                <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '6px', color: '#ffffff' }}>{metrics.success_rate}%</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Success Rate</div>
              </div>
              <div style={{ backgroundColor: 'var(--card-bg)', padding: '12px', borderRadius: '16px', border: '1px solid var(--card-border)' }}>
                <Store size={20} color="var(--primary-color)" />
                <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '6px', color: '#ffffff' }}>{metrics.total_shops}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Active Registered Shops</div>
              </div>
              <div style={{ backgroundColor: 'var(--card-bg)', padding: '12px', borderRadius: '16px', border: '1px solid var(--card-border)' }}>
                <ListOrdered size={20} color="var(--primary-color)" />
                <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '6px', color: '#ffffff' }}>{metrics.total_orders}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Total Orders Placed</div>
              </div>
            </div>

            {/* Quick Audit view */}
            <h3 style={{ fontSize: '12px', marginBottom: '8px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Recent System Activity</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '12px' }}>No orders placed yet.</div>
              ) : (
                orders.slice(0, 5).map(o => (
                  <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '10px 14px', fontSize: '12px' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#ffffff' }}>Order #{o.id} (₹{o.total_amount})</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Customer: {o.customer_phone}</div>
                    </div>
                    <span style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>{o.status}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'shops' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {shops.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>No registered shops.</div>
            ) : (
              shops.map(shop => (
                <div key={shop.id} style={{ border: '1px solid var(--card-border)', borderRadius: '16px', padding: '12px', backgroundColor: 'var(--card-bg)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffffff' }}>{shop.name}</h4>
                    <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(163,230,53,0.15)', color: 'var(--primary-color)', fontWeight: 'bold' }}>VERIFIED</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                    <div>Phone: {shop.phone}</div>
                    <div>Address: {shop.address}</div>
                    <div>Coords: {shop.coordinates}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'transactions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>No transactions recorded.</div>
            ) : (
              orders.map(order => (
                <div key={order.id} style={{ border: '1px solid var(--card-border)', borderRadius: '16px', padding: '12px', backgroundColor: 'var(--card-bg)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                    <span style={{ fontWeight: 'bold', color: '#ffffff' }}>Txn ID: pay_mock_{order.id}9382</span>
                    <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>PAID</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                    <div>Order Total: <span style={{ fontWeight: 'bold', color: '#ffffff' }}>₹{order.total_amount}</span></div>
                    <div>Customer phone: {order.customer_phone}</div>
                    <div>Gateway Ref: pay_ref_demo_{order.id}</div>
                    <div>Timestamp: {new Date(order.created_at).toLocaleString()}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
