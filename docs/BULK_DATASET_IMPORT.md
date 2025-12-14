# Bulk Dataset Import Feature

## Overview
The Bulk Dataset Import feature allows organization admins and contributors to import multiple water quality tests with multiple parameter measurements using an Excel template. This is ideal for importing historical data or large datasets collected during field sampling.

## Architecture

### Frontend Components

#### 1. **ImportChoiceModal** (`resources/js/components/modals/ImportChoiceModal.jsx`)
- Unified entry point for all imports
- Presents two options:
  - **Single Test Import**: Download template for importing parameters into a single test (uses existing Small WQT bulk import)
  - **Bulk Dataset Import**: Download template for importing multiple complete tests

#### 2. **BulkDatasetDownloadModal** (`resources/js/components/modals/BulkDatasetDownloadModal.jsx`)
- Lake and station selector for context-aware template generation
- Downloads Excel template pre-configured for the selected location
- Auto-navigates to upload page after successful download

#### 3. **BulkDatasetUploader** (`resources/js/components/bulk-import/BulkDatasetUploader.jsx`)
- Drag-and-drop file upload interface
- Validates uploaded file via API
- Displays errors and warnings in organized tables
- Download error log functionality
- Handles import submission

#### 4. **Upload Pages**
- `OrgBulkDatasetImport.jsx`: Organization admin upload page
- `ContribBulkDatasetImport.jsx`: Contributor upload page
- Both include:
  - Step-by-step instructions
  - Template download button
  - Upload component integration
  - Success/error handling

### Backend Services

#### 1. **BulkDatasetTemplateGenerator** (`app/Services/BulkDatasetTemplateGenerator.php`)
Generates Excel templates with two sheets:

**Instructions Sheet:**
- Lake and station information
- Detailed import instructions
- Required vs optional field documentation
- Data format guidelines

**Data Sheet:**
- Pre-formatted headers with required field indicators (*)
- Sample data rows (automatically detected and skipped during validation)
- Column definitions:
  - `Date*` - Sampling date (YYYY-MM-DD)
  - `Time*` - Sampling time (HH:MM, 24-hour)
  - `Sampler*` - Name of person who collected sample
  - `Method` - Sampling method (manual/automated/composite)
  - `Weather` - Weather conditions
  - `Air Temperature (°C)` - Air temperature
  - `Parameter*` - Water quality parameter name
  - `Value*` - Measured value
  - `Unit*` - Unit of measurement
  - `Depth (m)` - Sampling depth in meters
  - `Remarks` - Additional notes

#### 2. **BulkDatasetValidator** (`app/Services/BulkDatasetValidator.php`)
Performs comprehensive validation:

**Header Validation:**
- Ensures all required columns are present
- Validates column names match expected format

**Row Validation:**
- Required field presence (Date, Time, Sampler, Parameter, Value, Unit)
- Date format validation (YYYY-MM-DD)
- Time format validation (HH:MM or HH:MM:SS)
- Numeric value validation
- Parameter existence in database
- Depth and air temperature numeric validation

**Test Grouping:**
- Groups rows by unique combination of: Date + Time + Sampler
- Each unique combination = one sampling event (test)
- Multiple rows with same Date+Time+Sampler = multiple parameter measurements for that test

**Smart Features:**
- Automatically skips empty rows
- Detects and skips sample/example data (rows 2-4 with common example names)
- Returns detailed error messages with row and column information

#### 3. **BulkDatasetImporter** (`app/Services/BulkDatasetImporter.php`)
Handles atomic database operations:

**Database Structure:**
- **sampling_events**: One record per test (unique Date+Time+Sampler combination)
  - Stores: lake, station, date/time, sampler name, method, weather
  - Air temperature stored in notes field
  - Status set to 'draft'
  
- **sample_results**: One record per parameter measurement
  - Linked to sampling_event via sampling_event_id
  - Stores: parameter, value, unit, depth, remarks

**Transaction Safety:**
- All imports wrapped in database transaction
- Rollback on any error
- Returns detailed import statistics on success

#### 4. **BulkDatasetController** (`app/Http/Controllers/BulkDatasetController.php`)
Handles API endpoints:

- `GET /api/{org|contrib}/bulk-dataset/template` - Download template
  - Query params: `lake_id`, `station_id`, `format` (xlsx)
  - Returns: Excel file download
  
- `POST /api/{org|contrib}/bulk-dataset/validate` - Validate file
  - Body: `file`, `lake_id`, `station_id`
  - Returns: `{valid, testCount, resultCount, errors[], warnings[], tests[]}`
  
