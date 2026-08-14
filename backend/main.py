import os
import logging
logger = logging.getLogger("uvicorn")
import uuid
import random
from datetime import datetime, timedelta
import smtplib
from email.mime.text import MIMEText
import requests
import hashlib
import base64
import json

from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    WebSocket,
    WebSocketDisconnect,
    File,
    UploadFile
)
from fastapi.middleware.cors import CORSMiddleware

import boto3
from dotenv import load_dotenv

# Load env variables
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "ap-south-1")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME") or os.getenv("AWS_BUCKET_NAME")

# Initialize S3 client
s3_client = None

if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY:
    s3_client = boto3.client(
        "s3",
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        region_name=AWS_REGION
    )

from sqlalchemy.orm import Session
from typing import List, Optional

# IMPORTANT:
# Since main.py is inside the backend package and is being started with
# `python -m uvicorn backend.main:app`, use relative imports here.
from .database import engine, Base, get_db
from . import models, schemas
from .websocket_manager import manager
from . import sms_service


# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Ziplo API", version="1.0")


# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/customers/{phone}")
def get_customer_details(phone: str, db: Session = Depends(get_db)):
    customer = db.query(models.Customer).filter(
        models.Customer.phone == phone
    ).first()

    if not customer:
        raise HTTPException(
            status_code=404,
            detail="Customer not found"
        )

    return {
        "id": customer.id,
        "name": customer.name,
        "phone": customer.phone,
        "email": customer.email,
        "address": customer.address,
        "coordinates": customer.coordinates
    }


@app.put("/api/customers/{identifier}/coordinates")
def update_customer_coordinates(
    identifier: str,
    coord_update: schemas.CustomerCoordinatesUpdate,
    db: Session = Depends(get_db)
):
    customer = db.query(models.Customer).filter(
        (models.Customer.phone == identifier)
        | (models.Customer.email == identifier)
    ).first()

    if not customer and identifier.isdigit():
        customer = db.query(models.Customer).filter(models.Customer.id == int(identifier)).first()

    if not customer:
        raise HTTPException(
            status_code=404,
            detail="Customer not found"
        )

    customer.coordinates = coord_update.coordinates
    db.commit()
    db.refresh(customer)
    return {
        "id": customer.id,
        "name": customer.name,
        "phone": customer.phone,
        "coordinates": customer.coordinates
    }



# --- Seeding Endpoint ---
@app.post("/api/seed")
def seed_data(db: Session = Depends(get_db)):
    # No pre-seeded shops or products — all accounts are created from scratch via the app.
    return {
        "message": "No seed data. Create accounts via the registration flow."
    }


# --- Shop Auth & Management Routes ---
@app.get("/api/shops", response_model=List[schemas.Shop])
def get_all_shops(db: Session = Depends(get_db)):
    return db.query(models.Shop).all()


@app.put("/api/shops/{shop_id}/status", response_model=schemas.Shop)
def update_shop_status(
    shop_id: int,
    status_update: schemas.ShopStatusUpdate,
    db: Session = Depends(get_db)
):
    shop = db.query(models.Shop).filter(models.Shop.id == shop_id).first()
    if not shop:
        raise HTTPException(
            status_code=404,
            detail="Shop not found"
        )

    shop.active = status_update.active
    db.commit()
    db.refresh(shop)
    return shop


@app.put("/api/shops/{shop_id}/coordinates", response_model=schemas.Shop)
def update_shop_coordinates(
    shop_id: int,
    coord_update: schemas.ShopCoordinatesUpdate,
    db: Session = Depends(get_db)
):
    shop = db.query(models.Shop).filter(models.Shop.id == shop_id).first()
    if not shop:
        raise HTTPException(
            status_code=404,
            detail="Shop not found"
        )

    shop.coordinates = coord_update.coordinates
    db.commit()
    db.refresh(shop)
    return shop




# --- Products / Catalog Routes ---
@app.get("/api/products", response_model=List[schemas.Product])
def get_all_products(
    category: str = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Product).join(models.Shop).filter(
        models.Shop.active == True
    )

    if category:
        query = query.filter(models.Product.category == category)

    return query.all()


