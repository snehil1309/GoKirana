import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Header (on pages after cover)
        if self._pageNumber > 1:
            self.drawString(54, 11 * 72 - 36, "ZIPLO / GOKIRANA — COMPREHENSIVE PROJECT DOCUMENTATION")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(54, 11 * 72 - 42, 8.5 * 72 - 54, 11 * 72 - 42)
            
        # Footer
        footer_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(8.5 * 72 - 54, 30, footer_text)
        self.drawString(54, 30, "CONFIDENTIAL — FOR INTERNAL & SYSTEM ARCHITECTURE USE")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(54, 42, 8.5 * 72 - 54, 42)
        
        self.restoreState()

def create_pdf(filename="GoKirana_Project_Documentation.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    primary_color = colors.HexColor("#0F172A")    # Deep Slate
    secondary_color = colors.HexColor("#2563EB")  # Vivid Blue
    accent_color = colors.HexColor("#16A34A")     # Emerald Green
    text_dark = colors.HexColor("#1E293B")        # Slate 800
    
    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=30,
        leading=36,
        textColor=primary_color,
        spaceAfter=10
    )
    
    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=14,
        leading=18,
        textColor=secondary_color,
        spaceAfter=25
    )
    
    h1_style = ParagraphStyle(
        'CustomH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=primary_color,
        spaceBefore=18,
        spaceAfter=10,
        keepWithNext=True
    )
    
    h2_style = ParagraphStyle(
        'CustomH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=secondary_color,
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )

    h3_style = ParagraphStyle(
        'CustomH3',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=accent_color,
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=text_dark,
        spaceAfter=8
    )

    bullet_style = ParagraphStyle(
        'CustomBullet',
        parent=body_style,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=4
    )

    code_style = ParagraphStyle(
        'CodeStyle',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#091E42"),
        backColor=colors.HexColor("#F1F5F9"),
        borderColor=colors.HexColor("#E2E8F0"),
        borderWidth=0.5,
        borderPadding=6,
        spaceAfter=8,
        spaceBefore=4
    )

    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=text_dark
    )
    
    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.white
    )

    story = []

    # --- COVER PAGE / HEADER ---
    story.append(Spacer(1, 20))
    story.append(Paragraph("ZIPLO / GOKIRANA", title_style))
    story.append(Paragraph("Hyperlocal Quick-Commerce & Kirana Digitization Platform Documentation", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=3, color=secondary_color, spaceAfter=20))
    
    meta_data = [
        [Paragraph("<b>Document Version:</b> 1.0.0", table_cell), Paragraph("<b>Date:</b> August 2026", table_cell)],
        [Paragraph("<b>Project Architecture:</b> FastAPI + React (Vite) + SQLite/AWS S3", table_cell), Paragraph("<b>Target Market:</b> Tier-2/3 Indian Cities (Vadodara)", table_cell)],
        [Paragraph("<b>Author/Team:</b> DeepMind Engineering / Antigravity Pair Programmer", table_cell), Paragraph("<b>Status:</b> Production Ready & Functional", table_cell)]
    ]
    meta_table = Table(meta_data, colWidths=[250, 250])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#E2E8F0")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 15))

    # Executive Overview
    story.append(Paragraph("Executive Overview & Business Mission", h1_style))
    story.append(Paragraph(
        "<b>Ziplo (GoKirana)</b> is an end-to-end quick-commerce and local retail digitization ecosystem engineered to empower neighborhood Kirana stores, pharmacies, and specialty retailers in Tier-2/Tier-3 cities. It enables local merchants to offer hyper-fast 10-to-30 minute deliveries to customers within a hyper-local radius (0-5 km), competing directly with dark-store instant delivery giants while preserving local merchant livelihoods.",
        body_style
    ))
    story.append(Paragraph(
        "The platform bridges local buyers, store owners, and delivery partners through real-time order routing, live GPS tracking, automated OTP-based delivery verification, localized SMS notifications, dynamic inventory management, and an operational analytics dashboard.",
        body_style
    ))

    # Table of Contents Summary
    story.append(Spacer(1, 10))
    story.append(Paragraph("Document Structure", h2_style))
    toc_items = [
        "<b>Section 1: Architecture & Technology Dependencies</b> — Stack details, python packages, frontend libraries.",
        "<b>Section 2: Comprehensive Core Features</b> — Multi-role capabilities for Customers, Store Owners, Delivery Agents & Admins.",
        "<b>Section 3: End-to-End User & Operational Flows</b> — Complete lifecycles for registration, ordering, live tracking, and status transitions.",
        "<b>Section 4: Data Models & Database Schema</b> — Relational tables, fields, types, foreign keys, and indexes.",
        "<b>Section 5: API Endpoint Directory & Protocols</b> — Detailed REST API endpoints, WebSockets, S3 upload logic, and SMS integration.",
        "<b>Section 6: Deployment & Operational Runbook</b> — Environment configurations, startup scripts, and background services."
    ]
    for item in toc_items:
        story.append(Paragraph(f"• {item}", bullet_style))

    story.append(PageBreak())

    # --- SECTION 1: ARCHITECTURE & DEPENDENCIES ---
    story.append(Paragraph("1. Architecture & Technology Dependencies", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceAfter=12))

    story.append(Paragraph("System Architecture Overview", h2_style))
    story.append(Paragraph(
        "Ziplo follows a modern decoupled client-server architecture. The backend is built with high-performance <b>FastAPI (Python)</b> exposing asynchronous RESTful APIs and full-duplex <b>WebSockets</b> for real-time order status and GPS updates. Data persistence is managed via <b>SQLAlchemy ORM</b> connected to an optimized <b>SQLite database (gokirana.db)</b>. The frontend is a responsive Single-Page Application (SPA) powered by <b>React 19</b>, <b>Vite 8</b>, and <b>Lucide React</b> icons.",
        body_style
    ))

    story.append(Paragraph("Backend Dependencies (Python / FastAPI Stack)", h2_style))
    backend_deps = [
        [Paragraph("Package Name", table_header), Paragraph("Version / Range", table_header), Paragraph("Functional Role / Usage", table_header)],
        [Paragraph("<b>FastAPI</b>", table_cell), Paragraph("^0.110.0", table_cell), Paragraph("Core asynchronous web framework providing REST endpoints, WebSocket routing, dependency injection, and OpenAPI documentation.", table_cell)],
        [Paragraph("<b>Uvicorn</b>", table_cell), Paragraph("^0.28.0", table_cell), Paragraph("Lightning-fast ASGI server implementation for handling async HTTP and WebSocket connections.", table_cell)],
        [Paragraph("<b>SQLAlchemy</b>", table_cell), Paragraph("^2.0.0", table_cell), Paragraph("Object-Relational Mapping (ORM) library for schema declaration, relationship mapping, and SQL query generation.", table_cell)],
        [Paragraph("<b>Pydantic</b>", table_cell), Paragraph("^2.6.0", table_cell), Paragraph("Data validation and serialization library defining strict input request schemas and output API models.", table_cell)],
        [Paragraph("<b>Boto3</b>", table_cell), Paragraph("^1.34.0", table_cell), Paragraph("AWS SDK for Python, integrated for secure image asset uploads to AWS S3 buckets.", table_cell)],
        [Paragraph("<b>python-dotenv</b>", table_cell), Paragraph("^1.0.0", table_cell), Paragraph("Loads environment secrets (.env) into OS environment variables (S3 credentials, Fast2SMS API keys).", table_cell)],
        [Paragraph("<b>requests</b>", table_cell), Paragraph("^2.31.0", table_cell), Paragraph("HTTP client library used by the SMS service layer to communicate with Fast2SMS REST gateway.", table_cell)],
        [Paragraph("<b>ReportLab</b>", table_cell), Paragraph("^4.4.0", table_cell), Paragraph("PDF generation library used for building programmatic project documentation and invoices.", table_cell)]
    ]
    t_backend = Table(backend_deps, colWidths=[110, 90, 300])
    t_backend.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('PADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_backend)
    story.append(Spacer(1, 10))

    story.append(Paragraph("Frontend Dependencies (React / Node Stack)", h2_style))
    frontend_deps = [
        [Paragraph("Dependency", table_header), Paragraph("Version", table_header), Paragraph("Functional Description", table_header)],
        [Paragraph("<b>React / React-DOM</b>", table_cell), Paragraph("^19.2.6", table_cell), Paragraph("UI Component rendering library utilizing virtual DOM and modern functional hooks (useState, useEffect, useMemo).", table_cell)],
        [Paragraph("<b>Vite</b>", table_cell), Paragraph("^8.0.12", table_cell), Paragraph("Next-generation frontend build tool and dev server featuring instant HMR (Hot Module Replacement).", table_cell)],
        [Paragraph("<b>Lucide React</b>", table_cell), Paragraph("^1.17.0", table_cell), Paragraph("Modern, clean SVG icon library providing intuitive UI icons for cart, navigation, GPS, shops, and metrics.", table_cell)],
        [Paragraph("<b>ESLint / Plugins</b>", table_cell), Paragraph("^10.3.0", table_cell), Paragraph("Static code analysis and linting tools ensuring code quality, style consistency, and hook rules safety.", table_cell)]
    ]
    t_frontend = Table(frontend_deps, colWidths=[110, 90, 300])
    t_frontend.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), secondary_color),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('PADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_frontend)

    story.append(PageBreak())

    # --- SECTION 2: COMPREHENSIVE CORE FEATURES ---
    story.append(Paragraph("2. Comprehensive Core Features & Capabilities", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceAfter=12))

    story.append(Paragraph("1. Customer Module Capabilities", h2_style))
    cust_feats = [
        "<b>Hyperlocal Shop Discovery:</b> Calculates real-time distance between customer GPS coordinates and local Kirana stores using Haversine distance, prioritizing shops within a 0-5 km radius.",
        "<b>Category-Based Product Browsing:</b> Instant filtering across multiple local inventory categories including Grocery, Pharmacy, Baby Care, Pet Care, and Stationery.",
        "<b>Dynamic Cart & Order Checkout:</b> Add items, adjust quantities with live price calculation, auto-apply delivery fee calculation based on distance, and select Cash on Delivery (COD) or UPI.",
        "<b>Live Order Status Tracking:</b> Visual progress timeline showing order state transitions (Pending → Accepted → Packing → Out for Delivery → Delivered).",
        "<b>Real-Time GPS Delivery Tracking:</b> Interactive simulation/live broadcast of delivery partner coordinates moving along route to customer delivery location.",
        "<b>Delivery OTP Verification:</b> Displays a unique 4-digit security PIN for secure handover to the delivery agent.",
        "<b>Customer Profile & Order History:</b> Seamless phone number lookup with cached customer address and location preferences."
    ]
    for f in cust_feats:
        story.append(Paragraph(f"• {f}", bullet_style))

    story.append(Spacer(1, 10))
    story.append(Paragraph("2. Merchant / Shop Owner Module Capabilities", h2_style))
    shop_feats = [
        "<b>Real-Time Order Dashboard:</b> Live WebSocket feeds notify store managers immediately when a new customer order is placed.",
        "<b>One-Click Order Workflow Management:</b> Shop owners can Accept, Mark as Packed, and Dispatch orders for delivery.",
        "<b>Digital Catalog & Inventory Management:</b> Add new products with image upload support (AWS S3 integration or pre-hosted URL fallbacks), edit MRP/offered prices, update stocks, or delete items.",
        "<b>Merchant Analytics Summary:</b> View daily total orders, revenue generated, and active inventory status."
    ]
    for f in shop_feats:
        story.append(Paragraph(f"• {f}", bullet_style))

    story.append(Spacer(1, 10))
    story.append(Paragraph("3. Delivery Agent & Operations Module Capabilities", h2_style))
    deliv_feats = [
        "<b>Order Allocation Portal:</b> View dispatched orders ready for pickup with shop pickup address and customer drop address.",
        "<b>GPS Location Broadcaster:</b> Live broadcast of delivery agent latitude/longitude coordinates via WebSocket/API updates.",
        "<b>OTP Handover Verification:</b> Enforces input of customer's 4-digit OTP prior to marking an order as 'Delivered', preventing false or lost deliveries."
    ]
    for f in deliv_feats:
        story.append(Paragraph(f"• {f}", bullet_style))

    story.append(Spacer(1, 10))
    story.append(Paragraph("4. Admin Oversight & Master Analytics Dashboard", h2_style))
    admin_feats = [
        "<b>Platform Health Metrics:</b> Total platform revenue, total order volume, active shops count, and completed delivery ratios.",
        "<b>Global Shop Directory:</b> View all onboarded stores, phone contacts, shop addresses, and exact lat/long coordinates.",
        "<b>Global Order Log & Audit Trail:</b> Monitor all system transactions across stores in real time."
    ]
    for f in admin_feats:
        story.append(Paragraph(f"• {f}", bullet_style))

    story.append(PageBreak())

    # --- SECTION 3: END-TO-END USER & OPERATIONAL FLOWS ---
    story.append(Paragraph("3. End-to-End Operational & System Flows", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceAfter=12))

    story.append(Paragraph("Flow A: Customer Order Placement & Checkout Lifecycle", h2_style))
    story.append(Paragraph(
        "1. <b>Location Detection:</b> Customer opens app; browser requests HTML5 Geolocation. App resolves lat/long (default: Alkapuri, Vadodara 22.3072, 73.1678).<br/>"
        "2. <b>Store & Item Selection:</b> App queries <code>GET /api/shops</code>. Distances are computed. Customer selects store, views items via <code>GET /api/shops/{id}/products</code>, and adds items to cart.<br/>"
        "3. <b>Checkout Payload:</b> Customer provides Name, Phone Number, and Delivery Address. Cart items are formatted as JSON string.<br/>"
        "4. <b>Backend Execution:</b> Frontend fires <code>POST /api/orders</code>.<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;a. System looks up or creates <code>Customer</code> record.<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;b. System generates random 4-digit <code>delivery_otp</code> (e.g. 4821).<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;c. <code>Order</code> created with status <code>Pending</code>.<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;d. SMS sent to customer with OTP & confirmation link via Fast2SMS.<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;e. WebSocket event broadcasted to shop channel <code>/ws/shop/{shop_id}</code>.",
        body_style
    ))

    story.append(Spacer(1, 10))
    story.append(Paragraph("Flow B: Merchant Order Processing & Dispatch Lifecycle", h2_style))
    story.append(Paragraph(
        "1. <b>Alert Received:</b> Shop dashboard receives real-time WebSocket packet or polls <code>GET /api/orders/shop/{shop_id}</code>.<br/>"
        "2. <b>Order Acceptance:</b> Merchant clicks 'Accept Order'. API call <code>PUT /api/orders/{id}/status</code> updates status to <code>Accepted</code>.<br/>"
        "3. <b>Packing Items:</b> Store staff gathers items and updates status to <code>Packing</code>.<br/>"
        "4. <b>Dispatch:</b> Store marks order as <code>Out for Delivery</code>. Order becomes visible in the Delivery Agent Portal.",
        body_style
    ))

    story.append(Spacer(1, 10))
    story.append(Paragraph("Flow C: Live Delivery, GPS Tracking & OTP Verification Lifecycle", h2_style))
    story.append(Paragraph(
        "1. <b>Agent Pick Up:</b> Delivery partner accepts assignment and starts navigating to customer.<br/>"
        "2. <b>Live GPS Broadcast:</b> Delivery partner app periodically posts location updates via <code>PUT /api/orders/{id}/location</code> with lat/long.<br/>"
        "3. <b>Customer Map Stream:</b> Customer tracking UI polls customer orders <code>GET /api/orders/customer/{phone}</code> or listens to WebSocket, rendering moving marker on map.<br/>"
        "4. <b>Handover & Completion:</b> Delivery partner arrives at doorstep and asks customer for 4-digit OTP.<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;a. Partner enters OTP into Delivery App UI.<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;b. System validates OTP against database record.<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;c. If matched, status updates to <code>Delivered</code> and delivery timestamp is recorded.",
        body_style
    ))

    story.append(PageBreak())

    # --- SECTION 4: DATA MODELS & SCHEMA ---
    story.append(Paragraph("4. Data Models & Database Schema", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceAfter=12))

    story.append(Paragraph("Relational Database Schema Diagram (SQLite)", h2_style))
    
    schema_data = [
        [Paragraph("Table Name", table_header), Paragraph("Primary Key & Fields", table_header), Paragraph("Relationships & Foreign Keys", table_header)],
        [
            Paragraph("<b>shops</b>", table_cell),
            Paragraph("• id (Integer, PK)<br/>• name (String)<br/>• phone (String, Unique)<br/>• password (String)<br/>• address (String)<br/>• coordinates (String)<br/>• image_url (String)", table_cell),
            Paragraph("• Has many <b>products</b> (1:N)<br/>• Has many <b>orders</b> (1:N)", table_cell)
        ],
        [
            Paragraph("<b>products</b>", table_cell),
            Paragraph("• id (Integer, PK)<br/>• shop_id (Integer, FK)<br/>• name (String)<br/>• description (String)<br/>• mrp (Float)<br/>• offered_price (Float)<br/>• stock (Integer)<br/>• category (String)<br/>• image_url (String)", table_cell),
            Paragraph("• Belongs to <b>shop</b> (FK: shops.id)", table_cell)
        ],
        [
            Paragraph("<b>customers</b>", table_cell),
            Paragraph("• id (Integer, PK)<br/>• name (String)<br/>• phone (String, Unique, Index)<br/>• address (String)<br/>• coordinates (String)", table_cell),
            Paragraph("• Has many <b>orders</b> (1:N)", table_cell)
        ],
        [
            Paragraph("<b>orders</b>", table_cell),
            Paragraph("• id (Integer, PK)<br/>• customer_name/phone/address<br/>• shop_id (Integer, FK)<br/>• items (Text/JSON String)<br/>• total_amount (Float)<br/>• status (String: Pending, Accepted, etc.)<br/>• delivery_otp (String)<br/>• live_location (String)<br/>• created_at (DateTime)", table_cell),
            Paragraph("• Belongs to <b>shop</b> (FK: shops.id)<br/>• Belongs to <b>customer</b> (via phone lookup)", table_cell)
        ]
    ]
    t_schema = Table(schema_data, colWidths=[100, 240, 160])
    t_schema.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('PADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_schema)

    story.append(PageBreak())

    # --- SECTION 5: API ENDPOINT DIRECTORY ---
    story.append(Paragraph("5. Complete API Endpoint Directory", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceAfter=12))

    api_endpoints = [
        [Paragraph("Method", table_header), Paragraph("Endpoint Path", table_header), Paragraph("Description & Parameters", table_header)],
        [Paragraph("<b>GET</b>", table_cell), Paragraph("<code>/api/shops</code>", table_cell), Paragraph("Returns list of all active Kirana stores with addresses, phone numbers, and coordinates.", table_cell)],
        [Paragraph("<b>GET</b>", table_cell), Paragraph("<code>/api/shops/{id}/products</code>", table_cell), Paragraph("Retrieves inventory catalog for a specific shop filtered by shop ID.", table_cell)],
        [Paragraph("<b>POST</b>", table_cell), Paragraph("<code>/api/products</code>", table_cell), Paragraph("Creates a new product item for a shop. Supports fields: shop_id, name, price, stock, category.", table_cell)],
        [Paragraph("<b>PUT</b>", table_cell), Paragraph("<code>/api/products/{id}</code>", table_cell), Paragraph("Updates product details (MRP, offered price, stock availability, category, image URL).", table_cell)],
        [Paragraph("<b>DELETE</b>", table_cell), Paragraph("<code>/api/products/{id}</code>", table_cell), Paragraph("Deletes a product item from the shop catalog.", table_cell)],
        [Paragraph("<b>POST</b>", table_cell), Paragraph("<code>/api/orders</code>", table_cell), Paragraph("Places a new order. Accepts customer details, shop_id, cart items JSON. Generates OTP & triggers SMS.", table_cell)],
        [Paragraph("<b>GET</b>", table_cell), Paragraph("<code>/api/orders/customer/{phone}</code>", table_cell), Paragraph("Fetches active and historic orders for a specific customer phone number.", table_cell)],
        [Paragraph("<b>GET</b>", table_cell), Paragraph("<code>/api/orders/shop/{shop_id}</code>", table_cell), Paragraph("Retrieves all incoming and processed orders for a specific merchant store.", table_cell)],
        [Paragraph("<b>PUT</b>", table_cell), Paragraph("<code>/api/orders/{id}/status</code>", table_cell), Paragraph("Updates order status enum: Pending → Accepted → Packing → Out for Delivery → Delivered.", table_cell)],
        [Paragraph("<b>PUT</b>", table_cell), Paragraph("<code>/api/orders/{id}/location</code>", table_cell), Paragraph("Updates live GPS coordinates (lat,long string) of the delivery partner for live tracking.", table_cell)],
        [Paragraph("<b>POST</b>", table_cell), Paragraph("<code>/api/upload</code>", table_cell), Paragraph("Uploads product image file to AWS S3 bucket and returns public S3 object URL.", table_cell)],
        [Paragraph("<b>POST</b>", table_cell), Paragraph("<code>/api/seed</code>", table_cell), Paragraph("Populates database with sample Kirana shops (Alkapuri, Gotri, Manjalpur) and grocery catalog items.", table_cell)],
        [Paragraph("<b>GET</b>", table_cell), Paragraph("<code>/api/admin/metrics</code>", table_cell), Paragraph("Computes master admin platform statistics (total sales revenue, order counts, active shops).", table_cell)],
        [Paragraph("<b>WS</b>", table_cell), Paragraph("<code>/ws/shop/{shop_id}</code>", table_cell), Paragraph("Full-duplex WebSocket connection for real-time order alerts to store manager UI.", table_cell)]
    ]
    t_api = Table(api_endpoints, colWidths=[65, 175, 260])
    t_api.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('PADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_api)

    story.append(Spacer(1, 15))
    story.append(Paragraph("6. Operational Setup & Launch Runbook", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceAfter=12))

    story.append(Paragraph("Execution Script (`run_project.bat`)", h2_style))
    code_text = (
        "@echo off\n"
        "echo Starting Ziplo Project Servers...\n\n"
        ":: Start FastAPI Backend on port 8000\n"
        "start cmd /k \"uvicorn backend.main:app --reload --port 8000\"\n\n"
        ":: Start React Vite Frontend on port 5173\n"
        "cd frontend\n"
        "npm run dev\n"
    )
    story.append(Paragraph(code_text.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style))

    story.append(Paragraph("Environment Variables Configuration (`.env`)", h2_style))
    env_text = (
        "AWS_ACCESS_KEY_ID=your_aws_access_key\n"
        "AWS_SECRET_ACCESS_KEY=your_aws_secret_key\n"
        "AWS_REGION=ap-south-1\n"
        "S3_BUCKET_NAME=ziplo-product-images\n"
        "FAST2SMS_API_KEY=your_fast2sms_api_key\n"
    )
    story.append(Paragraph(env_text.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated PDF: {filename}")

if __name__ == "__main__":
    create_pdf()
