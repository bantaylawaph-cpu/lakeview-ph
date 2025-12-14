# Bulk Import Feature - Deployment Checklist

## Pre-Deployment Verification

### ✅ Backend Setup
- [x] PhpSpreadsheet installed (`composer show phpoffice/phpspreadsheet`)
- [x] PHP extensions enabled: gd, zip (`php -m | grep -E "gd|zip"`)
- [x] Routes registered (`php artisan route:list --path=bulk-import`)
- [x] Temp directory exists (`storage/app/temp`)
- [x] Services created:
  - [x] BulkImportTemplateGenerator.php
  - [x] BulkImportValidator.php
- [x] Controller created: BulkImportController.php
- [x] Authorization trait used: ResolvesTenantContext

### ✅ Frontend Setup
- [x] Components created:
  - [x] BulkImportUploader.jsx
- [x] Pages updated:
  - [x] orgOverview.jsx
  - [x] contribOverview.jsx
- [x] Wizard updated: WQTestWizard.jsx
- [x] Assets compiled (`npm run build`)
- [x] No build errors

### ✅ Documentation
- [x] PRD_BULK_IMPORT_FEATURE.md (Product requirements)
- [x] BULK_IMPORT_BACKEND_SETUP.md (Installation guide)
- [x] BULK_IMPORT_TESTING_GUIDE.md (Testing procedures)
- [x] BULK_IMPORT_IMPLEMENTATION_SUMMARY.md (Technical details)
- [x] BULK_IMPORT_QUICKSTART.md (Quick start guide)
- [x] BULK_IMPORT_DEPLOYMENT_CHECKLIST.md (This file)

---

## Deployment Steps

### Step 1: Backup (5 minutes)
```bash
# Backup database
pg_dump -U postgres lakeview_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup Laravel app
tar -czf app_backup_$(date +%Y%m%d_%H%M%S).tar.gz lakeview-ph/
```

### Step 2: Deploy Backend (10 minutes)
```bash
# Navigate to project directory
cd lakeview-ph

# Pull latest changes (if using Git)
git pull origin main

# Install dependencies
composer install --optimize-autoloader --no-dev

# Clear caches
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Re-cache for production
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Verify routes
php artisan route:list --path=bulk-import
```

**Expected output:**
```
GET|HEAD  api/org/{tenant}/bulk-import/template
POST      api/org/{tenant}/bulk-import/validate
POST      api/org/{tenant}/bulk-import/error-log
GET|HEAD  api/contrib/{tenant}/bulk-import/template
POST      api/contrib/{tenant}/bulk-import/validate
POST      api/contrib/{tenant}/bulk-import/error-log
```

### Step 3: Deploy Frontend (5 minutes)
```bash
# Install node dependencies
npm ci --production

# Build production assets
npm run build

# Verify build output
ls -lh public/build/assets/
```

### Step 4: Set Permissions (2 minutes)
```bash
# Set storage permissions
chmod -R 775 storage/
chmod -R 775 bootstrap/cache/

# Set ownership (adjust user/group as needed)
chown -R www-data:www-data storage/
chown -R www-data:www-data bootstrap/cache/

# Verify temp directory
mkdir -p storage/app/temp
chmod 775 storage/app/temp
```

### Step 5: Environment Configuration (3 minutes)
```bash
# Verify .env settings
cat .env | grep -E "APP_ENV|APP_DEBUG|LOG_LEVEL"
```

**Required settings:**
```ini
APP_ENV=production
APP_DEBUG=false
LOG_LEVEL=error
```

### Step 6: PHP Configuration (2 minutes)
```bash
# Verify PHP extensions
php -m | grep -E "gd|zip"
```

**Expected output:**
```
gd
zip
```

If missing, enable in `php.ini`:
```ini
extension=gd
extension=zip
```

### Step 7: Web Server Configuration (5 minutes)

#### For Apache
Add to `.htaccess` or Apache config:
```apache
# Allow larger uploads for bulk import
php_value upload_max_filesize 10M
php_value post_max_size 10M
php_value max_execution_time 60
php_value memory_limit 256M
```

#### For Nginx
Add to `nginx.conf`:
```nginx
# Allow larger uploads for bulk import
client_max_body_size 10M;

location ~ \.php$ {
    fastcgi_param PHP_VALUE "upload_max_filesize=10M \n post_max_size=10M \n max_execution_time=60 \n memory_limit=256M";
}
```

