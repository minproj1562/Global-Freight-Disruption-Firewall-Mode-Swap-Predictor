from pydantic import BaseModel, Field
from typing import Optional, List

class FuelPriceRange(BaseModel):
    min: int = Field(default=400, ge=100, le=2000)
    max: int = Field(default=800, ge=100, le=2000)
    step: int = Field(default=50, ge=10, le=200)

class CongestionRange(BaseModel):
    min: int = Field(default=30, ge=0, le=100)
    max: int = Field(default=90, ge=0, le=100)
    step: int = Field(default=10, ge=5, le=50)

class ParameterSweepRequest(BaseModel):
    scenario_name: str = Field(default="Parameter Sweep Experiment")
    scenario_type: str = Field(default="Parameter Sweep")  # Single, Batch, Parameter Sweep, Network-Wide
    origins: List[str] = Field(default=["Shanghai (CNSHA)"])
    destinations: List[str] = Field(default=["Rotterdam (NLRTM)"])
    vessels: List[str] = Field(default=["Ever Given (Container - 20,124 TEU)"])
    disruption_template: str = Field(default="Suez Canal Blockade (Severe Chokepoint Shut)")
    fuel_price_range: FuelPriceRange = Field(default_factory=FuelPriceRange)
    congestion_range: CongestionRange = Field(default_factory=CongestionRange)

class MonteCarloRequest(BaseModel):
    origin: str = Field(default="Shanghai (CNSHA)")
    destination: str = Field(default="Rotterdam (NLRTM)")
    vessel: str = Field(default="Ever Given (Container - 20,124 TEU)")
    disruption_template: str = Field(default="Suez Canal Blockade (Severe Chokepoint Shut)")
    iterations: int = Field(default=5000, ge=100, le=50000)

class NSGA2Request(BaseModel):
    origin: str = Field(default="Shanghai (CNSHA)")
    destination: str = Field(default="Rotterdam (NLRTM)")
    vessel: str = Field(default="Ever Given (Container - 20,124 TEU)")
    cost_weight: float = Field(default=1.0, ge=0, le=5)
    time_weight: float = Field(default=1.0, ge=0, le=5)
    carbon_weight: float = Field(default=1.0, ge=0, le=5)
