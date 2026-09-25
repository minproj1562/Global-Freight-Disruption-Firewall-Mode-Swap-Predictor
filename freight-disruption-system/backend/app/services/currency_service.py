# backend/app/services/currency_services.py
"""
Currency Exchange Rate Service
Fetches and caches USD/INR and other currency rates from exchangerate.host API

Features:
- Free API (no key required for basic usage)
- 24-hour Redis caching (if available)
- In-memory fallback cache (if Redis unavailable)
- Static fallback rate if API fails
- Support for multiple currency pairs

API Documentation: https://exchangerate.host
"""

import requests
from datetime import datetime, timedelta
from typing import Optional, Dict
import json

from app.core.config import settings

# Try to import redis, but make it optional
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    print("[Currency Service] Redis not installed - using in-memory cache only")
    print("[Currency Service] Install Redis: pip install redis")


class CurrencyService:
    """
    Handles currency exchange rate fetching and caching
    
    Usage:
        service = CurrencyService()
        rate = service.get_usd_to_inr_rate()  # Returns current USD to INR rate
        converted = service.convert(1000000, "USD", "INR")  # Convert $1M to INR
    """
    
    def __init__(self):
        self.api_url = settings.EXCHANGE_RATE_API_URL
        self.api_key = settings.EXCHANGE_RATE_API_KEY
        self.cache_duration_hours = settings.CACHE_CURRENCY_HOURS
        self.fallback_rate = settings.FALLBACK_USD_INR_RATE
        
        # Initialize Redis if available and enabled
        self.redis_client = None
        if REDIS_AVAILABLE and settings.REDIS_ENABLED:
            self._init_redis()
        
        # In-memory cache fallback (always available)
        self._memory_cache = {
            "usd_inr_rate": self.fallback_rate,
            "usd_inr_timestamp": None,
            "all_rates": {},
            "all_rates_timestamp": None
        }
    
    def _init_redis(self):
        """Initialize Redis connection"""
        try:
            self.redis_client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                password=settings.REDIS_PASSWORD,
                db=settings.REDIS_DB,
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2
            )
            # Test connection
            self.redis_client.ping()
            print(f"[Currency Service] ✓ Redis connected at {settings.REDIS_HOST}:{settings.REDIS_PORT}")
        except Exception as e:
            print(f"[Currency Service] ✗ Redis connection failed: {e}")
            print(f"[Currency Service] → Using in-memory cache only")
            self.redis_client = None
    
    def get_usd_to_inr_rate(self) -> float:
        """
        Get current USD to INR exchange rate
        
        Caching strategy (in order):
        1. Check Redis cache (if available)
        2. Check in-memory cache
        3. Fetch from API
        4. Fallback to static rate if all fail
        
        Returns:
            float: USD to INR exchange rate (e.g., 83.42 means 1 USD = 83.42 INR)
        """
        
        # Try Redis cache first
        if self.redis_client:
            try:
                cached_rate = self.redis_client.get("currency:usd_inr_rate")
                if cached_rate:
                    rate = float(cached_rate)
                    print(f"[Currency Service] ✓ Using cached rate from Redis: 1 USD = {rate} INR")
                    return rate
            except Exception as e:
                print(f"[Currency Service] Redis read error: {e}")
        
        # Try in-memory cache
        if self._memory_cache["usd_inr_timestamp"]:
            cache_age = datetime.utcnow() - self._memory_cache["usd_inr_timestamp"]
            if cache_age < timedelta(hours=self.cache_duration_hours):
                rate = self._memory_cache["usd_inr_rate"]
                print(f"[Currency Service] ✓ Using in-memory cached rate: 1 USD = {rate} INR (age: {cache_age})")
                return rate
        
        # Fetch fresh rate from API
        try:
            rate = self._fetch_usd_to_inr_from_api()
            
            # Cache in Redis
            if self.redis_client:
                try:
                    self.redis_client.setex(
                        "currency:usd_inr_rate",
                        self.cache_duration_hours * 3600,
                        str(rate)
                    )
                    print(f"[Currency Service] ✓ Cached new rate in Redis (TTL: {self.cache_duration_hours}h)")
                except Exception as e:
                    print(f"[Currency Service] Redis write error: {e}")
            
            # Cache in memory
            self._memory_cache["usd_inr_rate"] = rate
            self._memory_cache["usd_inr_timestamp"] = datetime.utcnow()
            
            print(f"[Currency Service] ✓ Fresh rate fetched from API: 1 USD = {rate} INR")
            return rate
            
        except Exception as e:
            print(f"[Currency Service] ✗ API fetch failed: {e}")
            print(f"[Currency Service] → Using fallback rate: 1 USD = {self.fallback_rate} INR")
            return self.fallback_rate
    
    def _fetch_usd_to_inr_from_api(self) -> float:
        """Fetch live USD to INR rate from exchangerate.host API"""
        
        params = {
            "base": "USD",
            "symbols": "INR"
        }
        
        # Add API key if available (optional for free tier)
        if self.api_key:
            params["access_key"] = self.api_key
        
        try:
            response = requests.get(self.api_url, params=params, timeout=5)
            response.raise_for_status()
            
            data = response.json()
            
            # Check if API returned success
            if not data.get("success", True):  # Some endpoints don't return 'success' field
                error_msg = data.get("error", {}).get("info", "Unknown API error")
                raise ValueError(f"API error: {error_msg}")
            
            # Extract INR rate
            rate = data.get("rates", {}).get("INR")
            
            if not rate:
                raise ValueError("INR rate not found in API response")
            
            return float(rate)
            
        except requests.exceptions.Timeout:
            raise Exception("API request timeout after 5 seconds")
        except requests.exceptions.RequestException as e:
            raise Exception(f"API request failed: {e}")
        except (KeyError, ValueError) as e:
            raise Exception(f"Invalid API response format: {e}")
    
    def get_all_rates(self, base: str = "USD") -> Dict[str, float]:
        """
        Get exchange rates for multiple currencies
        
        Args:
            base: Base currency code (default: USD)
        
        Returns:
            dict: Currency code -> exchange rate mapping
            Example: {"INR": 83.42, "EUR": 0.92, "GBP": 0.79, ...}
        """
        
        cache_key = f"currency:all_rates_{base}"
        
        # Try Redis cache
        if self.redis_client:
            try:
                cached_data = self.redis_client.get(cache_key)
                if cached_data:
                    rates = json.loads(cached_data)
                    print(f"[Currency Service] ✓ Using cached rates from Redis (base: {base})")
                    return rates
            except Exception as e:
                print(f"[Currency Service] Redis read error: {e}")
        
        # Try in-memory cache
        if base in self._memory_cache["all_rates"]:
            cache_timestamp = self._memory_cache["all_rates_timestamp"]
            if cache_timestamp:
                cache_age = datetime.utcnow() - cache_timestamp
                if cache_age < timedelta(hours=self.cache_duration_hours):
                    rates = self._memory_cache["all_rates"][base]
                    print(f"[Currency Service] ✓ Using in-memory cached rates (base: {base})")
                    return rates
        
        # Fetch from API
        try:
            rates = self._fetch_all_rates_from_api(base)
            
            # Cache in Redis
            if self.redis_client:
                try:
                    self.redis_client.setex(
                        cache_key,
                        self.cache_duration_hours * 3600,
                        json.dumps(rates)
                    )
                except Exception as e:
                    print(f"[Currency Service] Redis write error: {e}")
            
            # Cache in memory
            self._memory_cache["all_rates"][base] = rates
            self._memory_cache["all_rates_timestamp"] = datetime.utcnow()
            
            print(f"[Currency Service] ✓ Fresh rates fetched from API (base: {base}, {len(rates)} currencies)")
            return rates
            
        except Exception as e:
            print(f"[Currency Service] ✗ Failed to fetch all rates: {e}")
            return {"INR": self.fallback_rate}  # Minimal fallback
    
    def _fetch_all_rates_from_api(self, base: str) -> Dict[str, float]:
        """Fetch all exchange rates from API"""
        
        params = {"base": base}
        
        if self.api_key:
            params["access_key"] = self.api_key
        
        response = requests.get(self.api_url, params=params, timeout=5)
        response.raise_for_status()
        
        data = response.json()
        
        if not data.get("success", True):
            error_msg = data.get("error", {}).get("info", "Unknown API error")
            raise ValueError(f"API error: {error_msg}")
        
        rates = data.get("rates", {})
        
        if not rates:
            raise ValueError("No rates found in API response")
        
        return {k: float(v) for k, v in rates.items()}
    
    def convert(self, amount: float, from_currency: str, to_currency: str) -> float:
        """
        Convert amount from one currency to another
        
        Args:
            amount: Amount to convert
            from_currency: Source currency code (e.g., "USD")
            to_currency: Target currency code (e.g., "INR")
        
        Returns:
            float: Converted amount
        
        Example:
            >>> service.convert(1000000, "USD", "INR")
            83420000.0  # $1M = ₹8.34 crores
        """
        
        if from_currency == to_currency:
            return amount
        
        # Special case for USD to INR (most common, has dedicated cache)
        if from_currency == "USD" and to_currency == "INR":
            rate = self.get_usd_to_inr_rate()
            return amount * rate
        
        # For other conversions, fetch all rates
        rates = self.get_all_rates(base=from_currency)
        
        if to_currency not in rates:
            print(f"[Currency Service] ✗ {to_currency} not found, using fallback conversion")
            # Fallback: convert via USD
            if from_currency == "USD":
                return amount * self.fallback_rate
            else:
                return amount  # Last resort: no conversion
        
        return amount * rates[to_currency]
    
    def format_currency(self, amount: float, currency: str = "USD") -> str:
        """
        Format currency amount for display
        
        Args:
            amount: Numeric amount
            currency: Currency code
        
        Returns:
            str: Formatted string
        
        Example:
            >>> service.format_currency(1500000, "USD")
            "$1,500,000.00"
            >>> service.format_currency(12500000, "INR")
            "₹1.25 Cr"
        """
        
        if currency == "USD":
            return f"${amount:,.2f}"
        elif currency == "INR":
            # Format in crores (1 crore = 10 million)
            if amount >= 10000000:
                crores = amount / 10000000
                return f"₹{crores:.2f} Cr"
            elif amount >= 100000:
                lakhs = amount / 100000
                return f"₹{lakhs:.2f} L"
            else:
                return f"₹{amount:,.2f}"
        else:
            return f"{amount:,.2f} {currency}"
    
    def get_cache_status(self) -> Dict:
        """Get current cache status (for debugging/monitoring)"""
        
        status = {
            "redis_available": self.redis_client is not None,
            "memory_cache_active": True,
            "last_usd_inr_fetch": self._memory_cache["usd_inr_timestamp"].isoformat() if self._memory_cache["usd_inr_timestamp"] else None,
            "current_usd_inr_rate": self._memory_cache["usd_inr_rate"],
            "fallback_rate": self.fallback_rate,
            "cache_duration_hours": self.cache_duration_hours
        }
        
        if self.redis_client:
            try:
                status["redis_connected"] = self.redis_client.ping()
            except:
                status["redis_connected"] = False
        
        return status