- `POST /api/{org|contrib}/bulk-dataset/import` - Import data
  - Body: `file`, `lake_id`, `station_id`
  - Validates then imports
  - Returns: `{success, message, testCount, resultCount}`
  
- `POST /api/{org|contrib}/bulk-dataset/error-log` - Download error log
  - Body: `errors[]`
  - Returns: Excel file with error details

### Routes

Routes defined in `routes/api.php`:

```php
// Organization Admin
Route::middleware(['auth:sanctum','role:org_admin,contributor'])
    ->prefix('org')
    ->group(function () {
        Route::get ('/bulk-dataset/template',     [BulkDatasetController::class, 'downloadTemplate']);
        Route::post('/bulk-dataset/validate',     [BulkDatasetController::class, 'validateFile']);
        Route::post('/bulk-dataset/import',       [BulkDatasetController::class, 'import']);
        Route::post('/bulk-dataset/error-log',    [BulkDatasetController::class, 'downloadErrorLog']);
    });

// Contributor
Route::middleware(['auth:sanctum','role:contributor,org_admin'])
    ->prefix('contrib')
    ->group(function () {
        // Same endpoints as above
    });
```

## User Workflow

### 1. **Access Import Feature**
Three ways to access:
- Dashboard Overview: Click "Start Import" button → Select "Bulk Dataset"
- Sidebar: Click "Bulk Dataset Import" (always visible)
- Direct navigation after template download (auto-redirect)

### 2. **Download Template**
1. Select lake from dropdown
2. Select station from dropdown
3. Click "Download Template"
4. Template downloads with lake/station context
5. Automatically redirects to upload page

### 3. **Fill Template**
1. Open downloaded Excel file
2. Read instructions on first sheet
3. Go to "Data" sheet
4. Delete sample rows (2-4)
5. Fill in data:
   - One row per parameter measurement
   - Group tests by using same Date, Time, and Sampler
   - Example:
     ```
     Date       | Time  | Sampler | Parameter | Value | Unit
     2025-12-14 | 09:00 | John    | pH        | 7.2   | pH units
     2025-12-14 | 09:00 | John    | DO        | 6.5   | mg/L
     2025-12-14 | 14:00 | Jane    | pH        | 7.4   | pH units
     ```
     This creates 2 tests: one for John at 09:00, one for Jane at 14:00

### 4. **Upload and Validate**
1. Drag file to upload area (or click to browse)
2. File automatically validates
3. Review validation results:
   - **Success**: Shows test count and result count
   - **Errors**: Shows table with row, column, and description
   - **Warnings**: Shows potential issues (non-blocking)
4. Download error log if needed (Excel format)

### 5. **Import Data**
1. If validation passes, "Import Data" button appears
2. Click to import
3. System creates:
   - Sampling events (tests)
   - Sample results (parameter measurements)
4. Success message shows imported counts
5. Auto-redirects to Water Quality Tests page

## Data Model

### Row Grouping Example

**Excel Data:**
```
Date       | Time  | Sampler      | Method | Weather | Air Temp | Parameter | Value | Unit
2025-12-14 | 09:00 | Juan Cruz    | manual | Sunny   | 28       | pH        | 7.2   | pH units
2025-12-14 | 09:00 | Juan Cruz    | manual | Sunny   | 28       | DO        | 6.5   | mg/L
2025-12-14 | 09:00 | Juan Cruz    | manual | Sunny   | 28       | Temp      | 25.3  | °C
2025-12-14 | 14:00 | Maria Santos | manual | Cloudy  | 26       | pH        | 7.4   | pH units
```

**Database Result:**

**sampling_events:**
| id | lake_id | station_id | sampled_at          | sampler_name  | method | weather | notes              | status |
|----|---------|------------|---------------------|---------------|--------|---------|--------------------| -------|
| 1  | 5       | 12         | 2025-12-14 09:00:00 | Juan Cruz     | manual | Sunny   | Air Temp: 28°C     | draft  |
| 2  | 5       | 12         | 2025-12-14 14:00:00 | Maria Santos  | manual | Cloudy  | Air Temp: 26°C     | draft  |

**sample_results:**
| id | sampling_event_id | parameter_id | value | unit      | depth_m |
|----|-------------------|--------------|-------|-----------|---------|
| 1  | 1                 | 10           | 7.2   | pH units  | 0       |
| 2  | 1                 | 11           | 6.5   | mg/L      | 0       |
| 3  | 1                 | 12           | 25.3  | °C        | 0       |
| 4  | 2                 | 10           | 7.4   | pH units  | 0       |

## Validation Rules