@app.get(
    "/api/shops/{shop_id}/products",
    response_model=List[schemas.Product]
)
def get_shop_products(
    shop_id: int,
    db: Session = Depends(get_db)
):
    return db.query(models.Product).filter(
        models.Product.shop_id == shop_id
    ).all()


@app.post(
    "/api/shops/{shop_id}/products",
    response_model=schemas.Product
)
def create_shop_product(
    shop_id: int,
    product: schemas.ProductCreate,
    db: Session = Depends(get_db)
):
    db_product = models.Product(
        **product.dict(),
        shop_id=shop_id
    )

    db.add(db_product)
    db.commit()
    db.refresh(db_product)

    return db_product


@app.put(
    "/api/products/{product_id}",
    response_model=schemas.Product
)
def update_product(
    product_id: int,
    product_update: schemas.ProductCreate,
    db: Session = Depends(get_db)
):
    db_product = db.query(models.Product).filter(
        models.Product.id == product_id
    ).first()

    if not db_product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    for key, val in product_update.dict().items():
        setattr(db_product, key, val)

    db.commit()
    db.refresh(db_product)

    return db_product


@app.delete("/api/products/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db)
):
    db_product = db.query(models.Product).filter(
        models.Product.id == product_id
    ).first()

    if not db_product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    db.delete(db_product)
    db.commit()

    return {
        "message": "Product deleted successfully"
    }


PHONEPE_MERCHANT_ID = "PGTESTPAYUAT86"
PHONEPE_SALT_KEY = "96434309-7796-489d-8924-ab56988a6076"
PHONEPE_SALT_INDEX = "1"
PHONEPE_ENV = "UAT"

