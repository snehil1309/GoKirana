import React, { useState, useEffect, useRef } from 'react';
import { Store, Plus, Save, Bell, Check, X, ShieldAlert, Clock, CheckCircle } from 'lucide-react';

export default function MerchantHub({ backendUrl }) {
  const [shop, setShop] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  
  // Auth & Onboarding
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  
  // Product form
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodMrp, setProdMrp] = useState('');
  const [prodOffPrice, setProdOffPrice] = useState('');
  const [prodStock, setProdStock] = useState('');
  const [prodCategory, setProdCategory] = useState('Grocery');

  // WebSocket & Alerts
  const [wsConnected, setWsConnected] = useState(false);
  const [unacceptedOrders, setUnacceptedOrders] = useState([]); // Orders triggering alert
  const [activeTimers, setActiveTimers] = useState({}); // order_id -> seconds remaining
  const audioIntervalRef = useRef(null);
  const audioCtxRef = useRef(null);

  useEffect(() => {
    const savedShop = localStorage.getItem('gokirana_shop');
    if (savedShop) {
      const parsed = JSON.parse(savedShop);
      setShop(parsed);
      fetchShopData(parsed.id);
    }
  }, []);

  // WebSockets for live notifications
  useEffect(() => {
    if (!shop) return;

    let wsUrl = backendUrl.replace('http://', 'ws://').replace('https://', 'wss://');
    let ws = new WebSocket(`${wsUrl}/ws/shop/${shop.id}`);

    ws.onopen = () => {
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.event === 'NEW_ORDER') {
        const order = data.order;
        setUnacceptedOrders(prev => [...prev, order]);
        fetchShopData(shop.id);
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
      setTimeout(() => {
        if (shop) fetchShopData(shop.id);
      }, 3000);
    };

    return () => ws.close();
  }, [shop, backendUrl]);

  // Audio Alert Loop
  useEffect(() => {
    if (unacceptedOrders.length > 0) {
      if (!audioIntervalRef.current) {
        audioIntervalRef.current = setInterval(() => {
          playBeep();
        }, 1000);
      }
    } else {
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current);
        audioIntervalRef.current = null;
      }
    }
    return () => {
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current);
      }
    };
  }, [unacceptedOrders]);

  // Active timers loop
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setActiveTimers(prev => {
        const next = { ...prev };
        let updated = false;
        for (const orderId in next) {
          if (next[orderId] > 0) {
            next[orderId] = next[orderId] - 1;
            updated = true;
          } else {
            delete next[orderId];
            updated = true;
          }
        }
        return updated ? next : prev;
      });
    }, 1000);
    return () => clearInterval(timerInterval);
  }, []);

  const playBeep = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn('AudioContext failed to start:', e);
    }
  };

  const fetchShopData = async (shopId) => {
    try {
      const prodRes = await fetch(`${backendUrl}/api/shops/${shopId}/products`);
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData);
      }
      const orderRes = await fetch(`${backendUrl}/api/orders/shop/${shopId}`);
      if (orderRes.ok) {
        const orderData = await orderRes.json();
        setOrders(orderData);
        
        const now = new Date();
        const timersUpdate = {};
        orderData.forEach(o => {
          if (o.status === 'Preparing') {
            const orderTime = new Date(o.created_at);
            const diffSeconds = Math.floor((now.getTime() - orderTime.getTime()) / 1000);
            const remaining = 300 - diffSeconds;
            if (remaining > 0) {
              timersUpdate[o.id] = remaining;
            }
          }
        });
        setActiveTimers(timersUpdate);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${backendUrl}/api/shops/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
      });
      if (res.ok) {
        const data = await res.json();
        setShop(data);
        localStorage.setItem('gokirana_shop', JSON.stringify(data));
        fetchShopData(data.id);
      } else {
        alert('Invalid credentials.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    // Default to Vadodara center coordinates for seamless vicinity testing
    const payload = {
      name,
      phone,
      password,
      address,
      coordinates: '22.3072,73.1678',
      image_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80'
    };
    try {
      const res = await fetch(`${backendUrl}/api/shops/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setShop(data);
        localStorage.setItem('gokirana_shop', JSON.stringify(data));
        fetchShopData(data.id);
      } else {
        alert('Registration failed. Phone number might be taken.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('gokirana_shop');
    setShop(null);
    setOrders([]);
    setProducts([]);
  };

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProdName('');
    setProdDesc('');
    setProdMrp('');
    setProdOffPrice('');
    setProdStock('');
    setProdCategory('Grocery');
    setShowProductModal(true);
  };

  const handleOpenEditProduct = (p) => {
    setEditingProduct(p);
    setProdName(p.name);
    setProdDesc(p.description);
    setProdMrp(p.mrp);
    setProdOffPrice(p.offered_price);
    setProdStock(p.stock);
    setProdCategory(p.category);
    setShowProductModal(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const payload = {
      name: prodName,
      description: prodDesc,
      mrp: parseFloat(prodMrp),
      offered_price: parseFloat(prodOffPrice),
      stock: parseInt(prodStock),
      category: prodCategory,
      image_url: editingProduct?.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&q=80'
    };

    try {
      let url = `${backendUrl}/api/shops/${shop.id}/products`;
      let method = 'POST';
      if (editingProduct) {
        url = `${backendUrl}/api/products/${editingProduct.id}`;
        method = 'PUT';
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowProductModal(false);
        fetchShopData(shop.id);
      } else {
        alert('Failed to save product.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProduct = async (prodId) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await fetch(`${backendUrl}/api/products/${prodId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchShopData(shop.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAcceptOrder = async (orderId) => {
    setUnacceptedOrders(prev => prev.filter(o => o.id !== orderId));
    try {
      const res = await fetch(`${backendUrl}/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Preparing' })
      });
      if (res.ok) {
        setActiveTimers(prev => ({ ...prev, [orderId]: 300 }));
        fetchShopData(shop.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeclineOrder = async (orderId) => {
    setUnacceptedOrders(prev => prev.filter(o => o.id !== orderId));
    try {
      const res = await fetch(`${backendUrl}/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Cancelled' })
      });
      if (res.ok) {
        fetchShopData(shop.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkPacked = async (orderId) => {
    try {
      const res = await fetch(`${backendUrl}/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'In Transit' })
      });
      if (res.ok) {
        setActiveTimers(prev => {
          const next = { ...prev };
          delete next[orderId];
          return next;
        });
        fetchShopData(shop.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkDelivered = async (orderId) => {
    try {
      const res = await fetch(`${backendUrl}/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Delivered' })
      });
      if (res.ok) {
        fetchShopData(shop.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatTimer = (seconds) => {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const inputStyle = {
    width: '100%',
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    color: '#ffffff',
    fontSize: '14px',
    fontFamily: 'var(--font-family)',
    outline: 'none'
  };

  if (!shop) {
    return (
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', backgroundColor: 'var(--background-color)' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <Store size={64} color="var(--primary-color)" style={{ margin: '0 auto' }} />
          <h2 style={{ fontSize: '24px', marginTop: '12px', color: '#ffffff' }}>Merchant Hub</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Manage your digital inventory and orders.</p>
        </div>

        {isRegistering ? (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <input type="text" placeholder="Shop Name" required value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
            <input type="tel" placeholder="Phone Number" required value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} />
            <input type="text" placeholder="Shop Address" required value={address} onChange={e => setAddress(e.target.value)} style={inputStyle} />
            <input type="password" placeholder="Password" required value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
            <button className="add-btn" type="submit" style={{ backgroundColor: 'var(--primary-color)', color: 'var(--secondary-color)', padding: '12px', fontSize: '14px', fontWeight: 'bold' }}>Register Shop</button>
            <p onClick={() => setIsRegistering(false)} style={{ textAlign: 'center', color: 'var(--primary-color)', cursor: 'pointer', fontSize: '13px', marginTop: '6px' }}>Already have a shop? Login</p>
          </form>
        ) : (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <input type="tel" placeholder="Phone Number" required value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} />
            <input type="password" placeholder="Password" required value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
            <button className="add-btn" type="submit" style={{ backgroundColor: 'var(--primary-color)', color: 'var(--secondary-color)', padding: '12px', fontSize: '14px', fontWeight: 'bold' }}>Login</button>
            <p onClick={() => setIsRegistering(true)} style={{ textAlign: 'center', color: 'var(--primary-color)', cursor: 'pointer', fontSize: '13px', marginTop: '6px' }}>Don't have a shop? Register now</p>
          </form>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--background-color)' }}>
      {/* Merchant Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '16px', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Store size={18} /> {shop.name}
          </h2>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            Live status: {wsConnected ? <span style={{ color: 'var(--success-color)', fontWeight: 'bold' }}>Online</span> : <span style={{ color: 'var(--error-color)', fontWeight: 'bold' }}>Disconnected</span>}
          </div>
        </div>
        <button onClick={handleLogout} className="add-btn" style={{ borderColor: 'var(--error-color)', color: 'var(--error-color)' }}>Logout</button>
      </header>

      {/* Acoustic Alert Panel */}
      {unacceptedOrders.length > 0 && (
        <div className="alert-pulse" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', margin: '12px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={20} className="alert-bell-anim" />
            <span style={{ fontWeight: 'bold', fontSize: '14px' }}>NEW PENDING ORDER INCOMING!</span>
          </div>
          {unacceptedOrders.map(order => (
            <div key={order.id} style={{ backgroundColor: 'rgba(255,255,255,0.15)', padding: '10px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 'bold' }}>Order #{order.id} (₹{order.total_amount})</div>
                <div style={{ fontSize: '10px' }}>Items: {order.items.map(i => `${i.product_name} x${i.quantity}`).join(', ')}</div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => handleAcceptOrder(order.id)} style={{ backgroundColor: '#ffffff', border: 'none', borderRadius: '6px', color: 'var(--secondary-color)', padding: '6px 10px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>Accept</button>
                <button onClick={() => handleDeclineOrder(order.id)} style={{ backgroundColor: 'transparent', border: '1px solid #ffffff', borderRadius: '6px', color: '#ffffff', padding: '6px 10px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main fulfillment Dashboard */}
      <main style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
        {/* Active Orders Section */}
        <h3 style={{ fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px', fontWeight: 'bold' }}>Fulfillment Queue</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {orders.filter(o => ['Ordered', 'Preparing', 'In Transit'].includes(o.status)).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px', color: 'var(--text-muted)', fontSize: '13px' }}>
              No active orders in queue.
            </div>
          ) : (
            orders.filter(o => ['Ordered', 'Preparing', 'In Transit'].includes(o.status)).map(order => {
              const secondsLeft = activeTimers[order.id];
              return (
                <div key={order.id} style={{ border: '1px solid var(--card-border)', borderRadius: '16px', padding: '12px', backgroundColor: 'var(--card-bg)', backdropFilter: 'blur(10px)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#ffffff' }}>Order #{order.id}</span>
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      fontWeight: 'bold',
                      backgroundColor: order.status === 'Preparing' ? 'rgba(245,158,11,0.2)' : 'rgba(163,230,53,0.2)',
                      color: order.status === 'Preparing' ? '#f59e0b' : 'var(--primary-color)'
                    }}>{order.status}</span>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    {order.items.map(item => (
                      <div key={item.id}>{item.product_name} x {item.quantity}</div>
                    ))}
                  </div>

                  {order.status === 'Ordered' && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px', marginTop: '8px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Pending Acceptance</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="add-btn" onClick={() => handleAcceptOrder(order.id)} style={{ backgroundColor: 'var(--primary-color)', color: 'var(--secondary-color)' }}>Accept</button>
                        <button className="add-btn" onClick={() => handleDeclineOrder(order.id)} style={{ borderColor: 'var(--error-color)', color: 'var(--error-color)' }}>Decline</button>
                      </div>
                    </div>
                  )}

                  {order.status === 'Preparing' && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px', marginTop: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--error-color)' }}>
                        <Clock size={16} />
                        <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Prep Timer: {formatTimer(secondsLeft)}</span>
                      </div>
                      <button className="add-btn" onClick={() => handleMarkPacked(order.id)}>Mark Packed</button>
                    </div>
                  )}

                  {order.status === 'In Transit' && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px', marginTop: '8px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Delivery Partner in transit</span>
                      <button className="add-btn" onClick={() => handleMarkDelivered(order.id)}>Mark Delivered</button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Product Catalog Management */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px', fontWeight: 'bold' }}>Inventory Catalog</h3>
          <button className="add-btn" onClick={handleOpenAddProduct} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Plus size={14} /> Add Item
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {products.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px', color: 'var(--text-muted)', fontSize: '13px' }}>
              Your catalog is empty. Add items to sell.
            </div>
          ) : (
            products.map(p => (
              <div key={p.id} style={{ display: 'flex', border: '1px solid var(--card-border)', borderRadius: '16px', padding: '10px', alignItems: 'center', gap: '10px', backgroundColor: 'var(--card-bg)' }}>
                <img src={p.image_url || 'https://via.placeholder.com/150'} alt={p.name} style={{ width: '48px', height: '48px', objectFit: 'contain', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#ffffff' }}>{p.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Stock: {p.stock} | Price: ₹{p.offered_price}</div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className="add-btn" onClick={() => handleOpenEditProduct(p)}>Edit</button>
                  <button className="add-btn" style={{ borderColor: 'var(--error-color)', color: 'var(--error-color)' }} onClick={() => handleDeleteProduct(p.id)}>Delete</button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Add / Edit Product Modal */}
      {showProductModal && (
        <div className="drawer-overlay" onClick={() => setShowProductModal(false)}>
          <div className="drawer-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>{editingProduct ? 'Edit Catalog Item' : 'Add Catalog Item'}</h3>
              <button onClick={() => setShowProductModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ffffff' }}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Product Name</label>
                <input type="text" required value={prodName} onChange={e => setProdName(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Description</label>
                <textarea value={prodDesc} onChange={e => setProdDesc(e.target.value)} style={{ ...inputStyle, height: '60px' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)' }}>MRP (₹)</label>
                  <input type="number" step="0.01" required value={prodMrp} onChange={e => setProdMrp(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Offered Price (₹)</label>
                  <input type="number" step="0.01" required value={prodOffPrice} onChange={e => setProdOffPrice(e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Stock Units</label>
                  <input type="number" required value={prodStock} onChange={e => setProdStock(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Category</label>
                  <select 
                    value={prodCategory} 
                    onChange={e => setProdCategory(e.target.value)} 
                    style={{
                      ...inputStyle,
                      backgroundColor: '#1e293b',
                      color: '#ffffff'
                    }}
                  >
                    <option value="Grocery">Grocery</option>
                    <option value="Pharmacy">Pharmacy</option>
                    <option value="Baby Care">Baby Care</option>
                    <option value="Pet Care">Pet Care</option>
                    <option value="Stationery">Stationery</option>
                  </select>
                </div>
              </div>
              <button className="add-btn" type="submit" style={{ backgroundColor: 'var(--primary-color)', color: 'var(--secondary-color)', padding: '12px', fontSize: '14px', fontWeight: 'bold', marginTop: '10px' }}>Save to Catalog</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
