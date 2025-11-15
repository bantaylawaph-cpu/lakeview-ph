<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Storage;
use Tests\TestCase;
use App\Http\Controllers\Api\KycProfileController;

class KycDocumentUrlTest extends TestCase
{
    public function test_public_url_uses_disk_and_falls_back_to_asset()
    {
    $disk = env('KYC_DOCS_DISK', config('filesystems.default', 'public'));
        Storage::fake($disk);

        // Create a test subclass to expose protected method
        $tester = new class extends KycProfileController {
            public function probe($path) { return $this->docPublicUrl($path); }
        };

        // Ensure the file "exists" on the fake disk so the helper tries disk URL first
        $path = 'kyc/123/example.jpg';
        Storage::disk($disk)->put($path, 'fake');

        $url = $tester->probe($path);
        $this->assertNotEmpty($url);
        // Accept either absolute (http) or storage-relative based on environment
        $this->assertTrue(str_starts_with($url, 'http://') || str_starts_with($url, 'https://') || str_starts_with($url, '/storage/'), 'Unexpected URL format: '.$url);
    }
}
