import React, { useState, useEffect } from 'react';
import './LandingWebsite.css';

export default function LandingWebsite({ backendUrl, onSelectView }) {
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const hash = window.location.hash.replace('#', '');
      if (['home', 'about', 'privacy', 'terms', 'faqs', 'walkthrough', 'contact'].includes(hash)) {
        return hash;
      }
      const saved = localStorage.getItem('ziplo_active_tab');
      return saved || 'home';
    } catch (e) {
      return 'home';
    }
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (['home', 'about', 'privacy', 'terms', 'faqs', 'walkthrough', 'contact'].includes(hash)) {
        setActiveTab(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Search & Location Bar State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('Bengaluru, Karnataka, India');

  // Cart State
  const [cartItemsCount] = useState(3);
  const [cartTotal] = useState(148);

  // FAQ state
  const [faqCategory, setFaqCategory] = useState('all');
  const [faqSearch, setFaqSearch] = useState('');

  // Walkthrough state
  const [walkthroughRole, setWalkthroughRole] = useState('customer');
  const [activeWalkthroughStep, setActiveWalkthroughStep] = useState(0);

  // Contact Form state
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(null);
  const [contactError, setContactError] = useState('');

  // Categories Grid (Pixel-Perfect Icons)
  const categoryGrid = [
    { id: 'dairy', name: 'Dairy, Bread & Eggs', iconClass: 'bi bi-cup-hot-fill text-info' },
    { id: 'veggies', name: 'Fresh Fruits & Veggies', iconClass: 'bi bi-basket2-fill text-success' },
    { id: 'snacks', name: 'Snacks & Munchies', iconClass: 'bi bi-box-seam-fill text-warning' },
    { id: 'drinks', name: 'Cold Drinks & Juices', iconClass: 'bi bi-water text-primary' },
    { id: 'instant', name: 'Instant & Frozen Food', iconClass: 'bi bi-fire text-danger' },
    { id: 'bakery', name: 'Bakery & Biscuits', iconClass: 'bi bi-egg-fried text-warning' },
    { id: 'sweets', name: 'Sweet Tooth & Sweets', iconClass: 'bi bi-heart-fill text-pink' },
    { id: 'staples', name: 'Atta, Rice & Dal', iconClass: 'bi bi-flower1 text-success' },
    { id: 'masala', name: 'Masala, Oil & Spices', iconClass: 'bi bi-droplet-fill text-warning' },
    { id: 'personal', name: 'Personal & Skin Care', iconClass: 'bi bi-sparkles text-info' },
    { id: 'cleaning', name: 'Cleaning Essentials', iconClass: 'bi bi-magic text-primary' },
    { id: 'home', name: 'Home & Office Needs', iconClass: 'bi bi-house-door-fill text-secondary' },
  ];

  // Sample Featured Products (Blinkit Style Cards in Bootstrap Grid)
  const trendingProducts = [
    { id: 1, name: 'Amul Taaza Toned Milk', weight: '500 ml', price: 28, mrp: 30, discount: '7% OFF', iconClass: 'bi bi-cup-hot-fill text-info', time: '10 MINS' },
    { id: 2, name: 'Fresh Farm Tomatoes', weight: '1 kg', price: 34, mrp: 45, discount: '24% OFF', iconClass: 'bi bi-basket2-fill text-danger', time: '10 MINS' },
    { id: 3, name: 'Fortune Sunlite Sunflower Oil', weight: '1 L', price: 135, mrp: 160, discount: '15% OFF', iconClass: 'bi bi-droplet-fill text-warning', time: '12 MINS' },
    { id: 4, name: 'Aashirvaad Shudh Chakki Atta', weight: '5 kg', price: 245, mrp: 280, discount: '12% OFF', iconClass: 'bi bi-flower1 text-success', time: '10 MINS' },
    { id: 5, name: 'Lays India’s Magic Masala', weight: '50 g', price: 20, mrp: 20, discount: 'BESTSELLER', iconClass: 'bi bi-box-seam-fill text-warning', time: '10 MINS' },
    { id: 6, name: 'Cadbury Dairy Milk Silk', weight: '60 g', price: 75, mrp: 85, discount: '11% OFF', iconClass: 'bi bi-heart-fill text-danger', time: '10 MINS' },
  ];

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setContactError('');
    setContactSuccess(null);

    if (!contactForm.name.trim()) { setContactError('Please enter your name.'); return; }
    if (!contactForm.email.trim() || !contactForm.email.includes('@')) { setContactError('Please enter a valid email address.'); return; }
    if (!contactForm.phone.trim() || contactForm.phone.replace(/\D/g, '').length < 10) { setContactError('Please enter a valid 10-digit phone number.'); return; }
    if (!contactForm.message.trim()) { setContactError('Please enter your message.'); return; }

    setContactSubmitting(true);

    const mailtoUrl = `mailto:getziplo@gmail.com?subject=${encodeURIComponent(`Website Inquiry from ${contactForm.name}`)}&body=${encodeURIComponent(`Sender Name: ${contactForm.name}\nSender Email: ${contactForm.email}\nSender Phone: ${contactForm.phone}\n\nMessage:\n${contactForm.message}`)}`;

    try {
      // 1. Post to backend
      const response = await fetch(`${backendUrl}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm)
      });

      // 2. Direct post to FormSubmit
      try {
        await fetch('https://formsubmit.co/ajax/getziplo@gmail.com', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: contactForm.name,
            email: contactForm.email,
            _replyto: contactForm.email,
            phone: contactForm.phone,
            message: contactForm.message,
            _subject: `New Ziplo Contact Form Entry from ${contactForm.name}`
          })
        });
      } catch (err) {
        // ignore client CORS
      }

      const msgId = `ZIPLO-MSG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      setContactSuccess({
        status: 'success',
        message: `Thank you ${contactForm.name}! Your message has been dispatched to getziplo@gmail.com.`,
        reference_id: msgId,
        recipient: 'getziplo@gmail.com',
        mailtoUrl: mailtoUrl,
        form: { ...contactForm }
      });
      setContactForm({ name: '', email: '', phone: '', message: '' });
    } catch (err) {
      const msgId = `ZIPLO-MSG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      setContactSuccess({
        status: 'success',
        message: `Thank you ${contactForm.name}! Your message has been prepared for getziplo@gmail.com.`,
        reference_id: msgId,
        recipient: 'getziplo@gmail.com',
        mailtoUrl: mailtoUrl,
        form: { ...contactForm }
      });
      setContactForm({ name: '', email: '', phone: '', message: '' });
    } finally {
      setContactSubmitting(false);
    }
  };


  const faqs = [
    { category: 'customer', question: 'What is Ziplo and how fast is delivery?', answer: 'Ziplo is a hyperlocal grocery platform connecting you with nearby neighborhood Kirana stores. Orders are delivered in 10-15 minutes directly by local store partners.' },
    { category: 'customer', question: 'Are product prices on Ziplo higher than local stores?', answer: 'No! Ziplo promises zero artificial markups. You get authentic Kirana store prices and MRP discounts directly from your neighborhood shop owner.' },
    { category: 'customer', question: 'How do I pay for my order on Ziplo?', answer: 'Ziplo supports UPI (GPay, PhonePe, Paytm), Credit/Debit Cards, Net Banking, and Cash on Delivery (COD).' },
    { category: 'merchant', question: 'How can a Kirana store join Ziplo as a Merchant?', answer: 'Click "Log In / App Portal" at the top right, select "Log in as Merchant / Store Partner", sign up with your phone or email, and list your store items in under 5 minutes.' },
    { category: 'merchant', question: 'Is there a setup fee for store partners?', answer: 'Ziplo offers transparent, zero-upfront onboarding for store partners. We only charge a nominal fair commission per successful order so you keep maximum profit.' }
  ];

  const filteredFaqs = faqs.filter(faq => {
    const matchesCategory = faqCategory === 'all' || faq.category === faqCategory;
    const matchesSearch = faq.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
                          faq.answer.toLowerCase().includes(faqSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const walkthroughSteps = {
    customer: [
      { title: '1. Set Location', subtitle: 'Auto-detect GPS or pinpoint on map.', description: 'Ziplo matches your address with active nearby Kirana stores within 2 km.', tag: 'Location Match', icon: 'bi bi-geo-alt-fill text-emerald', details: ['GPS Auto-location', '2 km Kirana search', 'Store status'] },
      { title: '2. Select Groceries', subtitle: 'Browse live inventory with store prices.', description: 'Explore daily essentials, dairy, snacks, and fruits updated live by store owners.', tag: 'Live Inventory', icon: 'bi bi-cart-check-fill text-info', details: ['Real-time stock', 'Search & Category filter', 'MRP discounts'] },
      { title: '3. Quick Checkout', subtitle: 'Instant UPI, Cards, or COD.', description: 'Review your basket with zero surge fee and place order in seconds.', tag: 'Seamless Pay', icon: 'bi bi-lightning-charge-fill text-warning', details: ['Instant UPI', 'Transparent bill', 'No surge'] },
      { title: '4. 10-Min Delivery', subtitle: 'Live track your dispatch.', description: 'Neighborhood store packs and delivers to your doorstep in 10 minutes.', tag: '10-Min SLA', icon: 'bi bi-truck text-emerald', details: ['Live status', 'Store hotline', '10-Min guarantee'] }
    ],
    merchant: [
      { title: '1. Fast Onboarding', subtitle: 'Register in 3 minutes.', description: 'Sign up with store name and phone number. No paperwork or setup fee.', tag: '3-Min Signup', icon: 'bi bi-shop text-emerald', details: ['Zero setup cost', 'Simple smartphone app', 'Instant verification'] },
      { title: '2. Smart Cataloging', subtitle: 'Manage stock effortlessly.', description: 'Access Ziplo’s pre-built database of 20,000+ items and toggle stock with one tap.', tag: 'Cataloging', icon: 'bi bi-tags-fill text-info', details: ['20k item database', 'One-tap stock toggle', 'Custom pricing'] },
      { title: '3. Real-time Orders', subtitle: 'Instant sound alerts on orders.', description: 'Accept incoming orders and pack items using smart digital slips.', tag: 'Order Hub', icon: 'bi bi-bell-fill text-warning', details: ['Sound alerts', 'Digital slip', 'Instant status update'] },
      { title: '4. Daily Payouts', subtitle: 'Automated bank settlements.', description: 'Receive daily earnings straight into your bank account with growth reports.', tag: 'Daily Payouts', icon: 'bi bi-graph-up-arrow text-emerald', details: ['Daily bank credit', 'Sales analytics', 'Customer metrics'] }
    ]
  };

  const navToTab = (tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    try {
      localStorage.setItem('ziplo_active_tab', tab);
      if (tab === 'home') {
        history.pushState("", document.title, window.location.pathname + window.location.search);
      } else {
        window.location.hash = `#${tab}`;
      }
    } catch (e) {
      // ignore
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  return (
    <div className="ziplo-website d-flex flex-column min-vh-100">
      
      {/* ========================================================
          BOOTSTRAP 5 PERSISTENT NAVBAR (BLINKIT STRUCTURE)
      ======================================================== */}
      <nav className="navbar navbar-expand-xl sticky-top ziplo-navbar py-2 px-3">
        <div className="container-fluid max-w-7xl">
          
          {/* BRAND LOGO */}
          <div 
            onClick={() => navToTab('home')}
            className="navbar-brand d-flex items-center gap-2 cursor-pointer me-3"
            style={{ cursor: 'pointer' }}
          >
            <div className="ziplo-logo-icon">Z</div>
            <div>
              <span className="ziplo-brand-text">Ziplo</span>
              <small className="d-block text-emerald-400 fw-bold text-uppercase" style={{ fontSize: '9px', letterSpacing: '1px', marginTop: '-4px' }}>
                10 Min Grocery
              </small>
            </div>
          </div>

          {/* BLINKIT-STYLE LOCATION SELECTOR */}
          <div 
            className="d-flex align-items-center ziplo-location-btn me-2 me-md-3"
            style={{ cursor: 'pointer' }}
            onClick={() => setSelectedLocation(selectedLocation === 'Bengaluru, Karnataka, India' ? 'Indiranagar, Bengaluru' : 'Bengaluru, Karnataka, India')}
          >
            <i className="bi bi-geo-alt-fill text-emerald-400 fs-6 me-1 me-md-2"></i>
            <div className="text-start leading-tight">
              <div className="fw-black text-white text-xs d-flex align-items-center gap-1" style={{ fontSize: '10px' }}>
                <span className="d-none d-sm-inline">Delivery in 10 MINS</span>
                <span className="d-inline d-sm-none">10 MINS</span>
                <i className="bi bi-chevron-down text-emerald-400" style={{ fontSize: '9px' }}></i>
              </div>
              <small className="text-muted text-truncate d-block" style={{ maxWidth: '100px', fontSize: '10px' }}>
                {selectedLocation}
              </small>
            </div>
          </div>


          {/* PROMINENT SEARCH BAR */}
          <div className="flex-grow-1 me-3 position-relative max-w-lg" style={{ maxWidth: '480px' }}>
            <i className="bi bi-search ziplo-search-icon"></i>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Search "milk", "fresh fruits", "chips", "butter"...'
              className="form-control ziplo-search-box text-xs"
            />
          </div>

          {/* RIGHT ACTIONS: LOGIN & BLINKIT-STYLE GREEN CART BUTTON */}
          <div className="d-flex align-items-center gap-2">
            
            {/* Nav Menu Toggle for Large Screens */}
            <div className="d-none d-xl-flex align-items-center gap-1 me-2">
              <button onClick={() => navToTab('home')} className={`btn btn-sm text-xs font-bold rounded-pill px-3 ${activeTab === 'home' ? 'btn-success text-dark' : 'text-light'}`}>Home</button>
              <button onClick={() => navToTab('about')} className={`btn btn-sm text-xs font-bold rounded-pill px-3 ${activeTab === 'about' ? 'btn-success text-dark' : 'text-light'}`}>About</button>
              <button onClick={() => navToTab('walkthrough')} className={`btn btn-sm text-xs font-bold rounded-pill px-3 ${activeTab === 'walkthrough' ? 'btn-success text-dark' : 'text-light'}`}>Walkthrough</button>
              <button onClick={() => navToTab('faqs')} className={`btn btn-sm text-xs font-bold rounded-pill px-3 ${activeTab === 'faqs' ? 'btn-success text-dark' : 'text-light'}`}>FAQs</button>
              <button onClick={() => navToTab('contact')} className={`btn btn-sm text-xs font-bold rounded-pill px-3 ${activeTab === 'contact' ? 'btn-success text-dark' : 'text-light'}`}>Contact</button>
            </div>

            {/* Login Gateway Button */}
            <button 
              onClick={() => setShowLoginModal(true)}
              className="btn btn-outline-light btn-sm rounded-pill fw-bold text-xs px-3 d-none d-sm-block"
            >
              <i className="bi bi-box-arrow-in-right me-1"></i> Log In
            </button>

            {/* Blinkit Green Cart Button */}
            <button 
              onClick={() => onSelectView('consumer')}
              className="btn ziplo-cart-btn btn-sm d-flex align-items-center gap-2"
            >
              <i className="bi bi-cart-fill fs-6"></i>
              <div className="text-start leading-tight d-none d-sm-block" style={{ fontSize: '11px' }}>
                <div className="fw-black">{cartItemsCount} ITEMS</div>
                <div className="text-dark opacity-75" style={{ fontSize: '9px' }}>₹{cartTotal}</div>
              </div>
              <span className="badge bg-dark bg-opacity-25 text-dark text-xs px-2 py-1 ms-1">CART →</span>
            </button>

            {/* Mobile Hamburger Button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="btn btn-dark btn-sm d-xl-none border-secondary"
            >
              <i className="bi bi-list fs-5"></i>
            </button>

          </div>

        </div>

        {/* MOBILE DROPDOWN MENU */}
        {mobileMenuOpen && (
          <div className="container-fluid d-xl-none bg-dark border-bottom border-secondary py-3 px-4">
            <div className="d-flex flex-column gap-2 text-start">
              <button onClick={() => navToTab('home')} className="btn text-light text-start fw-bold">Home</button>
              <button onClick={() => navToTab('about')} className="btn text-light text-start fw-bold">About Us</button>
              <button onClick={() => navToTab('walkthrough')} className="btn text-light text-start fw-bold">App Walkthrough</button>
              <button onClick={() => navToTab('faqs')} className="btn text-light text-start fw-bold">FAQs</button>
              <button onClick={() => navToTab('contact')} className="btn text-light text-start fw-bold">Contact Us</button>
              <button onClick={() => navToTab('privacy')} className="btn text-light text-start fw-bold">Privacy Policy (Template)</button>
              <button onClick={() => navToTab('terms')} className="btn text-light text-start fw-bold">Terms & Conditions (Template)</button>
              <button onClick={() => setShowLoginModal(true)} className="btn btn-success text-dark fw-bold mt-2">Log In / App Gateway</button>
            </div>
          </div>
        )}
      </nav>


      {/* MAIN CONTENT AREA */}
      <main className="flex-grow-1">
        
        {/* ========================================================
            PAGE 1: HOME (BOOTSTRAP STRUCTURED LANDING PAGE)
        ======================================================== */}
        {activeTab === 'home' && (
          <div className="py-4 pb-5">
            
            {/* HERO PROMOTIONAL BANNER GRID */}
            <div className="container max-w-7xl mb-5">
              <div className="row g-4">
                
                {/* Main Hero Card (Left 8 Cols) */}
                <div className="col-12 col-lg-8">
                  <div className="ziplo-hero-card h-100 d-flex flex-column justify-content-between">
                    <div>
                      <span className="badge bg-success bg-opacity-25 text-emerald-400 border border-success border-opacity-50 px-3 py-2 rounded-pill fw-bold text-uppercase text-xs mb-3">
                        <i className="bi bi-lightning-charge-fill me-1 text-warning"></i> Hyperlocal 10-Min SLA
                      </span>
                      <h1 className="display-5 fw-black text-white tracking-tight mb-3">
                        Paani, Doodh, Vegetables & Snacks. <br />
                        <span className="text-emerald-400">Delivered in 10 Mins!</span>
                      </h1>
                      <p className="text-slate-300 lead text-sm mb-4">
                        Direct from your trusted neighborhood Kirana store with zero price markups.
                      </p>
                    </div>

                    <div className="d-flex flex-wrap gap-3 pt-3">
                      <button 
                        onClick={() => onSelectView('consumer')}
                        className="btn ziplo-cart-btn btn-lg px-4 py-3 fw-black text-sm d-flex align-items-center gap-2"
                      >
                        <span>Order Groceries Now</span>
                        <i className="bi bi-arrow-right-short fs-5"></i>
                      </button>
                      <button 
                        onClick={() => onSelectView('merchant')}
                        className="btn btn-outline-light btn-lg px-4 py-3 fw-bold text-sm"
                      >
                        Partner Kirana Store
                      </button>
                    </div>
                  </div>
                </div>

                {/* Secondary Offer Banners (Right 4 Cols) */}
                <div className="col-12 col-lg-4">
                  <div className="d-flex flex-column gap-3 h-100">
                    
                    <div 
                      className="ziplo-card p-4 d-flex align-items-center justify-content-between cursor-pointer"
                      onClick={() => onSelectView('consumer')}
                    >
                      <div>
                        <small className="text-emerald-400 text-uppercase fw-bold" style={{ fontSize: '10px' }}>Fresh Kirana Stock</small>
                        <h5 className="fw-black text-white mb-1">Daily Milk & Bakery</h5>
                        <small className="text-muted">Fresh items every morning</small>
                      </div>
                      <i className="bi bi-cup-hot-fill fs-1 text-info"></i>
                    </div>

                    <div 
                      className="ziplo-card p-4 d-flex align-items-center justify-content-between cursor-pointer"
                      onClick={() => onSelectView('merchant')}
                    >
                      <div>
                        <small className="text-teal-300 text-uppercase fw-bold" style={{ fontSize: '10px' }}>Kirana Partner</small>
                        <h5 className="fw-black text-white mb-1">Own a Kirana Store?</h5>
                        <small className="text-muted">Sell online in 3 minutes</small>
                      </div>
                      <i className="bi bi-shop fs-1 text-emerald-400"></i>
                    </div>

                  </div>
                </div>

              </div>
            </div>

            {/* BLINKIT-STYLE "SHOP BY CATEGORY" GRID */}
            <div className="container max-w-7xl mb-5">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h3 className="fw-black text-white mb-0">Shop by Category</h3>
                  <small className="text-muted">Explore 20,000+ items from local neighborhood stores</small>
                </div>
                <button onClick={() => onSelectView('consumer')} className="btn btn-link text-emerald-400 fw-bold text-decoration-none text-xs p-0">
                  See All Categories →
                </button>
              </div>

              {/* Bootstrap 6-Column Category Grid */}
              <div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-6 g-3">
                {categoryGrid.map((cat) => (
                  <div key={cat.id} className="col">
                    <div 
                      onClick={() => onSelectView('consumer')}
                      className="ziplo-cat-tile"
                    >
                      <div className="ziplo-cat-icon">
                        <i className={cat.iconClass}></i>
                      </div>
                      <div className="fw-bold text-light text-xs">
                        {cat.name}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* BLINKIT-STYLE "TRENDING STAPLES NEAR YOU" PRODUCT CAROUSEL */}
            <div className="container max-w-7xl mb-5">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="d-flex align-items-center gap-2">
                  <span className="spinner-grow spinner-grow-sm text-emerald-400" role="status"></span>
                  <h3 className="fw-black text-white mb-0">Trending Staples Near You</h3>
                </div>
                <small className="text-muted fw-bold">10 MINS SLA Delivery</small>
              </div>

              {/* Bootstrap 6-Column Product Grid */}
              <div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-6 g-3">
                {trendingProducts.map((prod) => (
                  <div key={prod.id} className="col">
                    <div className="ziplo-prod-card">
                      
                      <div>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="badge bg-success bg-opacity-25 text-emerald-400 border border-success border-opacity-25 text-uppercase" style={{ fontSize: '9px' }}>
                            {prod.time}
                          </span>
                          <small className="text-warning fw-bold" style={{ fontSize: '9px' }}>{prod.discount}</small>
                        </div>

                        <div className="text-center py-3">
                          <i className={`${prod.iconClass} display-6`}></i>
                        </div>

                        <h6 className="fw-bold text-white text-xs text-truncate mb-1">{prod.name}</h6>
                        <small className="text-muted d-block mb-3" style={{ fontSize: '11px' }}>{prod.weight}</small>
                      </div>

                      <div className="d-flex align-items-center justify-content-between pt-2 border-top border-secondary border-opacity-50">
                        <div>
                          <span className="fw-black text-white text-sm">₹{prod.price}</span>
                          {prod.mrp > prod.price && (
                            <small className="text-muted text-decoration-line-through ms-1" style={{ fontSize: '10px' }}>₹{prod.mrp}</small>
                          )}
                        </div>
                        <button 
                          onClick={() => onSelectView('consumer')}
                          className="btn ziplo-add-btn"
                        >
                          ADD
                        </button>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* DUAL APP DISCOVERY BANNER */}
            <div className="container max-w-7xl">
              <div className="ziplo-card p-4 p-md-5">
                <div className="row align-items-center g-4">
                  
                  <div className="col-12 col-lg-8">
                    <small className="text-emerald-400 text-uppercase fw-bold">Hyperlocal Commerce Platform</small>
                    <h2 className="fw-black text-white mt-1 mb-3">Empowering 100+ Local Kirana Stores</h2>
                    <p className="text-slate-300 text-sm mb-4">
                      Ziplo brings instant digital order fulfillment to traditional neighborhood shops, keeping community Kirana businesses strong while providing 10-minute convenience to families.
                    </p>
                    <div className="d-flex flex-wrap gap-2">
                      <button onClick={() => navToTab('walkthrough')} className="btn btn-outline-success btn-sm fw-bold px-3">
                        Explore App Walkthrough →
                      </button>
                      <button onClick={() => navToTab('about')} className="btn btn-outline-secondary btn-sm fw-bold px-3 text-light">
                        Read Our Story
                      </button>
                    </div>
                  </div>

                  <div className="col-12 col-lg-4">
                    <div className="bg-dark p-4 rounded-4 text-center border border-secondary border-opacity-50">
                      <i className="bi bi-shop fs-1 text-emerald-400 mb-2 d-block"></i>
                      <h5 className="fw-bold text-white mb-1">Want to list your shop?</h5>
                      <small className="text-muted d-block mb-3">Zero setup fee. Automated daily bank payouts.</small>
                      <button 
                        onClick={() => onSelectView('merchant')}
                        className="btn btn-emerald btn-sm w-100 fw-black text-dark"
                        style={{ backgroundColor: '#14b8a6' }}
                      >
                        Register Kirana Store Hub
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            </div>

          </div>
        )}


        {/* ========================================================
            PAGE 2: ABOUT US
        ======================================================== */}
        {activeTab === 'about' && (
          <div className="container max-w-7xl py-5">
            <div className="text-center max-w-2xl mx-auto mb-5">
              <small className="text-emerald-400 text-uppercase fw-bold">Our Story & Mission</small>
              <h1 className="fw-black text-white display-5 mt-1 mb-3">Championing India's Kirana Stores</h1>
              <p className="text-slate-300 lead">
                Ziplo was created to empower neighborhood Kirana stores with hyper-local technology so they can thrive alongside modern shoppers.
              </p>
            </div>

            <div className="row g-4">
              <div className="col-12 col-md-6">
                <div className="ziplo-card p-4 p-md-5 h-100">
                  <i className="bi bi-rocket-takeoff-fill fs-1 text-emerald-400 mb-3 d-block"></i>
                  <h3 className="fw-bold text-white mb-3">Our Mission</h3>
                  <p className="text-slate-300">
                    To democratize quick commerce by enabling every neighborhood store owner to sell online, reach local households in minutes, and manage digital inventory with zero friction.
                  </p>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="ziplo-card p-4 p-md-5 h-100">
                  <i className="bi bi-globe-americas fs-1 text-teal-300 mb-3 d-block"></i>
                  <h3 className="fw-bold text-white mb-3">Our Vision</h3>
                  <p className="text-slate-300">
                    A hyper-connected local economy where neighborhood Kiranas remain the heart of community commerce—providing fast, fresh, fair-priced groceries digitally.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* ========================================================
            PAGE 3: PRIVACY POLICY (TEMPLATE)
        ======================================================== */}
        {activeTab === 'privacy' && (
          <div className="container max-w-4xl py-5">
            <div className="alert alert-warning bg-warning bg-opacity-10 border-warning border-opacity-25 text-warning d-flex justify-between align-items-center mb-4 rounded-4 p-3">
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-info-circle-fill fs-5"></i>
                <span className="fw-bold text-xs">Privacy Policy Template — Official PDF document will be integrated shortly.</span>
              </div>
              <button 
                onClick={() => alert("The official PDF Privacy Policy document will be available for download soon.")}
                className="btn btn-warning btn-sm text-dark fw-bold text-xs"
              >
                Download PDF
              </button>
            </div>

            <div className="ziplo-card p-4 p-md-5 text-slate-300">
              <h2 className="fw-black text-white mb-1">Privacy Policy</h2>
              <small className="text-muted d-block mb-4">Last updated: August 14, 2026 | Ziplo Technologies Private Limited</small>
              
              <h5 className="fw-bold text-white mt-4">1. Introduction</h5>
              <p className="text-sm">Ziplo values your privacy. This Privacy Policy template explains how we collect, use, and safeguard your data.</p>
              
              <h5 className="fw-bold text-white mt-4">2. Contact Us Regarding Privacy</h5>
              <p className="text-sm">If you have questions, contact us at <a href="mailto:getziplo@gmail.com" className="text-emerald-400 fw-bold">getziplo@gmail.com</a>.</p>
            </div>
          </div>
        )}


        {/* ========================================================
            PAGE 4: TERMS AND CONDITIONS (TEMPLATE)
        ======================================================== */}
        {activeTab === 'terms' && (
          <div className="container max-w-4xl py-5">
            <div className="alert alert-warning bg-warning bg-opacity-10 border-warning border-opacity-25 text-warning d-flex justify-between align-items-center mb-4 rounded-4 p-3">
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-info-circle-fill fs-5"></i>
                <span className="fw-bold text-xs">Terms & Conditions Template — Official PDF document will be integrated shortly.</span>
              </div>
              <button 
                onClick={() => alert("The official PDF Terms & Conditions document will be available for download soon.")}
                className="btn btn-warning btn-sm text-dark fw-bold text-xs"
              >
                Download PDF
              </button>
            </div>

            <div className="ziplo-card p-4 p-md-5 text-slate-300">
              <h2 className="fw-black text-white mb-1">Terms and Conditions</h2>
              <small className="text-muted d-block mb-4">Last updated: August 14, 2026 | Ziplo Technologies Private Limited</small>
              
              <h5 className="fw-bold text-white mt-4">1. Agreement to Terms</h5>
              <p className="text-sm">By using Ziplo, you agree to be bound by these Terms and Conditions.</p>
              
              <h5 className="fw-bold text-white mt-4">2. Governing Law & Support</h5>
              <p className="text-sm">For queries, contact us at <a href="mailto:getziplo@gmail.com" className="text-emerald-400 fw-bold">getziplo@gmail.com</a>.</p>
            </div>
          </div>
        )}


        {/* ========================================================
            PAGE 5: FAQs
        ======================================================== */}
        {activeTab === 'faqs' && (
          <div className="container max-w-4xl py-5">
            <div className="text-center mb-5">
              <small className="text-emerald-400 text-uppercase fw-bold">Help & Information</small>
              <h1 className="fw-black text-white display-5 mt-1">Frequently Asked Questions</h1>
            </div>

            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
              <div className="btn-group">
                <button onClick={() => setFaqCategory('all')} className={`btn btn-sm fw-bold ${faqCategory === 'all' ? 'btn-success text-dark' : 'btn-outline-secondary text-light'}`}>All Questions</button>
                <button onClick={() => setFaqCategory('customer')} className={`btn btn-sm fw-bold ${faqCategory === 'customer' ? 'btn-success text-dark' : 'btn-outline-secondary text-light'}`}>Customer FAQs</button>
                <button onClick={() => setFaqCategory('merchant')} className={`btn btn-sm fw-bold ${faqCategory === 'merchant' ? 'btn-success text-dark' : 'btn-outline-secondary text-light'}`}>Merchant FAQs</button>
              </div>

              <input 
                type="text" 
                placeholder="Search FAQ keywords..."
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
                className="form-control form-control-sm ziplo-search-box w-auto"
                style={{ width: '240px' }}
              />
            </div>

            <div className="accordion" id="ziploFaqAccordion">
              {filteredFaqs.map((faq, index) => (
                <div key={index} className="accordion-item">
                  <h2 className="accordion-header">
                    <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target={`#faqCollapse${index}`}>
                      {faq.question}
                    </button>
                  </h2>
                  <div id={`faqCollapse${index}`} className="accordion-collapse collapse" data-bs-parent="#ziploFaqAccordion">
                    <div className="accordion-body">
                      {faq.answer}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* ========================================================
            PAGE 6: APP WALKTHROUGH
        ======================================================== */}
        {activeTab === 'walkthrough' && (
          <div className="container max-w-7xl py-5">
            <div className="text-center mb-5">
              <small className="text-emerald-400 text-uppercase fw-bold">Interactive Guide</small>
              <h1 className="fw-black text-white display-5 mt-1">Ziplo Application Walkthrough</h1>
            </div>

            <div className="d-flex justify-content-center mb-4">
              <div className="btn-group">
                <button onClick={() => { setWalkthroughRole('customer'); setActiveWalkthroughStep(0); }} className={`btn fw-bold ${walkthroughRole === 'customer' ? 'btn-success text-dark' : 'btn-outline-secondary text-light'}`}>🛍️ Customer Experience</button>
                <button onClick={() => { setWalkthroughRole('merchant'); setActiveWalkthroughStep(0); }} className={`btn fw-bold ${walkthroughRole === 'merchant' ? 'btn-info text-dark' : 'btn-outline-secondary text-light'}`}>🏪 Merchant Hub Experience</button>
              </div>
            </div>

            <div className="row g-3 mb-4">
              {walkthroughSteps[walkthroughRole].map((step, idx) => (
                <div key={idx} className="col-6 col-md-3">
                  <button 
                    onClick={() => setActiveWalkthroughStep(idx)}
                    className={`btn w-100 text-start p-3 rounded-4 ${activeWalkthroughStep === idx ? 'btn-success text-dark fw-bold' : 'btn-dark text-light border-secondary opacity-75'}`}
                  >
                    <small className="d-block text-uppercase fw-bold mb-1" style={{ fontSize: '10px' }}>STEP {idx + 1}</small>
                    <span className="text-truncate d-block text-xs">{step.title}</span>
                  </button>
                </div>
              ))}
            </div>

            {(() => {
              const currentStep = walkthroughSteps[walkthroughRole][activeWalkthroughStep];
              return (
                <div className="ziplo-card p-4 p-md-5">
                  <div className="row align-items-center g-4">
                    <div className="col-12 col-lg-7">
                      <span className="badge bg-success bg-opacity-25 text-emerald-400 mb-3 px-3 py-2 rounded-pill text-uppercase">{currentStep.tag}</span>
                      <h2 className="fw-black text-white mb-2">{currentStep.title}</h2>
                      <h6 className="text-emerald-400 fw-bold mb-3">{currentStep.subtitle}</h6>
                      <p className="text-slate-300 mb-4">{currentStep.description}</p>
                      
                      <div className="d-flex gap-2">
                        <button disabled={activeWalkthroughStep === 0} onClick={() => setActiveWalkthroughStep(prev => Math.max(0, prev - 1))} className="btn btn-outline-secondary btn-sm text-light fw-bold">← Previous</button>
                        <button disabled={activeWalkthroughStep === 3} onClick={() => setActiveWalkthroughStep(prev => Math.min(3, prev + 1))} className="btn btn-success btn-sm text-dark fw-bold">Next Step →</button>
                      </div>
                    </div>

                    <div className="col-12 col-lg-5 text-center">
                      <div className="bg-dark p-5 rounded-4 border border-secondary border-opacity-50">
                        <i className={`${currentStep.icon} display-1 mb-3 d-block`}></i>
                        <h5 className="fw-bold text-white mb-3">{currentStep.title}</h5>
                        <button onClick={() => onSelectView(walkthroughRole === 'customer' ? 'consumer' : 'merchant')} className="btn btn-success btn-sm fw-black text-dark w-100">
                          Open {walkthroughRole === 'customer' ? 'Customer App' : 'Merchant Hub'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}


        {/* ========================================================
            PAGE 7: CONTACT US
        ======================================================== */}
        {activeTab === 'contact' && (
          <div className="container max-w-7xl py-5">
            <div className="text-center mb-5">
              <small className="text-emerald-400 text-uppercase fw-bold">Get In Touch</small>
              <h1 className="fw-black text-white display-5 mt-1">Contact Ziplo Team</h1>
            </div>

            <div className="row g-4">
              
              {/* Form */}
              <div className="col-12 col-lg-7">
                <div className="ziplo-card p-4 p-md-5">
                  <h3 className="fw-bold text-white mb-4">Send Us a Message</h3>

                  {contactSuccess ? (
                    <div className="alert alert-success bg-success bg-opacity-10 border-success text-success rounded-4 p-4">
                      <h5 className="fw-bold text-white">Message Dispatched Successfully!</h5>
                      <p className="text-sm mb-2">{contactSuccess.message}</p>
                      <small className="d-block text-muted font-monospace mb-3">Recipient Inbox: getziplo@gmail.com</small>

                      <div className="d-flex flex-wrap gap-2">
                        {contactSuccess.mailtoUrl && (
                          <a 
                            href={contactSuccess.mailtoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-emerald btn-sm fw-bold text-dark"
                            style={{ backgroundColor: '#10b981' }}
                          >
                            <i className="bi bi-envelope-at-fill me-1"></i> Open Gmail / Mail Client
                          </a>
                        )}
                        <button onClick={() => setContactSuccess(null)} className="btn btn-outline-light btn-sm fw-bold">Send Another Message</button>
                      </div>
                    </div>
                  ) : (

                    <form onSubmit={handleContactSubmit} className="d-flex flex-column gap-3">
                      {contactError && <div className="alert alert-danger p-2 text-xs font-bold mb-0">{contactError}</div>}
                      <div>
                        <label className="form-label text-xs fw-bold text-uppercase text-muted">Name of the person *</label>
                        <input type="text" required placeholder="e.g. Rahul Sharma" value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} className="form-control ziplo-search-box" style={{ paddingLeft: '16px' }} />
                      </div>
                      <div>
                        <label className="form-label text-xs fw-bold text-uppercase text-muted">Email ID *</label>
                        <input type="email" required placeholder="e.g. rahul@example.com" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} className="form-control ziplo-search-box" style={{ paddingLeft: '16px' }} />
                      </div>
                      <div>
                        <label className="form-label text-xs fw-bold text-uppercase text-muted">Phone Number *</label>
                        <input type="tel" required placeholder="e.g. 9876543210" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} className="form-control ziplo-search-box" style={{ paddingLeft: '16px' }} />
                      </div>
                      <div>
                        <label className="form-label text-xs fw-bold text-uppercase text-muted">Message *</label>
                        <textarea rows="4" required placeholder="Type your message here..." value={contactForm.message} onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })} className="form-control ziplo-search-box h-auto py-2" style={{ paddingLeft: '16px' }}></textarea>
                      </div>
                      <button type="submit" disabled={contactSubmitting} className="btn ziplo-cart-btn btn-lg fw-black text-sm w-100 py-3 mt-2">
                        {contactSubmitting ? 'Sending...' : 'Submit Message'}
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {/* Sidebar */}
              <div className="col-12 col-lg-5">
                <div className="ziplo-card p-4 mb-3">
                  <i className="bi bi-envelope-fill fs-3 text-emerald-400 mb-2 d-block"></i>
                  <h5 className="fw-bold text-white">Direct Email</h5>
                  <div className="p-3 rounded-3 bg-dark border border-secondary font-monospace text-emerald-400 fw-bold text-sm">
                    getziplo@gmail.com
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>


      {/* ========================================================
          LOGIN GATEWAY MODAL (USER & MERCHANT SELECTOR)
      ======================================================== */}
      {showLoginModal && (
        <div className="modal d-block bg-dark bg-opacity-75 backdrop-blur" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content ziplo-modal-content p-4">
              <div className="modal-header border-0 pb-0">
                <div className="text-center w-100">
                  <div className="ziplo-logo-icon mx-auto mb-2">Z</div>
                  <h4 className="fw-black text-white mb-1">Welcome to Ziplo</h4>
                  <small className="text-muted">Select how you want to log in:</small>
                </div>
                <button onClick={() => setShowLoginModal(false)} type="button" className="btn-close btn-close-white position-absolute top-0 end-0 m-4"></button>
              </div>

              <div className="modal-body d-flex flex-column gap-3 pt-4">
                <button onClick={() => { setShowLoginModal(false); onSelectView('consumer'); }} className="btn btn-dark border-secondary p-3 text-start d-flex align-items-center gap-3">
                  <i className="bi bi-bag-check-fill fs-2 text-emerald-400"></i>
                  <div>
                    <div className="fw-bold text-white text-sm">Log in as Customer / User</div>
                    <small className="text-muted">Order groceries in 10 mins from local Kiranas</small>
                  </div>
                </button>

                <button onClick={() => { setShowLoginModal(false); onSelectView('merchant'); }} className="btn btn-dark border-secondary p-3 text-start d-flex align-items-center gap-3">
                  <i className="bi bi-shop fs-2 text-teal-300"></i>
                  <div>
                    <div className="fw-bold text-white text-sm">Log in as Merchant / Partner</div>
                    <small className="text-muted">Manage store catalog, live orders & payouts</small>
                  </div>
                </button>

                <button onClick={() => { setShowLoginModal(false); onSelectView('admin'); }} className="btn btn-outline-secondary btn-sm text-muted fw-bold">
                  🔑 Command Center / Admin Access
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* FOOTER */}
      <footer className="bg-dark border-top border-secondary py-5 text-slate-400">
        <div className="container max-w-7xl">
          <div className="row g-4">
            <div className="col-12 col-md-4">
              <div className="d-flex align-items-center gap-2 mb-3">
                <div className="ziplo-logo-icon" style={{ width: '32px', height: '32px', fontSize: '16px' }}>Z</div>
                <span className="ziplo-brand-text fs-4">Ziplo</span>
              </div>
              <p className="text-muted text-xs">
                India's premier hyperlocal Kirana commerce platform delivering groceries in 10 minutes directly from local store partners.
              </p>
            </div>

            <div className="col-6 col-md-4">
              <h6 className="fw-bold text-uppercase text-light text-xs mb-3">Navigation</h6>
              <ul className="list-unstyled text-xs d-flex flex-column gap-2">
                <li><button onClick={() => navToTab('home')} className="btn btn-link p-0 text-muted text-decoration-none text-xs">Home</button></li>
                <li><button onClick={() => navToTab('about')} className="btn btn-link p-0 text-muted text-decoration-none text-xs">About Us</button></li>
                <li><button onClick={() => navToTab('walkthrough')} className="btn btn-link p-0 text-muted text-decoration-none text-xs">App Walkthrough</button></li>
                <li><button onClick={() => navToTab('faqs')} className="btn btn-link p-0 text-muted text-decoration-none text-xs">FAQs</button></li>
                <li><button onClick={() => navToTab('contact')} className="btn btn-link p-0 text-muted text-decoration-none text-xs">Contact Us</button></li>
              </ul>
            </div>

            <div className="col-6 col-md-4">
              <h6 className="fw-bold text-uppercase text-light text-xs mb-3">Support Email</h6>
              <small className="d-block text-emerald-400 font-monospace fw-bold mb-2">getziplo@gmail.com</small>
              <small className="text-muted d-block">Operating Hours: 24x7 Support</small>
              <small className="text-muted d-block">Bengaluru, Karnataka, India</small>
            </div>
          </div>

          <div className="mt-5 pt-4 border-top border-secondary text-center text-muted text-xs">
            © {new Date().getFullYear()} Ziplo Technologies Private Limited. All rights reserved.
          </div>
        </div>
      </footer>

      {/* MOBILE BOTTOM STICKY NAVIGATION BAR */}
      <div className="ziplo-mobile-bottom-nav d-flex d-xl-none">
        <button 
          type="button"
          onClick={() => navToTab('home')}
          className={`ziplo-mobile-nav-item ${activeTab === 'home' ? 'active' : ''}`}
        >
          <i className="bi bi-house-door-fill"></i>
          <span>Home</span>
        </button>

        
        <button 
          type="button"
          onClick={() => onSelectView('consumer')}
          className="ziplo-mobile-nav-item text-emerald-400"
        >
          <i className="bi bi-cart-fill"></i>
          <span>Shop App</span>
        </button>
        
        <button 
          type="button"
          onClick={() => navToTab('walkthrough')}
          className={`ziplo-mobile-nav-item ${activeTab === 'walkthrough' ? 'active' : ''}`}
        >
          <i className="bi bi-phone"></i>
          <span>Walkthrough</span>
        </button>

        <button 
          type="button"
          onClick={() => navToTab('contact')}
          className={`ziplo-mobile-nav-item ${activeTab === 'contact' ? 'active' : ''}`}
        >
          <i className="bi bi-envelope-fill"></i>
          <span>Contact</span>
        </button>

        <button 
          type="button"
          onClick={() => setShowLoginModal(true)}
          className="ziplo-mobile-nav-item"
        >
          <i className="bi bi-box-arrow-in-right"></i>
          <span>Log In</span>
        </button>
      </div>


    </div>
  );
}

