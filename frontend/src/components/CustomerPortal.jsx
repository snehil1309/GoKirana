import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingCart, Search, Info, MapPin, X, Check, ArrowRight, 
  Clock, ArrowLeft, Star, Settings, ShieldAlert, Navigation,
  Compass, ShieldCheck, HelpCircle, Laptop, Eye, EyeOff, Store, UserCheck
} from 'lucide-react';

export default function CustomerPortal({ backendUrl, user, setUser, activeView, setActiveView }) {
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

  // Map settings and location — restored from localStorage on page load
  const [userLocation, setUserLocation] = useState(() => {
    const saved = localStorage.getItem('cust_location_coords');
    if (saved) {
      const [lat, lng] = saved.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }
    // Fall back to saved customer coordinates from profile
    const custCoords = localStorage.getItem('cust_coordinates');
    if (custCoords) {
      const [lat, lng] = custCoords.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }
    return { lat: 22.3072, lng: 73.1678 }; // Default: Alkapuri, Vadodara
  });
  const [locationName, setLocationName] = useState(
    localStorage.getItem('cust_location_name') || 'Alkapuri, Vadodara'
  );
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [vicinityOnly, setVicinityOnly] = useState(true); // Default filter within 2 KM
  const [mapplsApiKey, setMapplsApiKey] = useState(localStorage.getItem('mappls_api_key') || '');
  const [mapType, setMapType] = useState(localStorage.getItem('mappls_api_key') ? 'mappls' : 'osm'); // 'osm' or 'mappls'
  const [showMapSettings, setShowMapSettings] = useState(false);

  // Deliver Somewhere Else modal
  const [showDeliverElsewhere, setShowDeliverElsewhere] = useState(false);
  const [deliveryPinCoords, setDeliveryPinCoords] = useState(null); // { lat, lng }
  const [reverseGeoLabel, setReverseGeoLabel] = useState('');
  const [reverseGeoLoading, setReverseGeoLoading] = useState(false);
  const [deliveryHouseNo, setDeliveryHouseNo] = useState('');
  const [deliveryBuildingName, setDeliveryBuildingName] = useState('');
  const [deliveryFloor, setDeliveryFloor] = useState('');
  const [deliveryLandmark, setDeliveryLandmark] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const deliveryMapRef = useRef(null);    // Leaflet map instance for the delivery modal
  const deliveryMarkerRef = useRef(null); // Draggable pin
  const deliveryMapContainerRef = useRef(null); // DOM node

  // Cart conflict state
  const [showCartConflictModal, setShowCartConflictModal] = useState(false);
  const [pendingProduct, setPendingProduct] = useState(null);

  // Mandatory Location & Detailed Address states for order verification
  const [showLocationRequiredModal, setShowLocationRequiredModal] = useState(false);
  const [showAddressDetailsModal, setShowAddressDetailsModal] = useState(false);
  const [addressHouseNo, setAddressHouseNo] = useState('');
  const [addressBuildingName, setAddressBuildingName] = useState('');
  const [addressFloorNo, setAddressFloorNo] = useState('');
  const [addressLandmark, setAddressLandmark] = useState('');
  const [addressAreaCity, setAddressAreaCity] = useState('');
  const [verifyingLocation, setVerifyingLocation] = useState(false);
  const [isPlacingOrderFlow, setIsPlacingOrderFlow] = useState(false);
  const [currentOrderDeliveryAddress, setCurrentOrderDeliveryAddress] = useState(
    localStorage.getItem('cust_address') || ''
  );



  // Auth state
  const currentUser = user || (localStorage.getItem('ziplo_user') ? JSON.parse(localStorage.getItem('ziplo_user')) : null);
  const [userEmail, setUserEmail] = useState(currentUser?.email || localStorage.getItem('cust_email') || '');
  const [userPhone, setUserPhone] = useState(currentUser?.phone || localStorage.getItem('cust_phone') || '');
  const [userName, setUserName] = useState(currentUser?.name || localStorage.getItem('cust_name') || '');
  const [isLoggedIn, setIsLoggedIn] = useState(!!currentUser);
  
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [inputOtp, setInputOtp] = useState('');

  // Auto-detection state
  const [accountDetected, setAccountDetected] = useState(null); // { exists: bool, role: 'merchant'|'customer', name: str }
  const [detectingAccount, setDetectingAccount] = useState(false);

  // Registration state
  const [isSignUp, setIsSignUp] = useState(false);
  const [regRole, setRegRole] = useState('customer'); // 'customer' | 'merchant'
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingName, setOnboardingName] = useState('');
  const [onboardingAddress, setOnboardingAddress] = useState('');
  const [onboardingCoords, setOnboardingCoords] = useState('22.3072,73.1678');
  const [geoDenied, setGeoDenied] = useState(false);

  // Sync state when props change
  useEffect(() => {
    const saved = localStorage.getItem('ziplo_user');
    const curr = user || (saved ? JSON.parse(saved) : null);
    if (curr) {
      setIsLoggedIn(true);
      setUserEmail(curr.email || '');
      setUserPhone(curr.phone || '');
      setUserName(curr.name || '');
    } else {
      setIsLoggedIn(false);
      setUserEmail('');
      setUserPhone('');
      setUserName('');
    }
  }, [user]);

  // Debounced Auto-Detection when typing Email / Phone in Login
  useEffect(() => {
    if (!loginIdentifier || loginIdentifier.trim().length < 3 || otpSent || isSignUp) {
      setAccountDetected(null);
      return;
    }
    const timer = setTimeout(async () => {
      setDetectingAccount(true);
      try {
        const res = await fetch(`${backendUrl}/api/auth/check-identifier?identifier=${encodeURIComponent(loginIdentifier.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setAccountDetected(data);
        }
      } catch (err) {
        console.error("Account check error:", err);
      } finally {
        setDetectingAccount(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [loginIdentifier, otpSent, isSignUp, backendUrl]);

  // Checkout & Tracking
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [pastOrders, setPastOrders] = useState([]);

  // Refs for the deliver-elsewhere map (separate from order tracking map)
  // deliveryMapRef, deliveryMarkerRef, deliveryMapContainerRef already declared above

  // Mockup Categories
  const categories = [
    { name: 'Grocery', icon: 'https://cdn-icons-png.flaticon.com/128/3724/3724720.png' },
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

    if (geoDenied) {
      // Disable distance sorting and vicinity filtering; display in default/random sequence
      result = [...result].sort((a, b) => a.id - b.id);
    } else {
      // Sort by distance
      result.sort((a, b) => a.distance - b.distance);

      // Filter within 2 KM if toggle is active
      if (vicinityOnly) {
        result = result.filter(s => s.distance <= 2.0);
      }
    }

    // Filter by search query
    if (searchQuery && !selectedShop) {
      result = result.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredShops(result);
  }, [shops, userLocation, vicinityOnly, searchQuery, selectedShop, geoDenied]);

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

  // Effect 1: Initialize Leaflet Map only once when tracking view mounts
  useEffect(() => {
    const isTracking = !!(selectedProduct?.tracking && activeOrder);
    
    if (!isTracking) {
      // Cleanup leaflet map instance when tracking is closed
      if (leafletMapRef.current) {
        try {
          leafletMapRef.current.remove();
        } catch (e) {
          console.warn("Error cleaning up map:", e);
        }
        leafletMapRef.current = null;
      }
      return;
    }

    const loadLeaflet = () => {
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
    };

    // Delay slightly to allow the DOM node to be rendered by React
    const timer = setTimeout(loadLeaflet, 200);

    return () => {
      clearTimeout(timer);
    };
  }, [selectedProduct?.tracking]);

  // Effect 2: Update map markers when activeOrder status or position changes
  useEffect(() => {
    if (leafletMapRef.current && activeOrder) {
      updateMapMarkers();
    }
  }, [activeOrder, shops, userLocation]);

  const initLeafletMap = () => {
    if (!window.L || !mapContainerRef.current) return;
    if (leafletMapRef.current) {
      updateMapMarkers();
      return;
    }

    // Find shop coordinates
    const shop = shops.find(s => s.id === activeOrder?.shop_id);
    let shopLat = 22.3072, shopLng = 73.1678;
    if (shop && shop.coordinates) {
      const parts = shop.coordinates.split(',');
      shopLat = parseFloat(parts[0]);
      shopLng = parseFloat(parts[1]);
    }

    // Initialize map centered between shop and user
    const map = window.L.map(mapContainerRef.current, {
      center: [(userLocation.lat + shopLat) / 2, (userLocation.lng + shopLng) / 2],
      zoom: 14,
      zoomControl: false
    });

    leafletMapRef.current = map;

    // Premium Dark Mode style Map tiles (CartoDB Dark Matter)
    window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CartoDB'
    }).addTo(map);

    updateMapMarkers();
  };

  const updateMapMarkers = () => {
    const map = leafletMapRef.current;
    if (!map || !window.L || !activeOrder) return;

    // Invalidate size to ensure it recalculates dimensions correctly
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    // Clear existing markers/lines
    leafletMarkersRef.current.forEach(layer => map.removeLayer(layer));
    leafletMarkersRef.current = [];

    // Find shop coordinates
    const shop = shops.find(s => s.id === activeOrder.shop_id);
    let shopLat = 22.3072, shopLng = 73.1678;
    if (shop && shop.coordinates) {
      const parts = shop.coordinates.split(',');
      shopLat = parseFloat(parts[0]);
      shopLng = parseFloat(parts[1]);
    }

    // User pin (Destination) — pulsing green
    const userIcon = window.L.divIcon({
      className: 'user-map-pin',
      html: `<div style="background-color: #22c55e; width: 16px; height: 16px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 0 4px rgba(34,197,94,0.3), 0 0 14px #22c55e;"></div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });
    const userMarker = window.L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
      .addTo(map)
      .bindPopup(`<strong style="color: #0F172A;">📍 Your Location</strong>`);
    leafletMarkersRef.current.push(userMarker);

    // Shop pin (Source)
    const shopIcon = window.L.divIcon({
      className: 'shop-map-pin',
      html: `<div style="background-color: #ef4444; width: 14px; height: 14px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 10px #ef4444;"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
    const shopMarker = window.L.marker([shopLat, shopLng], { icon: shopIcon })
      .addTo(map)
      .bindPopup(`<strong style="color: #0F172A;">${shop?.name || 'Store'}</strong>`);
    leafletMarkersRef.current.push(shopMarker);

    // Resolve delivery partner coordinates — REAL GPS if available
    const hasLiveCoords = !!(activeOrder.delivery_coordinates);
    let partnerLat = shopLat;
    let partnerLng = shopLng;
    if (activeOrder.delivery_coordinates) {
      const parts = activeOrder.delivery_coordinates.split(',');
      partnerLat = parseFloat(parts[0]);
      partnerLng = parseFloat(parts[1]);
    } else if (activeOrder.status === 'Delivered') {
      partnerLat = userLocation.lat;
      partnerLng = userLocation.lng;
    }

    // Delivery Partner pin — pulsing when live GPS is active
    const pulseStyle = hasLiveCoords && activeOrder.status === 'In Transit'
      ? `box-shadow: 0 0 0 0 rgba(163,230,53,0.7); animation: pulse-ring 1.2s ease-out infinite;`
      : `box-shadow: 0 0 15px #A3E635;`;
    const partnerIcon = window.L.divIcon({
      className: 'partner-map-pin',
      html: `<div style="background-color: #A3E635; width: 30px; height: 30px; border-radius: 50%; border: 2px solid #ffffff; ${pulseStyle} display: flex; align-items: center; justify-content: center; font-size: 15px;">🛵</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
    const partnerMarker = window.L.marker([partnerLat, partnerLng], { icon: partnerIcon, zIndexOffset: 1000 })
      .addTo(map)
      .bindPopup(`<strong style="color: #0F172A;">🛵 Delivery Partner — ${activeOrder.status}</strong><br/><small style="color:#555;">${hasLiveCoords ? 'Live GPS Active' : 'Estimated position'}</small>`);
    leafletMarkersRef.current.push(partnerMarker);

    // Route polyline
    const routeLine = window.L.polyline([[shopLat, shopLng], [partnerLat, partnerLng], [userLocation.lat, userLocation.lng]], {
      color: '#A3E635',
      weight: 3,
      opacity: 0.7,
      dashArray: '6, 10'
    }).addTo(map);
    leafletMarkersRef.current.push(routeLine);

    // Auto-pan: if live GPS coords exist, pan to the delivery partner
    // Otherwise fit all pins in view
    if (hasLiveCoords && activeOrder.status === 'In Transit') {
      map.setView([partnerLat, partnerLng], Math.max(map.getZoom(), 15), { animate: true, duration: 0.8 });
    } else {
      const bounds = window.L.latLngBounds([[shopLat, shopLng], [userLocation.lat, userLocation.lng]]);
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  };


  // Poll customer orders periodically if user is logged in (dynamic status updates without page refresh)
  useEffect(() => {
    if (!isLoggedIn || !userPhone) return;

    const pollOrders = async () => {
      try {
        const res = await fetch(`${backendUrl}/api/orders/customer/${userPhone}`);
        if (res.ok) {
          const data = await res.json();
          setPastOrders(data);
          if (activeOrder) {
            const updatedMatching = data.find(o => o.id === activeOrder.id);
            if (updatedMatching) {
              setActiveOrder(updatedMatching);
            }
          } else {
            const incomplete = data.find(o => o.status !== 'Delivered' && o.status !== 'Cancelled');
            if (incomplete) {
              setActiveOrder(incomplete);
            }
          }
        }
      } catch (err) {
        console.error("Error polling customer orders:", err);
      }
    };

    pollOrders();
    const interval = setInterval(pollOrders, 3000);
    return () => clearInterval(interval);
  }, [isLoggedIn, userPhone, activeOrder, backendUrl]);

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

  const requestGeoLocation = (autoFillAddress = true) => {
    if (!navigator.geolocation) {
      setGeoDenied(true);
      return;
    }

    const handleSuccess = async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const coordsStr = `${lat.toFixed(6)},${lng.toFixed(6)}`;
      setUserLocation({ lat, lng });
      setOnboardingCoords(coordsStr);
      setGeoDenied(false);
      localStorage.setItem('cust_location_coords', coordsStr);
      localStorage.setItem('cust_coordinates', coordsStr);

      // Sync calibrated coordinates to backend if logged in
      const identifier = userPhone || userEmail || user?.phone || user?.email;
      if (identifier) {
        try {
          fetch(`${backendUrl}/api/customers/${identifier}/coordinates`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ coordinates: coordsStr })
          });
        } catch (err) {
          console.warn("Failed to sync calibrated coordinates to backend:", err);
        }
      }

      let fullAddr = '';
      let shortName = `Current Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.display_name) {
            fullAddr = data.display_name;
            shortName = data.address?.suburb || data.address?.neighbourhood || data.address?.road || data.address?.city || data.display_name.split(',')[0];
          }
        }
      } catch (e) {
        console.warn("Reverse geocoding failed:", e);
      }

      if (autoFillAddress && fullAddr) {
        setRegAddress(fullAddr);
        setOnboardingAddress(fullAddr);
      }
      setLocationName(shortName);
      localStorage.setItem('cust_location_name', shortName);

      if (leafletMapRef.current) {
        leafletMapRef.current.setView([lat, lng], 14);
        if (leafletCircleRef.current) {
          leafletCircleRef.current.setLatLng([lat, lng]);
        }
      }
    };


    const handleError = (error) => {
      console.warn("High-accuracy GPS failed, falling back to basic accuracy:", error);
      navigator.geolocation.getCurrentPosition(
        handleSuccess,
        (err) => {
          console.warn("Geolocation permission denied or unresolvable:", err);
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

  const calibrateLocationWithShop = async (shopCoords) => {
    if (!shopCoords) {
      alert("No shop coordinates available to calibrate with.");
      return;
    }
    const parts = shopCoords.split(',');
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (isNaN(lat) || isNaN(lng)) {
      alert("Invalid shop coordinates format.");
      return;
    }

    const coordsStr = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    setUserLocation({ lat, lng });
    setOnboardingCoords(coordsStr);
    localStorage.setItem('cust_location_coords', coordsStr);
    localStorage.setItem('cust_coordinates', coordsStr);

    const identifier = userPhone || userEmail || user?.phone || user?.email;
    if (identifier) {
      try {
        await fetch(`${backendUrl}/api/customers/${identifier}/coordinates`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ coordinates: coordsStr })
        });
      } catch (e) {
        console.warn("Error updating customer coords:", e);
      }
    }
    alert(`🎯 GPS Calibrated! Your delivery location is now synced to exact shop coordinates (${coordsStr}). Distance is 0.0 KM.`);
  };

  const handleSelectShop = (shop) => {

    if (shop.active === false) {
      alert("This store is currently offline. We will be back soon!");
      return;
    }
    if (geoDenied) {
      alert("Note: Location permission is denied. To order from this store and see accurate delivery times, please update your delivery address by clicking the 'Deliver to' section in the header and enabling location services.");
    }
    setSelectedShop(shop);
    setSelectedCategory(null);
    setSearchQuery('');
  };


  const handleAuthRegister = async (e) => {
    e.preventDefault();
    if (!regEmail && !regPhone) {
      alert("Please provide either email or phone number to register.");
      return;
    }
    const isShopReg = regRole === 'merchant';
    try {
      const res = await fetch(`${backendUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: regEmail || null,
          phone: regPhone || null,
          password: regPassword,
          name: regName || (isShopReg ? "New Kirana Store" : "Customer"),
          address: regAddress || "Vadodara, Gujarat",
          is_shop: isShopReg
        })
      });
      if (res.ok) {
        alert(`Account created successfully as ${isShopReg ? 'Merchant (Store Owner)' : 'Consumer'}! Please log in.`);
        setIsSignUp(false);
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
        const data = await res.json();
        setOtpSent(true);
        if (data.role) {
          setAccountDetected({ exists: true, role: data.role, is_shop: data.is_shop });
        }
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
          is_shop: regRole === 'merchant'
        })
      });
      if (res.ok) {
        const data = await res.json();
        const now = Date.now();
        const fullUserData = {
          ...data,
          loginTimestamp: now,
          lastAccessTimestamp: now
        };

        if (setUser) setUser(fullUserData);
        localStorage.setItem('ziplo_user', JSON.stringify(fullUserData));
        
        localStorage.setItem('cust_phone', data.phone || '');
        localStorage.setItem('cust_email', data.email || '');
        localStorage.setItem('cust_name', data.name || '');
        localStorage.setItem('cust_address', data.address || '');
        localStorage.setItem('cust_coordinates', data.coordinates || '');
        localStorage.setItem('cust_profile_completed', data.profile_completed ? 'true' : 'false');

        if (data.role === 'merchant') {
          localStorage.setItem('gokirana_shop', JSON.stringify(data));
        }

        setUserPhone(data.phone || '');
        setUserEmail(data.email || '');
        setUserName(data.name || '');
        setIsLoggedIn(true);
        setShowLoginModal(false);
        setOtpSent(false);
        setInputOtp('');

        if (!data.profile_completed && data.role !== 'merchant' && !data.is_shop) {
          setShowOnboarding(true);
          requestGeoLocation(true);
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

  const handleLogout = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    localStorage.removeItem('ziplo_user');
    localStorage.removeItem('gokirana_shop');
    localStorage.removeItem('cust_phone');
    localStorage.removeItem('cust_email');
    localStorage.removeItem('cust_name');
    localStorage.removeItem('cust_address');
    localStorage.removeItem('cust_coordinates');
    localStorage.removeItem('cust_profile_completed');
    if (setUser) setUser(null);
    setIsLoggedIn(false);
    setUserPhone('');
    setUserEmail('');
    setUserName('');
    setActiveOrder(null);
    setPastOrders([]);
    if (setActiveView) setActiveView('consumer');
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

    const savedAddress = localStorage.getItem('cust_address') || localStorage.getItem('cust_delivery_address');
    const savedCoords = localStorage.getItem('cust_coordinates') || localStorage.getItem('cust_location_coords');

    // If customer already has a pinned map location & address, proceed directly to payment
    if (savedAddress && savedAddress.trim().length > 3 && savedCoords) {
      setCurrentOrderDeliveryAddress(savedAddress);
      setShowPaymentModal(true);
    } else {
      // Otherwise open the Interactive Map Location Pin & Complete Address modal directly
      setIsPlacingOrderFlow(true);
      setShowDeliverElsewhere(true);
    }
  };



  const handleConfirmAddressDetails = async (e) => {
    e.preventDefault();
    const constructed = [
      addressHouseNo.trim(),
      addressBuildingName.trim(),
      addressFloorNo ? `Floor: ${addressFloorNo.trim()}` : null,
      addressLandmark ? `Landmark: ${addressLandmark.trim()}` : null,
      addressAreaCity.trim()
    ].filter(Boolean).join(', ');

    setCurrentOrderDeliveryAddress(constructed);

    const coordsStr = `${userLocation.lat.toFixed(6)},${userLocation.lng.toFixed(6)}`;
    localStorage.setItem('cust_address', constructed);
    localStorage.setItem('cust_coordinates', coordsStr);
    localStorage.setItem('cust_location_coords', coordsStr);

    const identifier = userPhone || userEmail || user?.phone || user?.email;
    if (identifier) {
      try {
        fetch(`${backendUrl}/api/auth/complete-profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: identifier,
            name: userName || 'Customer',
            address: constructed,
            coordinates: coordsStr,
            is_shop: false
          })
        });
      } catch (err) {
        console.warn("Failed to sync new address to profile:", err);
      }
    }

    setShowAddressDetailsModal(false);
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

    const finalAddress = currentOrderDeliveryAddress || localStorage.getItem('cust_address') || locationName;
    const finalCoords = `${userLocation.lat.toFixed(6)},${userLocation.lng.toFixed(6)}`;

    const orderPayload = {
      customer_phone: userPhone,
      shop_id: firstProduct.shop_id,
      items: itemsList,
      total_amount: getCartTotal(),
      delivery_coordinates: finalCoords,
      delivery_address: finalAddress
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


  // Change location manual selection — persists to localStorage
  const selectLocation = (preset) => {
    let lat, lng, name;
    if (preset === 'alkapuri') {
      lat = 22.3072; lng = 73.1678; name = 'Alkapuri, Vadodara';
    } else if (preset === 'gotri') {
      lat = 22.3220; lng = 73.1250; name = 'Gotri, Vadodara';
    } else if (preset === 'manjalpur') {
      lat = 22.2750; lng = 73.1980; name = 'Manjalpur, Vadodara';
    }
    if (lat !== undefined) {
      setUserLocation({ lat, lng });
      setLocationName(name);
      localStorage.setItem('cust_location_coords', `${lat},${lng}`);
      localStorage.setItem('cust_location_name', name);
    }
    setShowLocationModal(false);
  };

  // ── Deliver Somewhere Else helpers ──────────────────────────────────────

  // Reverse geocode using free Nominatim API
  const reverseGeocode = async (lat, lng) => {
    setReverseGeoLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (res.ok) {
        const data = await res.json();
        setReverseGeoLabel(data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch {
      setReverseGeoLabel(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      setReverseGeoLoading(false);
    }
  };

  // Load Leaflet then initialise the delivery pin-drop map
  const initDeliveryMap = () => {
    const container = deliveryMapContainerRef.current;
    if (!container) return;

    const startLat = userLocation.lat;
    const startLng = userLocation.lng;

    const setup = () => {
      const L = window.L;
      if (!L || !container) return;

      // Destroy any old instance (React StrictMode double-invoke)
      if (deliveryMapRef.current) {
        deliveryMapRef.current.remove();
        deliveryMapRef.current = null;
        deliveryMarkerRef.current = null;
      }

      const map = L.map(container, { center: [startLat, startLng], zoom: 15, zoomControl: true });
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CartoDB'
      }).addTo(map);

      // Draggable pin
      const pinIcon = L.divIcon({
        className: '',
        html: `<div style="font-size:32px;line-height:1;filter:drop-shadow(0 2px 6px rgba(163,230,53,0.7));">📍</div>`,
        iconSize: [32, 40],
        iconAnchor: [16, 40]
      });
      const marker = L.marker([startLat, startLng], { icon: pinIcon, draggable: true }).addTo(map);

      const onPinMove = (latlng) => {
        setDeliveryPinCoords({ lat: latlng.lat, lng: latlng.lng });
        reverseGeocode(latlng.lat, latlng.lng);
      };

      marker.on('dragend', () => onPinMove(marker.getLatLng()));
      map.on('click', (e) => {
        marker.setLatLng(e.latlng);
        onPinMove(e.latlng);
      });

      deliveryMapRef.current = map;
      deliveryMarkerRef.current = marker;

      // Prime the geocode label
      setDeliveryPinCoords({ lat: startLat, lng: startLng });
      reverseGeocode(startLat, startLng);

      setTimeout(() => map.invalidateSize(), 250);
    };

    if (window.L) {
      setup();
    } else {
      // Load Leaflet CSS + JS if not already present
      if (!document.querySelector('#leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = setup;
      document.body.appendChild(script);
    }
  };

  // Confirm the delivery address and update userLocation
  const confirmDeliveryAddress = () => {
    if (!deliveryPinCoords) {
      alert('Please drop the pin on your delivery location.');
      return;
    }
    const parts = [
      deliveryHouseNo && `${deliveryHouseNo}`,
      deliveryBuildingName && `${deliveryBuildingName}`,
      deliveryFloor && `Floor ${deliveryFloor}`,
      deliveryLandmark && `Near ${deliveryLandmark}`,
    ].filter(Boolean);
    const addressLabel = parts.length
      ? `${parts.join(', ')}`
      : (reverseGeoLabel || `Custom Pin Location (${deliveryPinCoords.lat.toFixed(4)}, ${deliveryPinCoords.lng.toFixed(4)})`);

    const coordsStr = `${deliveryPinCoords.lat.toFixed(6)},${deliveryPinCoords.lng.toFixed(6)}`;

    setUserLocation(deliveryPinCoords);
    setLocationName(addressLabel);
    setCurrentOrderDeliveryAddress(addressLabel);
    setGeoDenied(false);

    localStorage.setItem('cust_location_coords', coordsStr);
    localStorage.setItem('cust_coordinates', coordsStr);
    localStorage.setItem('cust_location_name', addressLabel);
    localStorage.setItem('cust_address', addressLabel);

    // Save full address details
    localStorage.setItem('cust_delivery_address', JSON.stringify({
      houseNo: deliveryHouseNo,
      buildingName: deliveryBuildingName,
      floor: deliveryFloor,
      landmark: deliveryLandmark,
      notes: deliveryNotes,
      coords: coordsStr,
      geoLabel: reverseGeoLabel,
    }));

    // Sync coordinates to backend profile if logged in
    const identifier = userPhone || userEmail || user?.phone || user?.email;
    if (identifier) {
      try {
        fetch(`${backendUrl}/api/customers/${identifier}/coordinates`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ coordinates: coordsStr })
        });
      } catch (e) {
        console.warn("Failed to sync map pin coordinates:", e);
      }
    }

    // Cleanup map before closing
    if (deliveryMapRef.current) {
      deliveryMapRef.current.remove();
      deliveryMapRef.current = null;
    }
    setShowDeliverElsewhere(false);
    setShowLocationModal(false);

    // If customer was in order placement flow, proceed to payment
    if (isPlacingOrderFlow) {
      setIsPlacingOrderFlow(false);
      setShowPaymentModal(true);
    }
  };


  // Init delivery map whenever modal opens
  // (called via useEffect below)

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
              onClick={() => {
                setIsPlacingOrderFlow(false);
                setShowDeliverElsewhere(true);
              }}
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
            {currentUser?.role === 'merchant' && (
              <button 
                onClick={() => setActiveView && setActiveView('merchant')} 
                style={{
                  backgroundColor: 'rgba(163, 230, 53, 0.15)',
                  border: '1px solid var(--primary-color)',
                  color: 'var(--primary-color)',
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
                <Store size={14} /> Switch to Merchant View
              </button>
            )}
            <button 
              onClick={() => setShowMapSettings(true)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
              title="Map Settings"
            >
              <Settings size={18} />
            </button>
            {isLoggedIn ? (
              <button onClick={handleLogout} className="add-btn" style={{ borderColor: 'var(--error-color)', color: 'var(--error-color)' }}>
                Logout ({userPhone.slice(-4) || currentUser?.email?.slice(0, 4) || 'User'})
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
            <main className="products-section" style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '12px 16px 80px 16px' }}>
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
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }} onClick={() => setSelectedProduct(p)}>
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
        /* Shop Directory Page with Grid of Stores */
        <div className="directory-container container px-3 py-4">
          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
            <div>
              <h3 className="fw-bold text-light mb-1" style={{ fontSize: '18px' }}>
                Stores Nearby ({filteredShops.length})
              </h3>
              <p className="text-muted small mb-0">Discover local shops within your delivery range</p>
            </div>
            
            <button 
              className={`map-toggle-btn btn btn-sm d-flex align-items-center gap-1 ${vicinityOnly ? 'active' : ''}`}
              onClick={() => setVicinityOnly(!vicinityOnly)}
              style={{ fontSize: '12px', padding: '8px 16px', borderRadius: '10px' }}
            >
              <Compass size={14} /> {vicinityOnly ? 'Showing: 2 KM Area Only' : 'Showing All Stores'}
            </button>
          </div>

          {filteredShops.length === 0 ? (
            <div className="text-center text-muted py-5 px-3 bg-dark bg-opacity-25 border border-secondary border-opacity-25 rounded-4 my-4">
              <Navigation className="text-muted mb-3" size={32} />
              <h5>No shops listed within a 2 KM vicinity</h5>
              <p className="small mb-0">Try changing your location preset or toggle "Showing All Stores".</p>
            </div>
          ) : (
            <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 row-cols-xl-4 g-4">
              {filteredShops.map(shop => {
                const isClose = shop.distance <= 2.0;
                const isOffline = shop.active === false;
                return (
                  <div key={shop.id} className="col">
                    <div 
                      className="shop-directory-card card h-100 border-0"
                      onClick={() => handleSelectShop(shop)}
                      style={{
                        background: 'var(--card-bg)',
                        border: '1px solid var(--card-border)',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        cursor: isOffline ? 'not-allowed' : 'pointer',
                        opacity: isOffline ? 0.6 : 1,
                        filter: isOffline ? 'grayscale(70%)' : 'none',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        transition: 'transform 0.2s, box-shadow 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (!isOffline) {
                          e.currentTarget.style.transform = 'translateY(-4px)';
                          e.currentTarget.style.boxShadow = '0 8px 24px rgba(163, 230, 53, 0.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isOffline) {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                        }
                      }}
                    >
                      <div style={{ position: 'relative', height: '140px' }}>
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
                        {isOffline ? (
                          <div style={{
                            position: 'absolute',
                            top: '10px',
                            left: '10px',
                            backgroundColor: 'rgba(239, 68, 68, 0.9)',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            color: '#ffffff'
                          }}>
                            We will be back soon
                          </div>
                        ) : !isClose && (
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
                      <div className="card-body p-3 d-flex flex-column justify-content-between">
                        <div>
                          <div className="d-flex justify-content-between align-items-start gap-2">
                            <h4 className="card-title h6 fw-bold mb-1 text-light text-truncate" style={{ maxWidth: '80%' }}>{shop.name}</h4>
                            <div style={{ backgroundColor: 'rgba(163, 230, 53, 0.15)', border: '1px solid rgba(163, 230, 53, 0.3)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', color: 'var(--primary-color)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                              ★ 4.3
                            </div>
                          </div>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }} className="mb-3 text-truncate">{shop.address}</p>
                        </div>
                        <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
                          <span>{isOffline ? 'Currently Offline' : 'Free Delivery'}</span>
                          <span style={{ color: isOffline ? 'var(--error-color)' : 'var(--primary-color)', fontWeight: 'bold' }}>
                            {isOffline ? 'Back soon' : '20-30 mins'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Mockup features footer */}
          <div className="features-footer mt-5 border-top border-secondary border-opacity-10 pt-4">
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
          <div className="drawer-content" onClick={(e) => e.stopPropagation()} style={{ minHeight: '350px', width: selectedProduct.tracking ? '800px' : '450px', maxWidth: '95vw' }}>
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
                  <div className="container-fluid p-0">
                    {(!activeOrder.delivery_coordinates || activeOrder.delivery_coordinates.trim() === '') && (
                      <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#f59e0b', fontSize: '12px', fontWeight: 'bold', marginBottom: '14px' }}>
                        ⚠️ Customer delivery location not set. Live tracking unavailable.
                      </div>
                    )}
                    <div className="row g-4">
                      {/* Map Section */}
                      <div className="col-12 col-md-7">
                        <div className="d-flex flex-column gap-2">
                          <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)' }}>LIVE DELIVERY TRACKING</span>
                          <div className="map-wrapper shadow-lg border border-secondary border-opacity-25 rounded-4 overflow-hidden" style={{ height: '320px', position: 'relative' }}>
                            {/* LIVE GPS badge */}
                            {activeOrder?.delivery_coordinates && activeOrder?.status === 'In Transit' && (
                              <div className="live-tracking-badge">LIVE GPS</div>
                            )}
                            <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }}>
                              <div className="map-placeholder d-flex flex-column align-items-center justify-content-center h-100 bg-dark bg-opacity-50">
                                <Navigation className="animate-pulse mb-2 text-primary" size={24} />
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Loading live tracking map...</span>
                              </div>
                            </div>
                          </div>

                        </div>
                      </div>

                      {/* Milestones / Checklist */}
                      <div className="col-12 col-md-5">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative', paddingLeft: '24px', paddingTop: '10px' }}>
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
                              <div style={{ fontWeight: 'bold', fontSize: '13px' }}>Preparing & Packing</div>
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

            {/* Deliver Somewhere Else — primary CTA */}
            <button
              onClick={() => { setShowDeliverElsewhere(true); }}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '14px',
                border: '1.5px solid rgba(163,230,53,0.5)',
                background: 'linear-gradient(135deg, rgba(163,230,53,0.1), rgba(163,230,53,0.04))',
                color: '#ffffff',
                textAlign: 'left',
                cursor: 'pointer',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <span style={{ fontSize: '26px' }}>🏠</span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--primary-color)' }}>Get delivered somewhere else</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Pin your home, office, or any custom address on the map</div>
              </div>
              <span style={{ marginLeft: 'auto', color: 'var(--primary-color)', fontSize: '18px' }}>›</span>
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Or pick a quick preset:</p>

              <button onClick={() => selectLocation('alkapuri')}
                style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)', color: '#ffffff', textAlign: 'left', cursor: 'pointer', fontSize: '13px' }}
              >
                <strong>📍 Alkapuri Center</strong>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>Ziplo & Royal Kirana nearby</span>
              </button>

              <button onClick={() => selectLocation('gotri')}
                style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)', color: '#ffffff', textAlign: 'left', cursor: 'pointer', fontSize: '13px' }}
              >
                <strong>📍 Gotri Road</strong>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>Gotri Supermarket nearby</span>
              </button>

              <button onClick={() => selectLocation('manjalpur')}
                style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)', color: '#ffffff', textAlign: 'left', cursor: 'pointer', fontSize: '13px' }}
              >
                <strong>📍 Manjalpur</strong>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>Manjalpur Family Mart nearby</span>
              </button>

              <button
                onClick={() => { requestGeoLocation(); setShowLocationModal(false); }}
                style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)', color: '#ffffff', textAlign: 'left', cursor: 'pointer', fontSize: '13px' }}
              >
                <strong>📡 Recalibrate Device GPS Location</strong>
              </button>

              {shops && shops.length > 0 && (
                <button
                  onClick={() => {
                    const s = selectedShop || shops[0];
                    if (s && s.coordinates) {
                      calibrateLocationWithShop(s.coordinates);
                      setShowLocationModal(false);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid rgba(163,230,53,0.4)',
                    backgroundColor: 'rgba(163,230,53,0.1)',
                    color: 'var(--primary-color)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    marginTop: '4px'
                  }}
                >
                  🎯 Calibrate Location to {(selectedShop || shops[0])?.name || 'Shop'} Coords (0.0 KM)
                </button>
              )}
            </div>
          </div>
        </div>
      )}


      {/* ── Deliver Somewhere Else Modal ─────────────────────────────── */}
      {showDeliverElsewhere && (
        <div
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(3,7,18,0.92)',
            backdropFilter: 'blur(10px)',
            zIndex: 4000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) { if (deliveryMapRef.current) { deliveryMapRef.current.remove(); deliveryMapRef.current = null; } setShowDeliverElsewhere(false); } }}
        >
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid rgba(163,230,53,0.2)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '92vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(163,230,53,0.08)'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff' }}>🏠 Pin Delivery Location & Complete Address</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Pin your exact location on the map above, then enter complete address details below.</div>

              </div>
              <button
                onClick={() => { if (deliveryMapRef.current) { deliveryMapRef.current.remove(); deliveryMapRef.current = null; } setShowDeliverElsewhere(false); }}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '4px' }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Interactive Map */}
            <div style={{ padding: '16px 20px 8px' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                📌 Tap/click on the map to move the pin
              </div>
              <div
                ref={(el) => {
                  deliveryMapContainerRef.current = el;
                  if (el && !deliveryMapRef.current) {
                    setTimeout(() => initDeliveryMap(), 50);
                  }
                }}
                style={{ width: '100%', height: '260px', borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(163,230,53,0.2)' }}
              />
              {/* Reverse geo label */}
              <div style={{
                marginTop: '10px',
                padding: '10px 14px',
                backgroundColor: 'rgba(163,230,53,0.06)',
                border: '1px solid rgba(163,230,53,0.15)',
                borderRadius: '10px',
                fontSize: '12px',
                color: '#ffffff',
                minHeight: '40px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <MapPin size={14} color="var(--primary-color)" style={{ flexShrink: 0 }} />
                <span style={{ color: reverseGeoLoading ? 'var(--text-muted)' : '#ffffff' }}>
                  {reverseGeoLoading ? 'Fetching address...' : (reverseGeoLabel || 'Drop the pin to see the address')}
                </span>
              </div>
            </div>

            {/* Address Detail Form */}
            <div style={{ padding: '8px 20px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: '4px' }}>
                Address Details
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>House / Flat No. *</label>
                  <input
                    type="text"
                    placeholder="e.g. B-204"
                    value={deliveryHouseNo}
                    onChange={(e) => setDeliveryHouseNo(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.04)',
                      color: '#fff', fontSize: '13px', fontFamily: 'var(--font-family)', outline: 'none'
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Building / Society Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Royal Heights"
                    value={deliveryBuildingName}
                    onChange={(e) => setDeliveryBuildingName(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.04)',
                      color: '#fff', fontSize: '13px', fontFamily: 'var(--font-family)', outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Floor / Wing</label>
                  <input
                    type="text"
                    placeholder="e.g. 2nd Floor, Wing A"
                    value={deliveryFloor}
                    onChange={(e) => setDeliveryFloor(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.04)',
                      color: '#fff', fontSize: '13px', fontFamily: 'var(--font-family)', outline: 'none'
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Landmark</label>
                  <input
                    type="text"
                    placeholder="e.g. Near SBI Bank"
                    value={deliveryLandmark}
                    onChange={(e) => setDeliveryLandmark(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.04)',
                      color: '#fff', fontSize: '13px', fontFamily: 'var(--font-family)', outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Additional Instructions (optional)</label>
                <textarea
                  placeholder="e.g. Ring the bell twice, Leave at security desk..."
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  rows={2}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.04)',
                    color: '#fff', fontSize: '13px', fontFamily: 'var(--font-family)', resize: 'none', outline: 'none'
                  }}
                />
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button
                  onClick={() => { if (deliveryMapRef.current) { deliveryMapRef.current.remove(); deliveryMapRef.current = null; } setShowDeliverElsewhere(false); }}
                  style={{
                    flex: 1, padding: '13px', borderRadius: '12px',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'var(--text-muted)', fontWeight: 'bold', fontSize: '14px',
                    cursor: 'pointer', fontFamily: 'var(--font-family)'
                  }}
                >Cancel</button>
                <button
                  onClick={confirmDeliveryAddress}
                  disabled={!deliveryPinCoords || !deliveryHouseNo.trim()}
                  style={{
                    flex: 2, padding: '13px', borderRadius: '12px',
                    backgroundColor: deliveryPinCoords && deliveryHouseNo.trim() ? 'var(--primary-color)' : 'rgba(163,230,53,0.3)',
                    border: 'none',
                    color: 'var(--secondary-color)', fontWeight: 'bold', fontSize: '14px',
                    cursor: deliveryPinCoords && deliveryHouseNo.trim() ? 'pointer' : 'not-allowed',
                    fontFamily: 'var(--font-family)', transition: 'all 0.2s'
                  }}
                >
                  ✓ Confirm Delivery Address
                </button>
              </div>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>
                Shops within 2 km of the pinned location will be shown after confirming.
              </p>
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
              <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>{isSignUp ? 'Create Account' : 'Login to Ziplo'}</h3>
              <button onClick={() => setShowLoginModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ffffff' }}>
                <X size={24} />
              </button>
            </div>

            {/* Tabs for Login vs Register */}
            {!otpSent && (
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <button 
                  onClick={() => setIsSignUp(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: !isSignUp ? '2.5px solid var(--primary-color)' : 'none',
                    color: !isSignUp ? 'var(--primary-color)' : 'var(--text-muted)',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Sign In
                </button>
                <button 
                  onClick={() => setIsSignUp(true)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: isSignUp ? '2.5px solid var(--primary-color)' : 'none',
                    color: isSignUp ? 'var(--primary-color)' : 'var(--text-muted)',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Create an Account
                </button>
              </div>
            )}

            {!isSignUp ? (
              // Sign In Form
              !otpSent ? (
                <form key="login-form" onSubmit={handleAuthLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Email or Phone Number</label>
                      {detectingAccount && <span style={{ fontSize: '10px', color: 'var(--primary-color)' }}>Checking...</span>}
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. snehil@gmail.com or 9876543210"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        color: '#ffffff',
                        fontSize: '14px',
                        marginTop: '6px'
                      }}
                    />
                    
                    {/* Auto-detection badge */}
                    {accountDetected && accountDetected.exists && (
                      <div style={{
                        marginTop: '8px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        backgroundColor: accountDetected.role === 'merchant' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(163, 230, 53, 0.15)',
                        border: accountDetected.role === 'merchant' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(163, 230, 53, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '11px',
                        color: accountDetected.role === 'merchant' ? '#fca5a5' : 'var(--primary-color)'
                      }}>
                        {accountDetected.role === 'merchant' ? <Store size={14} /> : <UserCheck size={14} />}
                        <span>
                          <strong>{accountDetected.role === 'merchant' ? 'Merchant Account Detected' : 'Consumer Account Detected'}</strong>
                          {accountDetected.name ? ` (${accountDetected.name})` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Password</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showLoginPassword ? "text" : "password"}
                        placeholder="Enter password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: '10px',
                          border: '1px solid rgba(255,255,255,0.1)',
                          backgroundColor: 'rgba(255,255,255,0.03)',
                          color: '#ffffff',
                          fontSize: '14px',
                          marginTop: '6px',
                          paddingRight: '40px'
                        }}
                      />
                      <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, marginTop: '3px' }}>
                        {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <button className="add-btn" type="submit" style={{
                    padding: '12px',
                    backgroundColor: 'var(--primary-color)',
                    color: 'var(--secondary-color)',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}>
                    Login & Send OTP
                  </button>

                  <div style={{ textAlign: 'center', marginTop: '6px' }}>
                    <button 
                      type="button" 
                      onClick={() => setIsSignUp(true)} 
                      style={{ background: 'transparent', border: 'none', color: 'var(--primary-color)', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      New to Ziplo? Create an Account
                    </button>
                  </div>
                </form>
              ) : (
                // OTP Input Form
                <form key="verify-form" onSubmit={handleAuthVerify} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', textAlign: 'center' }}>
                      Enter 6-Digit OTP sent to {loginIdentifier}
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={inputOtp}
                      onChange={(e) => setInputOtp(e.target.value.replace(/\D/g, ''))}
                      required
                      placeholder="XXXXXX"
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        color: '#ffffff',
                        fontSize: '18px',
                        letterSpacing: '6px',
                        textAlign: 'center',
                        marginTop: '6px'
                      }}
                    />
                  </div>
                  <button className="add-btn" type="submit" style={{
                    padding: '12px',
                    backgroundColor: 'var(--primary-color)',
                    color: 'var(--secondary-color)',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}>
                    Verify OTP & Login
                  </button>
                  <button type="button" onClick={(e) => { e.preventDefault(); setOtpSent(false); }} style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '11px',
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}>
                    Back to password login
                  </button>
                </form>
              )
            ) : (
              // Sign Up Form with Role Selector
              <form onSubmit={handleAuthRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Register Account As</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setRegRole('customer')}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: regRole === 'customer' ? '2px solid var(--primary-color)' : '1px solid rgba(255,255,255,0.1)',
                        backgroundColor: regRole === 'customer' ? 'rgba(163, 230, 53, 0.15)' : 'rgba(255,255,255,0.03)',
                        color: regRole === 'customer' ? 'var(--primary-color)' : 'var(--text-muted)',
                        fontWeight: 'bold',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <UserCheck size={14} /> Consumer
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegRole('merchant')}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: regRole === 'merchant' ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
                        backgroundColor: regRole === 'merchant' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.03)',
                        color: regRole === 'merchant' ? '#fca5a5' : 'var(--text-muted)',
                        fontWeight: 'bold',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <Store size={14} /> Merchant (Store Owner)
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>{regRole === 'merchant' ? 'Store / Merchant Name' : 'Full Name'}</label>
                  <input
                    type="text"
                    placeholder={regRole === 'merchant' ? "e.g. Royal Kirana & Supermarket" : "e.g. Rahul Sharma"}
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      color: '#ffffff',
                      fontSize: '14px',
                      marginTop: '6px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. user@domain.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      color: '#ffffff',
                      fontSize: '14px',
                      marginTop: '6px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    maxLength={10}
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, ''))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      color: '#ffffff',
                      fontSize: '14px',
                      marginTop: '6px'
                    }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Address / Location</label>
                    <button type="button" onClick={() => requestGeoLocation(true)} style={{ background: 'transparent', border: 'none', color: 'var(--primary-color)', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>
                      📍 Detect Location (GPS)
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder={regRole === 'merchant' ? "e.g. RC Dutt Road, Alkapuri, Vadodara" : "e.g. Flat 302, Green Park, Vadodara"}
                    value={regAddress}
                    onChange={(e) => setRegAddress(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      color: '#ffffff',
                      fontSize: '14px',
                      marginTop: '6px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showRegPassword ? "text" : "password"}
                      placeholder="Create password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        color: '#ffffff',
                        fontSize: '14px',
                        marginTop: '6px',
                        paddingRight: '40px'
                      }}
                    />
                    <button type="button" onClick={() => setShowRegPassword(!showRegPassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, marginTop: '3px' }}>
                      {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <button className="add-btn" type="submit" style={{
                  padding: '12px',
                  backgroundColor: 'var(--primary-color)',
                  color: 'var(--secondary-color)',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}>
                  Create {regRole === 'merchant' ? 'Merchant' : 'Consumer'} Account
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Onboarding Profile Modal */}
      {showOnboarding && currentUser?.role !== 'merchant' && !currentUser?.is_shop && (
        <div className="drawer-overlay" style={{ zIndex: 3000 }}>
          <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--primary-color)' }}>Complete Your Profile</h3>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Welcome! Please tell us your name and delivery address to complete setup.</p>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const res = await fetch(`${backendUrl}/api/auth/complete-profile`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    identifier: loginIdentifier || userEmail || userPhone,
                    name: onboardingName,
                    address: onboardingAddress,
                    coordinates: onboardingCoords,
                    is_shop: false
                  })
                });
                if (res.ok) {
                  const data = await res.json();
                  localStorage.setItem('cust_name', data.name);
                  localStorage.setItem('cust_address', data.address);
                  localStorage.setItem('cust_coordinates', data.coordinates);
                  localStorage.setItem('cust_profile_completed', 'true');
                  
                  setUserName(data.name);
                  setLocationName(data.address);
                  if (data.coordinates) {
                    const parts = data.coordinates.split(',');
                    setUserLocation({ lat: parseFloat(parts[0]), lng: parseFloat(parts[1]) });
                  }
                  setShowOnboarding(false);
                  alert("Profile completed successfully!");
                } else {
                  alert("Failed to complete profile.");
                }
              } catch (err) {
                console.error(err);
                alert("Network error updating profile.");
              }
            }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Nickname / Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Snehil"
                  value={onboardingName}
                  onChange={(e) => setOnboardingName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    color: '#ffffff',
                    fontSize: '14px',
                    marginTop: '6px'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Delivery Address</label>
                <textarea
                  required
                  placeholder="e.g. Flat 102, Royal Residency, Alkapuri"
                  value={onboardingAddress}
                  onChange={(e) => setOnboardingAddress(e.target.value)}
                  style={{
                    width: '100%',
                    height: '60px',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontFamily: 'var(--font-family)',
                    marginTop: '6px',
                    resize: 'none'
                  }}
                />
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
                    ⚠️ Geolocation permission denied. Defaulting to Alkapuri central coordinates. Please input your address manually.
                  </span>
                ) : (
                  <span style={{ fontSize: '11px', color: 'var(--success-color)', display: 'block' }}>
                    ✓ Location permission active. Coordinates: {onboardingCoords}
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
                Complete Profile & Save
              </button>
            </form>
          </div>
        </div>
      )}

      {/* GPS Location Required Modal (Mandatory before placing order) */}
      {showLocationRequiredModal && (
        <div style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(3,7,18,0.92)',
          backdropFilter: 'blur(10px)',
          zIndex: 3500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#0f172a',
            border: '1.5px solid rgba(239,68,68,0.5)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '420px',
            padding: '24px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📡</div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#ffffff', marginBottom: '8px' }}>
              GPS Location Permission Required
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '20px' }}>
              To place your order, GoKirana requires your live GPS location so the merchant and delivery partner can navigate accurately to your exact address.
              <br /><br />
              <strong style={{ color: '#ef4444' }}>Order placement is paused until location permission is enabled.</strong>
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => {
                  setShowLocationRequiredModal(false);
                  handlePlaceOrderClick();
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--primary-color)',
                  color: 'var(--secondary-color)',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                🔄 Enable GPS & Fetch Location
              </button>
              <button
                onClick={() => setShowLocationRequiredModal(false)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '12px',
                  backgroundColor: 'transparent',
                  color: 'var(--text-muted)',
                  fontSize: '12px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer'
                }}
              >
                Cancel & Return to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Delivery Address Modal for New Location */}
      {showAddressDetailsModal && (
        <div style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(3,7,18,0.92)',
          backdropFilter: 'blur(10px)',
          zIndex: 3500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#0f172a',
            border: '1.5px solid rgba(163,230,53,0.4)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '460px',
            padding: '24px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--primary-color)' }}>📍 Complete Delivery Address</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>New GPS location detected. Please provide building & floor details.</span>
              </div>
              <button onClick={() => setShowAddressDetailsModal(false)} style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmAddressDetails} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>House / Flat / Building No *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Flat 402, Building B"
                  value={addressHouseNo}
                  onChange={e => setAddressHouseNo(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)', color: '#ffffff', marginTop: '4px', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>Society / Apartment / Building Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Residency / Sunshine Heights"
                  value={addressBuildingName}
                  onChange={e => setAddressBuildingName(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)', color: '#ffffff', marginTop: '4px', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>Floor (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 4th Floor"
                    value={addressFloorNo}
                    onChange={e => setAddressFloorNo(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)', color: '#ffffff', marginTop: '4px', fontSize: '13px' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>Landmark (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Opp. Inox Cinema"
                    value={addressLandmark}
                    onChange={e => setAddressLandmark(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)', color: '#ffffff', marginTop: '4px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>Area / City (Auto-detected via GPS)</label>
                <input
                  type="text"
                  required
                  value={addressAreaCity}
                  onChange={e => setAddressAreaCity(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)', color: '#ffffff', marginTop: '4px', fontSize: '12px' }}
                />
              </div>

              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--primary-color)',
                  color: 'var(--secondary-color)',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer',
                  marginTop: '8px'
                }}
              >
                Save Address & Proceed to Payment ›
              </button>
            </form>
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
              {/* Delivery address summary */}
              <div style={{
                marginTop: '12px',
                padding: '10px 12px',
                backgroundColor: 'rgba(163,230,53,0.05)',
                border: '1px solid rgba(163,230,53,0.15)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px'
              }}>
                <MapPin size={14} color="var(--primary-color)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Delivering to</div>
                  <div style={{ fontSize: '12px', color: '#ffffff', fontWeight: 'bold' }}>{locationName}</div>
                  {(() => {
                    const stored = localStorage.getItem('cust_delivery_address');
                    if (!stored) return null;
                    const addr = JSON.parse(stored);
                    const details = [addr.houseNo, addr.buildingName, addr.floor && `Floor ${addr.floor}`, addr.landmark && `Near ${addr.landmark}`].filter(Boolean).join(', ');
                    return details ? <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{details}</div> : null;
                  })()}
                  <button
                    onClick={() => { setShowPaymentModal(false); setShowLocationModal(true); }}
                    style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontSize: '11px', cursor: 'pointer', padding: 0, marginTop: '4px', fontFamily: 'var(--font-family)', fontWeight: 'bold' }}
                  >Change address</button>
                </div>
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