# --- Orders Routes ---
@app.post("/api/orders", response_model=schemas.Order)
async def create_order(
    order: schemas.OrderCreate,
    db: Session = Depends(get_db)
):
    # Look up customer to get/sync baseline coordinates & address
    cust = db.query(models.Customer).filter(
        (models.Customer.phone == order.customer_phone)
        | (models.Customer.email == order.customer_phone)
    ).first()

    final_coords = order.delivery_coordinates or (cust.coordinates if cust else None)
    final_address = order.delivery_address or (cust.address if cust else None)

    # Sync back to customer record if customer exists
    if cust:
        if final_coords:
            cust.coordinates = final_coords
        if final_address:
            cust.address = final_address

    db_order = models.Order(
        customer_phone=order.customer_phone,
        shop_id=order.shop_id,
        status="Ordered",
        total_amount=order.total_amount,
        delivery_coordinates=final_coords,
        delivery_address=final_address,
        payment_status="Pending"
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

    db.commit()
    db.refresh(db_order)

    # Generate transaction ID for PhonePe
    transaction_id = f"ZIPLO_{db_order.id}_{int(datetime.now().timestamp())}"
    db_order.transaction_id = transaction_id
    db.commit()

    # Initialize PhonePe Payment
    payload = {
        "merchantId": PHONEPE_MERCHANT_ID,
        "merchantTransactionId": transaction_id,
        "merchantUserId": order.customer_phone,
        "amount": int(order.total_amount * 100), # Amount in paise
        "redirectUrl": f"{order.frontend_url}/#order-status?transactionId={transaction_id}",
        "redirectMode": "REDIRECT",
        "callbackUrl": "http://192.168.29.36:8000/api/payment/callback",
        "mobileNumber": order.customer_phone,
        "paymentInstrument": {
            "type": "PAY_PAGE"
        }
    }
    
    base64_payload = base64.b64encode(json.dumps(payload).encode("utf-8")).decode("utf-8")
    string_to_hash = base64_payload + "/pg/v1/pay" + PHONEPE_SALT_KEY
    checksum = hashlib.sha256(string_to_hash.encode("utf-8")).hexdigest() + "###" + PHONEPE_SALT_INDEX

    headers = {
        "Content-Type": "application/json",
        "X-VERIFY": checksum
    }

    try:
        response = requests.post(
            "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay",
            json={"request": base64_payload},
            headers=headers,
            timeout=10
        )
        data = response.json()
        if data.get("success"):
            redirect_url = data["data"]["instrumentResponse"]["redirectInfo"]["url"]
            # Convert to dict to inject redirect_url dynamically for the response schema
            order_resp = schemas.Order.model_validate(db_order).model_dump()
            order_resp["redirect_url"] = redirect_url
            return order_resp
    except Exception as e:
        logger.error(f"PhonePe Init Error: {e}")
    
    raise HTTPException(status_code=500, detail=f"Failed to init payment: {e}")

from fastapi import Request

@app.post("/api/payment/callback")
async def payment_callback(request: Request, db: Session = Depends(get_db)):
    x_verify = request.headers.get("x-verify")
    try:
        data = await request.json()
        response_b64 = data.get("response")
        if not response_b64:
            return {"status": "ignored"}
        
        string_to_hash = response_b64 + PHONEPE_SALT_KEY
        expected_checksum = hashlib.sha256(string_to_hash.encode("utf-8")).hexdigest() + "###" + PHONEPE_SALT_INDEX
        
        if x_verify != expected_checksum:
            return {"status": "invalid_signature"}
            
        decoded = json.loads(base64.b64decode(response_b64).decode("utf-8"))
        transaction_id = decoded.get("data", {}).get("merchantTransactionId")
        success = decoded.get("success")
        code = decoded.get("code")
        
        if transaction_id:
            order = db.query(models.Order).filter(models.Order.transaction_id == transaction_id).first()
            if order:
                if success and code == "PAYMENT_SUCCESS":
                    if order.payment_status != "Success":
                        order.payment_status = "Success"

                        # Deduct stock
                        for item in order.items:
                            product = db.query(models.Product).filter(
                                models.Product.id == item.product_id
                            ).first()
                            if product:
                                product.stock = max(0, product.stock - item.quantity)
                        
                        db.commit()
                        
                        items_payload = [{"product_name": item.product_name, "quantity": item.quantity} for item in order.items]
                        notification = {
                            "event": "NEW_ORDER",
                            "order": {
                                "id": order.id,
                                "customer_phone": order.customer_phone,
                                "total_amount": order.total_amount,
                                "delivery_coordinates": order.delivery_coordinates,
                                "delivery_address": order.delivery_address,
                                "items": items_payload
                            }
                        }
                        await manager.notify_shop(order.shop_id, notification)
                else:
                    order.payment_status = "Failed"
                    db.commit()
    except Exception as e:
        logger.error(f"Callback error: {e}")
        
    return {"status": "ok"}

@app.get("/api/payment/status/{transaction_id}")
async def check_payment_status(transaction_id: str, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.transaction_id == transaction_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if order.payment_status == "Pending":
        string_to_hash = f"/pg/v1/status/{PHONEPE_MERCHANT_ID}/{transaction_id}" + PHONEPE_SALT_KEY
        checksum = hashlib.sha256(string_to_hash.encode("utf-8")).hexdigest() + "###" + PHONEPE_SALT_INDEX
        
        headers = {
            "Content-Type": "application/json",
            "X-VERIFY": checksum,
            "X-MERCHANT-ID": PHONEPE_MERCHANT_ID
        }
        try:
            resp = requests.get(f"https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/status/{PHONEPE_MERCHANT_ID}/{transaction_id}", headers=headers)
            data = resp.json()
            if data.get("success") and data.get("code") == "PAYMENT_SUCCESS":
                order.payment_status = "Success"
                # Deduct stock
                for item in order.items:
                    product = db.query(models.Product).filter(
                        models.Product.id == item.product_id
                    ).first()
                    if product:
                        product.stock = max(0, product.stock - item.quantity)
                db.commit()
                
                # Push WebSocket notification
                items_payload = [{"product_name": item.product_name, "quantity": item.quantity} for item in order.items]
                notification = {
                    "event": "NEW_ORDER",
                    "order": {
                        "id": order.id,
                        "customer_phone": order.customer_phone,
                        "total_amount": order.total_amount,
                        "delivery_coordinates": order.delivery_coordinates,
                        "delivery_address": order.delivery_address,
                        "items": items_payload
                    }
                }
                await manager.notify_shop(order.shop_id, notification)
            elif data.get("code") in ["PAYMENT_ERROR", "PAYMENT_DECLINED", "PAYMENT_CANCELLED"]:
                order.payment_status = "Failed"
                db.commit()
        except Exception as e:
            logger.error(f"Status check error: {e}")

    return {"payment_status": order.payment_status, "order_id": order.id, "transaction_id": transaction_id}


@app.get(
    "/api/orders/customer/{phone}",
    response_model=List[schemas.Order]
)
def get_customer_orders(
    phone: str,
    db: Session = Depends(get_db)
):
    return db.query(models.Order).filter(
        models.Order.customer_phone == phone,
        models.Order.payment_status == 'Success'
    ).order_by(
        models.Order.id.desc()
    ).all()


@app.get(
    "/api/orders/shop/{shop_id}",
    response_model=List[schemas.Order]
)
def get_shop_orders(
    shop_id: int,
    db: Session = Depends(get_db)
):
    return db.query(models.Order).filter(
        models.Order.shop_id == shop_id,
        models.Order.payment_status == 'Success'
    ).order_by(
        models.Order.id.desc()
    ).all()


@app.put(
    "/api/orders/{order_id}/status",
    response_model=schemas.Order
)
def update_order_status(
    order_id: int,
    status_update: schemas.OrderStatusUpdate,
    db: Session = Depends(get_db)
):
    order = db.query(models.Order).filter(
        models.Order.id == order_id
    ).first()

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )

    order.status = status_update.status

    db.commit()
    db.refresh(order)

    return order


@app.put(
    "/api/orders/{order_id}/location",
    response_model=schemas.Order
)
def update_order_location(
    order_id: int,
    location_update: schemas.OrderLocationUpdate,
    db: Session = Depends(get_db)
):
    order = db.query(models.Order).filter(
        models.Order.id == order_id
    ).first()

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )

    order.delivery_coordinates = (
        location_update.delivery_coordinates
    )

    db.commit()
    db.refresh(order)

    return order


