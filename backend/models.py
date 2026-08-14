from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
import datetime
from .database import Base

class Shop(Base):
    __tablename__ = "shops"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    owner_name = Column(String, nullable=True)
    phone = Column(String, unique=True, index=True, nullable=True)
    email = Column(String, unique=True, index=True, nullable=True)
    password = Column(String)  # Simple demo pass
    address = Column(String, nullable=True)
    coordinates = Column(String, nullable=True)  # "lat,lng"
    active = Column(Boolean, default=True)
    image_url = Column(String, nullable=True)
    otp = Column(String, nullable=True)
    otp_expiry = Column(DateTime, nullable=True)
    profile_completed = Column(Boolean, default=False)

    products = relationship("Product", back_populates="shop", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="shop")

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)
    email = Column(String, unique=True, index=True, nullable=True)
    phone = Column(String, unique=True, index=True, nullable=True)
    password = Column(String)
    address = Column(String, nullable=True)
    coordinates = Column(String, nullable=True)  # "lat,lng"
    otp = Column(String, nullable=True)
    otp_expiry = Column(DateTime, nullable=True)
    profile_completed = Column(Boolean, default=False)


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    shop_id = Column(Integer, ForeignKey("shops.id"))
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    mrp = Column(Float)
    offered_price = Column(Float)
    stock = Column(Integer, default=0)
    category = Column(String, index=True)
    image_url = Column(String, nullable=True)

    shop = relationship("Shop", back_populates="products")

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    customer_phone = Column(String, index=True)
    shop_id = Column(Integer, ForeignKey("shops.id"))
    status = Column(String, default="Ordered")  # Ordered, Preparing, In Transit, Delivered, Cancelled
    total_amount = Column(Float)
    delivery_coordinates = Column(String, nullable=True)  # "lat,lng" for live tracking
    delivery_address = Column(String, nullable=True)  # Full customer delivery address
    transaction_id = Column(String, nullable=True, unique=True, index=True) # PhonePe transaction ID
    payment_status = Column(String, default="Pending") # Pending, Success, Failed

    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    shop = relationship("Shop", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    product_id = Column(Integer)  # Decoupled or direct link
    product_name = Column(String)
    quantity = Column(Integer)
    price = Column(Float)

    order = relationship("Order", back_populates="items")


class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, default="Platform Admin")
    username = Column(String, unique=True, index=True)
    password = Column(String)

