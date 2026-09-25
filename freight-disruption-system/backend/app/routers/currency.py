#  backend/app/routers/currency.py
"""
Currency Exchange Rate Router
Provides endpoints for currency conversion and rate fetching
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Optional
from pydantic import BaseModel

from app.services.currency_service import currency_service

router = APIRouter(prefix="/api/currency", tags=["Currency Exchange"])


class ConvertRequest(BaseModel):
    amount: float
    from_currency: str = "USD"
    to_currency: str = "INR"


class ConvertResponse(BaseModel):
    amount: float
    from_currency: str
    to_currency: str
    converted_amount: float
    exchange_rate: float
    formatted: str


@router.get("/rate")
def get_exchange_rate(
    from_currency: str = Query("USD", description="Source currency code"),
    to_currency: str = Query("INR", description="Target currency code")
):
    """
    Get current exchange rate between two currencies
    
    Example:
        GET /api/currency/rate?from_currency=USD&to_currency=INR
    """
    try:
        if from_currency == "USD" and to_currency == "INR":
            rate = currency_service.get_usd_to_inr_rate()
        else:
            rates = currency_service.get_all_rates(base=from_currency)
            rate = rates.get(to_currency)
            
            if not rate:
                raise HTTPException(
                    status_code=404,
                    detail=f"Exchange rate for {from_currency} to {to_currency} not found"
                )
        
        return {
            "from_currency": from_currency,
            "to_currency": to_currency,
            "exchange_rate": rate,
            "example": f"1 {from_currency} = {rate:.4f} {to_currency}"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/convert", response_model=ConvertResponse)
def convert_currency(request: ConvertRequest):
    """
    Convert amount from one currency to another
    
    Example:
        POST /api/currency/convert
        {
            "amount": 1000000,
            "from_currency": "USD",
            "to_currency": "INR"
        }
    """
    try:
        converted = currency_service.convert(
            request.amount,
            request.from_currency,
            request.to_currency
        )
        
        # Get exchange rate
        if request.from_currency == "USD" and request.to_currency == "INR":
            rate = currency_service.get_usd_to_inr_rate()
        else:
            rates = currency_service.get_all_rates(base=request.from_currency)
            rate = rates.get(request.to_currency, 0.0)
        
        # Format result
        formatted = currency_service.format_currency(converted, request.to_currency)
        
        return ConvertResponse(
            amount=request.amount,
            from_currency=request.from_currency,
            to_currency=request.to_currency,
            converted_amount=converted,
            exchange_rate=rate,
            formatted=formatted
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rates")
def get_all_rates(base: str = Query("USD", description="Base currency code")):
    """
    Get all available exchange rates for a base currency
    
    Example:
        GET /api/currency/rates?base=USD
    """
    try:
        rates = currency_service.get_all_rates(base)
        
        return {
            "base": base,
            "rates": rates,
            "count": len(rates)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
def get_service_status():
    """Get currency service status and cache info"""
    
    status = currency_service.get_cache_status()
    
    return {
        "status": "operational",
        "cache_info": status
    }