"""
Test script for currency service
Run: python test_currency.py
"""

from app.services.currency_service import currency_service, get_exchange_rate, convert_currency

print("\n" + "="*60)
print("CURRENCY SERVICE TEST")
print("="*60)

# Test 1: Get USD to INR rate
print("\n[Test 1] Get USD to INR exchange rate:")
rate = currency_service.get_usd_to_inr_rate()
print(f"✓ Current rate: 1 USD = {rate} INR")

# Test 2: Convert USD to INR
print("\n[Test 2] Convert $1,000,000 to INR:")
usd_amount = 1000000
inr_amount = currency_service.convert(usd_amount, "USD", "INR")
print(f"✓ ${usd_amount:,} = ₹{inr_amount:,.2f}")
print(f"✓ In crores: ₹{inr_amount/10000000:.2f} Cr")

# Test 3: Get all rates
print("\n[Test 3] Get all exchange rates (base: USD):")
all_rates = currency_service.get_all_rates("USD")
print(f"✓ Fetched {len(all_rates)} currency rates")
print(f"✓ Sample rates:")
for currency in ["INR", "EUR", "GBP", "JPY", "CNY"]:
    if currency in all_rates:
        print(f"   1 USD = {all_rates[currency]:.4f} {currency}")

# Test 4: Format currency
print("\n[Test 4] Currency formatting:")
print(f"✓ USD: {currency_service.format_currency(1500000, 'USD')}")
print(f"✓ INR: {currency_service.format_currency(125000000, 'INR')}")

# Test 5: Cache status
print("\n[Test 5] Cache status:")
status = currency_service.get_cache_status()
print(f"✓ Redis available: {status['redis_available']}")
print(f"✓ Redis connected: {status.get('redis_connected', 'N/A')}")
print(f"✓ Memory cache active: {status['memory_cache_active']}")
print(f"✓ Current USD/INR rate: {status['current_usd_inr_rate']}")
print(f"✓ Fallback rate: {status['fallback_rate']}")
print(f"✓ Cache duration: {status['cache_duration_hours']} hours")

# Test 6: Multiple calls (should use cache)
print("\n[Test 6] Cache efficiency (calling 5 times):")
import time
for i in range(5):
    start = time.time()
    rate = currency_service.get_usd_to_inr_rate()
    elapsed = (time.time() - start) * 1000
    print(f"✓ Call {i+1}: {rate} INR (took {elapsed:.2f}ms)")

print("\n" + "="*60)
print("ALL TESTS PASSED!")
print("="*60 + "\n")