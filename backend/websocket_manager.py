from fastapi import WebSocket
from typing import Dict, List

class ConnectionManager:
    def __init__(self):
        # Maps shop_id (as int) to list of active WebSockets
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, shop_id: int, websocket: WebSocket):
        await websocket.accept()
        if shop_id not in self.active_connections:
            self.active_connections[shop_id] = []
        self.active_connections[shop_id].append(websocket)

    def disconnect(self, shop_id: int, websocket: WebSocket):
        if shop_id in self.active_connections:
            if websocket in self.active_connections[shop_id]:
                self.active_connections[shop_id].remove(websocket)
            if not self.active_connections[shop_id]:
                del self.active_connections[shop_id]


    async def notify_shop(self, shop_id: int, message: dict):
        if shop_id in self.active_connections:
            for connection in self.active_connections[shop_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    # Connection might be dead, handled on disconnect
                    pass

manager = ConnectionManager()
