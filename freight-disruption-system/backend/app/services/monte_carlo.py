# backend/app/services/monte_carlo.py
"""
Monte Carlo Simulation Engine for Reroute Analysis
Runs 500/5000 stochastic iterations sampling from context-aware distributions
"""
import random
import math
from typing import Tuple, List, Dict
from dataclasses import dataclass

@dataclass
class MonteCarloConfig:
    """Configuration for Monte Carlo simulation"""
    num_iterations: int = 2000
    bunker_price_mean: float = 640.0
    bunker_price_std: float = 45.0
    weather_factor_mu: float = 0.0
    weather_factor_sigma: float = 0.10
    base_speed_knots: float = 19.5
    charter_daily_mean: float = 24000.0
    charter_daily_std: float = 1800.0
    fuel_consumption_rate: float = 0.038  # tons per nm
    
    # Disruption parameters
    disruption_delay_mu: float = 2.4  # LogNormal μ for 11-16 days
    disruption_delay_sigma: float = 0.35
    war_risk_insurance_mean: float = 42000.0
    war_risk_insurance_std: float = 5000.0


@dataclass
class MonteCarloResult:
    """Single Monte Carlo iteration result"""
    cost_usd: float
    time_days: float
    confidence_score: float
    risk_level: str  # low, medium, high, critical
    co2_tons: float = 0.0


