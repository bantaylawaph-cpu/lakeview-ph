# Bulk Import Troubleshooting - Authentication Issues

## Problem: Downloading HTML Instead of File

When clicking the template download button, you get an HTML file (the application's main page) instead of the Excel/CSV file.

### Root Cause
The API request is not authenticated properly, so Laravel returns a redirect to the main app page.

---

## Solution Steps

### Step 1: Verify You're Logged In

1. Open the application in your browser
2. Check if you can see the Overview/Dashboard page
3. Look for your name/profile in the top right corner

If you're not logged in:
- Navigate to the login page
- Enter your credentials
- Log in successfully

### Step 2: Check Authentication Token

1. **Open Browser DevTools** (Press F12)
2. **Go to "Console" tab**
3. **Type this command:**
   ```javascript
   localStorage.getItem('auth.token')
   ```
4. **Press Enter**

**Expected Result:**
```
"1|aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890"
```

**If you get `null`:**
- You're not authenticated
- Log out and log back in
- Check the "Console" tab for any login errors

### Step 3: Test Template Download with Token

1. **Stay in the DevTools Console**
2. **Run this test command:**
   ```javascript
   fetch('/api/org/1/bulk-import/template?format=csv', {
     headers: {
       'Authorization': 'Bearer ' + localStorage.getItem('auth.token')
     }
   })
   .then(r => {
     console.log('Status:', r.status);
     console.log('Content-Type:', r.headers.get('content-type'));
     return r.text();
   })
   .then(text => {
     console.log('Response preview:', text.substring(0, 200));
   })
   .catch(e => console.error('Error:', e));
   ```

**Expected Output:**
```
Status: 200
Content-Type: text/csv
Response preview: "Parameter","Value","Depth_m","Remarks"
"pH","7.2","0","Surface sample"
...
```

**If you see HTML:**
```
Status: 200
Content-Type: text/html
Response preview: <!DOCTYPE html><html lang="en">...
```
This means authentication failed.

### Step 4: Check the Route

Replace `1` in the URL with your actual organization ID:

```javascript
// First, get your organization ID
fetch('/api/me', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('auth.token')
  }
})
.then(r => r.json())
.then(data => {
  console.log('Your organizations:', data.organizations);
  console.log('Use the ID from above in the template URL');
});
```

---

## Common Issues & Fixes

### Issue 1: Token is `null`
**Solution:** Log out and log back in

```javascript
// In DevTools Console:
localStorage.removeItem('auth.token');
// Then refresh page and log in again
```

### Issue 2: Token expired
**Symptoms:** Token exists but API returns 401 Unauthorized

**Solution:** Log out and log in again
```javascript
// Check token age
new Date(parseInt(localStorage.getItem('auth.user.ts')))
```

### Issue 3: Wrong Organization ID
**Symptoms:** 403 Forbidden error

**Solution:** Use correct organization ID from `/api/me`

### Issue 4: Routes not registered
**Symptoms:** 404 Not Found

**Check backend:**
```bash
php artisan route:list --path=bulk-import
```

Should show 6 routes. If not:
```bash
php artisan route:clear
php artisan route:cache
```

### Issue 5: CORS errors
**Symptoms:** "CORS policy" error in console

**Solution:** Check `config/cors.php`:
```php
'paths' => ['api/*', 'sanctum/csrf-cookie'],
```

---

## Manual Test (Backend)

Test the API directly with curl (replace `YOUR_TOKEN` and `TENANT_ID`):

```bash
# Get your token first
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "your@email.com", "password": "yourpassword"}'

# Copy the token from response, then test download:
curl -X GET "http://localhost:8000/api/org/1/bulk-import/template?format=csv" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -v

# Look for:
# < HTTP/1.1 200 OK
# < Content-Type: text/csv
# < Content-Disposition: attachment; filename="..."
```

**If you see:**
- `< HTTP/1.1 302 Found` - Authentication failed (redirect)
- `< Content-Type: text/html` - Not authenticated
- `< HTTP/1.1 403 Forbidden` - No permission for this org
- `< HTTP/1.1 404 Not Found` - Route not found

---

## Quick Fix Commands

### Clear all Laravel caches:
```bash
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear
```

### Rebuild production assets:
```bash
npm run build
```

### Restart development server:
```bash
# Stop current server (Ctrl+C)
php artisan serve
```

---

## Testing the Fix

1. **Refresh the page** (F5)
2. **Open DevTools Console** (F12)
3. **Check token:**
   ```javascript
   console.log(localStorage.getItem('auth.token') ? 'Authenticated ✓' : 'Not authenticated ✗');
   ```
4. **Try downloading template** from Overview page
5. **Check downloaded file:**
   - Should have `.xlsx` or `.csv` extension
   - Should NOT have `.html` extension
   - Should open in Excel/Sheets showing parameter columns

---

## If Still Not Working

### Enable Debugging

1. **Check browser Network tab:**
   - Open DevTools → Network tab
   - Click "Download Excel Template"
   - Look for the request to `/api/org/{tenant}/bulk-import/template`
   - Click on it to see:
     - Request Headers (should include `Authorization: Bearer ...`)
     - Response Headers (should be `Content-Type: text/csv` or `application/...sheet`)
     - Response body (should be file data, not HTML)

2. **Check Laravel logs:**
   ```bash
   tail -f storage/logs/laravel.log
   ```
   Then try downloading again. Look for:
   - Authentication errors
   - Authorization errors
   - Route errors

3. **Test with Postman/Insomnia:**
   - Method: GET
   - URL: `http://localhost:8000/api/org/1/bulk-import/template?format=csv`
   - Headers:
     - `Authorization: Bearer YOUR_TOKEN`
     - `Accept: text/csv`
   - Send request
   - Should receive file download

---

## Contact Support

If none of the above works, provide:
1. Screenshot of DevTools Console showing token check
2. Screenshot of DevTools Network tab showing the request
3. Content of `storage/logs/laravel.log` (last 50 lines)
4. Output of `php artisan route:list --path=bulk-import`
