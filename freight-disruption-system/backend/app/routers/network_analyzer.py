"""
backend/app/routers/network_analyzer.py

Network Impact Analyzer — Port Manager Facing Router.

Translates graph-theory network analysis (NetworkX centrality,
vulnerability/articulation points, shortest alternative paths) plus the
GCN/BFS ripple-effect predictor into plain operational language a Port
Manager can act on, without requiring any computer-science background.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.ports import Port
from app.services import graph_engine
from app.services import network_impact_service
from app.services.gnn_ripple_predictor import gnn_ripple_predictor
from app.ml.gnn_model import gnn_predictor
from app.schemas.network_analyzer import (
    NetworkOverviewResponse,
    DirectTradePartner,
    AlternativeRouteItem,
    ShutdownSimulationResponse,
    ShutdownAffectedPort,
    TechnicalDetailsResponse,
    RippleDashboardResponse,
    GraphTopologyResponse,
)

router = APIRouter(prefix="/api/network-analyzer", tags=["Network Impact Analyzer"])


def _get_port_or_404(db: Session, port_id: str) -> Port:
    port = db.query(Port).filter(Port.id == port_id).first()
    if not port:
        raise HTTPException(status_code=404, detail=f"Port '{port_id}' not found")
    return port


@router.get("/{port_id}/ripple-dashboard", response_model=RippleDashboardResponse)
def get_ripple_dashboard(port_id: str, db: Session = Depends(get_db)):
    """
    Primary Port Manager endpoint: one call returns the health banner,
    incoming threats, outgoing impacts, the auto-generated preparation
    plan, and real-world historical precedents — everything the
    redesigned Network Impact Analyzer page needs.
    """
    port = _get_port_or_404(db, port_id)
    try:
        return network_impact_service.build_ripple_dashboard(db, port)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not build network ripple dashboard: {e}")

@router.get("/{port_id}/graph-topology", response_model=GraphTopologyResponse)
def get_graph_topology(port_id: str, db: Session = Depends(get_db)):
    """
    Map-ready trade network snapshot for the Network Watch page's visual
    map: this port plus its direct trade partners, color-coded by whether
    they're currently threatening this port, being affected by it, or
    just normally connected — reuses the ripple dashboard's calculations.
    """
    port = _get_port_or_404(db, port_id)
    try:
        return network_impact_service.build_graph_topology(db, port)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not build the network map: {e}")
    
@router.get("/{port_id}/overview", response_model=NetworkOverviewResponse)
def get_network_overview(port_id: str, db: Session = Depends(get_db)):
    """
    Plain-language summary of where this port sits in the global trade
    network (chokepoint role, direct trade partners, failure risk).
    Retained for API completeness / technical documentation — the main
    Port Manager page now leads with the ripple dashboard instead.
    """
    port = _get_port_or_404(db, port_id)
    graph_engine.ensure_port_has_edges(db, port.id)
    G = graph_engine.build_port_graph(db)

    if port.id not in G.nodes or G.number_of_nodes() < 2:
        raise HTTPException(status_code=422, detail="Not enough network data available for this port yet.")

    centralities = graph_engine.compute_all_centralities(G)
    vulnerability = graph_engine.compute_port_vulnerability(G, port.id, centralities)
    plain_language = graph_engine.translate_to_port_manager_language(port.id, G, centralities, vulnerability)

    all_betweenness = centralities["betweenness"]
    sorted_ports = sorted(all_betweenness.items(), key=lambda kv: kv[1], reverse=True)
    rank = next((i + 1 for i, (pid, _) in enumerate(sorted_ports) if pid == port.id), len(sorted_ports))

    direct_partners = []
    for neighbor_id in G.neighbors(port.id):
        node = G.nodes[neighbor_id]
        edge = G[port.id][neighbor_id]
        direct_partners.append(DirectTradePartner(
            port_id=neighbor_id,
            port_name=node.get("name", neighbor_id),
            port_code=node.get("code", neighbor_id),
            avg_transit_days=edge.get("transit_days", edge.get("weight", 0.0)),
        ))
    direct_partners.sort(key=lambda p: p.avg_transit_days)

    return NetworkOverviewResponse(
        port_id=port.id,
        port_name=port.name,
        port_code=port.code,
        **plain_language,
        global_rank_by_importance=rank,
        total_ports_in_network=len(sorted_ports),
        direct_trade_partners=direct_partners,
    )


@router.get("/{port_id}/alternative-routes", response_model=List[AlternativeRouteItem])
def get_alternative_routes(port_id: str, db: Session = Depends(get_db)):
    """
    If this port had to close suddenly, which alternate port-to-port
    paths could its trading partners use instead, and how many extra
    days would that add? Reused on the page as "Backup Routes".
    """
    port = _get_port_or_404(db, port_id)
    graph_engine.ensure_port_has_edges(db, port.id)
    G = graph_engine.build_port_graph(db)

    alternatives = graph_engine.find_alternative_routes(G, port.id, top_k=5)
    results = []
    for alt in alternatives:
        if alt.get("no_alternative_exists"):
            results.append(AlternativeRouteItem(
                from_port_name=alt["from_port_name"],
                to_port_name=alt["to_port_name"],
                has_alternative=False,
                alternate_path_names=[],
                extra_transit_days=None,
                plain_language_summary=(
                    f"There is currently NO alternative sea route between {alt['from_port_name']} and "
                    f"{alt['to_port_name']} in our network model if your port becomes unavailable. "
                    f"This is a critical dependency."
                ),
            ))
        else:
            if alt.get("diversion_port_name"):
                summary = (
                    f"Inbound cargo from {alt['from_port_name']} can divert to {alt['diversion_port_name']} "
                    f"(via {' → '.join(alt['alternate_path'])}), adding approximately {alt['extra_transit_days']} "
                    f"extra day(s) for berth reallocation and hinterland connection."
                )
            else:
                summary = (
                    f"Cargo between {alt['from_port_name']} and {alt['to_port_name']} could reroute via "
                    f"{' → '.join(alt['alternate_path'])}, adding approximately {alt['extra_transit_days']} "
                    f"extra day(s) of transit if your port is unavailable."
                )
            results.append(AlternativeRouteItem(
                from_port_name=alt["from_port_name"],
                to_port_name=alt["to_port_name"],
                has_alternative=True,
                alternate_path_names=alt["alternate_path"],
                extra_transit_days=alt["extra_transit_days"],
                plain_language_summary=summary,
            ))
    return results


@router.get("/{port_id}/simulate-shutdown", response_model=ShutdownSimulationResponse)
def simulate_port_shutdown(
    port_id: str,
    severity: str = Query("critical", description="How severe/total the shutdown is"),
    db: Session = Depends(get_db),
):
    """
    Optional 'stress test': what happens to the rest of the network if
    MY port shuts down COMPLETELY, regardless of current congestion?
    Kept as a secondary/advanced action on the page, separate from the
    live incoming/outgoing ripple which uses real current congestion.
    """
    port = _get_port_or_404(db, port_id)
    result = gnn_ripple_predictor.predict_multi_horizon_ripple(
        epicenter_port_id_or_code=port.id,
        disruption_severity=severity,
        shock_magnitude_pct=65.0,
        db=db,
    )

    affected = [
        ShutdownAffectedPort(
            port_name=item["port_name"],
            port_code=item["port_code"],
            congestion_increase_pct=item["congestion_increase_pct"],
            risk_level=item["risk_level"],
            days_3=item["delay_days"]["d3"],
            days_7=item["delay_days"]["d7"],
            days_14=item["delay_days"]["d14"],
        )
        for item in result.get("propagation_cascade", [])
    ]

    severity_word = {
        "low": "a brief 1-2 day disruption", "medium": "a moderate 3-5 day stoppage",
        "high": "a serious 7-10 day stoppage", "critical": "a complete emergency closure",
    }.get(severity.lower(), "an emergency closure")

    summary = (
        f"If {port.name} experiences {severity_word}, our graph model predicts {len(affected)} other port(s) "
        f"in the global network would see cascading congestion increases within 14 days."
        if affected else
        f"If {port.name} experiences {severity_word}, our model indicates network shock "
        f"remains primarily contained to local coastal trade."
    )

    return ShutdownSimulationResponse(
        port_id=port.id,
        port_name=port.name,
        severity_simulated=severity,
        prediction_engine=result["model_architecture"],
        plain_language_summary=summary,
        affected_ports=affected,
    )


@router.get("/{port_id}/technical-details", response_model=TechnicalDetailsResponse)
def get_technical_details(port_id: str, db: Session = Depends(get_db)):
    """
    Raw network-science numbers + GNN model metadata, for the optional
    'Show Technical Details' toggle — hidden by default from the
    plain-language UI, useful for research documentation / evaluation.
    """
    port = _get_port_or_404(db, port_id)
    graph_engine.ensure_port_has_edges(db, port.id)
    G = graph_engine.build_port_graph(db)
    centralities = graph_engine.compute_all_centralities(G)
    vulnerability = graph_engine.compute_port_vulnerability(G, port.id, centralities)
    articulation_points = graph_engine.find_articulation_points(G)

    return TechnicalDetailsResponse(
        port_id=port.id,
        degree_centrality=round(centralities["degree"].get(port.id, 0.0), 4),
        betweenness_centrality=round(centralities["betweenness"].get(port.id, 0.0), 4),
        closeness_centrality=round(centralities["closeness"].get(port.id, 0.0), 4),
        eigenvector_centrality=round(centralities["eigenvector"].get(port.id, 0.0), 4),
        is_articulation_point=port.id in articulation_points,
        vulnerability_score=vulnerability["vulnerability_score"],
        total_network_nodes=G.number_of_nodes(),
        total_network_edges=G.number_of_edges(),
        gnn_model_info=gnn_predictor.get_model_info(),
    )