# Bulk Import Feature - Testing Guide

## Overview
This guide provides step-by-step instructions for testing the bulk water quality parameter import feature.

## Prerequisites
- Backend API endpoints deployed and accessible
- PhpSpreadsheet package installed (`composer require phpoffice/phpspreadsheet`)
- PHP extensions enabled: `gd`, `zip`
- Frontend assets compiled (`npm run dev` or `npm run build`)
- Valid authentication token

## Testing Steps

### 1. Template Download Test

#### From Overview Page (Org Admin or Contributor)
1. **Navigate to Overview page** (e.g., `/org/dashboard` or `/contrib/dashboard`)
2. **Locate "Bulk Import Template" section** (below KPI cards)
3. **Click "Download Excel Template"** or **"Download CSV Template"**
4. **Verify:**
   - Success notification appears: "Download Complete - Template file downloaded successfully"
   - File downloads with correct naming format: `WaterQuality_Import_Template_[OrgName]_[YYYYMMDD].[xlsx|csv]`
   - File opens correctly in Excel/Sheets
   - Contains 4 columns: Parameter, Value, Depth_m, Remarks
   - Contains 3 example rows showing proper format

**Expected Template Structure:**
```
| Parameter           | Value | Depth_m | Remarks        |
|---------------------|-------|---------|----------------|
| Temperature         | 25.3  | 0       | Surface sample |
| pH                  | 7.2   | 0       |                |
| Dissolved Oxygen    | 8.5   | 0.5     |                |
```

### 2. Template Fill Test

1. **Open downloaded template** in Excel or compatible spreadsheet editor
2. **Fill in water quality data:**
   - Use valid parameter names from your database
   - Enter numeric values for measurements
   - Specify depth in meters (use 0 for surface)
   - Add optional remarks
3. **Create test scenarios:**
   - **Valid data:** 10-20 rows with correct parameter names and numeric values
   - **Invalid parameter:** Add a row with parameter "Invalid_Param_XYZ"
   - **Invalid value:** Add a row with non-numeric value like "N/A" or "high"
   - **Large depth:** Add a row with depth > 100m (should trigger warning)
   - **Missing value:** Leave value cell empty (should trigger error)
4. **Save the file** (keep as .xlsx or export as .csv)

### 3. Import Validation Test

#### From Wizard Step 3
1. **Navigate to "Add Water Quality Test" wizard**
2. **Complete Steps 1-2** (select lake, station, date/time, sampler info)
3. **Proceed to Step 3** (Parameters & Results)
4. **Select "Import from Template" option** (bulk import radio button)
5. **Upload filled template:**
   - Drag and drop file, OR
   - Click "Choose File" button
6. **Verify upload progress indicator** displays (0-100%)
7. **Wait for validation to complete**

**Expected Validation Results:**

✅ **Success Case (no errors):**
- Green checkmark icon appears
- Success message: "Validation Passed - X of Y rows are valid"
- Preview table displays first 5-10 rows
- "Confirm Import" button is enabled
- Row count summary shows: "Found X valid parameters"

⚠️ **Warning Case (warnings only):**
- Yellow alert icon appears
- Warning message: "Validation passed with warnings"
- Preview table displays valid rows
- Warning summary box lists issues (e.g., "Row 12: Depth exceeds typical range")
- "Confirm Import" button is enabled
- "Download Error Log" button is visible

❌ **Error Case (validation failures):**
- Red alert icon appears
- Error message: "Validation Failed - Found X error(s)"
- Error summary box lists all errors with row numbers
- "Confirm Import" button is DISABLED
- "Download Error Log" button is visible
- "Try Again" button allows re-upload

### 4. Error Log Download Test

1. **Upload a template with errors/warnings** (from step 3)
2. **Click "Download Error Log" button**
3. **Verify:**
   - CSV file downloads immediately
   - Filename format: `validation_errors_YYYY-MM-DD.csv`
   - File contains columns: Row, Column, Type, Message
   - All errors and warnings are listed
   - Messages are descriptive and actionable

**Expected Error Log Format:**
```csv
Row,Column,Type,Message
12,Value,Error,Invalid numeric value: "N/A"
15,Parameter,Error,Parameter 'Unknown_Param' not found in database
87,Depth_m,Warning,Depth value exceeds typical range (150m)
```

### 5. Import Confirmation Test

1. **Upload a valid template** (from step 3)
2. **Review preview table** showing first 5 parameters
3. **Click "Confirm Import" button**
4. **Verify:**
   - Import modal/loader appears briefly
   - Parameters are added to wizard's parameter table
   - Wizard switches to "manual entry" view
   - All imported parameters appear in the table with:
     - Correct parameter names
     - Entered values
     - Specified depths
     - Remarks (if any)
   - Row count matches imported data
   - Can proceed to Step 4 (Review & Submit)

### 6. End-to-End Test

1. **Download template** from Overview page
2. **Fill template** with 20-30 valid water quality parameters
3. **Navigate to wizard** and complete Steps 1-2
4. **Import template** in Step 3
5. **Verify validation passes** (all green)
6. **Confirm import**
7. **Review imported data** in parameter table
8. **Proceed to Step 4** (Review & Submit)
9. **Submit the test**
10. **Verify:**
    - Test is saved to database
    - All parameters are associated with the test
    - Data matches imported template
    - Success notification appears

