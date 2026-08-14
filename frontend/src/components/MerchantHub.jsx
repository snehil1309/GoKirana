import React, { useState, useEffect, useRef } from 'react';
import { Store, Plus, Save, Bell, Check, X, ShieldAlert, Clock, CheckCircle, Eye, EyeOff, BarChart2, TrendingUp, Calendar, UserCheck, Image as ImageIcon, MapPin, DollarSign, Package } from 'lucide-react';

export default function MerchantHub({ backendUrl, user, setUser, activeView, setActiveView }) {
  const [shop, setShop] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeTracking, setActiveTracking] = useState({}); // order_id -> intervalId
  const [trackingCoords, setTrackingCoords] = useState({}); // order_id -> "lat,lng"
  
  // Navigation tab
  const [activeMerchantTab, setActiveMerchantTab] = useState('queue'); // 'queue' | 'analytics'

  // Auth & Onboarding state variables
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [inputOtp, setInputOtp] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  
  // Verification & Setup state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingOwnerName, setOnboardingOwnerName] = useState('');
  const [onboardingShopName, setOnboardingShopName] = useState('');
  const [onboardingShopImage, setOnboardingShopImage] = useState('');
  const [onboardingAddress, setOnboardingAddress] = useState('');
  const [onboardingCoords, setOnboardingCoords] = useState('22.3072,73.1678');
  const [geoDenied, setGeoDenied] = useState(false);

  // Sales Analytics state
  const [salesPeriod, setSalesPeriod] = useState('daily'); // 'daily', 'weekly', 'monthly', 'quarterly', 'annual', 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Sync shop state with user prop or localStorage
  useEffect(() => {
    if (user && user.role === 'merchant') {
      setShop(user);
      fetchShopData(user.id);
    } else {
      const savedShop = localStorage.getItem('gokirana_shop');
      if (savedShop) {
        try {
          const parsed = JSON.parse(savedShop);
          setShop(parsed);
          fetchShopData(parsed.id);
        } catch (e) {
          localStorage.removeItem('gokirana_shop');
          setShop(null);
        }
      }
    }
  }, [user]);

  // Sync verification & setup fields when shop is set
  useEffect(() => {
    if (shop) {
      if (shop.name) setOnboardingShopName(shop.name);
      if (shop.owner_name) setOnboardingOwnerName(shop.owner_name);
      if (shop.image_url) setOnboardingShopImage(shop.image_url);
      if (shop.address) setOnboardingAddress(shop.address);
      if (shop.coordinates) setOnboardingCoords(shop.coordinates);

      // Force verification setup modal if mandatory details missing
      if (shop.profile_completed === false || !shop.owner_name || !shop.image_url || !shop.name) {
        setShowOnboarding(true);
      }
    }
  }, [shop]);

  // Auto-fetch GPS location immediately when merchant registration view is active
  useEffect(() => {
    if (isRegistering) {
      requestGeoLocation(true);
    }
  }, [isRegistering]);

  
  // Product form
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodMrp, setProdMrp] = useState('');
  const [prodOffPrice, setProdOffPrice] = useState('');
  const [prodStock, setProdStock] = useState('');
  const [prodCategory, setProdCategory] = useState('Grocery');
  const [prodImage, setProdImage] = useState('');
  const [shopImage, setShopImage] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (file, type) => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${backendUrl}/api/upload`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        if (type === 'product') {
          setProdImage(data.url);
        } else if (type === 'shop') {
          setShopImage(data.url);
        }
        alert('Image uploaded to S3 successfully!');
      } else {
        alert('Image upload failed.');
      }
    } catch (err) {
      console.error(err);
      alert('Error uploading file to S3.');
    } finally {
      setUploading(false);
    }
  };

  // WebSocket & Alerts
  const [wsConnected, setWsConnected] = useState(false);
  const [unacceptedOrders, setUnacceptedOrders] = useState([]); // Orders triggering alert
  const [activeTimers, setActiveTimers] = useState({}); // order_id -> seconds remaining
  const audioIntervalRef = useRef(null);
  const audioCtxRef = useRef(null);

  // WebSockets for live notifications
  useEffect(() => {
    if (!shop || !shop.id) return;

    let isMounted = true;
    let timerId = null;
    let ws = null;
    
    const connectWs = () => {
      let wsUrl = backendUrl.replace('http://', 'ws://').replace('https://', 'wss://');
      ws = new WebSocket(`${wsUrl}/ws/shop/${shop.id}`);

      ws.onopen = () => {
        if (isMounted) setWsConnected(true);
      };

      ws.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'NEW_ORDER') {
            const order = data.order;
            setUnacceptedOrders(prev => {
              if(prev.find(o => o.id === order.id)) return prev;
              return [...prev, order];
            });
            fetchShopData(shop.id);
          }
        } catch (e) {
          console.error("WS error parsing message", e);
        }
      };

      ws.onerror = () => {
        if (isMounted) setWsConnected(false);
      };

      ws.onclose = () => {
        if (isMounted) {
          setWsConnected(false);
          timerId = setTimeout(() => {
            if (isMounted && shop && shop.id) {
              fetchShopData(shop.id);
              connectWs(); // Reconnect the websocket
            }
          }, 3000);
        }
      };
    };

    connectWs();

    return () => {
      isMounted = false;
      if (timerId) clearTimeout(timerId);
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      }
    };
  }, [shop?.id, backendUrl]);

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
      if (prodRes.status === 404) {
        console.warn("Shop not found in DB. Clearing invalid merchant session.");
        handleLogout();
        return;
      }
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData);
      }
      const orderRes = await fetch(`${backendUrl}/api/orders/shop/${shopId}`);
      if (orderRes.ok) {
        const orderData = await orderRes.json();
        setOrders(orderData);
        
        // Populate unacceptedOrders from API so they beep if missed or on page reload
        const pending = orderData.filter(o => o.status === 'Ordered');
        setUnacceptedOrders(pending);
        
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

  const requestGeoLocation = (autoFillAddress = true) => {
    if (!navigator.geolocation) {
      setGeoDenied(true);
      return;
    }

    const handleSuccess = async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const coordsStr = `${lat.toFixed(6)},${lng.toFixed(6)}`;
      setOnboardingCoords(coordsStr);
      setGeoDenied(false);

      if (shop && shop.id) {
        try {
          fetch(`${backendUrl}/api/shops/${shop.id}/coordinates`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ coordinates: coordsStr })
          }).then(r => r.ok && r.json()).then(updated => {
            if (updated) {
              setShop(prev => ({ ...prev, coordinates: coordsStr }));
              localStorage.setItem('gokirana_shop', JSON.stringify({ ...shop, coordinates: coordsStr }));
            }
          });
        } catch (err) {
          console.warn("Failed to update shop coordinates:", err);
        }
      }

      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.display_name) {
            const fullAddr = data.display_name;
            if (autoFillAddress) {
              setOnboardingAddress(fullAddr);
            }
          }
        }
      } catch (e) {
        console.warn("Reverse geocoding failed:", e);
      }
    };


    const handleError = (error) => {
      console.warn("High-accuracy GPS failed, falling back to basic accuracy:", error);
      navigator.geolocation.getCurrentPosition(
        handleSuccess,
        (err) => {
          console.warn("Geolocation permission denied/failed:", err);
          setGeoDenied(true);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
      );
    };

    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      handleError,
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 }
    );
  };

  const handleAuthRegister = async (e) => {
    e.preventDefault();
    if (!regEmail && !regPhone) {
      alert("Please provide either email or phone number to register.");
      return;
    }
    try {
      const res = await fetch(`${backendUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: regEmail || null,
          phone: regPhone || null,
          password: regPassword,
          is_shop: true,
          name: onboardingShopName || "New Shop",
          address: onboardingAddress || "Pending Onboarding",
          coordinates: onboardingCoords
        })
      });
      if (res.ok) {
        alert("Registration successful! Please log in.");
        setIsRegistering(false);
        setLoginIdentifier(regEmail || regPhone);
      } else {
        const data = await res.json();
        alert(data.detail || "Registration failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error occurred during registration.");
    }
  };

  const handleAuthLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${backendUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: loginIdentifier,
          password: loginPassword
        })
      });
      if (res.ok) {
        setOtpSent(true);
        alert("OTP sent successfully! Please check your terminal console / email.");
      } else {
        const data = await res.json();
        alert(data.detail || "Invalid identifier or password.");
      }
    } catch (err) {
      console.error(err);
      alert("Login failed.");
    }
  };

  const handleAuthVerify = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${backendUrl}/api/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: loginIdentifier,
          otp: inputOtp,
          is_shop: true
        })
      });
      if (res.ok) {
        const data = await res.json();
        const now = Date.now();
        const fullUserData = {
          ...data,
          role: 'merchant',
          loginTimestamp: now,
          lastAccessTimestamp: now
        };
        setShop(data);
        if (setUser) setUser(fullUserData);
        localStorage.setItem('gokirana_shop', JSON.stringify(data));
        localStorage.setItem('ziplo_user', JSON.stringify(fullUserData));
        fetchShopData(data.id);
        setOtpSent(false);
        setInputOtp('');

        if (!data.profile_completed) {
          setShowOnboarding(true);
          requestGeoLocation();
        }
      } else {
        const data = await res.json();
        alert(data.detail || "Invalid OTP code.");
      }
    } catch (err) {
      console.error(err);
      alert("Verification failed.");
    }
  };

  const fetchSalesAnalytics = async (p = salesPeriod, start = customStartDate, end = customEndDate) => {
    if (!shop || !shop.id) return;
    setLoadingAnalytics(true);
    try {
      let url = `${backendUrl}/api/shops/${shop.id}/analytics?period=${p}`;
      if (p === 'custom' && start) url += `&start_date=${start}`;
      if (p === 'custom' && end) url += `&end_date=${end}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData(data);
      }
    } catch (err) {
      console.error("Analytics fetch error:", err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    if (shop && shop.id && activeMerchantTab === 'analytics') {
      fetchSalesAnalytics();
    }
  }, [shop?.id, activeMerchantTab, salesPeriod]);

  const handleCompleteProfile = async (e) => {
    e.preventDefault();
    if (!onboardingOwnerName || !onboardingOwnerName.trim()) {
      alert("Please enter the Shop Owner's Name.");
      return;
    }
    if (!onboardingShopName || !onboardingShopName.trim()) {
      alert("Please enter/verify the Shop Name.");
      return;
    }
    if (!onboardingShopImage && !shopImage) {
      alert("Please provide or upload a Front Side Picture of your shop.");
      return;
    }
    try {
      const shopImg = onboardingShopImage || shopImage;
      const res = await fetch(`${backendUrl}/api/auth/complete-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: shop?.id ? String(shop.id) : (loginIdentifier || shop?.email || shop?.phone),
          name: onboardingShopName,
          owner_name: onboardingOwnerName,
          address: onboardingAddress,
          coordinates: onboardingCoords,
          image_url: shopImg,
          is_shop: true
        })
      });
      if (res.ok) {
        const data = await res.json();
        const updatedShop = {
          ...shop,
          ...data,
          profile_completed: true
        };
        setShop(updatedShop);
        if (setUser) setUser({ ...user, ...updatedShop, role: 'merchant' });
        localStorage.setItem('gokirana_shop', JSON.stringify(updatedShop));
        localStorage.setItem('ziplo_user', JSON.stringify({ ...user, ...updatedShop, role: 'merchant' }));
        setShowOnboarding(false);
        alert("Shop profile verified & saved successfully!");
      } else {
        alert("Failed to save shop verification details.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving shop profile.");
    }
  };

  const handleToggleShopStatus = async () => {
    if (!shop || !shop.id) return;
    const newStatus = !shop.active;
    try {
      const res = await fetch(`${backendUrl}/api/shops/${shop.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: newStatus })
      });
      if (res.ok) {
        const updatedShop = await res.json();
        const fullShopData = { ...shop, active: updatedShop.active };
        setShop(fullShopData);
        if (setUser) setUser(fullShopData);
        localStorage.setItem('gokirana_shop', JSON.stringify(fullShopData));
        localStorage.setItem('ziplo_user', JSON.stringify(fullShopData));
      } else {
        alert("Failed to update shop status.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error updating shop status.");
    }
  };

  const handleLogout = () => {

    localStorage.removeItem('gokirana_shop');
    localStorage.removeItem('ziplo_user');
    if (setUser) setUser(null);
    setShop(null);
    setOrders([]);
    setProducts([]);
    if (setActiveView) setActiveView('consumer');
  };

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProdName('');
    setProdDesc('');
    setProdMrp('');
    setProdOffPrice('');
    setProdStock('');
    setProdCategory('Grocery');
    setProdImage('');
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
    setProdImage(p.image_url || '');
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
      image_url: prodImage || editingProduct?.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&q=80'
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

  // Fetch customer location details for an order and cache it
  const fetchCustomerForOrder = async (order) => {
    try {
      const res = await fetch(`${backendUrl}/api/customers/${order.customer_phone}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.error("Error fetching customer details:", err);
      return null;
    }
  };

  // Start REAL GPS tracking using device watchPosition
  const startLocationTracking = async (order) => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported on this device/browser.");
      return;
    }

    const customer = await fetchCustomerForOrder(order);
    if (!customer || !customer.coordinates) {
      alert("Customer has not set their delivery location. Live tracking unavailable.");
      return;
    }

    // Store customer coords for the Navigate button
    setTrackingCoords(prev => ({
      ...prev,
      [`cust_${order.id}`]: customer.coordinates,
      [`cust_name_${order.id}`]: customer.name || order.customer_phone,
    }));

    // Watch merchant's real GPS position
    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const coordsStr = `${lat.toFixed(6)},${lng.toFixed(6)}`;

        // Push to backend
        await updateOrderLocation(order.id, coordsStr);
        // Update local UI
        setTrackingCoords(prev => ({ ...prev, [order.id]: coordsStr }));
      },
      (error) => {
        console.warn("GPS error:", error);
        if (error.code === error.PERMISSION_DENIED) {
          alert("Location permission denied. Please allow location access to enable live tracking.");
          stopLocationTracking(order.id);
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 10000,
      }
    );

    // Store watchId so we can stop it later
    setActiveTracking(prev => ({ ...prev, [order.id]: watchId }));
  };

  // Stop GPS tracking and clear watchPosition
  const stopLocationTracking = (orderId) => {
    const watchId = activeTracking[orderId];
    if (watchId !== undefined && watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }
    setActiveTracking(prev => {
      const copy = { ...prev };
      delete copy[orderId];
      return copy;
    });
  };

  // Open Google Maps navigation to customer location
  const navigateToCustomer = (orderId) => {
    const coords = trackingCoords[`cust_${orderId}`];
    if (!coords) return;
    const [lat, lng] = coords.split(',');
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    window.open(url, '_blank');
  };

  const updateOrderLocation = async (orderId, coords) => {
    try {
      await fetch(`${backendUrl}/api/orders/${orderId}/location`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delivery_coordinates: coords })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkDelivered = async (orderId) => {
    // Stop real GPS tracking
    stopLocationTracking(orderId);

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
          <form onSubmit={handleAuthRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <input type="text" placeholder="Shop Name (e.g. Ziplo Express)" required value={onboardingShopName} onChange={e => setOnboardingShopName(e.target.value)} style={inputStyle} />
            <input type="email" placeholder="Shop Email" value={regEmail} onChange={e => setRegEmail(e.target.value)} style={inputStyle} />
            <input type="tel" placeholder="Shop Phone Number" value={regPhone} onChange={e => setRegPhone(e.target.value)} style={inputStyle} />
            <div style={{ position: 'relative' }}>
              <input type={showRegPassword ? "text" : "password"} placeholder="Password" required value={regPassword} onChange={e => setRegPassword(e.target.value)} style={{...inputStyle, paddingRight: '40px'}} />
              <button type="button" onClick={() => setShowRegPassword(!showRegPassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Shop Location & Address (Auto-Fetched via GPS)</label>
              <input type="text" placeholder="Auto-fetching shop address via GPS..." required value={onboardingAddress} onChange={e => setOnboardingAddress(e.target.value)} style={inputStyle} />
              <span style={{ fontSize: '10px', color: 'var(--primary-color)', marginTop: '2px', display: 'block', fontWeight: 'bold' }}>
                {geoDenied ? "⚠️ Location permission pending. Please allow GPS access in browser." : `✓ GPS Active: ${onboardingCoords}`}
              </span>
            </div>


            <button className="add-btn" type="submit" style={{ backgroundColor: 'var(--primary-color)', color: 'var(--secondary-color)', padding: '12px', fontSize: '14px', fontWeight: 'bold' }}>Register Shop</button>
            <p onClick={() => setIsRegistering(false)} style={{ textAlign: 'center', color: 'var(--primary-color)', cursor: 'pointer', fontSize: '13px', marginTop: '6px' }}>Already have a shop? Login</p>
          </form>
        ) : (
          !otpSent ? (
            <form key="login-form" onSubmit={handleAuthLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input type="text" placeholder="Email or Phone Number" required value={loginIdentifier} onChange={e => setLoginIdentifier(e.target.value)} style={inputStyle} />
              <div style={{ position: 'relative' }}>
                <input type={showLoginPassword ? "text" : "password"} placeholder="Password" required value={loginPassword} onChange={e => setLoginPassword(e.target.value)} style={{...inputStyle, paddingRight: '40px'}} />
                <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                  {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <button className="add-btn" type="submit" style={{ backgroundColor: 'var(--primary-color)', color: 'var(--secondary-color)', padding: '12px', fontSize: '14px', fontWeight: 'bold' }}>Login & Send OTP</button>
              <p onClick={() => setIsRegistering(true)} style={{ textAlign: 'center', color: 'var(--primary-color)', cursor: 'pointer', fontSize: '13px', marginTop: '6px' }}>Don't have a shop? Register now</p>
            </form>
          ) : (
            <form key="verify-form" onSubmit={handleAuthVerify} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', textAlign: 'center', marginBottom: '6px' }}>
                  Enter 6-Digit OTP sent to {loginIdentifier}
                </label>
                <input 
                  type="text" 
                  maxLength={6} 
                  value={inputOtp} 
                  onChange={e => setInputOtp(e.target.value.replace(/\D/g, ''))} 
                  required 
                  placeholder="XXXXXX" 
                  style={{ ...inputStyle, fontSize: '18px', letterSpacing: '6px', textAlign: 'center' }} 
                />
              </div>
              <button className="add-btn" type="submit" style={{ backgroundColor: 'var(--primary-color)', color: 'var(--secondary-color)', padding: '12px', fontSize: '14px', fontWeight: 'bold' }}>Verify OTP & Login</button>
              <button type="button" onClick={(e) => { e.preventDefault(); setOtpSent(false); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer', textAlign: 'center' }}>
                Back to password login
              </button>
            </form>
          )
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--background-color)' }}>
      {/* Merchant Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border-color)', backgroundColor: '#0f172a' }}>
        <div>
          <h2 style={{ fontSize: '16px', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
            <Store size={18} /> {shop.name}
          </h2>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Owner: <strong style={{ color: '#ffffff' }}>{shop.owner_name || 'Not Set'}</strong> | Live status: {wsConnected ? <span style={{ color: 'var(--success-color)', fontWeight: 'bold' }}>Online</span> : <span style={{ color: 'var(--error-color)', fontWeight: 'bold' }}>Disconnected</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            type="button"
            onClick={handleToggleShopStatus}
            style={{
              backgroundColor: shop.active ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              border: `1px solid ${shop.active ? '#22c55e' : '#ef4444'}`,
              color: shop.active ? '#22c55e' : '#ef4444',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: shop.active ? '#22c55e' : '#ef4444' }}></span>
            {shop.active ? 'Shop Live (Online)' : 'Shop Offline'}
          </button>
          <button 
            onClick={() => requestGeoLocation(true)}
            style={{
              backgroundColor: 'rgba(163, 230, 53, 0.15)',
              border: '1px solid rgba(163, 230, 53, 0.4)',
              color: 'var(--primary-color)',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
            title="Recalibrate Shop GPS Coordinates"
          >
            🎯 Calibrate Shop GPS
          </button>
          <button 
            onClick={() => setActiveView && setActiveView('consumer')}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            🛒 Switch to Consumer View
          </button>
          <button onClick={handleLogout} className="add-btn" style={{ borderColor: 'var(--error-color)', color: 'var(--error-color)' }}>Logout</button>

        </div>
      </header>

      {/* Navigation Sub-Header Tabs */}
      <div style={{ display: 'flex', gap: '8px', padding: '8px 16px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(15, 23, 42, 0.8)' }}>
        <button 
          onClick={() => setActiveMerchantTab('queue')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeMerchantTab === 'queue' ? 'var(--primary-color)' : 'transparent',
            color: activeMerchantTab === 'queue' ? 'var(--secondary-color)' : 'var(--text-muted)',
            fontWeight: 'bold',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Package size={16} /> Order Queue & Inventory
        </button>

        <button 
          onClick={() => setActiveMerchantTab('analytics')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeMerchantTab === 'analytics' ? 'var(--primary-color)' : 'transparent',
            color: activeMerchantTab === 'analytics' ? 'var(--secondary-color)' : 'var(--text-muted)',
            fontWeight: 'bold',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <TrendingUp size={16} /> Sales & Analytics Summary
        </button>
      </div>

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

      {/* TAB 1: ORDER QUEUE & INVENTORY */}
      {activeMerchantTab === 'queue' && (
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
                const custCoords = order.delivery_coordinates || trackingCoords[`cust_${order.id}`];
                const custAddress = order.delivery_address || trackingCoords[`cust_addr_${order.id}`];
                const hasCustomerLocation = !!(custCoords && custCoords.trim() !== '');

                return (
                  <div key={order.id} style={{ border: '1px solid var(--card-border)', borderRadius: '16px', padding: '14px', backgroundColor: 'var(--card-bg)', backdropFilter: 'blur(10px)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffffff' }}>Order #{order.id}</span>
                      <span style={{
                        fontSize: '11px',
                        padding: '3px 10px',
                        borderRadius: '999px',
                        fontWeight: 'bold',
                        backgroundColor: order.status === 'Preparing' ? 'rgba(245,158,11,0.2)' : 'rgba(163,230,53,0.2)',
                        color: order.status === 'Preparing' ? '#f59e0b' : 'var(--primary-color)'
                      }}>{order.status}</span>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      {order.items.map(item => (
                        <div key={item.id}>• {item.product_name} x {item.quantity} (₹{item.price})</div>
                      ))}
                      <div style={{ marginTop: '4px', fontWeight: 'bold', color: '#ffffff' }}>Total: ₹{order.total_amount}</div>
                    </div>

                    {/* Customer Address & GPS Details Card */}
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '12px', marginTop: '8px', marginBottom: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--primary-color)', marginBottom: '4px' }}>
                        👤 Phone: {order.customer_phone}
                      </div>
                      <div style={{ fontSize: '12px', color: '#ffffff', fontWeight: '600', marginBottom: '4px', lineHeight: '1.4' }}>
                        🏠 <strong>Delivery Address:</strong> {custAddress || 'Location set via GPS'}
                      </div>
                      {hasCustomerLocation ? (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          📍 GPS Coords: <code style={{ color: 'var(--primary-color)' }}>{custCoords}</code>
                        </div>
                      ) : (
                        <div style={{ fontSize: '11px', color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '4px 8px', borderRadius: '6px', marginTop: '4px' }}>
                          ⚠️ Location coordinates pending
                        </div>
                      )}
                    </div>

                    {/* Quick Navigate Button available on all active orders with GPS */}
                    {hasCustomerLocation && (
                      <button
                        className="add-btn"
                        onClick={() => navigateToCustomer(order.id, custCoords)}
                        style={{
                          backgroundColor: '#2563eb',
                          color: '#ffffff',
                          width: '100%',
                          padding: '8px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          marginBottom: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        🗺️ Navigate to Customer Location (Google Maps)
                      </button>
                    )}

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
                        <button className="add-btn" onClick={() => handleMarkPacked(order.id)} style={{ backgroundColor: 'var(--primary-color)', color: 'var(--secondary-color)', fontWeight: 'bold' }}>Mark Packed & Ready</button>
                      </div>
                    )}

                    {order.status === 'In Transit' && (
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {hasCustomerLocation && (
                          activeTracking[order.id] !== undefined ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '11px', color: 'var(--success-color)', fontWeight: 'bold' }}>📡 Live GPS Broadcast Active</span>
                              <button className="add-btn" onClick={() => stopLocationTracking(order.id)} style={{ borderColor: 'var(--error-color)', color: 'var(--error-color)', padding: '4px 8px', fontSize: '11px' }}>Stop Tracking</button>
                            </div>
                          ) : (
                            <button className="add-btn" onClick={() => startLocationTracking(order)} style={{ backgroundColor: 'rgba(163,230,53,0.15)', color: 'var(--primary-color)', border: '1px solid rgba(163,230,53,0.4)' }}>📡 Start Live GPS Broadcast</button>
                          )
                        )}
                        <button className="add-btn" onClick={() => handleMarkDelivered(order.id)} style={{ backgroundColor: 'var(--success-color)', color: '#000000', fontWeight: 'bold' }}>Mark Order Delivered</button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>


          {/* Product Inventory Section */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px', fontWeight: 'bold' }}>Product Inventory ({products.length})</h3>
            <button onClick={handleOpenAddProduct} className="add-btn" style={{ backgroundColor: 'var(--primary-color)', color: 'var(--secondary-color)', padding: '6px 12px', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Plus size={16} /> Add Product
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
            {products.map(product => (
              <div key={product.id} style={{ border: '1px solid var(--card-border)', borderRadius: '12px', padding: '10px', backgroundColor: 'var(--card-bg)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column' }}>
                <img src={product.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&q=80'} alt={product.name} style={{ width: '100%', height: '90px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px' }} />
                <h4 style={{ fontSize: '13px', color: '#ffffff', margin: '0 0 4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</h4>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Category: {product.category}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--primary-color)' }}>₹{product.offered_price}</span>
                  <span style={{ fontSize: '11px', color: product.stock < 5 ? 'var(--error-color)' : 'var(--text-muted)' }}>Stock: {product.stock}</span>
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: 'auto' }}>
                  <button onClick={() => handleOpenEditProduct(product)} style={{ flex: 1, padding: '4px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'transparent', color: '#ffffff', fontSize: '11px', cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => handleDeleteProduct(product.id)} style={{ flex: 1, padding: '4px', borderRadius: '6px', border: '1px solid var(--error-color)', backgroundColor: 'transparent', color: 'var(--error-color)', fontSize: '11px', cursor: 'pointer' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </main>
      )}

      {/* TAB 2: SALES & ANALYTICS SUMMARY */}
      {activeMerchantTab === 'analytics' && (
        <main style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#ffffff', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={22} color="var(--primary-color)" /> Sales Performance & Analytics
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Real-time summary of sales revenue, order volumes, and top performing catalog items.
            </p>
          </div>

          {/* Period Selection Controls */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            {[
              { id: 'daily', label: 'Daily' },
              { id: 'weekly', label: 'Weekly (7d)' },
              { id: 'monthly', label: 'Monthly (30d)' },
              { id: 'quarterly', label: 'Quarterly (90d)' },
              { id: 'annual', label: 'Annual (365d)' },
              { id: 'custom', label: '📅 Custom Range' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setSalesPeriod(p.id)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: salesPeriod === p.id ? '1px solid var(--primary-color)' : '1px solid rgba(255,255,255,0.1)',
                  backgroundColor: salesPeriod === p.id ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                  color: salesPeriod === p.id ? 'var(--secondary-color)' : '#ffffff',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs if Custom Selected */}
          {salesPeriod === 'custom' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '16px', backgroundColor: 'rgba(15,23,42,0.6)', padding: '14px', borderRadius: '12px', border: '1px solid var(--primary-color)' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={e => setCustomStartDate(e.target.value)}
                  style={{ ...inputStyle, width: 'auto' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={e => setCustomEndDate(e.target.value)}
                  style={{ ...inputStyle, width: 'auto' }}
                />
              </div>
              <button
                onClick={() => fetchSalesAnalytics('custom', customStartDate, customEndDate)}
                style={{
                  marginTop: '18px',
                  backgroundColor: 'var(--primary-color)',
                  color: 'var(--secondary-color)',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Apply Date Range
              </button>
            </div>
          )}

          {/* Analytics Summary Cards */}
          {loadingAnalytics ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '14px' }}>
              Loading sales analytics summary...
            </div>
          ) : analyticsData ? (
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Showing summary from <strong>{analyticsData.start_date}</strong> to <strong>{analyticsData.end_date}</strong>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', padding: '16px', borderRadius: '16px', backdropFilter: 'blur(10px)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold', marginBottom: '6px' }}>Total Sales Revenue</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary-color)' }}>₹{analyticsData.total_sales.toLocaleString('en-IN')}</div>
                </div>

                <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', padding: '16px', borderRadius: '16px', backdropFilter: 'blur(10px)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold', marginBottom: '6px' }}>Total Orders Received</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff' }}>{analyticsData.total_orders}</div>
                </div>

                <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', padding: '16px', borderRadius: '16px', backdropFilter: 'blur(10px)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold', marginBottom: '6px' }}>Delivered Orders</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--success-color)' }}>{analyticsData.delivered_orders}</div>
                </div>

                <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', padding: '16px', borderRadius: '16px', backdropFilter: 'blur(10px)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold', marginBottom: '6px' }}>Average Order Value</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#38bdf8' }}>₹{analyticsData.avg_order_value}</div>
                </div>
              </div>

              {/* Top Products Breakdown */}
              <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', padding: '16px', backdropFilter: 'blur(10px)' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffffff', marginBottom: '12px' }}>🔥 Top Selling Products</h4>
                {analyticsData.top_products && analyticsData.top_products.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {analyticsData.top_products.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ fontSize: '13px', color: '#ffffff', fontWeight: '500' }}>#{idx + 1} {item.name}</span>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--primary-color)', backgroundColor: 'rgba(163,230,53,0.1)', padding: '4px 10px', borderRadius: '999px' }}>
                          {item.qty} units sold
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>
                    No product sales recorded for this timeframe.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '13px' }}>
              Select a period to view sales metrics summary.
            </div>
          )}
        </main>
      )}

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
                    <option value="Baby Care">Baby Care</option>
                    <option value="Pet Care">Pet Care</option>
                    <option value="Stationery">Stationery</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textAlign: 'left' }}>Product Image (S3 Upload)</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={e => handleFileUpload(e.target.files[0], 'product')} 
                  style={{ ...inputStyle, padding: '8px' }}
                />
                <button type="button" className="mock-upload-btn" onClick={() => {
                  fetch('/src/assets/react.svg')
                    .then(res => res.blob())
                    .then(blob => {
                      const file = new File([blob], 'react.svg', { type: 'image/svg+xml' });
                      handleFileUpload(file, 'product');
                    });
                }} style={{ ...inputStyle, padding: '8px', cursor: 'pointer', backgroundColor: 'var(--primary-color)', color: 'var(--secondary-color)', marginTop: '8px' }}>
                  Mock Upload react.svg
                </button>
                {uploading && <span style={{ fontSize: '11px', color: 'var(--primary-color)', display: 'block', marginTop: '4px', textAlign: 'left' }}>Uploading to S3...</span>}
                {prodImage && <span style={{ fontSize: '11px', color: 'var(--success-color)', display: 'block', marginTop: '4px', textAlign: 'left' }}>✓ Uploaded to S3 successfully</span>}
              </div>
              <button className="add-btn" type="submit" style={{ backgroundColor: 'var(--primary-color)', color: 'var(--secondary-color)', padding: '12px', fontSize: '14px', fontWeight: 'bold', marginTop: '10px' }}>Save to Catalog</button>
            </form>
          </div>
        </div>
      )}

      {/* Onboarding Profile Verification Modal for Shop */}
      {showOnboarding && (
        <div className="drawer-overlay" style={{ zIndex: 3000 }}>
          <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--primary-color)' }}>Shop Onboarding & Details Verification</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Please verify and complete all shop details below before proceeding to the merchant portal.
              </p>
            </div>

            <form onSubmit={handleCompleteProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#ffffff' }}>Shop Name (Re-verify)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ziplo Express Supermarket"
                  value={onboardingShopName}
                  onChange={(e) => setOnboardingShopName(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#ffffff' }}>Owner Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patel"
                  value={onboardingOwnerName}
                  onChange={(e) => setOnboardingOwnerName(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#ffffff' }}>Shop Address</label>
                <textarea
                  required
                  placeholder="e.g. Shop #4, City Center Mall, RC Dutt Road, Vadodara"
                  value={onboardingAddress}
                  onChange={(e) => setOnboardingAddress(e.target.value)}
                  style={{
                    ...inputStyle,
                    height: '60px',
                    resize: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#ffffff', display: 'block', marginBottom: '4px' }}>Front Side Picture of Shop</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={e => handleFileUpload(e.target.files[0], 'shop')} 
                  style={{ ...inputStyle, padding: '8px' }}
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <button type="button" className="mock-upload-btn" onClick={() => {
                    fetch('/src/assets/react.svg')
                      .then(res => res.blob())
                      .then(blob => {
                        const file = new File([blob], 'react.svg', { type: 'image/svg+xml' });
                        handleFileUpload(file, 'shop');
                      });
                  }} style={{ ...inputStyle, flex: 1, padding: '8px', cursor: 'pointer', backgroundColor: 'rgba(255,255,255,0.05)', color: '#ffffff' }}>
                    📷 Mock Upload Demo Image
                  </button>
                </div>
                <input
                  type="url"
                  placeholder="Or paste direct image URL (e.g. https://...)"
                  value={onboardingShopImage || shopImage}
                  onChange={(e) => setOnboardingShopImage(e.target.value)}
                  style={{ ...inputStyle, marginTop: '6px' }}
                />
                {uploading && <span style={{ fontSize: '11px', color: 'var(--primary-color)', display: 'block', marginTop: '4px' }}>Uploading picture to S3...</span>}
                {(onboardingShopImage || shopImage) && (
                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={onboardingShopImage || shopImage} alt="Shop Front" style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--primary-color)' }} />
                    <span style={{ fontSize: '11px', color: 'var(--success-color)', fontWeight: 'bold' }}>✓ Shop Front Picture attached</span>
                  </div>
                )}
              </div>

              <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)' }}>GPS Geolocation Status</span>
                  <button type="button" onClick={() => requestGeoLocation()} style={{ fontSize: '10px', backgroundColor: 'transparent', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 'bold' }}>
                    🔄 Refresh GPS
                  </button>
                </div>
                {geoDenied ? (
                  <span style={{ fontSize: '11px', color: 'var(--error-color)', display: 'block' }}>
                    ⚠️ Geolocation permission denied. Defaulting coordinates: {onboardingCoords}
                  </span>
                ) : (
                  <span style={{ fontSize: '11px', color: 'var(--success-color)', display: 'block' }}>
                    ✓ Location active. Coordinates: {onboardingCoords}
                  </span>
                )}
              </div>

              <button className="add-btn" type="submit" style={{
                padding: '12px',
                backgroundColor: 'var(--primary-color)',
                color: 'var(--secondary-color)',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginTop: '10px'
              }}>
                Verify & Save Shop Details
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
