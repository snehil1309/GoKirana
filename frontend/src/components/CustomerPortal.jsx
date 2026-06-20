import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingCart, Search, Info, MapPin, X, Check, ArrowRight, 
  Clock, ArrowLeft, Star, Settings, ShieldAlert, Navigation,
  Compass, ShieldCheck, HelpCircle, Laptop
} from 'lucide-react';

export default function CustomerPortal({ backendUrl }) {
  // State definitions
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [shops, setShops] = useState([]);
  const [filteredShops, setFilteredShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState({});
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Map settings and location
  const [userLocation, setUserLocation] = useState({ lat: 22.3072, lng: 73.1678 }); // Alkapuri, Vadodara
  const [locationName, setLocationName] = useState('Alkapuri, Vadodara');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [vicinityOnly, setVicinityOnly] = useState(true); // Default filter within 2 KM
  const [mapplsApiKey, setMapplsApiKey] = useState(localStorage.getItem('mappls_api_key') || '');
  const [mapType, setMapType] = useState(localStorage.getItem('mappls_api_key') ? 'mappls' : 'osm'); // 'osm' or 'mappls'
  const [showMapSettings, setShowMapSettings] = useState(false);

  // Cart conflict state
  const [showCartConflictModal, setShowCartConflictModal] = useState(false);
  const [pendingProduct, setPendingProduct] = useState(null);

  // Auth state
  const [userPhone, setUserPhone] = useState(localStorage.getItem('cust_phone') || '');
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('cust_phone'));
  const [tempPhone, setTempPhone] = useState('9106804063');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [mockOtp, setMockOtp] = useState('');
  const [inputOtp, setInputOtp] = useState('');
  const [loginMethod, setLoginMethod] = useState('password'); // 'password' or 'otp'
  const [loginPassword, setLoginPassword] = useState('');

  // Checkout & Tracking
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [pastOrders, setPastOrders] = useState([]);

  // Mockup Categories
  const categories = [
    { name: 'Grocery', icon: 'https://cdn-icons-png.flaticon.com/128/3724/3724720.png' },
    { name: 'Pharmacy', icon: 'https://cdn-icons-png.flaticon.com/128/2966/2966327.png' },
    { name: 'Baby Care', icon: 'https://cdn-icons-png.flaticon.com/128/2329/2329903.png' },
    { name: 'Pet Care', icon: 'https://cdn-icons-png.flaticon.com/128/3050/3050158.png' },
    { name: 'Stationery', icon: 'https://cdn-icons-png.flaticon.com/128/1902/1902611.png' }
  ];

  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const leafletCircleRef = useRef(null);
  const leafletMarkersRef = useRef([]);

  // Fetch initial data
  useEffect(() => {
    fetchProducts();
    fetchShops();
    if (isLoggedIn) {
      fetchPastOrders(userPhone);
    }
  }, [isLoggedIn, userPhone]);

  // Haversine formula for distance calculation in KM
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Filter shops based on location, distance, and search query
  useEffect(() => {
    let result = shops.map(shop => {
      let lat = 22.3072, lng = 73.1678;
      if (shop.coordinates) {
        const coords = shop.coordinates.split(',');
        lat = parseFloat(coords[0]);
        lng = parseFloat(coords[1]);
      }
      const distance = calculateDistance(userLocation.lat, userLocation.lng, lat, lng);
      return { ...shop, distance };
    });

    // Sort by distance
    result.sort((a, b) => a.distance - b.distance);

    // Filter within 2 KM if toggle is active
    if (vicinityOnly) {
      result = result.filter(s => s.distance <= 2.0);
    }

    // Filter by search query
    if (searchQuery && !selectedShop) {
      result = result.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredShops(result);
  }, [shops, userLocation, vicinityOnly, searchQuery, selectedShop]);

  // Filter products when shop is selected
  useEffect(() => {
    if (selectedShop) {
      let result = products.filter(p => p.shop_id === selectedShop.id);
      if (selectedCategory) {
        result = result.filter(p => p.category.toLowerCase() === selectedCategory.toLowerCase());
      }
      if (searchQuery) {
        result = result.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
      }
      setFilteredProducts(result);
    }
  }, [products, selectedShop, selectedCategory, searchQuery]);

  // Load Map Library (Leaflet or Mappls)
  useEffect(() => {
    if (selectedShop || showLocationModal) return; // Only show main map on directory screen

    // Dynamically load Leaflet CDN if not already loaded
    if (!window.L) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        initLeafletMap();
      };
      document.body.appendChild(script);
    } else {
      initLeafletMap();
    }

    return () => {
      // Cleanup leaflet map instance on unmount
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [selectedShop, userLocation, filteredShops, mapType]);

  const initLeafletMap = () => {
    if (!window.L || !mapContainerRef.current) return;
    if (leafletMapRef.current) {
      leafletMapRef.current.setView([userLocation.lat, userLocation.lng], 14);
      updateMapMarkers();
      return;
    }

    // Initialize map
    const map = window.L.map(mapContainerRef.current, {
      center: [userLocation.lat, userLocation.lng],
      zoom: 14,
      zoomControl: false
    });

    leafletMapRef.current = map;

    // Premium Dark Mode style Map tiles (CartoDB Dark Matter)
    window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CartoDB'
    }).addTo(map);

    // Custom icons
    const userIcon = window.L.divIcon({
      className: 'user-map-pin',
      html: `<div style="background-color: #A3E635; width: 14px; height: 14px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 10px #A3E635;"></div>`,
      iconSize: [20, 20]
    });

    // User pin
    window.L.marker([userLocation.lat, userLocation.lng], { icon: userIcon }).addTo(map);

    // 2KM Radius circle
    const circle = window.L.circle([userLocation.lat, userLocation.lng], {
      color: '#A3E635',
      fillColor: '#A3E635',
      fillOpacity: 0.1,
      radius: 2000,
      weight: 1.5,
      dashArray: '5, 5'
    }).addTo(map);
    leafletCircleRef.current = circle;

    updateMapMarkers();
  };

  const updateMapMarkers = () => {
    const map = leafletMapRef.current;
    if (!map || !window.L) return;

    // Clear existing markers
    leafletMarkersRef.current.forEach(marker => map.removeLayer(marker));
    leafletMarkersRef.current = [];

    // Add shop markers
    filteredShops.forEach(shop => {
      if (!shop.coordinates) return;
      const coords = shop.coordinates.split(',');
      const lat = parseFloat(coords[0]);
      const lng = parseFloat(coords[1]);

      const shopIcon = window.L.divIcon({
        className: 'shop-map-pin',
        html: `<div style="background-color: ${shop.distance <= 2.0 ? '#A3E635' : '#ef4444'}; width: 10px; height: 10px; border-radius: 50%; border: 2.5px solid #0b0f19; box-shadow: 0 0 8px ${shop.distance <= 2.0 ? '#A3E635' : '#ef4444'};"></div>`,
        iconSize: [16, 16]
      });

      const marker = window.L.marker([lat, lng], { icon: shopIcon }).addTo(map);
      marker.bindPopup(`<strong style="color: #0F172A;">${shop.name}</strong><br/><span style="color: #475569; font-size: 11px;">${shop.distance.toFixed(1)} km away</span>`);
      
      marker.on('click', () => {
        setSelectedShop(shop);
        setSelectedCategory(null);
        setSearchQuery('');
      });

      leafletMarkersRef.current.push(marker);
    });

    // Update radius circle position
    if (leafletCircleRef.current) {
      leafletCircleRef.current.setLatLng([userLocation.lat, userLocation.lng]);
    }
  };

  // Poll active order status if exists
  useEffect(() => {
    if (!activeOrder) return;
    const interval = setInterval(() => {
      fetch(`${backendUrl}/api/orders/customer/${userPhone}`)
        .then(res => res.json())
        .then(data => {
          const matching = data.find(o => o.id === activeOrder.id);
          if (matching) {
            setActiveOrder(matching);
            if (matching.status === 'Delivered') {
              clearInterval(interval);
            }
          }
        })
        .catch(err => console.error(err));
    }, 3000);
    return () => clearInterval(interval);
  }, [activeOrder, backendUrl, userPhone]);

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/products`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const fetchShops = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/shops`);
      if (res.ok) {
        const data = await res.json();
        setShops(data);
      }
    } catch (err) {
      console.error('Error fetching shops:', err);
    }
  };

  const fetchPastOrders = async (phone) => {
    try {
      const res = await fetch(`${backendUrl}/api/orders/customer/${phone}`);
      if (res.ok) {
        const data = await res.json();
        setPastOrders(data);
        const incomplete = data.find(o => o.status !== 'Delivered' && o.status !== 'Cancelled');
        if (incomplete) {
          setActiveOrder(incomplete);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendOtp = () => {
    if (!tempPhone || tempPhone.length < 10) {
      alert('Please enter a valid 10-digit mobile number.');
      return;
    }
    const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
    setMockOtp(generatedOtp);
    setOtpSent(true);
    alert(`[Demo OTP Sent]: ${generatedOtp}`);
  };

  const handleVerifyOtp = () => {
    if (inputOtp === mockOtp || inputOtp === '1234') {
      localStorage.setItem('cust_phone', tempPhone);
      setUserPhone(tempPhone);
      setIsLoggedIn(true);
      setShowLoginModal(false);
      setOtpSent(false);
      setInputOtp('');
    } else {
      alert('Invalid OTP. Please try again.');
    }
  };

  const handlePasswordLogin = () => {
    if (!tempPhone || tempPhone.length < 10) {
      alert('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (tempPhone === '9106804063' && loginPassword === 'Test123') {
      localStorage.setItem('cust_phone', tempPhone);
      setUserPhone(tempPhone);
      setIsLoggedIn(true);
      setShowLoginModal(false);
      setLoginPassword('');
    } else {
      alert('Invalid phone number or password. Try 9106804063 / Test123.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('cust_phone');
    setIsLoggedIn(false);
    setUserPhone('');
    setActiveOrder(null);
    setPastOrders([]);
  };

  const addToCart = (product) => {
    const existingItems = Object.values(cart);
    if (existingItems.length > 0 && existingItems[0].product.shop_id !== product.shop_id) {
      setPendingProduct(product);
      setShowCartConflictModal(true);
      return;
    }

    setCart(prev => {
      const currentQty = prev[product.id]?.quantity || 0;
      if (currentQty >= product.stock) {
        alert('Cannot add more. Insufficient stock!');
        return prev;
      }
      return {
        ...prev,
        [product.id]: {
          product,
          quantity: currentQty + 1
        }
      };
    });
  };

  const handleClearCartAndAddPending = () => {
    if (pendingProduct) {
      setCart({
        [pendingProduct.id]: {
          product: pendingProduct,
          quantity: 1
        }
      });
      setPendingProduct(null);
    }
    setShowCartConflictModal(false);
  };

  const removeFromCart = (productId) => {
    setCart(prev => {
      const current = prev[productId];
      if (!current) return prev;
      const next = { ...prev };
      if (current.quantity <= 1) {
        delete next[productId];
      } else {
        next[productId] = {
          ...current,
          quantity: current.quantity - 1
        };
      }
      return next;
    });
  };

  const getCartTotal = () => {
    return Object.values(cart).reduce((total, item) => total + (item.product.offered_price * item.quantity), 0);
  };

  const handlePlaceOrderClick = () => {
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async () => {
    const itemsList = Object.values(cart).map(item => ({
      product_id: item.product.id,
      product_name: item.product.name,
      quantity: item.quantity,
      price: item.product.offered_price
    }));

    const firstProduct = Object.values(cart)[0]?.product;
    if (!firstProduct) return;

    const orderPayload = {
      customer_phone: userPhone,
      shop_id: firstProduct.shop_id,
      items: itemsList,
      total_amount: getCartTotal()
    };

    try {
      const res = await fetch(`${backendUrl}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });
      if (res.ok) {
        const orderData = await res.json();
        setActiveOrder(orderData);
        setCart({});
        setShowPaymentModal(false);
        setIsCartOpen(false);
        fetchProducts(); // Refresh stocks
        fetchPastOrders(userPhone);
      } else {
        alert('Order placement failed.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Change location manual selection
  const selectLocation = (preset) => {
    if (preset === 'alkapuri') {
      setUserLocation({ lat: 22.3072, lng: 73.1678 });
      setLocationName('Alkapuri, Vadodara');
    } else if (preset === 'gotri') {
      setUserLocation({ lat: 22.3220, lng: 73.1250 });
      setLocationName('Gotri, Vadodara');
    } else if (preset === 'manjalpur') {
      setUserLocation({ lat: 22.2750, lng: 73.1980 });
      setLocationName('Manjalpur, Vadodara');
    }
    setShowLocationModal(false);
  };

  const saveMapplsConfig = (key) => {
    localStorage.setItem('mappls_api_key', key);
    setMapplsApiKey(key);
    setMapType(key ? 'mappls' : 'osm');
    setShowMapSettings(false);
    alert('MapmyIndia key saved. Real keys will load the Mappls vector tiles.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Top Address & Profile Bar */}
      <header>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {selectedShop ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button 
                onClick={() => { setSelectedShop(null); setSelectedCategory(null); setSearchQuery(''); }}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <ArrowLeft size={20} color="var(--primary-color)" />
              </button>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffffff' }}>{selectedShop.name}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{selectedShop.address}</div>
              </div>
            </div>
          ) : (
            <div 
              style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
              onClick={() => setShowLocationModal(true)}
            >
              <MapPin size={18} color="var(--primary-color)" />
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Deliver to</div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {locationName} <span style={{ fontSize: '10px', color: 'var(--primary-color)' }}>▼</span>
                </div>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              onClick={() => setShowMapSettings(true)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
              title="Map Settings"
            >
              <Settings size={18} />
            </button>
            {isLoggedIn ? (
              <button onClick={handleLogout} className="add-btn" style={{ borderColor: 'var(--error-color)', color: 'var(--error-color)' }}>
                Logout ({userPhone.slice(-4)})
              </button>
            ) : (
              <button onClick={() => setShowLoginModal(true)} className="add-btn">
                Login
              </button>
            )}
          </div>
        </div>

        <div className="search-container">
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            className="search-input"
            placeholder={selectedShop ? `Search in ${selectedShop.name}...` : 'Search for stores or products...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      {/* Main Promo Banner */}
      {!selectedShop && (
        <div style={{
          margin: '16px 16px 4px 16px',
          background: 'linear-gradient(135deg, #0b1528 0%, #1e293b 100%)',
          borderRadius: '16px',
          padding: '16px',
          border: '1.5px solid rgba(163, 230, 53, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h3 style={{ color: 'var(--primary-color)', fontSize: '18px', fontWeight: 'bold' }}>Local Stores.</h3>
            <h4 style={{ color: '#ffffff', fontSize: '14px', fontWeight: '600' }}>Fast Delivery. Right to You.</h4>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>Fresh essentials delivered in minutes.</span>
          </div>
          <div style={{
            backgroundColor: 'var(--primary-color)',
            color: 'var(--secondary-color)',
            padding: '8px 14px',
            borderRadius: '12px',
            fontSize: '20px',
            fontWeight: '900',
            fontStyle: 'italic',
            letterSpacing: '-1px'
          }}>
            ziplo
          </div>
        </div>
      )}

      {selectedShop ? (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          {/* Shop Banner Header */}
          <div className="shop-banner" style={{
            position: 'relative',
            height: '140px',
            backgroundImage: `linear-gradient(to bottom, rgba(3,7,18,0.2), rgba(3,7,18,0.9)), url(${selectedShop.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80'})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            color: '#ffffff',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'end'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>{selectedShop.name}</h2>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{selectedShop.address}</p>
              </div>
              <div style={{ backgroundColor: 'rgba(163, 230, 53, 0.2)', border: '1px solid var(--primary-color)', padding: '4px 8px', borderRadius: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary-color)' }}>
                <Star size={12} fill="var(--primary-color)" color="var(--primary-color)" />
                <span style={{ fontWeight: 'bold' }}>4.3</span>
              </div>
            </div>
          </div>

          {/* New Split Layout: Left Categories Sidebar, Right Products Section */}
          <div className="shop-layout-split" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            
            {/* Left Category Sidebar */}
            <aside className="category-sidebar">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {categories.map((cat, idx) => (
                  <div
                    key={idx}
                    className={`category-sidebar-card ${selectedCategory === cat.name ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}
                  >
                    <div className="category-image-wrapper">
                      <img src={cat.icon} alt={cat.name} />
                    </div>
                    <span className="category-name">{cat.name}</span>
                  </div>
                ))}
              </div>
            </aside>

            {/* Right Products Feed */}
            <main className="products-section" style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 80px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 'bold' }}>
                  {selectedCategory ? `${selectedCategory}` : 'All Products'}
                </h3>
                <span style={{ fontSize: '11px', color: 'var(--primary-color)', backgroundColor: 'rgba(163, 230, 53, 0.1)', padding: '2px 8px', borderRadius: '20px' }}>
                  Free Delivery above ₹199
                </span>
              </div>
              
              {filteredProducts.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
                  No products found matching filters.
                </div>
              ) : (
                <div className="products-grid">
                  {filteredProducts.map(p => {
                    const cartItem = cart[p.id];
                    return (
                      <div key={p.id} className="product-card">
                        <div className="product-image-container" onClick={() => setSelectedProduct(p)}>
                          <img src={p.image_url || 'https://via.placeholder.com/150'} alt={p.name} className="product-image" />
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }} onClick={() => setSelectedProduct(p)}>
                          <h4 className="product-name">{p.name}</h4>
                          <span className="product-desc">{p.description}</span>
                        </div>
                        <div className="product-price-row">
                          <div className="price-box">
                            <span className="offered-price">₹{p.offered_price}</span>
                            {p.mrp > p.offered_price && (
                              <span className="mrp-price">₹{p.mrp}</span>
                            )}
                          </div>

                          {p.stock === 0 ? (
                            <span style={{ fontSize: '11px', color: 'var(--error-color)', fontWeight: 'bold' }}>Out of stock</span>
                          ) : cartItem ? (
                            <div className="qty-btn-container">
                              <button className="qty-action-btn" onClick={() => removeFromCart(p.id)}>-</button>
                              <span className="qty-val">{cartItem.quantity}</span>
                              <button className="qty-action-btn" onClick={() => addToCart(p)}>+</button>
                            </div>
                          ) : (
                            <button className="add-btn" onClick={() => addToCart(p)}>ADD</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </main>
          </div>
        </div>
      ) : (
        /* Shop Directory Page with Interactive Map */
        <div className="directory-container">
          <div className="map-section">
            <div className="map-controls">
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-dark)' }}>Vicinity Map (2 KM Area)</span>
              <button 
                className={`map-toggle-btn ${vicinityOnly ? 'active' : ''}`}
                onClick={() => setVicinityOnly(!vicinityOnly)}
              >
                <Compass size={14} /> {vicinityOnly ? 'Vicinity: 2 KM' : 'Showing All'}
              </button>
            </div>
            <div className="map-wrapper">
              <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }}>
                <div className="map-placeholder">
                  <Navigation className="animate-pulse" size={24} color="var(--primary-color)" />
                  <span style={{ fontSize: '12px' }}>Loading Interactive Map...</span>
                </div>
              </div>
            </div>
          </div>

          <main style={{ padding: '0 16px 16px 16px', flex: 1 }}>
            <h3 style={{ fontSize: '14px', marginBottom: '12px', fontWeight: 'bold' }}>
              Stores Nearby ({filteredShops.length})
            </h3>
            {filteredShops.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px 10px', backgroundColor: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                No shops listed within a 2 KM vicinity of your selected location.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {filteredShops.map(shop => {
                  const isClose = shop.distance <= 2.0;
                  return (
                    <div 
                      key={shop.id} 
                      className="shop-directory-card"
                      onClick={() => { setSelectedShop(shop); setSelectedCategory(null); setSearchQuery(''); }}
                      style={{
                        background: 'var(--card-bg)',
                        border: '1px solid var(--card-border)',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                    >
                      <div style={{ position: 'relative', height: '130px' }}>
                        <img 
                          src={shop.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80'} 
                          alt={shop.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div style={{
                          position: 'absolute',
                          bottom: '10px',
                          right: '10px',
                          backgroundColor: '#0F172A',
                          border: '1.5px solid var(--primary-color)',
                          padding: '4px 8px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          color: 'var(--primary-color)',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                        }}>
                          {shop.distance.toFixed(1)} km away
                        </div>
                        {!isClose && (
                          <div style={{
                            position: 'absolute',
                            top: '10px',
                            left: '10px',
                            backgroundColor: 'rgba(239, 68, 68, 0.9)',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            color: '#ffffff'
                          }}>
                            Outside 2 KM
                          </div>
                        )}
                      </div>
                      <div style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                          <h4 style={{ fontSize: '15px', fontWeight: 'bold', color: '#ffffff' }}>{shop.name}</h4>
                          <div style={{ backgroundColor: 'rgba(163, 230, 53, 0.15)', border: '1px solid rgba(163, 230, 53, 0.3)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', color: 'var(--primary-color)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '2px' }}>
                            ★ 4.3
                          </div>
                        </div>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{shop.address}</p>
                        <div style={{ borderTop: '1px dashed var(--border-color)', marginTop: '10px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
                          <span>Free Delivery</span>
                          <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>20-30 mins</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Mockup features footer */}
            <div className="features-footer">
              <div className="feature-item">
                <Compass size={14} color="var(--primary-color)" />
                <span>LOCAL STORES</span>
              </div>
              <div className="feature-item">
                <Clock size={14} color="var(--primary-color)" />
                <span>FAST DELIVERY</span>
              </div>
              <div className="feature-item">
                <ShieldCheck size={14} color="var(--primary-color)" />
                <span>TRUSTED & SAFE</span>
              </div>
              <div className="feature-item">
                <HelpCircle size={14} color="var(--primary-color)" />
                <span>24x7 SUPPORT</span>
              </div>
            </div>
          </main>
        </div>
      )}

      {/* Active Order Tracking Screen (Sticky banner or modal when active) */}
      {activeOrder && (
        <div style={{
          backgroundColor: '#0c2e17',
          borderTop: '2px solid var(--primary-color)',
          padding: '12px 16px',
          position: 'sticky',
          bottom: Object.keys(cart).length > 0 ? '60px' : '0',
          zIndex: 80
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} color="var(--primary-color)" />
              <div>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#ffffff' }}>Tracking Order #{activeOrder.id}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Status: <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>{activeOrder.status}</span></div>
              </div>
            </div>
            <button className="add-btn" style={{ fontSize: '10px' }} onClick={() => setSelectedProduct({ tracking: true })}>
              View Tracking
            </button>
          </div>
        </div>
      )}

      {/* Cart Summary Bar */}
      {Object.keys(cart).length > 0 && (
        <div className="cart-bar" onClick={() => setIsCartOpen(true)}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <ShoppingCart size={20} />
            <span className="badge">{Object.values(cart).reduce((sum, item) => sum + item.quantity, 0)} Items</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '15px' }}>₹{getCartTotal()}</span>
            <ArrowRight size={18} />
          </div>
        </div>
      )}

      {/* Item Specifications / Tracking Details Modal */}
      {selectedProduct && (
        <div className="drawer-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="drawer-content" onClick={(e) => e.stopPropagation()} style={{ minHeight: '350px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <button onClick={() => setSelectedProduct(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ffffff' }}>
                <X size={24} />
              </button>
            </div>

            {selectedProduct.tracking ? (
              // Order Tracking details
              <div>
                <h3 style={{ fontSize: '18px', marginBottom: '16px', color: 'var(--primary-color)' }}>Order Tracking</h3>
                {activeOrder ? (
                  <div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative', paddingLeft: '24px' }}>
                      {/* VertLine */}
                      <div style={{
                        position: 'absolute',
                        left: '7px',
                        top: '8px',
                        bottom: '8px',
                        width: '2px',
                        backgroundColor: 'rgba(255,255,255,0.1)'
                      }}></div>

                      {/* Step 1 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
                        <div style={{
                          position: 'absolute',
                          left: '-23px',
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          backgroundColor: ['Ordered', 'Preparing', 'In Transit', 'Delivered'].includes(activeOrder.status) ? 'var(--primary-color)' : '#334155',
                          border: '3px solid #0f172a'
                        }}></div>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '13px' }}>Order Placed</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>We have received your order request.</div>
                        </div>
                      </div>

                      {/* Step 2 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
                        <div style={{
                          position: 'absolute',
                          left: '-23px',
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          backgroundColor: ['Preparing', 'In Transit', 'Delivered'].includes(activeOrder.status) ? 'var(--primary-color)' : '#334155',
                          border: '3px solid #0f172a'
                        }}></div>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '13px' }}>Preparing & Packing (5-Min Prep)</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>The merchant is packing your items.</div>
                        </div>
                      </div>

                      {/* Step 3 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
                        <div style={{
                          position: 'absolute',
                          left: '-23px',
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          backgroundColor: ['In Transit', 'Delivered'].includes(activeOrder.status) ? 'var(--primary-color)' : '#334155',
                          border: '3px solid #0f172a'
                        }}></div>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '13px' }}>In Transit</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Delivery partner is bringing your order.</div>
                        </div>
                      </div>

                      {/* Step 4 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
                        <div style={{
                          position: 'absolute',
                          left: '-23px',
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          backgroundColor: activeOrder.status === 'Delivered' ? 'var(--primary-color)' : '#334155',
                          border: '3px solid #0f172a'
                        }}></div>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '13px' }}>Delivered</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Order has arrived at your doorstep!</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p>No active order to track.</p>
                )}
              </div>
            ) : (
              // Product details
              <div>
                <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                  <img src={selectedProduct.image_url || 'https://via.placeholder.com/150'} alt={selectedProduct.name} style={{ width: '120px', height: '120px', objectFit: 'contain', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px' }} />
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>{selectedProduct.name}</h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Category: {selectedProduct.category}</p>
                    <div style={{ marginTop: '12px' }}>
                      <span className="offered-price" style={{ fontSize: '20px' }}>₹{selectedProduct.offered_price}</span>
                      {selectedProduct.mrp > selectedProduct.offered_price && (
                        <span className="mrp-price" style={{ fontSize: '14px', marginLeft: '8px' }}>₹{selectedProduct.mrp}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>Product Specifications</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{selectedProduct.description || 'No additional specifications provided by the merchant.'}</p>
                  <p style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '12px', color: selectedProduct.stock > 0 ? 'var(--primary-color)' : 'var(--error-color)' }}>
                    {selectedProduct.stock > 0 ? `In Stock: ${selectedProduct.stock} units left` : 'Currently Out of Stock'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="drawer-overlay" onClick={() => setIsCartOpen(false)}>
          <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>My Cart</h3>
              <button onClick={() => setIsCartOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ffffff' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              {Object.values(cart).map(item => (
                <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{item.product.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>₹{item.product.offered_price} each</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="qty-btn-container" style={{ margin: 0 }}>
                      <button className="qty-action-btn" onClick={() => removeFromCart(item.product.id)}>-</button>
                      <span className="qty-val">{item.quantity}</span>
                      <button className="qty-action-btn" onClick={() => addToCart(item.product)}>+</button>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', width: '50px', textAlign: 'right' }}>
                      ₹{item.product.offered_price * item.quantity}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '2px dashed var(--border-color)', paddingTop: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Subtotal</span>
                <span style={{ fontSize: '13px', fontWeight: 'bold' }}>₹{getCartTotal()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Delivery Charge</span>
                <span style={{ fontSize: '13px', color: 'var(--primary-color)', fontWeight: 'bold' }}>FREE</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                <span style={{ fontWeight: 'bold' }}>Total Bill</span>
                <span style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>₹{getCartTotal()}</span>
              </div>
            </div>

            <button onClick={handlePlaceOrderClick} style={{
              width: '100%',
              backgroundColor: 'var(--primary-color)',
              color: 'var(--secondary-color)',
              border: 'none',
              padding: '14px',
              borderRadius: '12px',
              fontWeight: 'bold',
              fontFamily: 'var(--font-family)',
              fontSize: '15px',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px'
            }}>
              Proceed to Pay <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Location Selector Modal */}
      {showLocationModal && (
        <div className="drawer-overlay" onClick={() => setShowLocationModal(false)}>
          <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>Select Delivery Location</h3>
              <button onClick={() => setShowLocationModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ffffff' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Choose coordinate preset around Vadodara to test 2 KM vicinity listing:</p>
              
              <button 
                onClick={() => selectLocation('alkapuri')}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  color: '#ffffff',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                <strong>📍 Alkapuri Center (Vadodara)</strong>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Near Ziplo Express (0.3km) & Royal Kirana (1.0km)</div>
              </button>

              <button 
                onClick={() => selectLocation('gotri')}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  color: '#ffffff',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                <strong>📍 Gotri Road (Vadodara)</strong>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Gotri Supermarket is within 2KM, other shops are further away.</div>
              </button>

              <button 
                onClick={() => selectLocation('manjalpur')}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  color: '#ffffff',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                <strong>📍 Manjalpur (Vadodara)</strong>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Manjalpur Family Mart is within 2KM, other shops are further away.</div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Map Settings / MapmyIndia Key Configuration Modal */}
      {showMapSettings && (
        <div className="drawer-overlay" onClick={() => setShowMapSettings(false)}>
          <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>MapmyIndia Map Settings</h3>
              <button onClick={() => setShowMapSettings(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ffffff' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Mappls Map SDK License Key / Client ID</label>
                <input
                  type="text"
                  placeholder="Enter MapmyIndia License Key"
                  value={mapplsApiKey}
                  onChange={(e) => setMapplsApiKey(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontFamily: 'var(--font-family)'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Map Provider</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={() => setMapType('osm')}
                    className={`map-toggle-btn ${mapType === 'osm' ? 'active' : ''}`}
                    style={{ flex: 1, justifyContent: 'center', padding: '10px' }}
                  >
                    OpenStreetMap Dark (Default)
                  </button>
                  <button 
                    onClick={() => {
                      if (!mapplsApiKey) {
                        alert('Please enter a MapmyIndia SDK Key first.');
                        return;
                      }
                      setMapType('mappls');
                    }}
                    className={`map-toggle-btn ${mapType === 'mappls' ? 'active' : ''}`}
                    style={{ flex: 1, justifyContent: 'center', padding: '10px' }}
                  >
                    MapmyIndia / Mappls
                  </button>
                </div>
              </div>

              <button 
                onClick={() => saveMapplsConfig(mapplsApiKey)}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--primary-color)',
                  color: 'var(--secondary-color)',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '10px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-family)',
                  marginTop: '10px'
                }}
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <div className="drawer-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Login or Signup</h3>
              <button onClick={() => setShowLoginModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ffffff' }}>
                <X size={24} />
              </button>
            </div>

            {/* Login Method Tabs */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <button 
                onClick={() => { setLoginMethod('password'); setOtpSent(false); }}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: loginMethod === 'password' ? '2.5px solid var(--primary-color)' : 'none',
                  color: loginMethod === 'password' ? 'var(--primary-color)' : 'var(--text-muted)',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontFamily: 'var(--font-family)'
                }}
              >
                Password Login
              </button>
              <button 
                onClick={() => setLoginMethod('otp')}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: loginMethod === 'otp' ? '2.5px solid var(--primary-color)' : 'none',
                  color: loginMethod === 'otp' ? 'var(--primary-color)' : 'var(--text-muted)',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontFamily: 'var(--font-family)'
                }}
              >
                OTP Login
              </button>
            </div>

            {loginMethod === 'password' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Phone Number</label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    maxLength={10}
                    value={tempPhone}
                    onChange={(e) => setTempPhone(e.target.value.replace(/\D/g, ''))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      color: '#ffffff',
                      fontSize: '14px',
                      fontFamily: 'var(--font-family)',
                      marginTop: '6px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Password</label>
                  <input
                    type="password"
                    placeholder="Enter password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      color: '#ffffff',
                      fontSize: '14px',
                      fontFamily: 'var(--font-family)',
                      marginTop: '6px'
                    }}
                  />
                </div>
                <button className="add-btn" onClick={handlePasswordLogin} style={{
                  padding: '12px',
                  backgroundColor: 'var(--primary-color)',
                  color: 'var(--secondary-color)',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}>
                  Login
                </button>
              </div>
            ) : (
              !otpSent ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Enter Phone Number</label>
                    <input
                      type="tel"
                      placeholder="9876543210"
                      maxLength={10}
                      value={tempPhone}
                      onChange={(e) => setTempPhone(e.target.value.replace(/\D/g, ''))}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        color: '#ffffff',
                        fontSize: '14px',
                        fontFamily: 'var(--font-family)',
                        marginTop: '6px'
                      }}
                    />
                  </div>
                  <button className="add-btn" onClick={handleSendOtp} style={{
                    padding: '12px',
                    backgroundColor: 'var(--primary-color)',
                    color: 'var(--secondary-color)',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}>
                    Send Demo OTP
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Enter 4-Digit OTP</label>
                    <input
                      type="text"
                      maxLength={4}
                      value={inputOtp}
                      onChange={(e) => setInputOtp(e.target.value.replace(/\D/g, ''))}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        color: '#ffffff',
                        fontSize: '16px',
                        letterSpacing: '8px',
                        textAlign: 'center',
                        fontFamily: 'var(--font-family)',
                        marginTop: '6px'
                      }}
                    />
                  </div>
                  <button className="add-btn" onClick={handleVerifyOtp} style={{
                    padding: '12px',
                    backgroundColor: 'var(--primary-color)',
                    color: 'var(--secondary-color)',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}>
                    Verify & Login
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Razorpay Mock Payment Gateway Modal */}
      {showPaymentModal && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(3,7,18,0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '380px',
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(163,230,53,0.1)'
          }}>
            {/* Header */}
            <div style={{
              backgroundColor: '#070a13',
              color: '#ffffff',
              padding: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.05)'
            }}>
              <div>
                <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--primary-color)', fontWeight: 'bold' }}>Razorpay Trusted</span>
                <div style={{ fontWeight: 'bold', fontSize: '15px' }}>ziplo Checkout</div>
              </div>
              <button onClick={() => setShowPaymentModal(false)} style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Bill Info */}
            <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Amount to Pay</span>
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--primary-color)' }}>₹{getCartTotal()}</span>
              </div>
            </div>

            {/* Payment Options */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Demo Payment Modes</div>
              
              <div style={{
                border: '1px solid rgba(163, 230, 53, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                backgroundColor: 'rgba(163, 230, 53, 0.05)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ backgroundColor: 'rgba(163, 230, 53, 0.2)', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'var(--primary-color)', fontSize: '10px' }}>UPI</div>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#ffffff' }}>Google Pay / PhonePe / BHIM</span>
                </div>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary-color)' }}></div>
              </div>

              <div style={{
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: 'var(--text-muted)',
                backgroundColor: 'rgba(255,255,255,0.01)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'var(--text-muted)', fontSize: '10px' }}>CARD</div>
                  <span style={{ fontSize: '13px' }}>Credit or Debit Card</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button onClick={handlePaymentSuccess} style={{
                  flex: 1,
                  backgroundColor: 'var(--primary-color)',
                  color: 'var(--secondary-color)',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '10px',
                  fontWeight: 'bold',
                  fontFamily: 'var(--font-family)',
                  cursor: 'pointer'
                }}>
                  Simulate Success
                </button>
                <button onClick={() => { alert('Demo payment failed.'); setShowPaymentModal(false); }} style={{
                  flex: 1,
                  backgroundColor: 'var(--error-color)',
                  color: 'white',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '10px',
                  fontWeight: 'bold',
                  fontFamily: 'var(--font-family)',
                  cursor: 'pointer'
                }}>
                  Simulate Failure
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Conflict Warning Modal */}
      {showCartConflictModal && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(3,7,18,0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 3000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '360px',
            padding: '20px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffffff', marginBottom: '8px' }}>Replace cart items?</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.4' }}>
              Your cart contains items from another store. Would you like to discard those items and start a new order with items from this store?
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => setShowCartConflictModal(false)} 
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '10px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-family)'
                }}
              >
                No, Keep Cart
              </button>
              <button 
                onClick={handleClearCartAndAddPending} 
                style={{
                  flex: 1,
                  backgroundColor: 'var(--primary-color)',
                  color: 'var(--secondary-color)',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '10px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-family)'
                }}
              >
                Yes, Discard & Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