## API Endpoint Tests (Optional - for developers)

### Test Template Download Endpoint
```bash
# Excel format
curl -X GET "http://localhost:8000/api/org/1/bulk-import/template?format=xlsx" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output template.xlsx

# CSV format
curl -X GET "http://localhost:8000/api/contrib/2/bulk-import/template?format=csv" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output template.csv
```

**Expected Response:**
- Status: 200 OK
- Content-Type: application/octet-stream
- Body: Binary file data (Excel or CSV)

### Test Validation Endpoint
```bash
curl -X POST "http://localhost:8000/api/org/1/bulk-import/validate" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@filled_template.xlsx"
```

**Expected Response:**
```json
{
  "isValid": true,
  "totalRows": 25,
  "validRows": 24,
  "errors": [
    {
      "row": 12,
      "column": "Value",
      "message": "Invalid numeric value: \"N/A\""
    }
  ],
  "warnings": [],
  "preview": [
    {
      "parameter": "Temperature",
      "value": "25.3",
      "depth_m": "0",
      "remarks": ""
    }
  ]
}
```

### Test Error Log Endpoint
```bash
curl -X POST "http://localhost:8000/api/org/1/bulk-import/error-log" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "errors": [
      {"row": 12, "column": "Value", "message": "Invalid numeric value"},
      {"row": 15, "column": "Parameter", "message": "Parameter not found"}
    ]
  }' \
  --output errors.csv
```

**Expected Response:**
- Status: 200 OK
- Content-Type: text/csv
- Body: CSV file with formatted errors

## Common Issues & Troubleshooting

### 1. Template Download Fails
**Symptoms:** 
- Error notification: "Download Failed"
- Network error in console

**Solutions:**
- Check backend server is running
- Verify API route is registered: `php artisan route:list --path=bulk-import`
- Check authorization token is valid
- Ensure PhpSpreadsheet is installed: `composer show phpoffice/phpspreadsheet`
- Verify PHP extensions enabled: `php -m | grep -E "gd|zip"`

### 2. Validation Always Fails
**Symptoms:**
- All uploads show "Validation Failed" regardless of data

**Solutions:**
- Check parameter names match database exactly (case-sensitive)
- Verify `parameters` table has data: `SELECT * FROM parameters LIMIT 10;`
- Check file format is correct (.xlsx or .csv)
- Ensure file size < 10MB
- Review Laravel logs: `storage/logs/laravel.log`

### 3. Import Button Disabled
**Symptoms:**
- "Confirm Import" button remains grayed out even with valid data

**Solutions:**
- Check `validationResults.errors.length === 0`
- Ensure `validationState === 'success' || validationState === 'warning'`
- Verify API response includes `isValid: true` or warnings only
- Check browser console for JavaScript errors

### 4. Parameters Don't Appear in Table
**Symptoms:**
- Import confirms but wizard table remains empty

**Solutions:**
- Verify `onImportSuccess()` callback is called
- Check parameter mapping logic in WQTestWizard.jsx
- Ensure imported parameter names match `parameterOptions` array
- Review `matchedParam` logic for parameter ID lookup

### 5. Error Log Won't Download
**Symptoms:**
- "Download Error Log" button doesn't work

**Solutions:**
- Check backend endpoint is accessible
- Verify errors array is properly formatted
- Try client-side fallback (should trigger automatically)
- Check browser download permissions

## Test Checklist

Use this checklist to ensure comprehensive testing:

- [ ] Template downloads successfully (Excel format)
- [ ] Template downloads successfully (CSV format)
- [ ] Template has correct structure (4 columns)
- [ ] Template has example data (3 rows)
- [ ] File validation rejects invalid file types
- [ ] File validation rejects oversized files (>10MB)
- [ ] Upload progress indicator displays correctly
- [ ] Valid data passes validation (green checkmark)
- [ ] Invalid parameter names trigger errors
- [ ] Non-numeric values trigger errors
- [ ] Large depths trigger warnings
- [ ] Missing values trigger errors
- [ ] Error log downloads successfully
- [ ] Error log contains all errors/warnings
- [ ] Imported parameters appear in wizard table
- [ ] Parameter values match imported data
- [ ] Can submit test after bulk import
- [ ] Saved test contains all imported parameters
- [ ] Both org and contrib roles work correctly

## Next Steps After Testing

1. **Report bugs** with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots/error messages
   - Browser console logs
   - Laravel error logs

2. **Performance testing:**
   - Test with maximum allowed rows (5,000)
   - Test with large file sizes (approaching 10MB)
   - Measure validation time for different file sizes

3. **User acceptance testing:**
   - Have actual users test the workflow
   - Collect feedback on UX/UI
   - Identify confusing error messages
   - Note feature requests

4. **Production deployment:**
   - Ensure all tests pass
   - Update production documentation
   - Train users on new feature
   - Monitor error logs after launch
