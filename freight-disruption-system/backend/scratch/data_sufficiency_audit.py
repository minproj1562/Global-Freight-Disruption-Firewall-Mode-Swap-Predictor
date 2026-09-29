import sys
from pathlib import Path
backend_path = Path(".").resolve()
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.database import engine, text

def data_sufficiency_audit():
    with engine.connect() as conn:
        print("="*70)
        print("PHASE 1.4 DATA SUFFICIENCY AUDIT")
        print("="*70)
        
        # 1. vessel_positions
        vp_total = conn.execute(text("SELECT count(*) FROM vessel_positions;")).scalar()
        print(f"Total vessel_positions: {vp_total}")
        
        if vp_total > 0:
            vp_mmsi = conn.execute(text("SELECT count(DISTINCT mmsi) FROM vessel_positions;")).scalar()
            vp_min_ts = conn.execute(text("SELECT min(timestamp) FROM vessel_positions;")).scalar()
            vp_max_ts = conn.execute(text("SELECT max(timestamp) FROM vessel_positions;")).scalar()
            null_stats = conn.execute(text("""
                SELECT 
                    ROUND(100.0 * count(*) FILTER (WHERE latitude IS NULL) / count(*), 2) as null_lat_pct,
                    ROUND(100.0 * count(*) FILTER (WHERE longitude IS NULL) / count(*), 2) as null_lon_pct,
                    ROUND(100.0 * count(*) FILTER (WHERE speed IS NULL) / count(*), 2) as null_spd_pct,
                    ROUND(100.0 * count(*) FILTER (WHERE heading IS NULL) / count(*), 2) as null_hdg_pct,
                    ROUND(100.0 * count(*) FILTER (WHERE timestamp IS NULL) / count(*), 2) as null_ts_pct
                FROM vessel_positions;
            """)).mappings().first()
            
            print(f"Distinct MMSIs in vessel_positions: {vp_mmsi}")
            print(f"Earliest timestamp: {vp_min_ts}")
            print(f"Latest timestamp: {vp_max_ts}")
            print(f"Missing latitude %: {null_stats['null_lat_pct']}%")
            print(f"Missing longitude %: {null_stats['null_lon_pct']}%")
            print(f"Missing speed %: {null_stats['null_spd_pct']}%")
            print(f"Missing heading %: {null_stats['null_hdg_pct']}%")
            print(f"Missing timestamp %: {null_stats['null_ts_pct']}%")
            
            # Max records per vessel
            max_rec = conn.execute(text("SELECT mmsi, count(*) as cnt FROM vessel_positions GROUP BY mmsi ORDER BY cnt DESC LIMIT 5;")).fetchall()
            print(f"Top records per vessel: {max_rec}")
        else:
            print("vessel_positions has 0 records.")
            
        # 2. vessels table
        v_total = conn.execute(text("SELECT count(*) FROM vessels;")).scalar()
        print(f"\nTotal vessels in fleet registry: {v_total}")
        if v_total > 0:
            v_types = conn.execute(text("SELECT vessel_type, count(*) FROM vessels GROUP BY vessel_type ORDER BY count(*) DESC LIMIT 5;")).fetchall()
            print(f"Top vessel types: {v_types}")
            
        # 3. Sequential evaluation for LSTM / GNN
        print("\nSequential Observations Evaluation for LSTM ETA Sequence Modeling:")
        print("  Required for LSTM: >= 20 sequential position timestamps per voyage with known destination port and true ATA.")
        if vp_total < 50:
            print(f"  Available vessel_positions: {vp_total} records across {vp_mmsi if vp_total > 0 else 0} vessel(s).")
            print("  VERDICT: REAL SEQUENTIAL TRACK DATA INSUFFICIENT FOR SUPERVISED LSTM ETA TRAINING.")
            print("  CRITICAL RULE: DO NOT FABRICATE SYNTHETIC VOYAGES. STOP LSTM MODEL REGENERATION.")

if __name__ == "__main__":
    data_sufficiency_audit()
