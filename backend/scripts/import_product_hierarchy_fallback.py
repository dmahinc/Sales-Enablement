"""
Fallback script to import product hierarchy with known OVHcloud products
Uses comprehensive product data based on product-map.ovh structure
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.product import Universe, Category, Product

# Comprehensive product data based on product-map.ovh
PRODUCTS_DATA = [
    # Public Cloud - AI & Machine Learning
    {"name": "AI Deploy", "category": "ai", "universe": "Public Cloud", "product_type": "paas", "phase": "beta"},
    {"name": "AI Notebooks", "category": "ai", "universe": "Public Cloud", "product_type": "paas", "phase": "general_avail"},
    {"name": "AI Training", "category": "ai", "universe": "Public Cloud", "product_type": "paas", "phase": "general_avail"},
    
    # Public Cloud - Data Analytics
    {"name": "Data Processing", "category": "analytics", "universe": "Public Cloud", "product_type": "paas", "phase": "general_avail"},
    {"name": "Managed Grafana", "category": "analytics", "universe": "Public Cloud", "product_type": "paas", "phase": "general_avail"},
    {"name": "Managed Kafka", "category": "analytics", "universe": "Public Cloud", "product_type": "paas", "phase": "general_avail"},
    {"name": "Managed Kafka MirrorMaker", "category": "analytics", "universe": "Public Cloud", "product_type": "paas", "phase": "general_avail"},
    {"name": "Managed Kafka Connect", "category": "analytics", "universe": "Public Cloud", "product_type": "paas", "phase": "general_avail"},
    
    # Public Cloud - Compute
    {"name": "VM instances", "category": "compute", "universe": "Public Cloud", "product_type": "iaas", "phase": "general_avail"},
    {"name": "Metal instances", "category": "compute", "universe": "Public Cloud", "product_type": "iaas", "phase": "general_avail"},
    {"name": "Managed Kubernetes Service", "category": "compute", "universe": "Public Cloud", "product_type": "paas", "phase": "general_avail"},
    
    # Public Cloud - Databases
    {"name": "Managed Databases for MySQL", "category": "databases", "universe": "Public Cloud", "product_type": "paas", "phase": "general_avail"},
    {"name": "Managed Databases for PostgreSQL", "category": "databases", "universe": "Public Cloud", "product_type": "paas", "phase": "general_avail"},
    {"name": "Managed Databases For MongoDB", "category": "databases", "universe": "Public Cloud", "product_type": "paas", "phase": "general_avail"},
    {"name": "Managed Databases for Redis", "category": "databases", "universe": "Public Cloud", "product_type": "paas", "phase": "general_avail"},
    {"name": "Managed Databases for OpenSearch", "category": "databases", "universe": "Public Cloud", "product_type": "paas", "phase": "general_avail"},
    {"name": "Managed Databases for Cassandra", "category": "databases", "universe": "Public Cloud", "product_type": "paas", "phase": "general_avail"},
    {"name": "Managed Databases for M3DB", "category": "databases", "universe": "Public Cloud", "product_type": "paas", "phase": "general_avail"},
    {"name": "Managed M3 Aggregator", "category": "databases", "universe": "Public Cloud", "product_type": "paas", "phase": "general_avail"},
    {"name": "Logs Data Platform", "category": "databases", "universe": "Public Cloud", "product_type": "paas", "phase": "general_avail"},
    
    # Public Cloud - Storage
    {"name": "Object Storage", "category": "storage", "universe": "Public Cloud", "product_type": "paas", "phase": "general_avail"},
    {"name": "Cloud Archive", "category": "storage", "universe": "Public Cloud", "product_type": "paas", "phase": "general_avail"},
    {"name": "Cold Archive", "category": "storage", "universe": "Public Cloud", "product_type": "paas", "phase": "beta"},
    {"name": "Block Storage", "category": "storage", "universe": "Public Cloud", "product_type": "iaas", "phase": "general_avail"},
    {"name": "Managed Private Registry", "category": "storage", "universe": "Public Cloud", "product_type": "paas", "phase": "general_avail"},
    
    # Public Cloud - Network
    {"name": "Public Cloud Floating Ips", "category": "network", "universe": "Public Cloud", "product_type": "paas", "phase": "general_avail"},
    {"name": "Public Cloud Load Balancers", "category": "network", "universe": "Public Cloud", "product_type": "paas", "phase": "general_avail"},
    {"name": "Public Cloud Network Gateway", "category": "network", "universe": "Public Cloud", "product_type": "paas", "phase": "general_avail"},
    {"name": "Private Networks", "category": "network", "universe": "Public Cloud", "product_type": "iaas", "phase": "general_avail"},
    
    # Private Cloud - Backup
    {"name": "Veeam Cloud Connect", "category": "backup", "universe": "Private Cloud", "product_type": "paas", "phase": "general_avail"},
    {"name": "Veeam Enterprise for VMware HPC", "category": "backup", "universe": "Private Cloud", "product_type": "paas", "phase": "general_avail"},
    {"name": "Veeam Managed Backup for VMware HPC", "category": "backup", "universe": "Private Cloud", "product_type": "paas", "phase": "general_avail"},
    {"name": "Zerto DRP for VMware HPC", "category": "backup", "universe": "Private Cloud", "product_type": "paas", "phase": "general_avail"},
    
    # Private Cloud - Compute
    {"name": "Hosted Private Cloud Powered By Vmware", "category": "compute", "universe": "Private Cloud", "product_type": "iaas", "phase": "general_avail"},
    {"name": "vRealize Operations (vROps)", "category": "compute", "universe": "Private Cloud", "product_type": "iaas", "phase": "general_avail"},
    
    # Private Cloud - Network
    {"name": "VMware NSX-V", "category": "network", "universe": "Private Cloud", "product_type": "iaas", "phase": "general_avail"},
    
    # Bare Metal - Compute
    {"name": "Dedicated servers", "category": "compute", "universe": "Bare Metal", "product_type": "iaas", "phase": "general_avail"},
    {"name": "Bare Metal Gaming servers", "category": "gaming", "universe": "Bare Metal", "product_type": "iaas", "phase": "general_avail"},
    {"name": "SAP HANA on Bare Metal", "category": "compute", "universe": "Bare Metal", "product_type": "iaas", "phase": "general_avail"},
    {"name": "Nutanix On Ovhcloud", "category": "compute", "universe": "Bare Metal", "product_type": "iaas", "phase": "general_avail"},
    
    # Bare Metal - Storage
    {"name": "Bare Metal Storage servers", "category": "storage", "universe": "Bare Metal", "product_type": "iaas", "phase": "general_avail"},
    
    # Bare Metal - Network
    {"name": "Bring Your Own IP", "category": "network", "universe": "Bare Metal", "product_type": "iaas", "phase": "general_avail"},
    {"name": "Additionnal IP", "category": "network", "universe": "Bare Metal", "product_type": "paas", "phase": "general_avail"},
    {"name": "Load Balancer (IPLB)", "category": "network", "universe": "Bare Metal", "product_type": "iaas", "phase": "general_avail"},
    {"name": "OVHcloud Connect", "category": "network", "universe": "Bare Metal", "product_type": "iaas", "phase": "general_avail"},
    {"name": "vRack", "category": "network", "universe": "Bare Metal", "product_type": "iaas", "phase": "general_avail"},
    {"name": "CDN Infrastructure", "category": "network", "universe": "Bare Metal", "product_type": "paas", "phase": "general_avail"},
    
    # Hosting & Collaboration - Hosting
    {"name": "Web hosting offers", "category": "hosting", "universe": "Hosting & Collaboration", "product_type": "paas", "phase": "general_avail"},
    {"name": "Domain names", "category": "hosting", "universe": "Hosting & Collaboration", "product_type": "paas", "phase": "general_avail"},
    {"name": "Start SQL database", "category": "hosting", "universe": "Hosting & Collaboration", "product_type": "paas", "phase": "general_avail"},
    {"name": "CDN Web", "category": "hosting", "universe": "Hosting & Collaboration", "product_type": "paas", "phase": "general_avail"},
    {"name": "Web Paas Powered By Platform.sh", "category": "hosting", "universe": "Hosting & Collaboration", "product_type": "paas", "phase": "general_avail"},
    {"name": "Web Cloud Databases", "category": "hosting", "universe": "Hosting & Collaboration", "product_type": "paas", "phase": "general_avail"},
    
    # Hosting & Collaboration - Collaboration
    {"name": "SharePoint", "category": "collab", "universe": "Hosting & Collaboration", "product_type": "saas", "phase": "general_avail"},
    {"name": "Microsoft 365", "category": "collab", "universe": "Hosting & Collaboration", "product_type": "saas", "phase": "general_avail"},
    {"name": "E-mail Pro", "category": "collab", "universe": "Hosting & Collaboration", "product_type": "saas", "phase": "general_avail"},
    {"name": "Hosted Exchange", "category": "collab", "universe": "Hosting & Collaboration", "product_type": "saas", "phase": "general_avail"},
    {"name": "Private Exchange", "category": "collab", "universe": "Hosting & Collaboration", "product_type": "saas", "phase": "general_avail"},
    {"name": "Trusted Exchange", "category": "collab", "universe": "Hosting & Collaboration", "product_type": "saas", "phase": "general_avail"},
    {"name": "Visibility Pro", "category": "collab", "universe": "Hosting & Collaboration", "product_type": "paas", "phase": "general_avail"},
]

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

CATEGORY_DISPLAY_NAMES = {
    "ai": "AI & Machine Learning",
    "analytics": "Data Analytics",
    "backup": "Backup and Disaster Recovery",
    "collab": "Collaborative Tools",
    "compute": "Compute",
    "databases": "Databases",
    "gaming": "Gaming solutions",
    "hosting": "Web Hosting",
    "network": "Network & Connectivity",
    "storage": "Storage",
}

def import_universes(db: Session):
    """Import universes"""
    print("Importing universes...")
    for universe_name, universe_data in UNIVERSES.items():
        universe = db.query(Universe).filter(Universe.name == universe_name).first()
        if not universe:
            universe = Universe(name=universe_name, **universe_data)
            db.add(universe)
            print(f"  ✓ Created universe: {universe_name}")
        else:
            for key, value in universe_data.items():
                setattr(universe, key, value)
            print(f"  ✓ Updated universe: {universe_name}")
    db.commit()

def import_categories(db: Session):
    """Import categories"""
    print("\nImporting categories...")
    universe_map = {u.name: u for u in db.query(Universe).all()}
    
    # Get unique categories from products
    categories_by_universe = {}
    for product in PRODUCTS_DATA:
        universe_name = product["universe"]
        category_name = product["category"]
        if universe_name not in categories_by_universe:
            categories_by_universe[universe_name] = set()
        categories_by_universe[universe_name].add(category_name)
    
    for universe_name, category_names in categories_by_universe.items():
        universe = universe_map.get(universe_name)
        if not universe:
            continue
        
        for idx, category_name in enumerate(sorted(category_names)):
            display_name = CATEGORY_DISPLAY_NAMES.get(category_name, category_name.title())
            
            category = db.query(Category).filter(
                Category.name == category_name,
                Category.universe_id == universe.id
            ).first()
            
            if not category:
                category = Category(
                    name=category_name,
                    display_name=display_name,
                    universe_id=universe.id,
                    display_order=idx
                )
                db.add(category)
                print(f"  ✓ Created category: {display_name} ({universe_name})")
            else:
                category.display_name = display_name
                print(f"  ✓ Updated category: {display_name}")
    db.commit()

def import_products(db: Session):
    """Import products"""
    print("\nImporting products...")
    universe_map = {u.name: u for u in db.query(Universe).all()}
    category_map = {}
    
    for category in db.query(Category).all():
        key = f"{category.name}_{category.universe.name}"
        category_map[key] = category
    
    for idx, product_data in enumerate(PRODUCTS_DATA):
        universe_name = product_data["universe"]
        category_name = product_data.get("category", "")
        
        universe = universe_map.get(universe_name)
        if not universe:
            print(f"  ✗ Warning: Universe '{universe_name}' not found for product '{product_data['name']}'")
            continue
        
        category = None
        if category_name:
            key = f"{category_name}_{universe_name}"
            category = category_map.get(key)
        
        product = db.query(Product).filter(Product.name == product_data["name"]).first()
        
        if not product:
            product = Product(
                name=product_data["name"],
                display_name=product_data["name"],
                universe_id=universe.id,
                category_id=category.id if category else None,
                product_type=product_data.get("product_type"),
                phase=product_data.get("phase"),
                display_order=idx
            )
            db.add(product)
            print(f"  ✓ Created product: {product_data['name']} ({universe_name})")
        else:
            product.universe_id = universe.id
            if category:
                product.category_id = category.id
            print(f"  ✓ Updated product: {product_data['name']}")
    
    db.commit()

def main():
    """Main import function"""
    db = SessionLocal()
    try:
        print("=" * 60)
        print("Product Hierarchy Import")
        print("=" * 60)
        
        import_universes(db)
        import_categories(db)
        import_products(db)
        
        print("\n" + "=" * 60)
        print("Import Summary")
        print("=" * 60)
        print(f"  Universes: {db.query(Universe).count()}")
        print(f"  Categories: {db.query(Category).count()}")
        print(f"  Products: {db.query(Product).count()}")
        print("=" * 60)
        print("\n✓ Product hierarchy import completed successfully!")
        
    except Exception as e:
        print(f"\n✗ Error during import: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main()
