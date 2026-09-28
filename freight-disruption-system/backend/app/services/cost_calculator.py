# backend/app/services/cost_calculator.py
"""
Cost Calculator Service
Granular cost breakdown using real-world freight rate indices
"""
from typing import Dict
import random


class CostCalculator:
    """Calculate detailed cost breakdowns for multimodal routes"""
    
    # Real-world freight rate indices (weekly averages)
    DREWRY_WCI_INDEX = 1850.0  # USD per 40ft container (Shanghai-Rotterdam benchmark)
    BUNKER_VLSFO_PRICE = 640.0  # USD per ton (Very Low Sulfur Fuel Oil)
    CHARTER_DAILY_RATE = 24000.0  # USD per day for 8000 TEU vessel
    
    # Port-specific charges (USD)
    PORT_CHARGES = {
        "NLRTM": 12500.0,  # Rotterdam
        "SGSIN": 8900.0,   # Singapore
        "CNSHA": 9800.0,   # Shanghai
        "USLAX": 15000.0,  # Los Angeles
        "DEHAM": 11200.0,  # Hamburg
        "AEJEA": 10500.0,  # Jebel Ali
        "EGPSD": 18500.0,  # Suez/Port Said
    }
    
    # Insurance rates (% of cargo value)
    INSURANCE_BASE_RATE = 0.0025  # 0.25%
    INSURANCE_WAR_RISK_RATE = 0.015  # 1.5% in high-risk zones
    
    # Inventory holding cost (% per day)
    INVENTORY_DAILY_RATE = 0.0003  # 0.03% of cargo value per day
    
    def __init__(self):
        self.exchange_rate_usd_inr = 83.25  # Updated dynamically in production
    
    def calculate_ocean_freight(
        self,
        distance_nm: float,
        time_days: float,
        vessel_type: str = "Container"
    ) -> Dict[str, float]:
        """Calculate ocean freight component breakdown"""
        
        # Bunker fuel consumption (tons)
        fuel_consumption_rate = 0.038  # tons per nm for average container ship
        bunker_tons = distance_nm * fuel_consumption_rate
        bunker_cost = bunker_tons * self.BUNKER_VLSFO_PRICE * random.uniform(0.95, 1.05)
        
        # Charter cost
        charter_cost = time_days * self.CHARTER_DAILY_RATE * random.uniform(0.92, 1.08)
        
        # Ocean freight (container slot cost)
        ocean_freight = (distance_nm / 8500.0) * self.DREWRY_WCI_INDEX * random.uniform(0.90, 1.10)
        
        return {
            "ocean_freight": round(ocean_freight, 2),
            "bunker_fuel": round(bunker_cost, 2),
            "charter_daily_rate": round(charter_cost, 2),
        }
    
    def calculate_port_charges(
        self,
        port_code: str,
        vessel_dwt: float = 50000.0
    ) -> float:
        """Calculate port call charges"""
        
        base_charge = self.PORT_CHARGES.get(port_code, 10000.0)
        
        # Scale by vessel size
        size_multiplier = (vessel_dwt / 50000.0) ** 0.5
        
        return round(base_charge * size_multiplier * random.uniform(0.95, 1.05), 2)
    
    def calculate_canal_fees(
        self,
        canal_type: str,
        vessel_dwt: float = 50000.0
    ) -> float:
        """Calculate canal transit fees (Suez, Panama)"""
        
        if "suez" in canal_type.lower():
            # Suez Canal: ~$450,000 for large container ship
            base_fee = 450000.0
        elif "panama" in canal_type.lower():
            # Panama Canal: ~$600,000 for Neopanamax
            base_fee = 600000.0
        else:
            return 0.0
        
        size_multiplier = (vessel_dwt / 70000.0) ** 0.8
        return round(base_fee * size_multiplier * random.uniform(0.96, 1.04), 2)
    
    def calculate_rail_freight(
        self,
        distance_km: float,
        cargo_type: str = "Container"
    ) -> float:
        """Calculate rail freight cost"""
        
        # USD per km (European rail freight rates)
        if "electrified" in cargo_type.lower() or distance_km > 2000:
            rate_per_km = random.uniform(9.0, 11.5)
        else:
            rate_per_km = random.uniform(11.5, 13.5)
        
        base_cost = distance_km * rate_per_km
        handling_fee = 4500.0  # Rail terminal handling
        
        return round(base_cost + handling_fee, 2)
    
    def calculate_air_freight(
        self,
        distance_nm: float,
        cargo_multiplier: float = 1.0
    ) -> float:
        """Calculate air freight cost"""
        
        # USD per nm (air cargo rates are much higher)
        rate_per_nm = random.uniform(28.0, 38.0) * cargo_multiplier
        
        base_cost = distance_nm * rate_per_nm
        handling_fee = 7500.0  # Airport cargo handling
        fuel_surcharge = base_cost * random.uniform(0.15, 0.25)  # 15-25% fuel surcharge
        
        return round(base_cost + handling_fee + fuel_surcharge, 2)
    
    def calculate_insurance(
        self,
        cargo_value_usd: float,
        is_war_risk: bool = False,
        is_disrupted: bool = False
    ) -> Dict[str, float]:
        """Calculate insurance premiums"""
        
        base_insurance = cargo_value_usd * self.INSURANCE_BASE_RATE
        
        if is_war_risk or is_disrupted:
            war_risk_premium = cargo_value_usd * self.INSURANCE_WAR_RISK_RATE * random.uniform(0.90, 1.10)
            hull_insurance = war_risk_premium * 0.6  # Hull & machinery coverage
        else:
            war_risk_premium = 0.0
            hull_insurance = base_insurance * 0.3
        
        return {
            "insurance_base": round(base_insurance, 2),
            "insurance_war_risk": round(war_risk_premium, 2),
            "insurance_hull": round(hull_insurance, 2),
        }
    
    def calculate_inventory_holding_cost(
        self,
        cargo_value_usd: float,
        delay_days: float
    ) -> float:
        """Calculate inventory holding cost (tied-up capital)"""
        
        return round(cargo_value_usd * delay_days * self.INVENTORY_DAILY_RATE, 2)
    
    def calculate_demurrage(
        self,
        delay_days: float,
        is_disrupted: bool = False
    ) -> float:
        """Calculate demurrage and detention charges"""
        
        if delay_days < 2.0:
            return 0.0
        
        # USD per day demurrage
        daily_rate = 1200.0 if not is_disrupted else 2400.0
        
        billable_days = max(delay_days - 2.0, 0.0)  # 2 free days
        
        return round(billable_days * daily_rate * random.uniform(0.95, 1.05), 2)
    
    def calculate_full_breakdown(
        self,
        sea_distance_nm: float = 0.0,
        air_distance_nm: float = 0.0,
        rail_distance_km: float = 0.0,
        time_days: float = 0.0,
        cargo_value_usd: float = 0.0,
        is_disrupted: bool = False,
        is_war_risk: bool = False,
        origin_port_code: str = "CNSHA",
        dest_port_code: str = "NLRTM",
        includes_canal: bool = False
    ) -> Dict[str, float]:
        """
        Generate complete cost waterfall breakdown
        
        Returns dict with all cost components matching CostBreakdown model
        """
        
        breakdown = {
            "ocean_freight": 0.0,
            "bunker_fuel": 0.0,
            "charter_daily_rate": 0.0,
            "port_call_charges": 0.0,
            "canal_transit_fees": 0.0,
            "rail_freight": 0.0,
            "air_freight": 0.0,
            "road_freight": 0.0,
            "insurance_base": 0.0,
            "insurance_war_risk": 0.0,
            "insurance_hull": 0.0,
            "inventory_holding_cost": 0.0,
            "demurrage_detention": 0.0,
            "customs_duties": 0.0,
            "handling_charges": 0.0,
            "documentation_fees": 0.0,
            "contingency_buffer": 0.0,
        }
        
        # Ocean costs
        if sea_distance_nm > 0:
            ocean_costs = self.calculate_ocean_freight(sea_distance_nm, time_days)
            breakdown.update(ocean_costs)
            
            # Port charges
            breakdown["port_call_charges"] = (
                self.calculate_port_charges(origin_port_code) +
                self.calculate_port_charges(dest_port_code)
            )
            
            # Canal fees
            if includes_canal:
                breakdown["canal_transit_fees"] = self.calculate_canal_fees("suez")
        
        # Rail costs
        if rail_distance_km > 0:
            breakdown["rail_freight"] = self.calculate_rail_freight(rail_distance_km)
        
        # Air costs
        if air_distance_nm > 0:
            cargo_mult = 1.45 if cargo_value_usd > 30000000 else 1.15
            breakdown["air_freight"] = self.calculate_air_freight(air_distance_nm, cargo_mult)
        
        # Insurance
        insurance = self.calculate_insurance(cargo_value_usd, is_war_risk, is_disrupted)
        breakdown.update(insurance)
        
        # Inventory holding cost
        breakdown["inventory_holding_cost"] = self.calculate_inventory_holding_cost(
            cargo_value_usd, time_days
        )
        
        # Demurrage
        breakdown["demurrage_detention"] = self.calculate_demurrage(time_days, is_disrupted)
        
        # Customs & documentation
        breakdown["customs_duties"] = cargo_value_usd * random.uniform(0.02, 0.05)  # 2-5%
        breakdown["documentation_fees"] = random.uniform(800.0, 1500.0)
        
        # Handling charges
        breakdown["handling_charges"] = random.uniform(3500.0, 6500.0)
        
        # Contingency buffer (5% of subtotal)
        subtotal = sum(breakdown.values())
        breakdown["contingency_buffer"] = subtotal * 0.05
        
        # Calculate totals
        subtotal = sum(breakdown.values())
        taxes_surcharges = subtotal * random.uniform(0.03, 0.07)  # 3-7% taxes
        total_usd = subtotal + taxes_surcharges
        total_inr = total_usd * self.exchange_rate_usd_inr
        
        breakdown["subtotal"] = round(subtotal, 2)
        breakdown["taxes_surcharges"] = round(taxes_surcharges, 2)
        breakdown["total_cost_usd"] = round(total_usd, 2)
        breakdown["exchange_rate_usd_inr"] = self.exchange_rate_usd_inr
        breakdown["total_cost_inr"] = round(total_inr, 2)
        
        return breakdown