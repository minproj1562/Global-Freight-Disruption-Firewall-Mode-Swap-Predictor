# backend/app/scripts/audit_training_data.py
"""
One-time audit of the real datasets before building any training pipeline.
Run from the backend/ directory:
    python -m app.scripts.audit_training_data
Does NOT modify or train anything — read-only diagnostics.
"""
import pandas as pd
from pathlib import Path

RAW_DIR = Path("data/raw")
PORTWATCH_DIR = RAW_DIR / "portwatch"

pd.set_option("display.max_columns", 20)
pd.set_option("display.width", 160)


def section(title: str):
    print("\n" + "=" * 80)
    print(title)
    print("=" * 80)


def audit_shipment_data():
    section("1. global_supply_chain_risk_2026.csv")
    path = RAW_DIR / "global_supply_chain_risk_2026.csv"
    if not path.exists():
        print(f"[MISSING] {path} not found")
        return None

    df = pd.read_csv(path)
    print(f"Shape: {df.shape}")
    print(f"\nDtypes:\n{df.dtypes}")
    print(f"\nMissing values (%):\n{(df.isnull().mean() * 100).round(2)}")

    if "Disruption_Occurred" in df.columns:
        print(f"\nTarget balance:\n{df['Disruption_Occurred'].value_counts(normalize=True).round(3)}")

    if "Date" in df.columns:
        dates = pd.to_datetime(df["Date"], errors="coerce")
        print(f"\nDate range: {dates.min()} -> {dates.max()}")
        print(f"Unparseable dates: {dates.isnull().sum()}")

    for col in ["Origin_Port", "Destination_Port", "Transport_Mode", "Product_Category", "Weather_Condition"]:
        if col in df.columns:
            print(f"\n{col} unique values ({df[col].nunique()}): {sorted(df[col].dropna().unique().tolist())[:30]}")

    return df


def audit_ports():
    section("2. portwatch/ports.csv")
    path = PORTWATCH_DIR / "ports.csv"
    if not path.exists():
        print(f"[MISSING] {path} not found")
        return None

    df = pd.read_csv(path)
    print(f"Shape: {df.shape}")
    print(f"Unique countries: {df['country'].nunique()}")
    print(f"Sample portnames: {df['portname'].head(10).tolist()}")
    return df


def audit_disruptions():
    section("3. portwatch/disruptions.csv")
    path = PORTWATCH_DIR / "disruptions.csv"
    if not path.exists():
        print(f"[MISSING] {path} not found")
        return None

    df = pd.read_csv(path)
    print(f"Shape: {df.shape}")
    df["fromdate"] = pd.to_datetime(df["fromdate"], errors="coerce", utc=True)
    df["todate"] = pd.to_datetime(df["todate"], errors="coerce", utc=True)
    print(f"Date range: {df['fromdate'].min()} -> {df['fromdate'].max()}")
    print(f"\nEvent types:\n{df['eventtype'].value_counts()}")
    print(f"\nAlert levels:\n{df['alertlevel'].value_counts()}")
    print(f"Unique countries affected: {df['country'].nunique()}")
    return df


def audit_gpr():
    section("4. data_gpr_export (GPR index)")
    xlsx_path = RAW_DIR / "data_gpr_export.xlsx"
    csv_path = RAW_DIR / "data_gpr_export.csv"

    if xlsx_path.exists():
        print(f"Found Excel file: {xlsx_path}")
        xl = pd.ExcelFile(xlsx_path)
        print(f"Sheet names: {xl.sheet_names}")
        for sheet in xl.sheet_names:
            df = xl.parse(sheet)
            print(f"\n--- Sheet '{sheet}' shape: {df.shape} ---")
            print(f"Columns (first 10): {df.columns.tolist()[:10]}")
        return

    if csv_path.exists():
        print(f"Found CSV file: {csv_path}")
        df = pd.read_csv(csv_path)
        print(f"Shape: {df.shape}")

        # Try to parse the month column as a real date
        parsed = pd.to_datetime(df["month"], errors="coerce")
        print(f"\nValid parsed months: {parsed.notnull().sum()} / {len(df)}")
        print(f"Valid date range: {parsed.min()} -> {parsed.max()}")

        # Flag rows that look like metadata leakage (the var_name/var_label issue)
        if "var_name" in df.columns:
            bad_rows = df["var_name"].notnull().sum()
            print(f"\n[FLAG] Rows with var_name populated (likely metadata rows, not real data): {bad_rows}")

        # Check which country GPR columns exist (GPRC_<ISO3>)
        country_cols = [c for c in df.columns if c.startswith("GPRC_")]
        print(f"\nCountry-level GPR columns found: {len(country_cols)}")
        print([c.replace("GPRC_", "") for c in country_cols])
        return

    print("[MISSING] Neither data_gpr_export.xlsx nor .csv found in data/raw/")


def cross_check_port_name_overlap(shipment_df, ports_df):
    if shipment_df is None or ports_df is None:
        return
    section("5. Cross-check: shipment Origin/Destination ports vs ports.csv portname")
    ship_ports = set(shipment_df["Origin_Port"].dropna().unique()) | set(shipment_df["Destination_Port"].dropna().unique())
    master_ports = set(ports_df["portname"].str.lower().str.strip())
    ship_ports_lower = {p.lower().strip() for p in ship_ports}

    matched = ship_ports_lower & master_ports
    unmatched = ship_ports_lower - master_ports
    print(f"Shipment file port names: {len(ship_ports)}")
    print(f"Matched directly to ports.csv: {len(matched)}")
    print(f"Unmatched (will need manual mapping or will be dropped): {sorted(unmatched)}")


def cross_check_country_overlap(gpr_country_codes, ports_df):
    if ports_df is None:
        return
    section("6. Cross-check: GPR country codes vs ports.csv ISO3")
    if "ISO3" not in ports_df.columns:
        print("ports.csv has no ISO3 column, skipping")
        return
    port_iso3 = set(ports_df["ISO3"].dropna().unique())
    overlap = set(gpr_country_codes) & port_iso3
    print(f"ISO3 codes in ports.csv: {len(port_iso3)}")
    print(f"GPR country codes: {len(gpr_country_codes)}")
    print(f"Overlap: {len(overlap)} -> {sorted(overlap)}")


if __name__ == "__main__":
    shipment_df = audit_shipment_data()
    ports_df = audit_ports()
    audit_disruptions()
    audit_gpr()
    cross_check_port_name_overlap(shipment_df, ports_df)

    gpr_csv = RAW_DIR / "data_gpr_export.csv"
    if gpr_csv.exists():
        df = pd.read_csv(gpr_csv)
        codes = [c.replace("GPRC_", "") for c in df.columns if c.startswith("GPRC_")]
        cross_check_country_overlap(codes, ports_df)

    print("\n" + "=" * 80)
    print("AUDIT COMPLETE — paste this full output back so the merge pipeline can be built correctly")
    print("=" * 80)