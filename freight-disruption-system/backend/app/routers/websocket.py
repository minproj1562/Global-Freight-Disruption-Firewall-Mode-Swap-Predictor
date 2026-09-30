from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.fleet_update_manager import fleet_update_manager

router = APIRouter()

@router.websocket("/ws/fleet")
async def fleet_websocket_endpoint(websocket: WebSocket):
    await fleet_update_manager.connect(websocket)
    try:
        while True:
            # We don't expect messages from the client, but we must keep the connection open
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        fleet_update_manager.disconnect(websocket)
    except Exception as e:
        print(f"[WebSocket] Error in fleet connection: {e}")
        fleet_update_manager.disconnect(websocket)
