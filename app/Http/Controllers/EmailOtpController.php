<?php

namespace App\Http\Controllers;

use App\Mail\OtpMail;
use App\Models\User;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\{Cache, DB, Hash, Mail, Validator};
use Illuminate\Support\Str;

class EmailOtpController extends Controller
{
    // Tunables
    private int $codeLength = 6;
    private int $ttlMinutes = 10;              // OTP validity
    private int $resendCooldownSeconds = 180;  // 3 minutes
    private int $maxAttempts = 5;
    private int $resetTicketTtlMinutes = 15;   // ticket validity for reset

    private function now() { return now(); }

    private function makeCode(): string {
        return str_pad((string) random_int(0, 999999), $this->codeLength, '0', STR_PAD_LEFT);
    }

    private function codeHash(string $email, string $purpose, string $code): string {
        $pepper = config('app.otp_pepper') ?? env('OTP_PEPPER', '');
        return hash('sha256', "{$email}|{$purpose}|{$code}|{$pepper}");
    }

    private function sendOtp(string $email, string $code, string $purpose): void {
        Mail::to($email)->queue(new OtpMail($email, $code, $purpose, $this->ttlMinutes));
    }

    private function cooldownRemaining(?\DateTimeInterface $lastSentAt): int {
        if (!$lastSentAt) return 0;
        $elapsed = $this->now()->diffInSeconds($lastSentAt, true);
        return max(0, $this->resendCooldownSeconds - $elapsed);
    }

    private function upsertOtp(string $email, string $purpose, ?array $payload = null): array {
        $existing = DB::table('email_otps')
            ->where('email', $email)
            ->where('purpose', $purpose)
            ->whereNull('consumed_at')
            ->orderByDesc('id')
            ->first();

        if ($existing) {
            $lastSentAt = isset($existing->last_sent_at) && $existing->last_sent_at
                ? \Carbon\Carbon::parse($existing->last_sent_at)
                : null;
            $remaining = $this->cooldownRemaining($lastSentAt);
            if ($remaining > 0) {
                return ['ok' => false, 'cooldown' => $remaining];
            }
        }

        $code = $this->makeCode();
        $hash = $this->codeHash($email, $purpose, $code);
        $now  = $this->now();

        // Invalidate previous unconsumed codes for same email/purpose
        DB::table('email_otps')
            ->where('email', $email)
            ->where('purpose', $purpose)
            ->whereNull('consumed_at')
            ->update(['consumed_at' => $now]);

        DB::table('email_otps')->insert([
            'email'        => $email,
            'purpose'      => $purpose,
            'code_hash'    => $hash,
            'expires_at'   => $now->copy()->addMinutes($this->ttlMinutes),
            'last_sent_at' => $now,
            'attempts'     => 0,
            'payload'      => $payload ? json_encode($payload) : null,
            'created_at'   => $now,
            'updated_at'   => $now,
        ]);

        $this->sendOtp($email, $code, $purpose);
        $resp = ['ok' => true, 'cooldown' => $this->resendCooldownSeconds];
        // Testing convenience: expose plaintext code only in testing environment to enable end-to-end OTP verification.
        if (app()->environment('testing')) {
            $resp['test_code'] = $code;
        }
        return $resp;
    }

    private function checkOtp(string $email, string $purpose, string $code) {
        $row = DB::table('email_otps')
            ->where('email', $email)
            ->where('purpose', $purpose)
            ->whereNull('consumed_at')
            ->orderByDesc('id')
            ->first();

        if (!$row) return ['ok' => false, 'reason' => 'not_found'];
        $expiresAt = isset($row->expires_at) && $row->expires_at
            ? \Carbon\Carbon::parse($row->expires_at)
            : null;
        if ($expiresAt && $this->now()->greaterThan($expiresAt)) return ['ok' => false, 'reason' => 'expired'];
        if ($row->attempts >= $this->maxAttempts) return ['ok' => false, 'reason' => 'too_many_attempts'];

        $expected = $row->code_hash;
        $actual   = $this->codeHash($email, $purpose, $code);
        $match    = hash_equals($expected, $actual);

        if (!$match) {
            DB::table('email_otps')->where('id', $row->id)->update([
                'attempts'   => $row->attempts + 1,
                'updated_at' => $this->now(),
            ]);
            return ['ok' => false, 'reason' => 'mismatch', 'attempts' => $row->attempts + 1];
        }

        // Consume
        DB::table('email_otps')->where('id', $row->id)->update([
            'consumed_at' => $this->now(),
            'updated_at'  => $this->now(),
        ]);

        return ['ok' => true, 'row' => $row];
    }

    /* -------- Registration -------- */

    public function registerRequestOtp(Request $r) {
        $v = Validator::make($r->all(), [
            'email' => ['required','email','max:255','unique:users,email'],
            'name'  => ['required','string','max:255'],
            // Strong password: >=8, uppercase, number, special char
            'password' => ['required','string','min:8','regex:/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/','confirmed'],
        ], [
            'password.regex' => 'Password must have at least one uppercase letter, one number and one special character.'
        ]);
        if ($v->fails()) return response()->json(['errors' => $v->errors()], 422);

        $payload = [
            'name'          => $r->name,
            'email'         => $r->email,
            'password_hash' => Hash::make($r->password),
        ];

        $res = $this->upsertOtp($r->email, 'register', $payload);
        if (!$res['ok']) {
            return response()->json(['ok' => false, 'cooldown_seconds' => $res['cooldown']], 429);
        }
        $out = ['ok' => true, 'cooldown_seconds' => $res['cooldown']];
        if (isset($res['test_code'])) $out['test_code'] = $res['test_code'];
        return response()->json($out);
    }

