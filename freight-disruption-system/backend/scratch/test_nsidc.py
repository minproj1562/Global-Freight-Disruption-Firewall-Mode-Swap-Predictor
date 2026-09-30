import httpx
import re

url = "https://noaadata.apps.nsidc.org/NOAA/G02135/north/daily/data/"
r = httpx.get(url, timeout=10.0, follow_redirects=True)
files = re.findall(r'href="([^"]+)"', r.text)
csv_files = [f for f in files if "csv" in f or "txt" in f]
print("Found data files in NSIDC:")
for f in csv_files[:10]:
    print(" ", f)

# Try downloading the first CSV file
if csv_files:
    file_url = url + csv_files[0]
    fr = httpx.get(file_url, timeout=10.0, follow_redirects=True)
    print(f"Status for {csv_files[0]}: {fr.status_code}")
    print("First 3 lines:\n", "\n".join(fr.text.splitlines()[:3]))