### Required Fields
- Date (format: YYYY-MM-DD)
- Time (format: HH:MM or HH:MM:SS, 24-hour)
- Sampler (any text)
- Parameter (must exist in database)
- Value (must be numeric)
- Unit (any text)

### Optional Fields
- Method (recommended: manual, automated, or composite)
- Weather (any text)
- Air Temperature (numeric, stored in notes)
- Depth (numeric, defaults to 0)
- Remarks (any text)

### Validation Errors
All errors include:
- Row number (1-indexed, including header)
- Column letter (A-K)
- Description of the error

### Common Validation Errors
- "Date is required"
- "Invalid date format. Use YYYY-MM-DD"
- "Time is required"
- "Invalid time format. Use HH:MM (24-hour)"
- "Parameter is required"
- "Unknown parameter: [name]" (parameter not in database)
- "Value must be a number"
- "Unit is required"

## Testing

### Manual Testing Checklist

#### Template Download
- [ ] Template downloads with correct lake/station info
- [ ] Instructions sheet is complete
- [ ] Data sheet has all columns
- [ ] Sample data is present
- [ ] Headers are styled correctly

#### Validation
- [ ] Empty file returns appropriate error
- [ ] Missing required fields trigger errors
- [ ] Invalid date format detected
- [ ] Invalid time format detected
- [ ] Unknown parameters detected
- [ ] Non-numeric values in Value field detected
- [ ] Sample rows (2-4) automatically skipped
- [ ] Empty rows skipped
- [ ] Row grouping works correctly
- [ ] Test count accurate
- [ ] Result count accurate

#### Import
- [ ] Valid file imports successfully
- [ ] Sampling events created correctly
- [ ] Sample results created correctly
- [ ] Date/time combined properly
- [ ] Method and weather stored
- [ ] Air temperature in notes
- [ ] Depth defaults to 0 when empty
- [ ] Transaction rollback on error
- [ ] Success message shows correct counts
- [ ] Redirects to tests page

#### Error Handling
- [ ] Large file size limit enforced (10MB)
- [ ] Invalid file type rejected
- [ ] Database errors caught
- [ ] Validation errors displayed clearly
- [ ] Error log download works
- [ ] Network errors handled gracefully

## Dependencies

### PHP
- Laravel 12.0
- PhpSpreadsheet 5.3.0 (Excel generation/parsing)
- Carbon (date/time handling)

### JavaScript
- React 18.3.1
- React Router (navigation)
- Vite 7.2.6 (build)

### Database
- PostgreSQL with PostGIS
- Tables: `sampling_events`, `sample_results`, `parameters`, `lakes`, `stations`

## Performance Considerations

- File size limit: 10MB
- Template caching: None (generated on-demand)
- Validation: In-memory processing
- Import: Transactional (all-or-nothing)
- Large datasets: Consider chunking for 1000+ rows

## Security

- Authentication: Sanctum bearer tokens
- Authorization: org_admin and contributor roles only
- File validation: Mime type checking (xlsx, xls only)
- SQL injection: Protected by Laravel query builder
- XSS: React auto-escapes output
- CSRF: Sanctum provides CSRF protection

## Future Enhancements

1. **CSV Support**: Add CSV export option for templates
2. **Batch Processing**: Handle very large files (10,000+ rows) with queue jobs
3. **Duplicate Detection**: Warn about potential duplicate tests
4. **Auto-Publish**: Option to auto-publish imported tests
5. **Preview**: Show data preview before import
6. **Progress Bar**: Real-time import progress for large files
7. **Validation Cache**: Cache parameter lists for faster validation
8. **Template Customization**: Allow custom column ordering
9. **Multi-Lake Import**: Support importing tests from multiple lakes in one file
10. **API Documentation**: Generate OpenAPI spec for bulk import endpoints

## Troubleshooting

### "Unknown parameter" error
- **Cause**: Parameter name in Excel doesn't match database exactly
- **Solution**: Ensure parameter names match exactly (case-sensitive)

### "Invalid date format" error
- **Cause**: Date not in YYYY-MM-DD format
- **Solution**: Format cells as text, use YYYY-MM-DD (e.g., 2025-12-14)

### Import fails silently
- **Cause**: Database transaction rollback due to constraint violation
- **Solution**: Check Laravel logs at `storage/logs/laravel.log`

### Template download fails
- **Cause**: Invalid lake or station ID
- **Solution**: Ensure lake and station exist in database

### File upload timeout
- **Cause**: File too large or slow network
- **Solution**: Check file size (max 10MB), check network connection

## Support
For issues or questions, check:
- Laravel logs: `storage/logs/laravel.log`
- Browser console for frontend errors
- Network tab for API request/response details
