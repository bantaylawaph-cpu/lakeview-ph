<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreFeedbackRequest;
use App\Http\Requests\PublicStoreFeedbackRequest;
use App\Models\Feedback;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class FeedbackController extends Controller
{
    public function store(StoreFeedbackRequest $request)
    {
        $user = $request->user();
        $v = $request->validated();

        $data = [
            'user_id' => $user->id,
            'tenant_id' => $user->tenant_id ?: null,
            'title' => $v['title'] ?? ($v['type'] ?? 'Lake feedback'),
            'message' => $v['message'] ?? ($v['description'] ?? ''),
            'category' => $this->mapTypeToCategory($v['type'] ?? ($v['category'] ?? null)),
            'lake_id' => $v['lake_id'] ?? null,
            'metadata' => array_merge($v['metadata'] ?? [], [
                'client' => [
                    'ua_hash' => substr(sha1((string)$request->userAgent()), 0, 16),
                    'lang' => $request->header('Accept-Language'),
                ],
            ]),
        ];

        // Handle image uploads if present
        if ($request->hasFile('images')) {
            $paths = [];
            $filesMeta = [];
            foreach ($request->file('images') as $file) {
                if (!$file->isValid()) continue;
                $stored = $this->storeWithOriginalName($file, $user?->id);
                $paths[] = $stored;
                $filesMeta[] = [
                    'path' => $stored,
                    'original' => (string) $file->getClientOriginalName(),
                    'mime' => (string) $file->getClientMimeType(),
                    'size' => (int) $file->getSize(),
                ];
            }
            if (!empty($paths)) $data['images'] = $paths;
            if (!empty($filesMeta)) {
                $data['metadata'] = array_merge($data['metadata'] ?? [], ['files' => $filesMeta]);
            }
        }
        $feedback = Feedback::create($data);
        return response()->json(['data' => $feedback], 201);
    }

    /**
     * Public (guest or authenticated) feedback submission.
     * Applies simple spam heuristics and honeypot validation (handled in request rules).
     */
    public function publicStore(PublicStoreFeedbackRequest $request)
    {
        $user = $request->user();
        $v = $request->validated();

        // Accept both legacy public feedback fields and new lake feedback fields
        $title = $v['title'] ?? ($v['type'] ?? 'Lake feedback');
        $message = $v['message'] ?? ($v['description'] ?? '');
        $category = $this->mapTypeToCategory($v['type'] ?? ($v['category'] ?? null));

        $payload = [
            'title' => trim($title),
            'message' => trim($message),
            'category' => $category,
            'lake_id' => $v['lake_id'] ?? null,
            'metadata' => [
                'client' => [
                    'ip' => $this->maskIp($request->ip()),
                    'ua_hash' => substr(sha1((string)$request->userAgent()), 0, 16),
                    'lang' => $request->header('Accept-Language'),
                ],
            ],
        ];

        if ($user) {
            $payload['user_id'] = $user->id;
            if ($user->tenant_id) { $payload['tenant_id'] = $user->tenant_id; }
            $payload['is_guest'] = false;
        } else {
            $payload['is_guest'] = true;
            $payload['guest_name'] = $v['guest_name'] ?? null;
            $payload['guest_email'] = $v['guest_email'] ?? ($v['contact'] ?? null);
        }

        // Spam heuristic scoring
        $payload['spam_score'] = $this->computeSpamScore($payload['message']);

        // Handle image uploads (multipart)
        if ($request->hasFile('images')) {
            $paths = [];
            $filesMeta = [];
            foreach ($request->file('images') as $file) {
                if (!$file->isValid()) continue;
                $stored = $this->storeWithOriginalName($file, $user?->id);
                $paths[] = $stored;
                $filesMeta[] = [
                    'path' => $stored,
                    'original' => (string) $file->getClientOriginalName(),
                    'mime' => (string) $file->getClientMimeType(),
                    'size' => (int) $file->getSize(),
                ];
            }
            if (!empty($paths)) $payload['images'] = $paths;
            if (!empty($filesMeta)) {
                $payload['metadata'] = array_merge($payload['metadata'] ?? [], ['files' => $filesMeta]);
            }
        }

        $feedback = Feedback::create($payload);
        return response()->json(['data' => $feedback], 201);
    }

    /**
     * Store uploaded file to public disk using a readable, mostly-original filename.
     * Ensures uniqueness and safety by slugifying the base name and appending timestamp + short rand.
     */
    private function storeWithOriginalName($file, $userId = null): string
    {
        try {
            $orig = (string) $file->getClientOriginalName();
        } catch (\Throwable $e) {
            $orig = '';
        }
        $base = $orig !== '' ? pathinfo($orig, PATHINFO_FILENAME) : 'file';
        $ext = strtolower($file->getClientOriginalExtension() ?: $file->extension());
        $slug = Str::slug(mb_substr($base, 0, 80)) ?: 'file';
        $stamp = date('Ymd-His');
        $uid = $userId ? ('u'.$userId.'-') : '';
        $rand = Str::lower(Str::random(5));
        $name = $uid.$slug.'-'.$stamp.'-'.$rand.($ext ? ('.'.$ext) : '');
        // Select disk (env override) – defaults to FEEDBACK_IMAGES_DISK or fallback to public if not configured
        $disk = env('FEEDBACK_IMAGES_DISK') ?: 'public';
        // Ensure prefix path; S3 will treat this as part of the object key
        return $file->storeAs('feedback', $name, $disk);
    }

    private function mapTypeToCategory($typeOrCategory): ?string
    {
        if (!$typeOrCategory) return null;
        $t = strtolower(trim($typeOrCategory));
        // Map UI strings to existing categories
        return match ($t) {
            'missing information' => 'data',
            'incorrect data' => 'data',
            'add photo' => 'ui',
            'other' => 'other',
            default => $t,
        };
    }

    private function computeSpamScore(string $text): int
    {
        $t = trim($text);
        if ($t === '') return 0;
        $len = mb_strlen($t);
        $maxRun = $this->longestRun($t);
        $freqRatio = $this->topCharRatio($t);
        $score = 0;
        if ($maxRun > 60) $score += 30;
        if ($freqRatio > 0.7) $score += 30;
        if ($len < 15) $score += 10;
        if ($len > 0 && preg_match('/^(?:[!?.\-_*\s]){10,}$/u', $t)) $score += 20; // mostly punctuation
        return min(60, $score);
    }

    private function longestRun(string $text): int
    {
        $prev = null; $run = 0; $max = 0; $len = mb_strlen($text);
        for ($i=0;$i<$len;$i++) {
            $ch = mb_substr($text,$i,1);
            if ($ch === $prev) { $run++; } else { $run = 1; $prev = $ch; }
            if ($run > $max) $max = $run;
        }
        return $max;
    }

    private function topCharRatio(string $text): float
    {
        $counts = [];
        $len = mb_strlen($text);
        for ($i=0;$i<$len;$i++) {
            $ch = mb_substr($text,$i,1);
            if (ctype_space($ch)) continue;
            $counts[$ch] = ($counts[$ch] ?? 0) + 1;
        }
        if (!$counts) return 0.0;
        $max = max($counts);
        return $max / max(1, $len);
    }

    private function maskIp(?string $ip): ?string
    {
        if (!$ip) return null;
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            $parts = explode('.', $ip);
            $parts[3] = 'x';
            return implode('.', $parts);
        }
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
            return substr($ip, 0, 16) . '::';
        }
        return null;
    }

    public function mine(Request $request)
    {
        $user = $request->user();
        $rows = Feedback::query()
            ->where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->paginate(15);
        return response()->json($rows);
    }

    public function show(Request $request, Feedback $feedback)
    {
        $user = $request->user();
        if ($feedback->user_id !== $user->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        return response()->json(['data' => $feedback]);
    }
}
