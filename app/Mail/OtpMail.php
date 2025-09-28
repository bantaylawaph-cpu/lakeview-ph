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
        $subject = "Your LakeView PH verification code: {$this->code}";
        return $this->subject($subject)
            ->text('mail.plain', [
                'content' => <<<TEXT
Hi,

Your LakeView PH verification code is:

{$this->code}

This code expires in {$this->ttlMinutes} minutes. If you didn’t request it, you can ignore this email.

— LakeView PH
TEXT
            ]);
    }
}
