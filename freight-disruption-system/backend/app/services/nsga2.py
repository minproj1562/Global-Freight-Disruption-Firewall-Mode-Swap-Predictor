# backend/app/services/nsga2.py
"""
NSGA-II Multi-Objective Optimizer
Generates Pareto frontier for Cost vs Time vs Carbon trade-offs
"""
from typing import List, Tuple, Dict
from dataclasses import dataclass
import random


@dataclass
class Solution:
    """Individual solution in NSGA-II population"""
    route_id: str
    cost: float
    time: float
    carbon: float
    risk_score: float
    
    # NSGA-II metadata
    rank: int = 0
    crowding_distance: float = 0.0
    dominates: List['Solution'] = None
    dominated_count: int = 0
    
    def __post_init__(self):
        if self.dominates is None:
            self.dominates = []


class NSGA2Optimizer:
    """
    Non-dominated Sorting Genetic Algorithm II
    For multi-objective route optimization
    """
    
    def __init__(self, population_size: int = 100, generations: int = 50):
        self.population_size = population_size
        self.generations = generations
    
    def dominates(self, sol1: Solution, sol2: Solution) -> bool:
        """
        Check if sol1 dominates sol2 (Pareto dominance)
        sol1 dominates sol2 if:
        - sol1 is no worse than sol2 in all objectives
        - sol1 is strictly better in at least one objective
        """
        better_in_any = False
        
        # Lower is better for all objectives
        if sol1.cost <= sol2.cost and sol1.time <= sol2.time and sol1.carbon <= sol2.carbon:
            if sol1.cost < sol2.cost or sol1.time < sol2.time or sol1.carbon < sol2.carbon:
                better_in_any = True
        
        return better_in_any
    
    def fast_non_dominated_sort(self, population: List[Solution]) -> List[List[Solution]]:
        """
        Fast non-dominated sorting algorithm
        Returns list of fronts (each front is a list of solutions)
        """
        fronts = [[]]
        
        for p in population:
            p.dominates = []
            p.dominated_count = 0
            
            for q in population:
                if self.dominates(p, q):
                    p.dominates.append(q)
                elif self.dominates(q, p):
                    p.dominated_count += 1
            
            if p.dominated_count == 0:
                p.rank = 0
                fronts[0].append(p)
        
        i = 0
        while fronts[i]:
            next_front = []
            for p in fronts[i]:
                for q in p.dominates:
                    q.dominated_count -= 1
                    if q.dominated_count == 0:
                        q.rank = i + 1
                        next_front.append(q)
            i += 1
            if next_front:
                fronts.append(next_front)
            else:
                break
        
        return fronts
    
    def calculate_crowding_distance(self, front: List[Solution]):
        """
        Calculate crowding distance for solutions in a front
        Promotes diversity along Pareto frontier
        """
        if len(front) == 0:
            return
        
        num_solutions = len(front)
        
        # Initialize crowding distances
        for sol in front:
            sol.crowding_distance = 0.0
        
        # For each objective (cost, time, carbon)
        for objective_fn in [
            lambda s: s.cost,
            lambda s: s.time,
            lambda s: s.carbon
        ]:
            # Sort by objective
            front.sort(key=objective_fn)
            
            # Boundary points have infinite distance
            front[0].crowding_distance = float('inf')
            front[-1].crowding_distance = float('inf')
            
            # Get objective range
            obj_min = objective_fn(front[0])
            obj_max = objective_fn(front[-1])
            obj_range = obj_max - obj_min
            
            if obj_range == 0:
                continue
            
            # Calculate crowding distance for intermediate points
            for i in range(1, num_solutions - 1):
                distance = (objective_fn(front[i + 1]) - objective_fn(front[i - 1])) / obj_range
                front[i].crowding_distance += distance
    
    def select_parents(self, population: List[Solution], tournament_size: int = 2) -> Solution:
        """Tournament selection based on rank and crowding distance"""
        tournament = random.sample(population, tournament_size)
        
        # Sort by rank (lower is better), then by crowding distance (higher is better)
        tournament.sort(key=lambda s: (s.rank, -s.crowding_distance))
        
        return tournament[0]
    
    def crossover(self, parent1: Solution, parent2: Solution) -> Solution:
        """
        Simulated crossover for route solutions
        In practice, this would combine route segments
        """
        # Weighted average with small mutation
        child_cost = (parent1.cost + parent2.cost) / 2 * random.uniform(0.95, 1.05)
        child_time = (parent1.time + parent2.time) / 2 * random.uniform(0.95, 1.05)
        child_carbon = (parent1.carbon + parent2.carbon) / 2 * random.uniform(0.95, 1.05)
        child_risk = (parent1.risk_score + parent2.risk_score) / 2
        
        return Solution(
            route_id=f"hybrid-{random.randint(1000, 9999)}",
            cost=child_cost,
            time=child_time,
            carbon=child_carbon,
            risk_score=child_risk
        )
    
    def mutate(self, solution: Solution, mutation_rate: float = 0.1):
        """Mutate solution with given probability"""
        if random.random() < mutation_rate:
            solution.cost *= random.uniform(0.90, 1.10)
            solution.time *= random.uniform(0.90, 1.10)
            solution.carbon *= random.uniform(0.90, 1.10)
    
    def optimize(
        self,
        initial_solutions: List[Solution]
    ) -> Tuple[List[Solution], List[List[Solution]]]:
        """
        Run NSGA-II optimization
        
        Returns:
            - Pareto front (first front)
            - All fronts
        """
        population = initial_solutions.copy()
        
        # Ensure population size
        while len(population) < self.population_size:
            # Clone and mutate existing solutions
            base = random.choice(initial_solutions)
            new_sol = Solution(
                route_id=f"generated-{len(population)}",
                cost=base.cost * random.uniform(0.85, 1.15),
                time=base.time * random.uniform(0.85, 1.15),
                carbon=base.carbon * random.uniform(0.85, 1.15),
                risk_score=base.risk_score
            )
            population.append(new_sol)
        
        # Evolution loop
        for generation in range(self.generations):
            # Create offspring
            offspring = []
            for _ in range(self.population_size):
                parent1 = self.select_parents(population)
                parent2 = self.select_parents(population)
                child = self.crossover(parent1, parent2)
                self.mutate(child)
                offspring.append(child)
            
            # Combine parent and offspring
            combined = population + offspring
            
            # Non-dominated sorting
            fronts = self.fast_non_dominated_sort(combined)
            
            # Calculate crowding distance for each front
            for front in fronts:
                self.calculate_crowding_distance(front)
            
            # Select next generation
            new_population = []
            for front in fronts:
                if len(new_population) + len(front) <= self.population_size:
                    new_population.extend(front)
                else:
                    # Sort by crowding distance and take best
                    front.sort(key=lambda s: s.crowding_distance, reverse=True)
                    remaining = self.population_size - len(new_population)
                    new_population.extend(front[:remaining])
                    break
            
            population = new_population
        
        # Final non-dominated sorting
        final_fronts = self.fast_non_dominated_sort(population)
        
        return final_fronts[0], final_fronts


def identify_pareto_frontier(routes: List[Dict]) -> List[Dict]:
    """
    Helper function to identify Pareto-optimal routes
    
    Args:
        routes: List of route dicts with 'cost', 'time', 'carbon' keys
    
    Returns:
        List of Pareto-optimal routes marked with is_pareto_optimal=True
    """
    solutions = [
        Solution(
            route_id=r.get('id', f"route-{i}"),
            cost=r['cost'],
            time=r['time'],
            carbon=r.get('carbon', 0.0),
            risk_score=r.get('risk_score', 0.0)
        )
        for i, r in enumerate(routes)
    ]
    
    optimizer = NSGA2Optimizer(population_size=len(solutions), generations=1)
    pareto_front, _ = optimizer.optimize(solutions)
    
    pareto_ids = {sol.route_id for sol in pareto_front}
    
    for route in routes:
        route['is_pareto_optimal'] = route.get('id', '') in pareto_ids
    
    return routes