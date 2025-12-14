<?php

// Simple test script to verify bulk import backend
// Run with: php test_bulk_import.php

require __DIR__ . '/vendor/autoload.php';

use App\Services\BulkImportTemplateGenerator;
use Illuminate\Support\Collection;

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Testing Bulk Import Template Generator...\n\n";

// Create mock parameters
$parameters = collect([
    (object)['id' => 1, 'code' => 'pH', 'name' => 'pH', 'unit' => '—'],
    (object)['id' => 2, 'code' => 'Temperature', 'name' => 'Temperature', 'unit' => '°C'],
    (object)['id' => 3, 'code' => 'DO', 'name' => 'Dissolved Oxygen', 'unit' => 'mg/L'],
]);

$generator = new BulkImportTemplateGenerator();

// Test Excel generation
echo "1. Testing Excel template generation...\n";
try {
    $result = $generator->generate($parameters, 'xlsx');
    echo "   ✓ Excel file generated successfully\n";
    echo "   - Filename: {$result['filename']}\n";
    
    if (file_exists($result['path'])) {
        $size = filesize($result['path']);
        echo "   - File size: " . number_format($size) . " bytes\n";
        unlink($result['path']);
    }
} catch (Exception $e) {
    echo "   ✗ Error: " . $e->getMessage() . "\n";
}

echo "\n2. Testing CSV template generation...\n";
try {
    $result = $generator->generate($parameters, 'csv');
    echo "   ✓ CSV file generated successfully\n";
    echo "   - Filename: {$result['filename']}\n";
    
    if (file_exists($result['path'])) {
        $size = filesize($result['path']);
        echo "   - File size: " . number_format($size) . " bytes\n";
        
        $content = file_get_contents($result['path']);
        echo "   - Content preview:\n";
        echo "     " . str_replace("\n", "\n     ", trim(substr($content, 0, 200))) . "\n";
        
        unlink($result['path']);
    }
} catch (Exception $e) {
    echo "   ✗ Error: " . $e->getMessage() . "\n";
}

echo "\n✓ All tests completed!\n";
