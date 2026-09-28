# backend/app/services/rl_agent.py
"""
Q-Learning Agent for Dynamic Mode-Swap Triggers
Learns optimal thresholds for when to switch between Sea/Rail/Air/Road
"""
import numpy as np
from typing import Dict, Tuple
import random


class QLearningAgent:
    """
    Simple Q-Learning agent for reroute decision-making
    State: (disruption_severity, cargo_urgency, cost_sensitivity)
    Actions: (stay_ocean, switch_to_air, switch_to_rail, hybrid_multimodal)
    """
    
    def __init__(
        self,
        learning_rate: float = 0.1,
        discount_factor: float = 0.95,
        epsilon: float = 0.1
    ):
        self.alpha = learning_rate
        self.gamma = discount_factor
        self.epsilon = epsilon
        
        # Q-table: dict mapping (state, action) -> Q-value
        self.q_table: Dict[Tuple, float] = {}
        
        # Action space
        self.actions = [
            'stay_ocean',
            'switch_to_air',
            'switch_to_rail',
            'hybrid_multimodal'
        ]
    
    def _discretize_state(
        self,
        disruption_severity: float,  # 0.0 to 1.0
        cargo_urgency: float,  # 0.0 to 1.0 (high urgency = 1.0)
        cost_sensitivity: float  # 0.0 to 1.0 (high sensitivity = 1.0)
    ) -> Tuple[int, int, int]:
        """Discretize continuous state into bins"""
        severity_bin = min(int(disruption_severity * 3), 2)  # 0, 1, 2 (low, med, high)
        urgency_bin = min(int(cargo_urgency * 3), 2)
        cost_bin = min(int(cost_sensitivity * 3), 2)
        
        return (severity_bin, urgency_bin, cost_bin)
    
    def get_q_value(self, state: Tuple, action: str) -> float:
        """Get Q-value for state-action pair"""
        return self.q_table.get((state, action), 0.0)
    
    def choose_action(self, state: Tuple) -> str:
        """Epsilon-greedy action selection"""
        if random.random() < self.epsilon:
            # Explore: random action
            return random.choice(self.actions)
        else:
            # Exploit: choose best action
            q_values = [self.get_q_value(state, a) for a in self.actions]
            max_q = max(q_values)
            best_actions = [a for a, q in zip(self.actions, q_values) if q == max_q]
            return random.choice(best_actions)
    
    def update(
        self,
        state: Tuple,
        action: str,
        reward: float,
        next_state: Tuple
    ):
        """Q-learning update rule"""
        current_q = self.get_q_value(state, action)
        
        # Get max Q-value for next state
        next_q_values = [self.get_q_value(next_state, a) for a in self.actions]
        max_next_q = max(next_q_values) if next_q_values else 0.0
        
        # Q-learning update
        new_q = current_q + self.alpha * (reward + self.gamma * max_next_q - current_q)
        
        self.q_table[(state, action)] = new_q
    
    def recommend_mode_swap(
        self,
        disruption_rf_score: float,
        cargo_priority: str,  # "Time", "Cost", "Balanced", "Carbon"
        cargo_value_usd: float
    ) -> Dict[str, any]:
        """
        Recommend whether to swap transport mode based on current conditions
        
        Returns:
            dict with:
                - recommended_action: str
                - confidence: float
                - reasoning: str
        """
        # Convert cargo priority to urgency score
        urgency_map = {
            "Time": 0.9,
            "Carbon": 0.3,
            "Cost": 0.2,
            "Balanced": 0.5
        }
        cargo_urgency = urgency_map.get(cargo_priority, 0.5)
        
        # Cost sensitivity based on cargo value (higher value = lower sensitivity to cost)
        cost_sensitivity = max(0.1, min(1.0, 1.0 - (cargo_value_usd / 100000000.0)))
        
        # Discretize state
        state = self._discretize_state(
            disruption_rf_score,
            cargo_urgency,
            cost_sensitivity
        )
        
        # Choose action
        action = self.choose_action(state)
        
        # Calculate confidence based on Q-value spread
        q_values = [self.get_q_value(state, a) for a in self.actions]
        if max(q_values) - min(q_values) > 0.5:
            confidence = 0.85
        else:
            confidence = 0.65
        
        # Generate reasoning
        reasoning_map = {
            'stay_ocean': "Ocean route remains optimal despite disruption - risk is manageable",
            'switch_to_air': "High urgency and disruption severity warrant air freight premium",
            'switch_to_rail': "Land bridge provides best cost-time-risk balance",
            'hybrid_multimodal': "Multimodal sea-air combination optimizes competing objectives"
        }
        
        return {
            "recommended_action": action,
            "confidence": confidence,
            "reasoning": reasoning_map.get(action, "Optimized based on learned policy"),
            "q_values": dict(zip(self.actions, q_values))
        }
    
    def train_from_history(self, decision_history: list):
        """
        Train Q-learning agent from historical reroute decisions
        
        Args:
            decision_history: List of dicts with keys:
                - disruption_severity
                - cargo_urgency
                - cost_sensitivity
                - action_taken
                - cost_saved
                - time_saved
        """
        for decision in decision_history:
            state = self._discretize_state(
                decision['disruption_severity'],
                decision['cargo_urgency'],
                decision['cost_sensitivity']
            )
            
            action = decision['action_taken']
            
            # Calculate reward based on savings
            cost_reward = decision.get('cost_saved', 0) / 100000.0  # Normalize
            time_reward = decision.get('time_saved', 0) * 1000.0  # Days to dollars
            reward = cost_reward + time_reward
            
            # Dummy next state (in practice, would be actual next observation)
            next_state = state
            
            self.update(state, action, reward, next_state)