    public function registerVerifyOtp(Request $r) {
        $v = Validator::make($r->all(), [
            'email'   => ['required','email'],
            'code'    => ['required','digits:6'],
            'remember'=> ['nullable','boolean'],
        ]);
        if ($v->fails()) return response()->json(['errors' => $v->errors()], 422);

        $check = $this->checkOtp($r->email, 'register', $r->code);
        if (!$check['ok']) return response()->json(['message' => 'Invalid or expired code.'], 422);

        $payload = json_decode($check['row']->payload ?? 'null', true) ?: [];
        // Resolve the default public role id (system scope). Fallback: attempt to insert canonical roles if missing.
        static $publicRoleId = null;
        if ($publicRoleId === null) {
            $publicRoleId = Role::where('name', Role::PUBLIC)->value('id');
            // Defensive: if roles table missing seeds, recreate minimal set.
            if (!$publicRoleId) {
                $canonical = [
                    ['name' => Role::PUBLIC, 'scope' => 'system'],
                    ['name' => Role::CONTRIBUTOR, 'scope' => 'tenant'],
                    ['name' => Role::ORG_ADMIN, 'scope' => 'tenant'],
                    ['name' => Role::SUPERADMIN, 'scope' => 'system'],
                ];
                foreach ($canonical as $c) {
                    Role::firstOrCreate(['name' => $c['name']], ['scope' => $c['scope']]);
                }
                $publicRoleId = Role::where('name', Role::PUBLIC)->value('id');
            }
        }

        $user = User::create([
            'name'              => $payload['name'] ?? 'User',
            'email'             => $r->email,
            'password'          => $payload['password_hash'] ?? Hash::make(Str::uuid()->toString()),
            'email_verified_at' => now(),
            'role_id'           => $publicRoleId,   // expected default role
            'tenant_id'         => null,            // enforce null for system role
        ]);

        // Issue token (match your “remember me” durations)
        $abilities = ['*'];
        $expiry    = ($r->boolean('remember') ? now()->addDays(30) : now()->addHours(2));
        $token     = $user->createToken('api', $abilities, $expiry)->plainTextToken;

        return response()->json([
            'ok'                   => true,
            'user'                 => $user,
            'token'                => $token,
            'remember_expires_at'  => $expiry->toIso8601String(),
        ]);
    }

    /* -------- Forgot Password -------- */

    public function forgotRequestOtp(Request $r) {
        $v = Validator::make($r->all(), ['email' => ['required','email']]);
        if ($v->fails()) return response()->json(['errors' => $v->errors()], 422);

        $user = User::where('email', $r->email)->first();
        if ($user) {
            $res = $this->upsertOtp($r->email, 'reset', null);
            if (!$res['ok']) {
                $out = ['ok' => true, 'cooldown_seconds' => $res['cooldown']];
                if (isset($res['test_code'])) $out['test_code'] = $res['test_code'];
                return response()->json($out);
            }
            $out = ['ok' => true, 'cooldown_seconds' => $this->resendCooldownSeconds];
            if (isset($res['test_code'])) $out['test_code'] = $res['test_code'];
            return response()->json($out);
        }
        // Don’t leak user existence
        return response()->json(['ok' => true, 'cooldown_seconds' => $this->resendCooldownSeconds]);
    }

    public function forgotVerifyOtp(Request $r) {
        $v = Validator::make($r->all(), [
            'email' => ['required','email'],
            'code'  => ['required','digits:6'],
        ]);
        if ($v->fails()) return response()->json(['errors' => $v->errors()], 422);

        $check = $this->checkOtp($r->email, 'reset', $r->code);
        if (!$check['ok']) return response()->json(['message' => 'Invalid or expired code.'], 422);

        // Short-lived reset ticket
        $ticket = (string) Str::uuid();
        Cache::put("pwreset:{$ticket}", $r->email, now()->addMinutes($this->resetTicketTtlMinutes));

        return response()->json([
            'ok' => true,
            'ticket' => $ticket,
            'ticket_expires_in' => $this->resetTicketTtlMinutes * 60
        ]);
    }

    public function forgotReset(Request $r) {
        $v = Validator::make($r->all(), [
            'ticket' => ['required','uuid'],
            'password' => ['required','string','min:8','regex:/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/','confirmed'],
        ], [
            'password.regex' => 'Password must have at least one uppercase letter, one number and one special character.'
        ]);
        if ($v->fails()) return response()->json(['errors' => $v->errors()], 422);

        $email = Cache::pull("pwreset:{$r->ticket}");
        if (!$email) return response()->json(['message' => 'Invalid or expired reset ticket.'], 422);

        $user = User::where('email', $email)->first();
        if (!$user) return response()->json(['message' => 'Account not found.'], 404);

        $user->forceFill(['password' => Hash::make($r->password)])->save();
        $user->tokens()->delete();

        return response()->json(['ok' => true]);
    }

    /* -------- Resend shared -------- */

    public function resend(Request $r) {
        $v = Validator::make($r->all(), [
            'email' => ['required','email'],
            'purpose' => ['required','in:register,reset'],
        ]);
        if ($v->fails()) return response()->json(['errors' => $v->errors()], 422);

        $res = $this->upsertOtp($r->email, $r->purpose, null);
        if (!$res['ok']) {
            return response()->json(['ok' => false, 'cooldown_seconds' => $res['cooldown']], 429);
        }
        return response()->json(['ok' => true, 'cooldown_seconds' => $this->resendCooldownSeconds]);
    }
}
