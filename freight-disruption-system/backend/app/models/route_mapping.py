#backend/app/models/route_mapping.py
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import uuid


class MonitoredRoute(Base):
    """
    A persisted, trackable active route owned by a Logistics Manager.

    Distinct from the synthetic demo data generated on-the-fly by
    GET /api/routes/active (Page 1.4 Active Fleet Monitor) — that endpoint
    fabricates random routes on every request with no stable IDs.
    MonitoredRoute is the durable record used to answer "which logistics
    manager's routes touch Port X?" for real-time congestion propagation.
    """
    __tablename__ = "monitored_routes"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    route_name = Column(String, nullable=False)

    logistics_manager_id = Column(String, ForeignKey("logistics_managers.id", ondelete="CASCADE"), nullable=False, index=True)
    vessel_id = Column(String, ForeignKey("vessels.id", ondelete="SET NULL"), nullable=True)

    origin_port_id = Column(String, ForeignKey("ports.id", ondelete="CASCADE"), nullable=False)
    destination_port_id = Column(String, ForeignKey("ports.id", ondelete="CASCADE"), nullable=False)

    status = Column(String, default="active")  # active, completed, cancelled

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    logistics_manager = relationship("LogisticsManager", backref="monitored_routes")
    vessel = relationship("Vessel", foreign_keys=[vessel_id])
    origin_port = relationship("Port", foreign_keys=[origin_port_id])
    destination_port = relationship("Port", foreign_keys=[destination_port_id])
    port_mappings = relationship(
        "RoutePortMapping",
        back_populates="route",
        cascade="all, delete-orphan",
        order_by="RoutePortMapping.sequence_order",
    )


class RoutePortMapping(Base):
    """
    Route <-> Port join table: every port a given MonitoredRoute physically
    touches (origin, transshipment stops, destination), in transit order.

    | Route ID | Ports Touched                           |
    |----------|------------------------------------------|
    | R-001    | Shanghai, Singapore, Mumbai, Mundra       |
    | R-002    | Rotterdam, Singapore, Colombo             |

    When a port's congestion changes, we query this table for "which active
    routes touch this port?", then resolve each route's logistics_manager_id
    to push a targeted WebSocket alert.
    """
    __tablename__ = "route_port_mappings"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    route_id = Column(String, ForeignKey("monitored_routes.id", ondelete="CASCADE"), nullable=False, index=True)
    port_id = Column(String, ForeignKey("ports.id", ondelete="CASCADE"), nullable=False, index=True)
    sequence_order = Column(Integer, default=0)  # 0 = origin ... N = destination

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    route = relationship("MonitoredRoute", back_populates="port_mappings")
    port = relationship("Port")