### Step 8: Database Verification (2 minutes)
```bash
# Check parameters table
php artisan tinker
>>> \App\Models\Parameter::count()
>>> exit
```

**Should return > 0**. If 0, seed parameters:
```bash
php artisan db:seed --class=ParametersSeeder
```

### Step 9: Restart Services (2 minutes)
```bash
# Restart PHP-FPM (if using Nginx)
sudo systemctl restart php8.2-fpm

# Restart Apache (if using Apache)
sudo systemctl restart apache2

# Restart queue workers (if using queues)
php artisan queue:restart
```

---

## Post-Deployment Testing

### Test 1: Template Download (2 minutes)
```bash
# Test Excel download
curl -X GET "https://your-domain.com/api/org/1/bulk-import/template?format=xlsx" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output test.xlsx

# Verify file
file test.xlsx
# Should output: Microsoft Excel 2007+

# Test CSV download
curl -X GET "https://your-domain.com/api/org/1/bulk-import/template?format=csv" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output test.csv

# Verify file
head test.csv
# Should show: Parameter,Value,Depth_m,Remarks
```

### Test 2: Validation Endpoint (3 minutes)
```bash
# Create a test file with valid data
echo "Parameter,Value,Depth_m,Remarks
Temperature,25.3,0,
pH,7.2,0," > valid.csv

# Upload for validation
curl -X POST "https://your-domain.com/api/org/1/bulk-import/validate" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@valid.csv"
```

**Expected response:**
```json
{
  "isValid": true,
  "totalRows": 2,
  "validRows": 2,
  "errors": [],
  "warnings": [],
  "preview": [...]
}
```

### Test 3: UI Workflow (5 minutes)
1. **Login** to application
2. **Navigate** to Overview page
3. **Download template** (Excel or CSV)
4. **Verify** file downloads and opens correctly
5. **Fill template** with 5-10 parameters
6. **Start wizard** → Complete Steps 1-2
7. **Upload template** in Step 3
8. **Verify** validation passes
9. **Confirm import**
10. **Submit test**

✅ **Success Criteria:**
- Template downloads without errors
- File contains correct structure
- Upload shows progress indicator
- Validation completes successfully
- Parameters appear in table
- Test saves to database

---

## Monitoring Setup

### 1. Laravel Logs
```bash
# Monitor logs in real-time
tail -f storage/logs/laravel.log

# Search for bulk import errors
grep "bulk-import" storage/logs/laravel.log

# Count validation failures
grep "Validation failed" storage/logs/laravel.log | wc -l
```

### 2. Web Server Logs

#### Apache
```bash
tail -f /var/log/apache2/error.log
tail -f /var/log/apache2/access.log | grep "bulk-import"
```

#### Nginx
```bash
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log | grep "bulk-import"
```

### 3. Performance Metrics
```bash
# Monitor upload times
grep "POST.*bulk-import/validate" /var/log/nginx/access.log | awk '{print $NF}'

# Monitor error rates
grep "bulk-import" storage/logs/laravel.log | grep "ERROR" | wc -l
```

### 4. Storage Usage
```bash
# Monitor temp directory size
du -sh storage/app/temp/

# Set up auto-cleanup cron job
crontab -e
# Add: 0 2 * * * find /path/to/storage/app/temp -type f -mtime +1 -delete
```

---

## Rollback Plan

If issues arise after deployment:

### Quick Rollback (5 minutes)
```bash
# Restore database backup
psql -U postgres lakeview_db < backup_YYYYMMDD_HHMMSS.sql

# Restore application files
tar -xzf app_backup_YYYYMMDD_HHMMSS.tar.gz

# Rebuild frontend with previous code
npm run build

# Clear caches
php artisan cache:clear
php artisan config:clear
php artisan route:clear

# Restart services
sudo systemctl restart apache2  # or nginx + php-fpm
```

### Disable Feature Only (1 minute)
```bash
# Comment out routes in routes/api.php
# Then clear route cache
php artisan route:clear
php artisan route:cache
```

---

## Security Hardening