# --- Admin Dashboard & Truncate Routes ---
@app.post("/api/admin/login")
def admin_login(
    creds: schemas.AdminLogin,
    db: Session = Depends(get_db)
):
    if creds.username == "admin" and creds.password == "admin123":
        return {
            "message": "Admin login successful",
            "token": "admin-session-token",
            "role": "admin"
        }

    admin = db.query(models.Admin).filter(
        models.Admin.username == creds.username
    ).first()

    if admin and admin.password == creds.password:
        return {
            "message": "Admin login successful",
            "token": "admin-session-token",
            "role": "admin"
        }

    raise HTTPException(
        status_code=401,
        detail="Invalid admin credentials"
    )


@app.post("/api/admin/truncate")
def truncate_accounts(
    db: Session = Depends(get_db)
):
    # Delete all orders, items, products, shops, and customers
    db.query(models.OrderItem).delete()
    db.query(models.Order).delete()
    db.query(models.Product).delete()
    db.query(models.Shop).delete()
    db.query(models.Customer).delete()

    db.commit()

    return {
        "message": "All merchant and consumer accounts and associated data have been truncated successfully."
    }


@app.get("/api/admin/metrics")
def get_admin_metrics(
    db: Session = Depends(get_db)
):
    total_shops = db.query(models.Shop).count()
    total_products = db.query(models.Product).count()

    orders = db.query(models.Order).all()

    total_sales = sum(
        [
            o.total_amount
            for o in orders
            if o.status != "Cancelled"
        ]
    )

    success_rate = 0.0

    if orders:
        completed = len(
            [
                o
                for o in orders
                if o.status == "Delivered"
            ]
        )

        success_rate = (
            completed / len(orders)
        ) * 100

    return {
        "total_shops": total_shops,
        "total_products": total_products,
        "total_orders": len(orders),
        "total_sales": round(total_sales, 2),
        "success_rate": round(success_rate, 1)
    }


@app.get(
    "/api/admin/shops",
    response_model=List[schemas.Shop]
)
def list_admin_shops(
    db: Session = Depends(get_db)
):
    return db.query(models.Shop).all()


