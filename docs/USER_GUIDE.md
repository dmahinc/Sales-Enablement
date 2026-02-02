# User Guide - Sales Enablement Platform

**Version:** 1.0  
**Last Updated:** February 2, 2026

---

## Welcome!

Welcome to the **OVHcloud Sales Enablement Platform**. This guide will help you get started with managing and discovering sales materials.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [For Product Marketing Managers (PMMs)](#for-product-marketing-managers-pmms)
3. [For Sales Representatives](#for-sales-representatives)
4. [Features Overview](#features-overview)
5. [Troubleshooting](#troubleshooting)

---

## Getting Started

### First Login

1. Navigate to the Sales Enablement Platform URL
2. Enter your email address and password
3. Click **Sign In**

**Default Admin Credentials** (for initial setup):
- Email: `admin@ovhcloud.com`
- Password: `admin123`

> ⚠️ **Important:** Change the default password after first login!

### Dashboard Overview

After logging in, you'll see the **Dashboard** with:

- **Quick Stats** - Total materials, personas, segments, and health score
- **Recent Materials** - Latest uploaded materials
- **Quick Actions** - Fast access to common tasks

---

## For Product Marketing Managers (PMMs)

### Uploading a New Material

1. Click **Materials** in the top navigation
2. Click **Upload File** button (top right)
3. **Drag and drop** your file or click to browse
4. Fill in the required fields:
   - **Material Type** - Select from dropdown (Sales Deck, Product Brief, etc.)
   - **Audience** - Internal, Customer Facing, or Shared Asset
   - **Universe** - Public Cloud, Private Cloud, Bare Metal, or Hosting & Collaboration
   - **Product Name** - (Optional) Associated product name
5. Click **Upload**

**Supported File Types:**
- PDF (`.pdf`)
- PowerPoint (`.pptx`, `.ppt`)
- Word (`.docx`, `.doc`)

**File Size Limit:** 50MB

### Creating a Material Manually

1. Go to **Materials** page
2. Click **Create Material**
3. Fill in the form:
   - Name (required)
   - Material Type (required)
   - Audience (required)
   - Description, tags, keywords (optional)
4. Click **Create**

### Editing Material Metadata

1. Find the material in the **Materials** list
2. Click the **Edit** icon (pencil)
3. Update any fields
4. Click **Update**

### Changing Material Status

Materials have four statuses:

- **Draft** - Work in progress
- **Review** - Pending approval
- **Published** - Active and available
- **Archived** - No longer active

To change status:
1. Edit the material
2. Select new status from dropdown
3. Save

### Creating a Persona

1. Click **Personas** in navigation
2. Click **Create Persona**
3. Fill in:
   - **Name** (required) - e.g., "IT Decision Maker"
   - **Role** - Job title
   - **Description** - Background information
   - **Goals** - What they're trying to achieve
   - **Challenges** - Pain points they face
   - **Preferred Content** - Types of content they prefer
4. Click **Create**

### Creating a Market Segment

1. Click **Segments** in navigation
2. Click **Create Segment**
3. Fill in:
   - **Name** (required) - e.g., "Enterprise Financial Services"
   - **Industry** - Target industry
   - **Company Size** - Startup, SMB, Mid-Market, Enterprise
   - **Region** - EMEA, Americas, APAC, Global
   - **Key Drivers** - Business drivers
   - **Pain Points** - Common challenges
   - **Buying Criteria** - Purchase factors
4. Click **Create**

### Monitoring Content Health

1. Click **Health** in navigation
2. View:
   - **Overall Health Score** - Percentage of published materials
   - **Status Distribution** - Breakdown by status
   - **Universe Coverage** - Materials per universe
   - **Recommendations** - Action items

---

## For Sales Representatives

### Finding Content Quickly

#### Option 1: Search

1. Click **Discovery** in navigation
2. Type keywords in the search box (e.g., "cloud", "security", "kubernetes")
3. Results appear instantly
4. Use filters to narrow down:
   - Material Type
   - Universe
   - Audience

#### Option 2: Browse by Universe

1. Click **Materials** in navigation
2. Use the left sidebar to filter by universe:
   - All Materials
   - Public Cloud
   - Private Cloud
   - Bare Metal
   - Hosting & Collaboration
3. Click on a universe to see filtered materials

### Downloading Materials

1. Find the material you need
2. Click the **Download** icon (down arrow)
3. File downloads to your computer

### Understanding Material Information

Each material card shows:
- **Name** - Material title
- **Type** - Sales Deck, Product Brief, etc.
- **Universe** - Product category
- **Status** - Published, Review, Draft, Archived
- **Product** - Associated product name

---

## Features Overview

### Materials Management

- **Upload** - Add new sales materials
- **Organize** - Categorize by universe, type, audience
- **Track** - Monitor status and health
- **Search** - Find materials quickly

### Personas Library

- **Define** - Create buyer personas
- **Describe** - Document goals and challenges
- **Target** - Link materials to personas

### Market Segments

- **Categorize** - Define market segments
- **Filter** - Organize by industry, size, region
- **Target** - Align materials with segments

### Discovery

- **Search** - Full-text search across all content
- **Filter** - Narrow results by multiple criteria
- **Browse** - Explore by category

### Health Dashboard

- **Monitor** - Track content health metrics
- **Identify** - Find stale or outdated content
- **Improve** - Get recommendations

---

## Tips & Best Practices

### For PMMs

✅ **Do:**
- Upload materials immediately after creation
- Fill in all metadata (tags, keywords) for better discoverability
- Keep status updated (draft → review → published)
- Use consistent naming conventions
- Add product names and universe for organization

❌ **Don't:**
- Upload duplicate materials
- Leave materials in "Draft" status indefinitely
- Skip metadata fields
- Use vague or generic names

### For Sales Reps

✅ **Do:**
- Use search before asking PMMs
- Filter by universe for relevant content
- Check material status (use "Published" materials)
- Download materials for offline use

❌ **Don't:**
- Use outdated materials (check status)
- Share internal-only materials externally
- Ignore the universe filter

---

## Troubleshooting

### Can't Login

**Problem:** Login fails with correct credentials

**Solutions:**
- Check that your email is correct
- Ensure password is entered correctly (case-sensitive)
- Clear browser cache and cookies
- Try incognito/private window
- Contact administrator if issue persists

### File Upload Fails

**Problem:** "Failed to upload file" error

**Solutions:**
- Check file size (must be < 50MB)
- Verify file type is supported (PDF, PPTX, DOCX)
- Ensure all required fields are filled
- Check internet connection
- Try a different browser

### Can't Find Material

**Problem:** Material doesn't appear in search

**Solutions:**
- Check filters aren't too restrictive
- Try different keywords
- Browse by universe instead
- Verify material status is "Published"
- Check if material exists in correct universe

### Download Not Working

**Problem:** Download button doesn't work

**Solutions:**
- Check browser popup blocker
- Try right-click → "Save As"
- Check file permissions
- Contact PMM if file is missing

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `/` | Focus search box (on Discovery page) |
| `Esc` | Close modal |
| `Ctrl/Cmd + K` | Quick search (future feature) |

---

## Getting Help

### Support Channels

- **Email:** sales-enablement@ovhcloud.com
- **Slack:** #sales-enablement (future)
- **Documentation:** See `/docs` folder in repository

### Reporting Issues

When reporting an issue, please include:
1. What you were trying to do
2. What happened instead
3. Screenshots (if applicable)
4. Browser and version
5. Steps to reproduce

---

## FAQ

**Q: Can I upload multiple files at once?**  
A: Currently, only single file uploads are supported. Bulk upload is planned for Phase 2.

**Q: How do I delete a material?**  
A: Click the trash icon on the material card. This action cannot be undone.

**Q: Can I restore a deleted material?**  
A: No, deletions are permanent. Contact an administrator if you need to recover content.

**Q: Who can see my materials?**  
A: All authenticated users can see materials. Use "Internal" audience for PMM-only content.

**Q: How often is content updated?**  
A: Content is updated in real-time. Changes appear immediately.

**Q: Can I export materials list?**  
A: Export functionality is planned for Phase 2.

---

*This user guide will be updated as new features are added.*