### 1. Rate Limiting
Add to `app/Http/Kernel.php`:
```php
protected $middlewareGroups = [
    'api' => [
        'throttle:60,1', // 60 requests per minute
        // ... other middleware
    ],
];
```

### 2. File Upload Restrictions
Already implemented:
- ✅ File type validation (.xlsx, .csv only)
- ✅ File size limit (10 MB)
- ✅ Row count limit (5,000)
- ✅ Temp file storage (not public)

### 3. Authorization
Already implemented:
- ✅ ResolvesTenantContext trait
- ✅ Sanctum authentication
- ✅ Multi-tenancy isolation

### 4. Additional Recommendations
- [ ] Add virus scanning for uploaded files
- [ ] Implement audit logging for bulk imports
- [ ] Add CORS headers for API endpoints
- [ ] Set up fail2ban for repeated upload failures

---

## Performance Optimization

### 1. Opcode Caching
```bash
# Install OPcache (if not already)
sudo apt-get install php8.2-opcache

# Verify OPcache is enabled
php -i | grep opcache.enable
```

### 2. Database Indexing
```sql
-- Add index on parameters table for faster lookups
CREATE INDEX IF NOT EXISTS idx_parameters_name ON parameters(name);
CREATE INDEX IF NOT EXISTS idx_parameters_code ON parameters(code);
```

### 3. CDN for Assets (Optional)
Consider serving `public/build/` from CDN:
- CloudFlare
- AWS CloudFront
- Azure CDN

---

## User Communication

### 1. Release Notes
```markdown
# New Feature: Bulk Water Quality Parameter Import

We're excited to announce a new feature that allows you to import multiple 
water quality parameters at once using Excel or CSV templates!

**What's New:**
- Download pre-formatted templates from your dashboard
- Fill templates offline with hundreds of parameters
- Upload and validate data in seconds
- Import directly into the Add Test wizard

**How to Use:**
1. Click "Download Excel Template" on your Overview page
2. Fill in your water quality data
3. Upload the template when adding a new test
4. Review and submit!

**Limits:**
- Maximum file size: 10 MB
- Maximum rows: 5,000 parameters
- Supported formats: Excel (.xlsx) and CSV (.csv)

**Questions?**
See the Quick Start Guide or contact support@your-domain.com
```

### 2. Training Materials
- [ ] Create video tutorial (3-5 minutes)
- [ ] Add to help documentation
- [ ] Send email announcement to users
- [ ] Post announcement in dashboard

---

## Success Metrics

Track these metrics for 30 days after deployment:

### Adoption Metrics
- Number of template downloads per day
- Number of bulk imports per day
- Average parameters per import
- Percentage of users using bulk vs manual entry

### Performance Metrics
- Average upload time
- Average validation time
- Template download success rate
- Import success rate (vs validation failures)

### Error Metrics
- Validation failure rate
- Most common validation errors
- File upload failures
- API endpoint errors

### User Satisfaction
- Support tickets related to bulk import
- User feedback/ratings
- Feature usage growth over time

---

## Support Contacts

**Technical Issues:**
- Backend: [Backend Developer Contact]
- Frontend: [Frontend Developer Contact]
- DevOps: [DevOps Contact]

**User Support:**
- Email: support@your-domain.com
- Documentation: /docs/bulk-import
- Quick Start Guide: `BULK_IMPORT_QUICKSTART.md`

---

## Completion Checklist

### Pre-Deployment
- [ ] Code reviewed
- [ ] Tests passing
- [ ] Documentation complete
- [ ] Backup created
- [ ] Stakeholders notified

### Deployment
- [ ] Backend deployed
- [ ] Frontend built and deployed
- [ ] Permissions set correctly
- [ ] Services restarted
- [ ] Caches cleared

### Post-Deployment
- [ ] Template download tested
- [ ] File upload tested
- [ ] Validation tested
- [ ] End-to-end workflow tested
- [ ] Monitoring configured
- [ ] Users notified

### Follow-Up (Week 1)
- [ ] Monitor error logs daily
- [ ] Track usage metrics
- [ ] Gather user feedback
- [ ] Address any issues quickly
- [ ] Document lessons learned

---

**Deployment Status:** 🚧 Ready for Production  
**Go-Live Date:** [TBD]  
**Deployed By:** [Name]  
**Verified By:** [Name]