@app.get(
    "/api/admin/orders",
    response_model=List[schemas.Order]
)
def list_admin_orders(
    db: Session = Depends(get_db)
):
    return db.query(models.Order).order_by(
        models.Order.id.desc()
    ).all()


# --- S3 Image Upload Route ---
@app.post("/api/upload")
async def upload_image(
    file: UploadFile = File(...)
):
    if not s3_client or not S3_BUCKET_NAME:
        raise HTTPException(
            status_code=500,
            detail="AWS S3 credentials are not configured on the server."
        )

    file_ext = (
        file.filename.split(".")[-1]
        if "." in file.filename
        else "jpg"
    )

    unique_filename = (
        f"uploads/{uuid.uuid4()}.{file_ext}"
    )

    try:
        # Upload object to S3
        s3_client.upload_fileobj(
            file.file,
            S3_BUCKET_NAME,
            unique_filename,
            ExtraArgs={
                "ContentType": file.content_type
            }
        )

        # Public S3 object URL
        public_url = (
            f"https://{S3_BUCKET_NAME}.s3."
            f"{AWS_REGION}.amazonaws.com/"
            f"{unique_filename}"
        )

        return {
            "url": public_url
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"S3 upload failed: {str(e)}"
        )


# --- WebSocket Endpoint ---
@app.websocket("/ws/shop/{shop_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    shop_id: int
):
    await manager.connect(
        shop_id,
        websocket
    )

    try:
        while True:
            # Keep connection alive, listen for any client messages if needed
            await websocket.receive_text()

    except WebSocketDisconnect:
        manager.disconnect(
            shop_id,
            websocket
        )


# --- Unified Authentication & Onboarding Routes ---

def send_otp_notification(
    identifier: str,
    otp: str,
    target_email: str = None
):
    # Ensure destination email address
    destination = (
        target_email
        if target_email and "@" in target_email
        else identifier
    )

    if "@" not in destination:
        logger.warning(
            f"[EMAIL OTP] Warning: No email address provided "
            f"for identifier: {identifier}"
        )
        destination = identifier

    subject = f"Ziplo Verification Code: {otp}"

    body = (
        f"Your Ziplo verification code is: {otp}. "
        f"It is valid for 10 minutes."
    )

    smtp_server = (
        os.getenv("SMTP_SERVER")
        or os.getenv("SMTP_HOST")
    )

    smtp_port = os.getenv(
        "SMTP_PORT",
        "587"
    )

    smtp_user = (
        os.getenv("SMTP_USER")
        or os.getenv("SMTP_USERNAME")
    )

    smtp_password = os.getenv(
        "SMTP_PASSWORD"
    )

    if smtp_server and smtp_user and smtp_password:
        try:
            from email.mime.multipart import MIMEMultipart

            msg = MIMEMultipart()

            msg["From"] = smtp_user
            msg["To"] = destination
            msg["Subject"] = subject

            msg.attach(
                MIMEText(
                    body,
                    "plain"
                )
            )

            server = smtplib.SMTP(
                smtp_server,
                int(smtp_port)
            )

            server.starttls()

            server.login(
                smtp_user,
                smtp_password
            )

            server.sendmail(
                smtp_user,
                destination,
                msg.as_string()
            )

            server.close()

            logger.info(
                f"[SMTP] Successfully sent OTP email "
                f"to {destination}"
            )

            return {
                "status": "sent",
                "method": "email",
                "to": destination
            }

        except Exception as e:
            logger.error(
                f"[SMTP] Failed to send email: {e}"
            )

    # Clean log output when SMTP credentials are not set
    logger.info(
        f"\n"
        f"==================================================\n"
        f"               EMAIL OTP VERIFICATION             \n"
        f"==================================================\n"
        f" To Email: {destination}\n"
        f" OTP Code: {otp}\n"
        f" Subject: {subject}\n"
        f"==================================================\n"
    )

    return {
        "status": "mock_sent",
        "method": "email",
        "to": destination,
        "otp": otp
    }


