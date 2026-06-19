from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    mrp: float
    offered_price: float
    stock: int
    category: str
    image_url: Optional[str] = None

class ProductCreate(ProductBase):
    pass

class Product(ProductBase):
    id: int
    shop_id: int

    class Config:
        orm_mode = True

class ShopBase(BaseModel):
    name: str
    phone: str
    address: str
    coordinates: str
    image_url: Optional[str] = None

class ShopCreate(ShopBase):
    password: str

class ShopLogin(BaseModel):
    phone: str
    password: str

class Shop(ShopBase):
    id: int
    active: bool

    class Config:
        orm_mode = True

class OrderItemBase(BaseModel):
    product_id: int
    product_name: str
    quantity: int
    price: float

class OrderItemCreate(OrderItemBase):
    pass

class OrderItem(OrderItemBase):
    id: int
    order_id: int

    class Config:
        orm_mode = True

class OrderCreate(BaseModel):
    customer_phone: str
    shop_id: int
    items: List[OrderItemCreate]
    total_amount: float

class Order(BaseModel):
    id: int
    customer_phone: str
    shop_id: int
    status: str
    total_amount: float
    created_at: datetime
    items: List[OrderItem]

    class Config:
        orm_mode = True

class OrderStatusUpdate(BaseModel):
    status: str
