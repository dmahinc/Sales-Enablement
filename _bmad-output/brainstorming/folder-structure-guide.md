# Central Repository Folder Structure Guide

## Overview

This guide provides detailed folder structure for the central material repository. The structure is designed to:
- Organize materials by type and audience
- Enable easy discovery and navigation
- Support both product-centric and use case-centric access
- Scale as materials grow

---

## Complete Folder Structure

```
Sales Enablement Materials/
│
├── 01_Internal_Materials/
│   │   (Materials for internal use: Sales teams, Pre-sales, Customer Care)
│   │
│   ├── Product_Briefs/
│   │   │   (Single source of truth for products - most detailed)
│   │   │
│   │   ├── By_Product/
│   │   │   │   (Organized by individual product)
│   │   │   │
│   │   │   ├── Public_Cloud/
│   │   │   │   ├── Product_Brief_Public_Cloud_v2.3_2026-02-01.pdf
│   │   │   │   └── [Additional versions if needed]
│   │   │   │
│   │   │   ├── Private_Cloud/
│   │   │   │   └── Product_Brief_Private_Cloud_v1.5_2026-01-15.pdf
│   │   │   │
│   │   │   ├── Object_Storage/
│   │   │   │   └── Product_Brief_Object_Storage_v3.1_2026-02-01.pdf
│   │   │   │
│   │   │   └── [Product Name]/
│   │   │       └── [Product Brief files]
│   │   │
│   │   └── By_Universe/
│   │       │   (Organized by product universe - alternative view)
│   │       │
│   │       ├── Compute/
│   │       │   ├── Public_Cloud/
│   │       │   ├── Private_Cloud/
│   │       │   └── [Other compute products]
│   │       │
│   │       ├── Storage/
│   │       │   ├── Object_Storage/
│   │       │   └── [Other storage products]
│   │       │
│   │       └── [Universe Name]/
│   │           └── [Product folders]
│   │
│   ├── Sales_Enablement_Decks/
│   │   │   (Sales-focused versions of product briefs)
│   │   │
│   │   ├── By_Product/
│   │   │   │
│   │   │   ├── Public_Cloud/
│   │   │   │   ├── Sales_Enablement_Deck_Public_Cloud_v2.0_2026-01-20.pptx
│   │   │   │   └── [Additional materials]
│   │   │   │
│   │   │   └── [Product Name]/
│   │   │       └── [Sales Enablement Deck files]
│   │   │
│   │   └── By_Universe/
│   │       │
│   │       ├── Compute/
│   │       ├── Storage/
│   │       └── [Universe Name]/
│   │
│   └── Product_Portfolio/
│       │   (Comprehensive breakdown of all products)
│       │
│       ├── Product_Portfolio_All_Products_v1.0_2026-02-01.pdf
│       └── [Additional portfolio materials]
│
├── 02_Customer_Facing/
│   │   (Materials for customers and prospects)
│   │
│   ├── Sales_Decks/
│   │   │   (Customer-facing sales presentations)
│   │   │
│   │   ├── Universe_Level/
│   │   │   │   (Deck covering entire universe/portfolio)
│   │   │   │
│   │   │   ├── Compute/
│   │   │   │   ├── Sales_Deck_Compute_Universe_v1.5_2026-01-15.pptx
│   │   │   │   └── [Voice-over files if available]
│   │   │   │
│   │   │   ├── Storage/
│   │   │   │   └── Sales_Deck_Storage_Universe_v1.2_2026-01-10.pptx
│   │   │   │
│   │   │   └── [Universe Name]/
│   │   │       └── [Universe-level sales decks]
│   │   │
│   │   └── Product_Level/
│   │       │   (Deck for individual product)
│   │       │
│   │       ├── Public_Cloud/
│   │       │   ├── Sales_Deck_Public_Cloud_v2.3_2026-02-01.pptx
│   │       │   └── [Voice-over files if available]
│   │       │
│   │       ├── Object_Storage/
│   │       │   └── Sales_Deck_Object_Storage_v3.1_2026-02-01.pptx
│   │       │
│   │       └── [Product Name]/
│   │           └── [Product-level sales decks]
│   │
│   ├── Datasheets/
│   │   │   (2-pager product descriptions for customers)
│   │   │
│   │   └── By_Product/
│   │       │
│   │       ├── Public_Cloud/
│   │       │   ├── Datasheet_Public_Cloud_v2.3_2026-02-01.pdf
│   │       │   └── [Additional versions if needed]
│   │       │
│   │       ├── Object_Storage/
│   │       │   └── Datasheet_Object_Storage_v3.1_2026-02-01.pdf
│   │       │
│   │       └── [Product Name]/
│   │           └── [Datasheet files]
│   │
│   └── Product_Catalog/
│       │   (High-level portfolio overview for consideration phase)
│       │
│       ├── Product_Catalog_All_Products_v1.0_2026-02-01.pdf
│       └── [Additional catalog materials]
│
├── 03_Shared_Assets/
│   │   (Reusable assets for PMM team)
│   │
│   ├── Personas/
│   │   │   (Shared persona definitions)
│   │   │
│   │   ├── Digital_Starter/
│   │   │   ├── Persona_Digital_Starter_v1.0_2026-02-01.pdf
│   │   │   └── [Additional persona materials]
│   │   │
│   │   ├── Digital_Scaler/
│   │   │   └── Persona_Digital_Scaler_v1.0_2026-02-01.pdf
│   │   │
│   │   ├── Corporate/
│   │   │   └── Persona_Corporate_v1.0_2026-02-01.pdf
│   │   │
│   │   └── [Persona Name]/
│   │       └── [Persona definition files]
│   │
│   ├── Content_Blocks/
│   │   │   (Reusable content pieces)
│   │   │
│   │   ├── Narratives/
│   │   │   │   (Use case narratives, value stories)
│   │   │   │
│   │   │   ├── Business_Continuity_Narrative_v1.0_2026-02-01.docx
│   │   │   ├── Disaster_Recovery_Narrative_v1.0_2026-02-01.docx
│   │   │   └── [Additional narratives]
│   │   │
│   │   ├── Value_Props/
│   │   │   │   (Value proposition statements)
│   │   │   │
│   │   │   ├── Sovereignty_Value_Prop_v1.0_2026-02-01.docx
│   │   │   ├── No_Lock_In_Value_Prop_v1.0_2026-02-01.docx
│   │   │   └── [Additional value props]
│   │   │
│   │   └── Proof_Points/
│   │       │   (Customer success stories, testimonials)
│   │       │
│   │       ├── Customer_Success_Story_Template_v1.0_2026-02-01.docx
│   │       └── [Additional proof points]
│   │
│   └── Templates/
│       │   (Document templates for PMMs)
│       │
│       ├── Product_Brief_Template_v1.0_2026-02-01.docx
│       ├── Sales_Deck_Template_v1.0_2026-02-01.pptx
│       ├── Datasheet_Template_v1.0_2026-02-01.docx
│       └── [Additional templates]
│
└── 04_Archive/
    │   (Deprecated or outdated materials - keep for reference)
    │
    └── Deprecated_Materials/
        │
        ├── Old_Versions/
        │   └── [Old material versions]
        │
        └── Retired_Products/
            └── [Materials for discontinued products]
```

