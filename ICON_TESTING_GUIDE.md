# Product Icon Testing Guide

## ✅ Build & Deployment Status

- **Frontend Build**: ✅ Successful
- **Icons Extracted**: ✅ 111 SVG icons in `frontend/public/icons/products/`
- **Icons in Container**: ✅ All icons copied to `/usr/share/nginx/html/icons/products/`
- **Container Running**: ✅ `sales-enablement-frontend` on port 3080 (HTTP)
- **Icon Accessibility**: ✅ Icons are being served correctly

## 🧪 Manual Testing Checklist

### 1. Product Hierarchy Selector Dropdown
**Location**: Any form with product selection (e.g., Material Upload, Product Release)

**Steps**:
1. Navigate to a page with product selection (e.g., Upload Material)
2. Select a Universe (e.g., "Public Cloud")
3. Select a Category (e.g., "Containers")
4. Click on the Product dropdown

**Expected Results**:
- ✅ Each product in the dropdown should display a small icon (18px) on the left
- ✅ Icons should be aligned with product names
- ✅ Selected product should show icon next to its name in the button
- ✅ Icons should be visible and properly sized
- ✅ If icon not found, should fallback to Lucide Package icon

**Products to Test**:
- "Managed Kubernetes Service" (should show Kubernetes icon)
- "Instances" (should show Instances icon)
- "AI Notebooks" (should show AI Notebooks icon)
- "Managed MySQL" (should show MySQL icon)

### 2. Product Completion Table
**Location**: PMM Dashboard → Product Completion Table

**Steps**:
1. Navigate to PMM Dashboard
2. Find the Product Completion Table
3. Look at the product list

**Expected Results**:
- ✅ Each product row should have an icon (20px) in the first column
- ✅ Icons should appear between checkbox and product name
- ✅ Icons should be properly aligned
- ✅ Search autocomplete should show icons (20px) next to product names

**Products to Test**:
- Search for "Kubernetes" - should show icon in suggestions
- Search for "MySQL" - should show icon in suggestions
- Check table rows for icon display

### 3. Icon File Accessibility
**Test URLs** (replace with your server IP):
- `http://91.134.72.199:3080/icons/products/Containers/Managed Kubernetes Service.svg`
- `http://91.134.72.199:3080/icons/products/AI & Machine Learning/AI Deploy.svg`
- `http://91.134.72.199:3080/icons/products/Compute/Instances.svg`

**Expected Results**:
- ✅ All URLs should return SVG content (not 404)
- ✅ SVG should render correctly in browser
- ✅ Content-Type should be `image/svg+xml`

### 4. Browser Console Check
**Steps**:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Navigate through pages with product selection

**Expected Results**:
- ✅ No 404 errors for icon files
- ✅ No CORS errors
- ✅ No JavaScript errors related to ProductIcon component

### 5. Visual Verification
**Check**:
- Icons are crisp and clear (SVG should scale perfectly)
- Icons match product names correctly
- Icons don't break layout or alignment
- Icons have appropriate colors (not too bright/dark)
- Fallback icons appear when product icon not found

## 🔍 Troubleshooting

### Icons Not Showing
1. **Check Browser Console**: Look for 404 errors on icon paths
2. **Verify Icon Paths**: Check that paths match `/icons/products/[Category]/[Product Name].svg`
3. **Check Network Tab**: Verify icons are being requested and returned
4. **Verify Container**: `docker exec sales-enablement-frontend ls /usr/share/nginx/html/icons/products/`

### Icons Showing as Broken Images
1. **Check SVG Format**: Verify SVG files are valid XML
2. **Check MIME Type**: Nginx should serve SVG as `image/svg+xml`
3. **Check File Permissions**: Icons should be readable

### Wrong Icons Showing
1. **Check Product Name Matching**: Verify product names match icon file names
2. **Check Normalization**: Product names are normalized for matching
3. **Check Mapping File**: Verify `product-icon-mapping.json` has correct mappings

## 📊 Test Results Template

```
Date: ___________
Tester: ___________

### Product Dropdown Icons
- [ ] Icons visible in dropdown
- [ ] Selected product shows icon
- [ ] Icons properly aligned
- [ ] Fallback works for missing icons

### Product Completion Table
- [ ] Icons visible in table rows
- [ ] Icons visible in autocomplete
- [ ] Icons properly aligned

### Icon Accessibility
- [ ] Icon URLs return 200 OK
- [ ] SVG content renders correctly
- [ ] No console errors

### Visual Quality
- [ ] Icons are crisp
- [ ] Icons match products
- [ ] Layout not broken
- [ ] Colors appropriate

### Issues Found:
_________________________________
_________________________________
```

## 🚀 Next Steps After Testing

1. **If All Tests Pass**: 
   - Restore HTTPS configuration (if needed)
   - Deploy to production
   - Monitor for any issues

2. **If Issues Found**:
   - Document specific issues
   - Check icon file paths
   - Verify product name matching logic
   - Check browser console for errors

## 📝 Notes

- Container is running on HTTP port 3080 for testing
- HTTPS configuration temporarily disabled (nginx-http.conf)
- All 111 icons are available in the container
- Icon matching uses fuzzy name matching with fallback
