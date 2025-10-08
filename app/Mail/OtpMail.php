<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class OtpMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $email,
        public string $code,
        public string $purpose, // 'register' | 'reset'
        public int $ttlMinutes
    ) {}

    public function build() {
        // Try to personalize with first name if user exists (mainly for password reset)
        $firstName = 'there';
        try {
            $fullName = \App\Models\User::where('email', $this->email)->value('name');
            if ($fullName) {
                $parts = preg_split('/\s+/', trim($fullName));
                if ($parts && strlen($parts[0])) $firstName = $parts[0];
            }
        } catch (\Throwable $e) {}

        $subject = "🔐 Your LakeView PH Verification Code";
        $content = <<<TEXT
Hi {$firstName},

Before you dive in, please use the verification code below to continue your request:

👉 {$this->code}

This code will expire in {$this->ttlMinutes} minutes.
If you didn’t request this, please ignore this email.

Thank you,
— LakeView PH
TEXT;

        return $this->subject($subject)
            ->text('mail.plain', [
                'content' => $content,
            ]);
    }
}
