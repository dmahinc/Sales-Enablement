"""
Script to scrape and import complete product hierarchy from product-map.ovh
Parses the product.datatable.html and extracts all products with their hierarchy
"""
import sys
import os
import json
import requests
import re
from pathlib import Path
from html.parser import HTMLParser
from typing import List, Dict, Optional

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from bs4 import BeautifulSoup
    HAS_BS4 = True
except ImportError:
    HAS_BS4 = False
    print("Warning: BeautifulSoup4 not installed. Install with: pip install beautifulsoup4")

# Universe definitions
UNIVERSES = {
    "Public Cloud": {
        "display_name": "Public Cloud",
        "description": "Scalable cloud infrastructure and services",
        "icon_name": "Cloud",
        "color": "#0050d7",
        "display_order": 1
    },
    "Private Cloud": {
        "display_name": "Private Cloud",
        "description": "Dedicated private cloud infrastructure",
        "icon_name": "Server",
        "color": "#4d5693",
        "display_order": 2
    },
    "Bare Metal": {
        "display_name": "Bare Metal",
        "description": "Physical dedicated servers",
        "icon_name": "HardDrive",
        "color": "#f59e0b",
        "display_order": 3
    },
    "Hosting & Collaboration": {
        "display_name": "Hosting & Collaboration",
        "description": "Web hosting and collaboration tools",
        "icon_name": "Users",
        "color": "#10b981",
        "display_order": 4
    }
}

def fetch_product_datatable():
    """Fetch product datatable from product-map.ovh"""
    url = "https://www.product-map.ovh/product.datatable.html"
    try:
        # Disable SSL verification for internal OVHcloud tools
        response = requests.get(url, timeout=30, verify=False)
        response.raise_for_status()
        return response.text
    except Exception as e:
        print(f"Error fetching product datatable: {e}")
        print("Attempting alternative approach...")
        # Try without SSL verification
        try:
            import urllib3
            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
            response = requests.get(url, timeout=30, verify=False)
            response.raise_for_status()
            return response.text
        except Exception as e2:
            print(f"Alternative fetch also failed: {e2}")
            return None

def parse_html_table(html_content: str) -> List[Dict]:
    """Parse HTML table and extract product data"""
    if not HAS_BS4:
        print("BeautifulSoup4 required for HTML parsing")
        return []
    
    soup = BeautifulSoup(html_content, 'html.parser')
    products = []
    
    # Find the table
    table = soup.find('table')
    if not table:
        print("No table found in HTML")
        return []
    
    # Get headers
    headers = []
    header_row = table.find('thead') or table.find('tr')
    if header_row:
        for th in header_row.find_all(['th', 'td']):
            headers.append(th.get_text(strip=True))
    
    # Parse rows
    rows = table.find_all('tr')[1:]  # Skip header row
    for row in rows:
        cells = row.find_all(['td', 'th'])
        if len(cells) < len(headers):
            continue
        
        product_data = {}
        for i, cell in enumerate(cells):
            if i < len(headers):
                header = headers[i].lower().replace(' ', '_').replace('-', '_')
                value = cell.get_text(strip=True)
                
                # Handle boolean values
                if value.lower() in ['true', '1', 'yes']:
                    value = True
                elif value.lower() in ['false', '0', 'no', 'nan']:
                    value = False
                elif value == '':
                    value = None
                
                product_data[header] = value
        
        if product_data.get('product_name'):
            products.append(product_data)
    
    return products

def determine_universe(product_data: Dict) -> str:
    """Determine universe from product data"""
    # Check universe flags
    if product_data.get('universe_public_cloud') == True:
        return "Public Cloud"
    elif product_data.get('universe_private_cloud') == True:
        return "Private Cloud"
    elif product_data.get('universe_baremetal_cloud') == True:
        return "Bare Metal"
    elif product_data.get('universe_web_cloud') == True:
        return "Hosting & Collaboration"
    
    # Fallback: determine from category or product type
    category = product_data.get('category_name', '').lower()
    product_type = product_data.get('product_type', '').lower()
    
    if category in ['ai', 'analytics', 'databases']:
        return "Public Cloud"
    elif category in ['backup'] and 'vmware' in product_data.get('product_name', '').lower():
        return "Private Cloud"
    elif category in ['gaming'] or 'dedicated' in product_data.get('product_name', '').lower():
        return "Bare Metal"
    elif category in ['collab', 'hosting']:
        return "Hosting & Collaboration"
    
    # Default to Public Cloud
    return "Public Cloud"