# ============= GLOBAL SINGLETON INSTANCE =============
currency_service = CurrencyService()


# ============= CONVENIENCE FUNCTIONS =============

def get_exchange_rate(from_currency: str = "USD", to_currency: str = "INR") -> float:
    """
    Convenience function to get exchange rate
    
    Args:
        from_currency: Source currency code
        to_currency: Target currency code
    
    Returns:
        float: Exchange rate
    
    Example:
        >>> rate = get_exchange_rate("USD", "INR")
        >>> print(f"1 USD = {rate} INR")
    """
    if from_currency == "USD" and to_currency == "INR":
        return currency_service.get_usd_to_inr_rate()
    
    rates = currency_service.get_all_rates(base=from_currency)
    return rates.get(to_currency, settings.FALLBACK_USD_INR_RATE)


def convert_currency(amount: float, from_currency: str, to_currency: str) -> float:
    """
    Convenience function to convert currency
    
    Args:
        amount: Amount to convert
        from_currency: Source currency code
        to_currency: Target currency code
    
    Returns:
        float: Converted amount
    
    Example:
        >>> inr_amount = convert_currency(1000000, "USD", "INR")
        >>> print(f"$1M = ₹{inr_amount:,.2f}")
    """
    return currency_service.convert(amount, from_currency, to_currency)