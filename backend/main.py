import os
from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import json

from .database import engine, Base, get_db
from . import models, schemas
from .websocket_manager import manager

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="GoKirana API", version="1.0")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Seeding Endpoint ---
@app.post("/api/seed")
def seed_data(db: Session = Depends(get_db)):
    # Check if shops exist
    if db.query(models.Shop).first():
        return {"message": "Database already seeded."}

    # Add default shops in Vadodara (around Alkapuri center: 22.3072, 73.1678)
    shop1 = models.Shop(
        name="Ziplo Express Alkapuri",
        phone="9876543210",
        password="password123",
        address="Alkapuri, Vadodara (0.3 km away)",
        coordinates="22.3085,73.1660",
        image_url="https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80"
    )
    shop2 = models.Shop(
        name="Royal Kirana & Pharmacy",
        phone="8765432109",
        password="password123",
        address="RC Dutt Road, Vadodara (1.0 km away)",
        coordinates="22.3150,73.1720",
        image_url="https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=500&q=80"
    )
    shop3 = models.Shop(
        name="Gotri Kirana Supermarket",
        phone="7654321098",
        password="password123",
        address="Gotri Road, Vadodara (4.5 km away)",
        coordinates="22.3220,73.1250",
        image_url="https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=500&q=80"
    )
    shop4 = models.Shop(
        name="Manjalpur Family Mart",
        phone="6543210987",
        password="password123",
        address="Manjalpur, Vadodara (4.8 km away)",
        coordinates="22.2750,73.1980",
        image_url="https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=500&q=80"
    )
    
    db.add(shop1)
    db.add(shop2)
    db.add(shop3)
    db.add(shop4)
    db.flush()

    # Add default products matching categories: Grocery, Pharmacy, Baby Care, Pet Care, Stationery
    products = [
        # Shop 1 Products
        models.Product(
            shop_id=shop1.id,
            name="Aashirvaad Shudh Chakki Atta (5kg)",
            description="100% pure whole wheat flour for soft rotis.",
            mrp=280.0,
            offered_price=255.0,
            stock=50,
            category="Grocery",
            image_url="https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&q=80"
        ),
        models.Product(
            shop_id=shop1.id,
            name="Fortune Mustard Oil (1L)",
            description="Pure mustard oil for traditional cooking.",
            mrp=190.0,
            offered_price=175.0,
            stock=30,
            category="Grocery",
            image_url="https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300&q=80"
        ),
        models.Product(
            shop_id=shop1.id,
            name="Dettol Antiseptic Liquid (500ml)",
            description="Effective antiseptic liquid for first aid and hygiene.",
            mrp=220.0,
            offered_price=199.0,
            stock=40,
            category="Pharmacy",
            image_url="https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=300&q=80"
        ),
        models.Product(
            shop_id=shop1.id,
            name="Pampers Baby Wipes (80 sheets)",
            description="Gentle wet wipes for baby sensitive skin.",
            mrp=150.0,
            offered_price=129.0,
            stock=60,
            category="Baby Care",
            image_url="https://images.unsplash.com/photo-1519689680058-324335c77ebe?w=300&q=80"
        ),
        models.Product(
            shop_id=shop1.id,
            name="Pedigree Adult Dry Dog Food (3kg)",
            description="Chicken and vegetables flavor dry food.",
            mrp=650.0,
            offered_price=599.0,
            stock=15,
            category="Pet Care",
            image_url="https://images.unsplash.com/photo-1589726480008-b8969939073b?w=300&q=80"
        ),
        models.Product(
            shop_id=shop1.id,
            name="Classmate Notebook A4 (Single Pack)",
            description="Premium quality paper notebook for school/college.",
            mrp=75.0,
            offered_price=65.0,
            stock=120,
            category="Stationery",
            image_url="https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=300&q=80"
        ),

        # Shop 2 Products
        models.Product(
            shop_id=shop2.id,
            name="Paracetamol Tablets 650mg",
            description="Effective relief from fever and mild-to-moderate pain.",
            mrp=30.0,
            offered_price=22.0,
            stock=200,
            category="Pharmacy",
            image_url="https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=300&q=80"
        ),
        models.Product(
            shop_id=shop2.id,
            name="Himalaya Baby Powder (200g)",
            description="Keeps baby cool, fresh, and happy.",
            mrp=140.0,
            offered_price=125.0,
            stock=35,
            category="Baby Care",
            image_url="https://images.unsplash.com/photo-1519689680058-324335c77ebe?w=300&q=80"
        ),
        models.Product(
            shop_id=shop2.id,
            name="Whiskas Wet Cat Food (Pack of 12)",
            description="Delicious chicken in gravy flavor.",
            mrp=480.0,
            offered_price=420.0,
            stock=25,
            category="Pet Care",
            image_url="https://images.unsplash.com/photo-1569591159212-b02ea8a9f239?w=300&q=80"
        ),
        
        # Shop 3 Products
        models.Product(
            shop_id=shop3.id,
            name="Tata Salt (1kg)",
            description="Iodized salt, desh ka namak.",
            mrp=28.0,
            offered_price=26.0,
            stock=100,
            category="Grocery",
            image_url="https://images.unsplash.com/photo-1504973960431-1c467e159aa4?w=300&q=80"
        ),
        models.Product(
            shop_id=shop3.id,
            name="Cello Gel Pens (Pack of 5)",
            description="Smooth writing gel pens with comfortable grip.",
            mrp=50.0,
            offered_price=45.0,
            stock=50,
            category="Stationery",
            image_url="https://images.unsplash.com/photo-1585336139058-3479a556c7cc?w=300&q=80"
        )
    ]
    for p in products:
        db.add(p)
    db.commit()
    return {"message": "Database seeded successfully with Ziplo Vadodara shops!"}


