# backend/app/routers/websocket.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import jwt, JWTError
from app.services.fleet_update_manager import fleet_update_manager
from app.services.congestion_alert_manager import congestion_alert_manager
from app.core.config import settings
from app.database import SessionLocal
from app.models.users import User

router = APIRouter()


@router.websocket("/ws/fleet")
async def fleet_websocket_endpoint(websocket: WebSocket):
    await fleet_update_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        fleet_update_manager.disconnect(websocket)
    except Exception as e:
        print(f"[WebSocket] Error in fleet connection: {e}")
        fleet_update_manager.disconnect(websocket)


def _resolve_user_from_token(token: str):
    """
    Decode a JWT the same way app.core.security.get_current_user does.
    Kept separate because browser WebSocket handshakes can't carry an
    Authorization header — the token is passed as a `?token=` query param
    instead and verified manually here.
    """
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    db = SessionLocal()
    try:
        return db.query(User).filter(User.id == user_id).first()
    finally:
        db.close()


@router.websocket("/ws/alerts")
async def congestion_alerts_websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    """
    Authenticated, per-user-scoped channel for port congestion propagation
    alerts (Task 2). Unlike /ws/fleet (public broadcast of AIS positions),
    this socket only ever receives messages targeted at the connecting
    user's own id, resolved server-side via the route-port mapping table.

    Connect with: wss://<host>/ws/alerts?token=<JWT access_token>
    """
    user = _resolve_user_from_token(token)
    if not user:
        await websocket.close(code=4401)  # custom close code: unauthorized
        return

    is_admin = (user.role or "").lower() == "admin"
    await congestion_alert_manager.connect(websocket, user_id=user.id, is_admin=is_admin)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        congestion_alert_manager.disconnect(websocket, user_id=user.id)
    except Exception as e:
        print(f"[WebSocket] Error in congestion alerts connection: {e}")
        congestion_alert_manager.disconnect(websocket, user_id=user.id)