class MonteCarloEngine:
    """Monte Carlo simulation engine for route analysis"""
    
    def __init__(self, config: MonteCarloConfig = None):
        self.config = config or MonteCarloConfig()
    
    def run_ocean_leg(
        self,
        distance_nm: float,
        cargo_multiplier: float = 1.0,
        is_disrupted: bool = False
    ) -> MonteCarloResult:
        """Simulate pure ocean routing leg"""
        
        # Stochastic parameters
        bunker_price = random.gauss(
            self.config.bunker_price_mean,
            self.config.bunker_price_std
        )
        weather_factor = random.lognormvariate(
            self.config.weather_factor_mu,
            self.config.weather_factor_sigma
        )
        effective_speed = self.config.base_speed_knots / max(weather_factor, 0.70)
        charter_rate = random.gauss(
            self.config.charter_daily_mean,
            self.config.charter_daily_std
        )
        
        # Calculate base costs
        fuel_cost = distance_nm * self.config.fuel_consumption_rate * bunker_price
        time_days = (distance_nm / (effective_speed * 24.0)) * random.uniform(0.97, 1.04)
        charter_cost = time_days * charter_rate
        port_charges = min(24000.0, max(6000.0, distance_nm * 0.75))
        
        # CO2 emissions (kg per nm for container ship)
        co2_tons = distance_nm * 0.011
        
        total_cost = fuel_cost + charter_cost + port_charges
        
        # Risk assessment
        if is_disrupted:
            risk_level = "critical" if time_days > 20.0 else "high"
            confidence = round(random.uniform(62.0, 78.0), 1)
        else:
            risk_level = "low"
            confidence = round(random.uniform(90.0, 97.0), 1)
        
        return MonteCarloResult(
            cost_usd=total_cost,
            time_days=time_days,
            confidence_score=confidence,
            risk_level=risk_level,
            co2_tons=co2_tons
        )
    
    def run_sea_air_leg(
        self,
        sea_distance_nm: float,
        air_distance_nm: float,
        cargo_multiplier: float = 1.0
    ) -> MonteCarloResult:
        """Simulate sea-to-air multimodal leg"""
        
        # Sea leg
        bunker_price = random.gauss(self.config.bunker_price_mean, self.config.bunker_price_std)
        weather_factor = random.lognormvariate(self.config.weather_factor_mu, self.config.weather_factor_sigma)
        sea_speed = self.config.base_speed_knots / max(weather_factor, 0.70)
        charter_rate = random.gauss(self.config.charter_daily_mean, self.config.charter_daily_std)
        
        sea_time = (sea_distance_nm / (sea_speed * 24.0)) * random.uniform(0.96, 1.04) if sea_distance_nm > 0 else 0.0
        sea_fuel_cost = sea_distance_nm * self.config.fuel_consumption_rate * bunker_price
        sea_charter = sea_time * (charter_rate * 0.75)  # Reduced rate for feeder
        
        # Air leg
        flight_speed_knots = 460.0
        air_time = (air_distance_nm / (flight_speed_knots * 24.0)) + random.uniform(0.5, 0.9)  # Add handling time
        air_freight_rate = random.uniform(28.0, 38.0)  # USD per nm
        air_cost = (air_distance_nm * air_freight_rate * cargo_multiplier) + 7500.0  # Base handling fee
        
        # Handover delay (port to airport transfer)
        handover_delay = 0.5  # 12 hours
        
        total_time = sea_time + air_time + handover_delay
        total_cost = sea_fuel_cost + sea_charter + air_cost + 8500.0  # Intermodal coordination fee
        
        # CO2: sea is lower, air is much higher
        co2_tons = (sea_distance_nm * 0.011) + (air_distance_nm * 0.16) + 12.0
        
        return MonteCarloResult(
            cost_usd=total_cost,
            time_days=total_time,
            confidence_score=round(random.uniform(93.0, 98.5), 1),
            risk_level="low",
            co2_tons=co2_tons
        )
    
    def run_sea_rail_leg(
        self,
        sea_distance_nm: float,
        rail_distance_km: float,
        cargo_multiplier: float = 1.0
    ) -> MonteCarloResult:
        """Simulate sea-to-rail multimodal leg"""
        
        # Sea leg
        bunker_price = random.gauss(self.config.bunker_price_mean, self.config.bunker_price_std)
        weather_factor = random.lognormvariate(self.config.weather_factor_mu, self.config.weather_factor_sigma)
        sea_speed = self.config.base_speed_knots / max(weather_factor, 0.70)
        charter_rate = random.gauss(self.config.charter_daily_mean, self.config.charter_daily_std)
        
        sea_time = (sea_distance_nm / (sea_speed * 24.0)) * random.uniform(0.96, 1.04) if sea_distance_nm > 0 else 0.0
        sea_fuel_cost = sea_distance_nm * self.config.fuel_consumption_rate * bunker_price
        sea_charter = sea_time * charter_rate
        
        # Rail leg
        rail_speed_kmh = 55.0  # Average freight rail speed
        rail_time = (rail_distance_km / (rail_speed_kmh * 24.0)) + random.uniform(0.5, 1.0)  # Add marshalling time
        rail_freight_rate = random.uniform(9.0, 13.5)  # USD per km
        rail_cost = (rail_distance_km * rail_freight_rate) + 4500.0  # Base rail handling
        
        # Handover delay (port to rail terminal)
        handover_delay = 0.4  # ~10 hours
        
        total_time = sea_time + rail_time + handover_delay
        total_cost = sea_fuel_cost + sea_charter + rail_cost + 6500.0  # Intermodal coordination
        
        # CO2: both relatively low
        co2_tons = (sea_distance_nm * 0.011) + (rail_distance_km * 0.0035) + 6.0
        
        # Medium risk due to rail infrastructure dependencies
        risk_level = "medium" if random.random() < 0.16 else "low"
        
        return MonteCarloResult(
            cost_usd=total_cost,
            time_days=total_time,
            confidence_score=round(random.uniform(88.0, 95.0), 1),
            risk_level=risk_level,
            co2_tons=co2_tons
        )
    
    def run_disrupted_shortest_path(
        self,
        distance_nm: float,
        cargo_multiplier: float = 1.0,
        is_disrupted: bool = True
    ) -> MonteCarloResult:
        """Simulate traditional shortest path through disrupted zone"""
        
        bunker_price = random.gauss(self.config.bunker_price_mean, self.config.bunker_price_std)
        weather_factor = random.lognormvariate(self.config.weather_factor_mu, self.config.weather_factor_sigma)
        speed = self.config.base_speed_knots / max(weather_factor, 0.70)
        charter_rate = random.gauss(self.config.charter_daily_mean, self.config.charter_daily_std)
        
        base_time = distance_nm / (speed * 24.0)
        
        if is_disrupted:
            # Add massive disruption delay (LogNormal distribution)
            disruption_delay = random.lognormvariate(
                self.config.disruption_delay_mu,
                self.config.disruption_delay_sigma
            )  # Results in ~11-16 days extra
            
            # War risk insurance surcharge
            war_risk_premium = random.gauss(
                self.config.war_risk_insurance_mean * cargo_multiplier,
                self.config.war_risk_insurance_std
            )
            
            # Charter idle burn during waiting
            idle_burn = disruption_delay * charter_rate
            
        else:
            disruption_delay = random.uniform(0.5, 1.5)  # Normal port congestion
            war_risk_premium = 0.0
            idle_burn = disruption_delay * charter_rate * 0.4
        
        total_time = base_time + disruption_delay
        fuel_cost = distance_nm * self.config.fuel_consumption_rate * bunker_price
        total_cost = (
            fuel_cost +
            (base_time * charter_rate) +
            idle_burn +
            war_risk_premium +
            14000.0  # Base port charges
        )
        
        # High CO2 due to idling
        co2_tons = distance_nm * 0.012 + (12.0 if is_disrupted else 0.0)
        
        if is_disrupted and total_time > 20.0:
            risk_level = "critical"
        elif is_disrupted:
            risk_level = "high"
        else:
            risk_level = "low"
        
        confidence = round(
            random.uniform(62.0, 78.0) if is_disrupted else random.uniform(86.0, 93.0),
            1
        )
        
        return MonteCarloResult(
            cost_usd=total_cost,
            time_days=total_time,
            confidence_score=confidence,
            risk_level=risk_level,
            co2_tons=co2_tons
        )
    
    def run_batch_simulation(
        self,
        corridor_type: str,
        sea_distance_nm: float,
        air_distance_nm: float = 0.0,
        rail_distance_km: float = 0.0,
        cargo_multiplier: float = 1.0,
        is_disrupted: bool = False,
        num_iterations: int = None
    ) -> List[MonteCarloResult]:
        """Run batch Monte Carlo simulation for a given corridor type"""
        
        iterations = num_iterations or self.config.num_iterations
        results = []
        
        for _ in range(iterations):
            if corridor_type == "ocean":
                result = self.run_ocean_leg(sea_distance_nm, cargo_multiplier, is_disrupted)
            elif corridor_type == "sea_air":
                result = self.run_sea_air_leg(sea_distance_nm, air_distance_nm, cargo_multiplier)
            elif corridor_type == "sea_rail":
                result = self.run_sea_rail_leg(sea_distance_nm, rail_distance_km, cargo_multiplier)
            elif corridor_type == "shortest_disrupted":
                result = self.run_disrupted_shortest_path(sea_distance_nm, cargo_multiplier, is_disrupted)
            else:
                raise ValueError(f"Unknown corridor type: {corridor_type}")
            
            results.append(result)
        
        return results
    
    @staticmethod
    def aggregate_results(results: List[MonteCarloResult]) -> Dict[str, float]:
        """Aggregate Monte Carlo results into summary statistics"""
        
        if not results:
            return {
                "mean_cost": 0.0,
                "mean_time": 0.0,
                "mean_confidence": 0.0,
                "mean_co2": 0.0,
                "std_cost": 0.0,
                "std_time": 0.0,
                "p50_cost": 0.0,
                "p95_cost": 0.0,
                "p50_time": 0.0,
                "p95_time": 0.0,
            }
        
        costs = [r.cost_usd for r in results]
        times = [r.time_days for r in results]
        confidences = [r.confidence_score for r in results]
        co2s = [r.co2_tons for r in results]
        
        costs_sorted = sorted(costs)
        times_sorted = sorted(times)
        
        n = len(results)
        
        return {
            "mean_cost": sum(costs) / n,
            "mean_time": sum(times) / n,
            "mean_confidence": sum(confidences) / n,
            "mean_co2": sum(co2s) / n,
            "std_cost": (sum((c - sum(costs)/n)**2 for c in costs) / n) ** 0.5,
            "std_time": (sum((t - sum(times)/n)**2 for t in times) / n) ** 0.5,
            "p50_cost": costs_sorted[n // 2],
            "p95_cost": costs_sorted[int(n * 0.95)],
            "p50_time": times_sorted[n // 2],
            "p95_time": times_sorted[int(n * 0.95)],
        }