# --- Shop Auth Routes ---
@app.get("/api/shops", response_model=List[schemas.Shop])
def get_active_shops(db: Session = Depends(get_db)):
    return db.query(models.Shop).filter(models.Shop.active == True).all()

@app.post("/api/shops/register", response_model=schemas.Shop)
def register_shop(shop: schemas.ShopCreate, db: Session = Depends(get_db)):
    db_shop = db.query(models.Shop).filter(models.Shop.phone == shop.phone).first()
    if db_shop:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    new_shop = models.Shop(
        name=shop.name,
        phone=shop.phone,
        password=shop.password,
        address=shop.address,
        coordinates=shop.coordinates,
        image_url=shop.image_url
    )
    db.add(new_shop)
    db.commit()
    db.refresh(new_shop)
    return new_shop

@app.post("/api/shops/login", response_model=schemas.Shop)
def login_shop(login: schemas.ShopLogin, db: Session = Depends(get_db)):
    shop = db.query(models.Shop).filter(models.Shop.phone == login.phone, models.Shop.password == login.password).first()
    if not shop:
        raise HTTPException(status_code=401, detail="Invalid phone number or password")
    return shop


# --- Products / Catalog Routes ---
@app.get("/api/products", response_model=List[schemas.Product])
def get_all_products(category: str = None, db: Session = Depends(get_db)):
    query = db.query(models.Product).join(models.Shop).filter(models.Shop.active == True)
    if category:
        query = query.filter(models.Product.category == category)
    return query.all()

@app.get("/api/shops/{shop_id}/products", response_model=List[schemas.Product])
def get_shop_products(shop_id: int, db: Session = Depends(get_db)):
    return db.query(models.Product).filter(models.Product.shop_id == shop_id).all()