---

## Folder Structure Principles

### **1. Numbered Main Folders**
- `01_Internal_Materials/` - Internal use materials
- `02_Customer_Facing/` - Customer-facing materials
- `03_Shared_Assets/` - Reusable PMM assets
- `04_Archive/` - Deprecated materials

**Why:** Numbering ensures logical order and easy navigation

### **2. Material Type Organization**
Each main folder contains subfolders by material type:
- Product Briefs
- Sales Decks
- Datasheets
- etc.

**Why:** Enables discovery by material type (sales team knows they need a Sales Deck)

### **3. Dual Organization (By Product / By Universe)**
Materials organized both ways:
- `By_Product/` - Individual product folders
- `By_Universe/` - Universe/portfolio folders

**Why:** Supports both product-centric and portfolio-centric access

### **4. Consistent Naming**
- Use underscores, not spaces
- Keep folder names short but descriptive
- Follow same naming as files

**Why:** Ensures consistency and easy navigation

---

## Navigation Guide

### **For Sales Teams (Finding Customer-Facing Materials):**

**Scenario 1: Need Sales Deck for Product**
- Navigate: `02_Customer_Facing/Sales_Decks/Product_Level/[Product Name]/`

**Scenario 2: Need Sales Deck for Universe**
- Navigate: `02_Customer_Facing/Sales_Decks/Universe_Level/[Universe Name]/`

**Scenario 3: Need Datasheet**
- Navigate: `02_Customer_Facing/Datasheets/By_Product/[Product Name]/`