def extract_datacenter_availability(product_data: Dict) -> Dict:
    """Extract datacenter availability from product data"""
    availability = {}
    datacenter_keys = [
        'datacenter_avail_bhs', 'datacenter_avail_gra', 'datacenter_avail_de',
        'datacenter_avail_rbx', 'datacenter_avail_sbg', 'datacenter_avail_waw',
        'datacenter_avail_uk', 'datacenter_avail_sgp', 'datacenter_avail_syd',
        'datacenter_avail_hil', 'datacenter_avail_vin'
    ]
    
    for key in datacenter_keys:
        dc_name = key.replace('datacenter_avail_', '').upper()
        availability[dc_name] = product_data.get(key, False)
    
    return availability

def extract_certifications(product_data: Dict) -> Dict:
    """Extract certifications from product data"""
    certs = {}
    cert_keys = [
        'certif_iso_27001', 'certif_hds', 'certif_hipaa', 'certif_pci_dss',
        'certif_snc', 'certif_soc1', 'certif_soc2'
    ]
    
    for key in cert_keys:
        cert_name = key.replace('certif_', '').upper()
        value = product_data.get(key)
        if value is not None and value != False:
            certs[cert_name] = value
    
    return certs

def transform_product_data(raw_products: List[Dict]) -> List[Dict]:
    """Transform raw product data into our format"""
    transformed = []
    
    for product in raw_products:
        universe = determine_universe(product)
        
        transformed_product = {
            "name": product.get('product_name', '').strip(),
            "display_name": product.get('product_name', '').strip(),
            "short_description": product.get('product_short_description', ''),
            "category": product.get('category_name', '').lower(),
            "universe": universe,
            "product_type": product.get('product_type', '').lower(),
            "phase": product.get('phase_name', '').lower().replace(' ', '_'),
            "visibility": product.get('visibility', True),
            "website_url": product.get('product_website_url', ''),
            "documentation_url": product.get('product_documentation_url', ''),
            "hardware_tenancy": product.get('hardware_tenancy', '').lower().replace(' ', '_'),
            "public_network": product.get('public_network', ''),
            "private_network": product.get('private_network', ''),
            "code_automation": product.get('code_automation', False),
            "datacenter_availability": extract_datacenter_availability(product),
            "certifications": extract_certifications(product),
        }
        
        if transformed_product["name"]:
            transformed.append(transformed_product)
    
    return transformed

def save_to_json(products: List[Dict], filename: str = "product_hierarchy.json"):
    """Save products to JSON file"""
    output_path = Path(__file__).parent / filename
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump({
            "universes": UNIVERSES,
            "products": products
        }, f, indent=2, ensure_ascii=False)
    print(f"Saved {len(products)} products to {output_path}")

def main():
    """Main scraping function"""
    print("Fetching product datatable from product-map.ovh...")
    html_content = fetch_product_datatable()
    
    if not html_content:
        print("Failed to fetch product data")
        return
    
    print("Parsing HTML table...")
    raw_products = parse_html_table(html_content)
    
    if not raw_products:
        print("No products found in table")
        return
    
    print(f"Found {len(raw_products)} products")
    print("Transforming product data...")
    transformed_products = transform_product_data(raw_products)
    
    print(f"Transformed {len(transformed_products)} products")
    save_to_json(transformed_products)
    
    # Print summary
    universe_counts = {}
    for product in transformed_products:
        universe = product["universe"]
        universe_counts[universe] = universe_counts.get(universe, 0) + 1
    
    print("\nProduct distribution by universe:")
    for universe, count in universe_counts.items():
        print(f"  {universe}: {count} products")

if __name__ == "__main__":
    main()