@app.post("/api/shops/{shop_id}/products", response_model=schemas.Product)
def create_shop_product(shop_id: int, product: schemas.ProductCreate, db: Session = Depends(get_db)):
    db_product = models.Product(**product.dict(), shop_id=shop_id)
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@app.put("/api/products/{product_id}", response_model=schemas.Product)
def update_product(product_id: int, product_update: schemas.ProductCreate, db: Session = Depends(get_db)):
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    for key, val in product_update.dict().items():
        setattr(db_product, key, val)
    db.commit()
    db.refresh(db_product)
    return db_product

@app.delete("/api/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(db_product)
    db.commit()
    return {"message": "Product deleted successfully"}


# --- Orders Routes ---
@app.post("/api/orders", response_model=schemas.Order)
async def create_order(order: schemas.OrderCreate, db: Session = Depends(get_db)):
    db_order = models.Order(
        customer_phone=order.customer_phone,
        shop_id=order.shop_id,
        status="Ordered",
        total_amount=order.total_amount
    )
    db.add(db_order)
    db.flush()

    order_items = []
    for item in order.items:
        db_item = models.OrderItem(
            order_id=db_order.id,
            product_id=item.product_id,
            product_name=item.product_name,
            quantity=item.quantity,
            price=item.price
        )
        db.add(db_item)
        order_items.append(db_item)
        
        # Deduct stock
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if product:
            product.stock = max(0, product.stock - item.quantity)

    db.commit()
    db.refresh(db_order)

    # Notify Shop via WebSockets immediately
    notification = {
        "event": "NEW_ORDER",
        "order": {
            "id": db_order.id,
            "customer_phone": db_order.customer_phone,
            "total_amount": db_order.total_amount,
            "items": [{"product_name": item.product_name, "quantity": item.quantity} for item in order_items]
        }
    }
    await manager.notify_shop(order.shop_id, notification)

    return db_order

@app.get("/api/orders/customer/{phone}", response_model=List[schemas.Order])
def get_customer_orders(phone: str, db: Session = Depends(get_db)):
    return db.query(models.Order).filter(models.Order.customer_phone == phone).order_by(models.Order.id.desc()).all()

@app.get("/api/orders/shop/{shop_id}", response_model=List[schemas.Order])
def get_shop_orders(shop_id: int, db: Session = Depends(get_db)):
    return db.query(models.Order).filter(models.Order.shop_id == shop_id).order_by(models.Order.id.desc()).all()

@app.put("/api/orders/{order_id}/status", response_model=schemas.Order)
def update_order_status(order_id: int, status_update: schemas.OrderStatusUpdate, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = status_update.status
    db.commit()
    db.refresh(order)
    return order


# --- Admin Dashboard Routes ---
@app.get("/api/admin/metrics")
def get_admin_metrics(db: Session = Depends(get_db)):
    total_shops = db.query(models.Shop).count()
    total_products = db.query(models.Product).count()
    orders = db.query(models.Order).all()
    total_sales = sum([o.total_amount for o in orders if o.status != "Cancelled"])
    success_rate = 0.0
    if orders:
        completed = len([o for o in orders if o.status == "Delivered"])
        success_rate = (completed / len(orders)) * 100
        
    return {
        "total_shops": total_shops,
        "total_products": total_products,
        "total_orders": len(orders),
        "total_sales": round(total_sales, 2),
        "success_rate": round(success_rate, 1)
    }

@app.get("/api/admin/shops", response_model=List[schemas.Shop])
def list_admin_shops(db: Session = Depends(get_db)):
    return db.query(models.Shop).all()

@app.get("/api/admin/orders", response_model=List[schemas.Order])
def list_admin_orders(db: Session = Depends(get_db)):
    return db.query(models.Order).order_by(models.Order.id.desc()).all()


# --- WebSocket Endpoint ---
@app.websocket("/ws/shop/{shop_id}")
async def websocket_endpoint(websocket: WebSocket, shop_id: int):
    await manager.connect(shop_id, websocket)
    try:
        while True:
            # Keep connection alive, listen for any client messages if needed
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(shop_id, websocket)