@app.get("/api/auth/check-identifier")
def check_identifier(
    identifier: str,
    db: Session = Depends(get_db)
):
    if not identifier or not identifier.strip():
        return {
            "exists": False,
            "role": None,
            "is_shop": False
        }

    clean_id = identifier.strip()

    # Check Customer table first
    cust = db.query(models.Customer).filter(
        (models.Customer.email == clean_id)
        | (models.Customer.phone == clean_id)
    ).first()

    if cust:
        return {
            "exists": True,
            "role": "customer",
            "is_shop": False,
            "name": cust.name
        }

    # Check Shop table
    shop = db.query(models.Shop).filter(
        (models.Shop.email == clean_id)
        | (models.Shop.phone == clean_id)
    ).first()

    if shop:
        return {
            "exists": True,
            "role": "merchant",
            "is_shop": True,
            "name": shop.name
        }

    return {
        "exists": False,
        "role": None,
        "is_shop": False
    }


@app.post("/api/auth/register")
def auth_register(
    reg: schemas.AuthRegister,
    db: Session = Depends(get_db)
):
    if not reg.email and not reg.phone:
        raise HTTPException(
            status_code=400,
            detail="Either email or phone must be provided"
        )

    if reg.is_shop:

        # Check if shop already exists
        if reg.email:
            existing = db.query(models.Shop).filter(
                models.Shop.email == reg.email
            ).first()

            if existing:
                raise HTTPException(
                    status_code=400,
                    detail="Email already registered as a shop"
                )

        if reg.phone:
            existing = db.query(models.Shop).filter(
                models.Shop.phone == reg.phone
            ).first()

            if existing:
                raise HTTPException(
                    status_code=400,
                    detail="Phone number already registered as a shop"
                )

        new_shop = models.Shop(
            name=reg.name or "New Shop",
            owner_name=reg.owner_name,
            email=reg.email,
            phone=reg.phone,
            password=reg.password,
            address=reg.address,
            coordinates=reg.coordinates or "22.3072,73.1678",
            image_url=reg.image_url,
            profile_completed=True
            if (
                reg.name
                and reg.owner_name
                and reg.image_url
                and reg.address
            )
            else False
        )

        db.add(new_shop)
        db.commit()

        return {
            "message": "Shop registered successfully. Please login to receive OTP.",
            "is_shop": True,
            "role": "merchant"
        }

    else:

        # Customer registration
        if reg.email:
            existing = db.query(models.Customer).filter(
                models.Customer.email == reg.email
            ).first()

            if existing:
                raise HTTPException(
                    status_code=400,
                    detail="Email already registered as a customer"
                )

        if reg.phone:
            existing = db.query(models.Customer).filter(
                models.Customer.phone == reg.phone
            ).first()

            if existing:
                raise HTTPException(
                    status_code=400,
                    detail="Phone number already registered as a customer"
                )

        new_cust = models.Customer(
            name=reg.name,
            email=reg.email,
            phone=reg.phone,
            password=reg.password,
            address=reg.address,
            coordinates=reg.coordinates,
            profile_completed=True
            if (
                reg.name
                and reg.address
            )
            else False
        )

        db.add(new_cust)
        db.commit()

        return {
            "message": "Customer registered successfully. Please login to receive OTP.",
            "is_shop": False,
            "role": "customer"
        }


@app.post("/api/auth/login")
def auth_login(
    login: schemas.AuthLogin,
    db: Session = Depends(get_db)
):
    # Try logging in as Customer first
    user = db.query(models.Customer).filter(
        (models.Customer.email == login.identifier)
        | (models.Customer.phone == login.identifier)
    ).first()

    is_shop = False

    # If not found, try logging in as Shop
    if not user:
        user = db.query(models.Shop).filter(
            (models.Shop.email == login.identifier)
            | (models.Shop.phone == login.identifier)
        ).first()

        is_shop = True

    if not user or user.password != login.password:
        raise HTTPException(
            status_code=401,
            detail="Invalid identifier or password"
        )

    # Generate 6-digit OTP
    otp = str(
        random.randint(
            100000,
            999999
        )
    )

    user.otp = otp

    user.otp_expiry = (
        datetime.utcnow()
        + timedelta(minutes=10)
    )

    db.commit()

    # Send Email OTP
    target_email = (
        getattr(user, "email", None)
        or login.identifier
    )

    send_otp_notification(
        login.identifier,
        otp,
        target_email=target_email
    )

    role = (
        "merchant"
        if is_shop
        else "customer"
    )

    return {
        "message": "OTP sent successfully to your email",
        "identifier": login.identifier,
        "is_shop": is_shop,
        "role": role
    }


