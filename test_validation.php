<?php

require __DIR__.'/vendor/autoload.php';

use App\Services\BulkImportValidator;
use App\Models\Parameter;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;

// Bootstrap Laravel
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "Testing Bulk Import Validation\n";
echo "================================\n\n";

// Get all parameters
$parameters = Parameter::query()->get(['id', 'code', 'name', 'unit']);

echo "Found " . $parameters->count() . " parameters\n";
echo "First few: " . $parameters->take(3)->pluck('code')->join(', ') . "\n\n";

// Create a test CSV file
$csvContent = "Parameter,Value,Unit,Depth_m,Remarks\n";
$csvContent .= "pH,7.5,—,1.5,Normal reading\n";
$csvContent .= "DO,8.2,mg/L,1.5,Good oxygen level\n";
$csvContent .= "TSS,15.3,mg/L,1.5,\n";

$testFilePath = storage_path('app/temp/test_import.csv');
File::ensureDirectoryExists(dirname($testFilePath));
file_put_contents($testFilePath, $csvContent);

echo "Created test file: $testFilePath\n";
echo "File size: " . filesize($testFilePath) . " bytes\n\n";

// Create an UploadedFile instance
$uploadedFile = new UploadedFile(
    $testFilePath,
    'test_import.csv',
    'text/csv',
    null,
    true // test mode
);

// Validate
echo "Running validation...\n";
try {
    $validator = new BulkImportValidator();
    $result = $validator->validate($uploadedFile, $parameters);
    
    echo "\n✓ Validation completed\n";
    echo "Valid: " . ($result['valid'] ? 'Yes' : 'No') . "\n";
    echo "Row count: " . $result['rowCount'] . "\n";
    echo "Errors: " . count($result['errors']) . "\n";
    echo "Warnings: " . count($result['warnings']) . "\n";
    echo "Parameters found: " . count($result['parameters']) . "\n\n";
    
    if (!empty($result['errors'])) {
        echo "Errors:\n";
        foreach ($result['errors'] as $error) {
            echo "  - Row {$error['row']}, Column {$error['column']}: {$error['description']}\n";
        }
    }
    
    if (!empty($result['warnings'])) {
        echo "\nWarnings:\n";
        foreach ($result['warnings'] as $warning) {
            echo "  - Row {$warning['row']}, Column {$warning['column']}: {$warning['description']}\n";
        }
    }
    
    if (!empty($result['parameters'])) {
        echo "\nValidated Parameters:\n";
        foreach (array_slice($result['parameters'], 0, 3) as $param) {
            echo "  - {$param['parameter']}: {$param['value']} {$param['unit']} @ {$param['depth_m']}m\n";
        }
    }
    
} catch (\Exception $e) {
    echo "\n✗ Validation failed\n";
    echo "Error: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n";
    echo "Line: " . $e->getLine() . "\n";
}

// Clean up
unlink($testFilePath);
echo "\nTest file cleaned up.\n";
