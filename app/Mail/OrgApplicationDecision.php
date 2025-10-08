<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use App\Models\User;

class OrgApplicationDecision extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public string $status,
        public ?string $notes = null,
        public ?string $tenantName = null
    ) {}

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

        $map = [
            'approved' => 'Approved',
            'needs_changes' => 'Needs Changes',
            'rejected' => 'Rejected',
        ];
        $state = $map[$this->status] ?? ucfirst($this->status);
        $org = $this->tenantName ?: 'the organization';

        $subject = '🌊 LakeView PH — Your Organization Application Update';
        $notesBlock = '';
        if ($this->notes && trim($this->notes) !== '') {
            $notesBlock = "\n\nNotes from the reviewer: {$this->notes}";
        }
        $content = <<<TEXT
Hi {$name},

We’ve reviewed your organization application to {$org} and here’s the result:

Status: {$state}{$notesBlock}

Thank you for taking the time to apply.
We appreciate your interest in contributing to the LakeView PH community.

Wishing you clear skies and calm waters,
— LakeView PH
TEXT;

        return $this->subject($subject)
            ->text('mail.plain', [
                'content' => $content,
            ]);
    }
}