@app.post("/api/auth/verify")
def auth_verify(
    verify: schemas.AuthVerify,
    db: Session = Depends(get_db)
):
    logger.info(
        f"[AUTH VERIFY] Identifier: {verify.identifier}, "
        f"OTP: {verify.otp}, "
        f"IsShop: {verify.is_shop}"
    )

    user = None

    if verify.is_shop:
        user = db.query(models.Shop).filter(
            (models.Shop.email == verify.identifier)
            | (models.Shop.phone == verify.identifier)
        ).first()

    else:
        user = db.query(models.Customer).filter(
            (models.Customer.email == verify.identifier)
            | (models.Customer.phone == verify.identifier)
        ).first()

    # Fallback search if user role wasn't matched strictly
    if not user:
        user = db.query(models.Customer).filter(
            (models.Customer.email == verify.identifier)
            | (models.Customer.phone == verify.identifier)
        ).first()

        if not user:
            user = db.query(models.Shop).filter(
                (models.Shop.email == verify.identifier)
                | (models.Shop.phone == verify.identifier)
            ).first()

            if user:
                verify.is_shop = True

    if not user:
        logger.warning(
            f"[AUTH VERIFY] User not found for identifier: "
            f"{verify.identifier}"
        )

        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    if not user.otp or user.otp != verify.otp:
        raise HTTPException(
            status_code=400,
            detail="Invalid OTP code"
        )

    if user.otp_expiry < datetime.utcnow():
        raise HTTPException(
            status_code=400,
            detail="OTP code has expired"
        )

    # Clear OTP
    user.otp = None
    user.otp_expiry = None

    db.commit()

    role = (
        "merchant"
        if verify.is_shop
        else "customer"
    )

    resp = {
        "role": role,
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "address": user.address,
        "coordinates": user.coordinates,
        "image_url": getattr(
            user,
            "image_url",
            None
        ),
        "owner_name": getattr(
            user,
            "owner_name",
            None
        ),
        "profile_completed": user.profile_completed
    }

    # If merchant is missing mandatory details
    # (owner_name, image_url), force profile_completed to False
    if verify.is_shop:
        if (
            not user.owner_name
            or not user.image_url
            or not user.name
        ):
            user.profile_completed = False

            db.commit()

            resp["profile_completed"] = False

    return resp


