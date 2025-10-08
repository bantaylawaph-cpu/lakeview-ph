<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use App\Models\User;
use App\Models\Tenant;

class OrgApplicationSubmitted extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public User $user, public Tenant $tenant, public string $initialStatus) {}

    public function build()
    {
        $name = 'there';
        try {
            $full = (string) ($this->user->name ?? '');
            if (trim($full) !== '') {
                $parts = preg_split('/\s+/', trim($full));
                if ($parts && strlen($parts[0])) $name = $parts[0];
            }
        } catch (\Throwable $e) {}

        $subject = '✅ LakeView PH — Your Organization Application Has Been Received';
        $content = <<<TEXT
Good day {$name},

Thank you for submitting your organization application to {$this->tenant->name}.

We’ve successfully received your details and our team will review your submission shortly.

Once the review is complete, we’ll reach out with an update.

Until then, may your day stay smooth sailing.

Best regards,
— LakeView PH
TEXT;

        return $this->subject($subject)
            ->text('mail.plain', [
                'content' => $content,
            ]);
    }
}
