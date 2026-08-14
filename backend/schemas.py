from pydantic import BaseModel, Field
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
    owner_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    coordinates: Optional[str] = None
    image_url: Optional[str] = None


class Shop(ShopBase):
    id: int
    active: bool

    class Config:
        orm_mode = True


class ShopStatusUpdate(BaseModel):
    active: bool


class ShopCoordinatesUpdate(BaseModel):
    coordinates: str


class CustomerCoordinatesUpdate(BaseModel):
    coordinates: str





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
    delivery_coordinates: Optional[str] = None
    delivery_address: Optional[str] = None

class Order(BaseModel):
    id: int
    customer_phone: str
    shop_id: int
    status: str
    total_amount: float
    delivery_coordinates: Optional[str] = None
    delivery_address: Optional[str] = None
    created_at: datetime
    items: List[OrderItem]


    class Config:
        orm_mode = True

class OrderStatusUpdate(BaseModel):
    status: str

class OrderLocationUpdate(BaseModel):
    delivery_coordinates: str

# Unified Authentication & Onboarding Schemas
class AuthLogin(BaseModel):
    identifier: str  # Email or Phone number
    password: str = Field(..., max_length=128)

class AuthRegister(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    password: str = Field(..., max_length=128)
    is_shop: bool = False
    name: Optional[str] = None  # Setup during registration or onboarding
    owner_name: Optional[str] = None
    address: Optional[str] = None
    coordinates: Optional[str] = None
    image_url: Optional[str] = None

class AuthVerify(BaseModel):
    identifier: str
    otp: str
    is_shop: bool = False

class ProfileComplete(BaseModel):
    identifier: str
    name: str
    owner_name: Optional[str] = None
    address: str
    coordinates: str
    image_url: Optional[str] = None
    is_shop: bool = False

class AdminLogin(BaseModel):
    username: str
    password: str

class ContactMessage(BaseModel):
    name: str
    email: str
    phone: str
    message: str



