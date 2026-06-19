from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
import datetime
from .database import Base

class Shop(Base):
    __tablename__ = "shops"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    phone = Column(String, unique=True, index=True)
    password = Column(String)  # Simple demo pass
    address = Column(String)
    coordinates = Column(String)  # "lat,lng"
    active = Column(Boolean, default=True)
    image_url = Column(String, nullable=True)

    products = relationship("Product", back_populates="shop", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="shop")

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
