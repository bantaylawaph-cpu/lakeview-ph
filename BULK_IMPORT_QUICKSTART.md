# Bulk Import Feature - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

This guide will get you up and running with the bulk import feature quickly.

---

## Prerequisites Checklist

Before starting, ensure you have:
- [x] Laravel application running (`php artisan serve`)
- [x] Database connection configured
- [x] PhpSpreadsheet installed (`composer show phpoffice/phpspreadsheet`)
- [x] PHP extensions enabled: gd, zip (`php -m | grep -E "gd|zip"`)
- [x] Frontend assets compiled (`npm run dev` or `npm run build`)
- [x] Valid user account (Org Admin or Contributor)

---

## For End Users

### Step 1: Download Template (30 seconds)
1. Log in to your dashboard
2. Scroll down to find "Bulk Import Template" section
3. Click **"Download Excel Template"** (or CSV if you prefer)
4. Save the file to your computer

### Step 2: Fill Template (5-10 minutes)
1. Open the downloaded template in Excel or Google Sheets
2. Fill in your water quality data:
   ```
   | Parameter        | Value | Depth_m | Remarks        |
   |------------------|-------|---------|----------------|
   | Temperature      | 25.3  | 0       | Morning sample |
   | pH               | 7.2   | 0       |                |
   | Dissolved Oxygen | 8.5   | 0.5     |                |
   ```
3. **Tips:**
   - Use exact parameter names from your database
   - Enter numeric values only
   - Use 0 for surface depth
   - Remarks are optional
4. Save the file

### Step 3: Import Data (1-2 minutes)
1. Click **"Add Water Quality Test"** button
2. Complete Step 1: Select lake and station
3. Complete Step 2: Enter date, time, and sampler info
4. In Step 3, select **"Import from Template"** option
5. Upload your filled template (drag-drop or click to browse)
6. Wait for validation (~5-10 seconds)
7. Review validation results:
   - ✅ **Green**: All good! Click "Confirm Import"
   - ⚠️ **Yellow**: Warnings, but you can still import
   - ❌ **Red**: Fix errors and re-upload
8. Click **"Confirm Import"** if validation passed
9. Proceed to Step 4 and submit your test

**Done!** Your parameters are now saved to the database.

---

## For Developers

### Quick Setup (5 commands)
```bash
# 1. Install backend dependency
cd lakeview-ph
composer require phpoffice/phpspreadsheet

# 2. Verify PHP extensions
php -m | grep -E "gd|zip"
# Should output: gd and zip

# 3. Create temp directory
mkdir -p storage/app/temp

# 4. Verify routes registered
php artisan route:list --path=bulk-import

# 5. Compile frontend
npm run dev
```

### Quick Test (2 minutes)
```bash
# Test template download
curl -X GET "http://localhost:8000/api/org/1/bulk-import/template?format=xlsx" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output test_template.xlsx

# Open the file
start test_template.xlsx  # Windows
# OR
open test_template.xlsx   # Mac
```

If the file opens successfully with 4 columns and 3 example rows, you're all set!

---

## Troubleshooting in 30 Seconds

### "Download Failed" Error
```bash
# Check if PhpSpreadsheet is installed
composer show phpoffice/phpspreadsheet

# If not found, install it
composer require phpoffice/phpspreadsheet
```

### "Missing Extension" Error
```bash
# Check which extensions are loaded
php -m | grep -E "gd|zip"

# If missing, edit php.ini and uncomment:
# extension=gd
# extension=zip

# Then restart web server
```

### "Validation Failed" Every Time
```bash
# Check if parameters exist in database
php artisan tinker
>>> \App\Models\Parameter::count()
# Should return > 0

# If 0, seed parameters first
php artisan db:seed --class=ParametersSeeder
```

---

## File Locations (for reference)

### Documentation
- `PRD_BULK_IMPORT_FEATURE.md` - Feature requirements
- `BULK_IMPORT_BACKEND_SETUP.md` - Detailed backend setup
- `BULK_IMPORT_TESTING_GUIDE.md` - Comprehensive testing
- `BULK_IMPORT_IMPLEMENTATION_SUMMARY.md` - Full implementation details
- `BULK_IMPORT_QUICKSTART.md` - This file

### Backend Code
- `app/Http/Controllers/BulkImportController.php`
- `app/Services/BulkImportTemplateGenerator.php`
- `app/Services/BulkImportValidator.php`
- `routes/api.php` (added bulk-import routes)

### Frontend Code
- `resources/js/components/water-quality-test/BulkImportUploader.jsx`
- `resources/js/components/water-quality-test/WQTestWizard.jsx`
- `resources/js/pages/OrgInterface/orgOverview.jsx`
- `resources/js/pages/ContributorInterface/contribOverview.jsx`

---

## Next Steps

### For Users
1. **Practice:** Try importing 5-10 parameters first
2. **Scale up:** Import larger datasets (50-100 parameters)
3. **Test validation:** Try uploading files with errors to see error messages
4. **Download error log:** Practice correcting errors using the CSV error log

### For Developers
1. **Test all endpoints:** Use the testing guide for comprehensive checks
2. **Monitor logs:** Watch `storage/logs/laravel.log` during imports
3. **Performance test:** Try importing maximum allowed rows (5,000)
4. **Customize:** Adjust validation rules, file limits, or column requirements

### For Admins
1. **User training:** Share this quickstart guide with your team
2. **Parameter setup:** Ensure all water quality parameters are in the database
3. **Monitoring:** Set up alerts for validation failures or large file uploads
4. **Backup:** Schedule regular database backups before bulk imports

---

## Common Questions

**Q: Can I import multiple sampling events at once?**  
A: No, v1.0 only supports importing parameters for a single sampling event. You still need to select the lake, station, and date in the wizard first.

**Q: What's the maximum file size?**  
A: 10 MB. This supports ~5,000 parameters in Excel or ~50,000 in CSV.

**Q: Can I use Google Sheets?**  
A: Yes! Download the Excel template, open it in Google Sheets, fill it out, then download as .xlsx or .csv.

**Q: What if my parameter name doesn't match exactly?**  
A: The validator will show an error. Parameter names must match your database exactly (case-insensitive).

**Q: Can I import parameters with the same name?**  
A: Yes, this is allowed (e.g., multiple Temperature readings at different depths).

**Q: What happens if validation fails?**  
A: You'll see detailed error messages with row numbers. Download the error log CSV, fix the issues, and re-upload.

---

## Getting Help

- **Testing Issues:** See `BULK_IMPORT_TESTING_GUIDE.md`
- **Setup Issues:** See `BULK_IMPORT_BACKEND_SETUP.md`
- **Feature Details:** See `PRD_BULK_IMPORT_FEATURE.md`
- **Implementation Details:** See `BULK_IMPORT_IMPLEMENTATION_SUMMARY.md`

---

**Ready to go?** Start with downloading a template from your dashboard!