@app.post("/api/auth/complete-profile")
def auth_complete_profile(
    profile: schemas.ProfileComplete,
    db: Session = Depends(get_db)
):
    if profile.is_shop:

        user = db.query(models.Shop).filter(
            (models.Shop.email == profile.identifier)
            | (models.Shop.phone == profile.identifier)
        ).first()

        if not user:
            user = (
                db.query(models.Shop).filter(
                    models.Shop.id == profile.identifier
                ).first()
                if profile.identifier.isdigit()
                else None
            )

    else:

        user = db.query(models.Customer).filter(
            (models.Customer.email == profile.identifier)
            | (models.Customer.phone == profile.identifier)
        ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    user.name = profile.name

    if profile.is_shop and profile.owner_name:
        user.owner_name = profile.owner_name

    if profile.is_shop and profile.image_url:
        user.image_url = profile.image_url

    user.address = profile.address
    user.coordinates = profile.coordinates
    user.profile_completed = True

    db.commit()

    role = (
        "merchant"
        if profile.is_shop
        else "customer"
    )

    return {
        "role": role,
        "id": user.id,
        "name": user.name,
        "owner_name": getattr(
            user,
            "owner_name",
            None
        ),
        "email": user.email,
        "phone": user.phone,
        "address": user.address,
        "coordinates": user.coordinates,
        "image_url": getattr(
            user,
            "image_url",
            None
        ),
        "profile_completed": True
    }


@app.get("/api/shops/{shop_id}/analytics")
def get_shop_analytics(
    shop_id: int,
    period: str = "daily",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    shop = db.query(models.Shop).filter(
        models.Shop.id == shop_id
    ).first()

    if not shop:
        raise HTTPException(
            status_code=404,
            detail="Shop not found"
        )

    now = datetime.utcnow()

    if period == "daily":

        start_time = datetime(
            now.year,
            now.month,
            now.day,
            0,
            0,
            0
        )

        end_time = now

    elif period == "weekly":

        start_time = now - timedelta(days=7)
        end_time = now

    elif period == "monthly":

        start_time = now - timedelta(days=30)
        end_time = now

    elif period == "quarterly":

        start_time = now - timedelta(days=90)
        end_time = now

    elif period == "annual":

        start_time = now - timedelta(days=365)
        end_time = now

    elif period == "custom":

        try:

            start_time = (
                datetime.strptime(
                    start_date,
                    "%Y-%m-%d"
                )
                if start_date
                else now - timedelta(days=30)
            )

            if end_date:
                end_time = (
                    datetime.strptime(
                        end_date,
                        "%Y-%m-%d"
                    )
                    + timedelta(days=1)
                    - timedelta(seconds=1)
                )
            else:
                end_time = now

        except Exception:

            raise HTTPException(
                status_code=400,
                detail="Invalid date format. Use YYYY-MM-DD."
            )

    else:

        start_time = now - timedelta(days=30)
        end_time = now

    orders = db.query(models.Order).filter(
        models.Order.shop_id == shop_id,
        models.Order.created_at >= start_time,
        models.Order.created_at <= end_time
    ).all()

    delivered_orders = [
        o
        for o in orders
        if o.status != "Cancelled"
    ]

    total_sales = sum(
        o.total_amount
        for o in delivered_orders
    )

    total_orders = len(orders)

    delivered_count = len(
        delivered_orders
    )

    avg_order_value = (
        total_sales / delivered_count
        if delivered_count > 0
        else 0.0
    )

    item_sales = {}

    for o in delivered_orders:

        for item in o.items:

            p_name = item.product_name

            item_sales[p_name] = (
                item_sales.get(
                    p_name,
                    0
                )
                + item.quantity
            )

    top_products = [
        {
            "name": name,
            "qty": qty
        }
        for name, qty in sorted(
            item_sales.items(),
            key=lambda x: x[1],
            reverse=True
        )[:5]
    ]

    return {
        "period": period,
        "start_date": start_time.strftime(
            "%Y-%m-%d"
        ),
        "end_date": end_time.strftime(
            "%Y-%m-%d"
        ),
        "total_sales": round(
            total_sales,
            2
        ),
        "total_orders": total_orders,
        "delivered_orders": delivered_count,
        "avg_order_value": round(
            avg_order_value,
            2
        ),
        "top_products": top_products
    }


@app.post("/api/contact")
def submit_contact_message(contact: schemas.ContactMessage):
    logger.info(f"[Contact Form] Message received from {contact.name} ({contact.email}, {contact.phone}): {contact.message}")
    msg_id = f"ZIPLO-MSG-{uuid.uuid4().hex[:8].upper()}"

    # Forward email directly to getziplo@gmail.com via FormSubmit service
    import urllib.request
    import json

    try:
        url = "https://formsubmit.co/ajax/getziplo@gmail.com"
        payload = json.dumps({
            "name": contact.name,
            "email": contact.email,
            "_replyto": contact.email,
            "phone": contact.phone,
            "message": contact.message,
            "_subject": f"New Contact Message from {contact.name} ({contact.email})"
        }).encode("utf-8")

        req = urllib.request.Request(
            url,
            data=payload,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                "Referer": "http://localhost:5173/"
            }
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            res_body = response.read().decode("utf-8")
            logger.info(f"[Contact Form Email Dispatch] Result: {res_body}")
    except Exception as e:
        logger.warning(f"[Contact Form Email Dispatch] Web forward notice: {e}")

    return {
        "status": "success",
        "message": f"Thank you {contact.name}, your message has been sent to getziplo@gmail.com! We will get back to you at {contact.email} shortly.",
        "reference_id": msg_id,
        "recipient": "getziplo@gmail.com",
        "timestamp": datetime.utcnow().isoformat()
    }