**Scenario 4: Need Product Catalog**
- Navigate: `02_Customer_Facing/Product_Catalog/`

---

### **For PMMs (Finding Internal Materials):**

**Scenario 1: Need Product Brief**
- Navigate: `01_Internal_Materials/Product_Briefs/By_Product/[Product Name]/`

**Scenario 2: Need Sales Enablement Deck**
- Navigate: `01_Internal_Materials/Sales_Enablement_Decks/By_Product/[Product Name]/`

**Scenario 3: Need Product Portfolio**
- Navigate: `01_Internal_Materials/Product_Portfolio/`

---

### **For PMMs (Finding Shared Assets):**

**Scenario 1: Need Persona**
- Navigate: `03_Shared_Assets/Personas/[Persona Name]/`

**Scenario 2: Need Content Block**
- Navigate: `03_Shared_Assets/Content_Blocks/[Type]/`

**Scenario 3: Need Template**
- Navigate: `03_Shared_Assets/Templates/`

---

## Folder Creation Rules

### **When to Create New Folders:**

1. **New Product:**
   - Create product folder in `By_Product/` structure
   - Create in all relevant material type folders
   - Example: New product "AI Platform" → Create folders in Product_Briefs, Sales_Decks, Datasheets

2. **New Universe:**
   - Create universe folder in `By_Universe/` structure
   - Add product folders within universe
   - Example: New universe "AI/ML" → Create universe folder, add product folders

3. **New Persona:**
   - Create persona folder in `03_Shared_Assets/Personas/`
   - Example: New persona "Enterprise" → Create `03_Shared_Assets/Personas/Enterprise/`

4. **New Content Block Type:**
   - Create type folder in `03_Shared_Assets/Content_Blocks/`
   - Example: New type "Use Cases" → Create `03_Shared_Assets/Content_Blocks/Use_Cases/`

### **When NOT to Create New Folders:**

- Don't create folders for single files (put file in parent folder)
- Don't create deep nested structures (keep max 4-5 levels)
- Don't create duplicate structures (use existing if similar)

---

## Special Cases

### **Materials Covering Multiple Products:**

**Option 1: Primary Product Folder**
- Upload to primary product folder
- Note in inventory spreadsheet: "Covers Product A, B, C"

**Option 2: Use Case Folder (Future)**
- When use case structure is added, create use case folder
- Example: `Use_Cases/Disaster_Recovery/` (future enhancement)

**For Now:** Use primary product folder, note coverage in inventory

---

### **Materials in Multiple Languages:**

**Option 1: Separate Files**
- Create separate files: `Material_Name_EN.pdf`, `Material_Name_FR.pdf`
- Store in same folder

**Option 2: Language Subfolder**
- Create language subfolder: `[Product Name]/EN/`, `[Product Name]/FR/`
- Store language-specific files in subfolders

**Recommendation:** Use Option 1 for simplicity, Option 2 if many languages

---

### **Version Control:**

**Current Approach:**
- Store current version in main folder
- Include version in filename: `Material_v2.3_2026-02-01.pdf`
- Archive old versions to `04_Archive/Old_Versions/` if needed

**Future Enhancement:**
- Version control system (if platform supports)
- For now: Use filename versioning

---

## Maintenance Guidelines

### **Regular Maintenance:**

1. **Monthly:**
   - Review folder structure for organization
   - Archive deprecated materials
   - Clean up duplicate or outdated files

2. **Quarterly:**
   - Review folder structure effectiveness
   - Gather feedback from users
   - Adjust structure if needed

3. **As Needed:**
   - Create new folders for new products/universes
   - Reorganize if structure becomes unclear
   - Archive materials when deprecated

---

## Folder Structure Best Practices

### **✅ Do:**
- Use consistent naming (underscores, no spaces)
- Keep folder names descriptive but concise
- Organize logically (by type, then by product/universe)
- Create folders before uploading materials
- Document any custom folder structures

### **❌ Don't:**
- Create deep nested structures (max 4-5 levels)
- Use spaces in folder names
- Create folders for single files
- Duplicate folder structures unnecessarily
- Mix material types in same folder

---

## Questions & Support

**Folder Structure Questions?**
- Check this guide first
- Ask Director or team channel
- Refer to examples in repository

**Need to Create New Structure?**
- Discuss with Director first
- Ensure consistency with existing structure
- Document any custom structures

---

**This folder structure is designed to scale and evolve. Start with this foundation, adjust as needed!** 🚀
