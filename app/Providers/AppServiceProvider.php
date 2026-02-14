<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Event;
use App\Events\FeedbackUpdated;
use App\Listeners\SendFeedbackUpdatedEmail;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Facades\URL;
use App\Models\Lake;
use App\Models\Watershed;
use App\Models\User;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Ensure generated URLs and asset() links use HTTPS in production behind a proxy (e.g., Render)
        // This prevents mixed-content issues when the app can't detect the forwarded scheme.
        if (config('app.env') === 'production' && filter_var(env('FORCE_HTTPS', true), FILTER_VALIDATE_BOOLEAN)) {
            URL::forceScheme('https');
        }

        // Avoid forcing a database connection during application boot; keep prod boot cheap.

        Relation::enforceMorphMap([
        'lake'      => Lake::class,
        'watershed' => Watershed::class,
        'user' => User::class
        // add more when you support other bodies
    ]);

    // Register event listeners (consolidated feedback email)
    Event::listen(FeedbackUpdated::class, [SendFeedbackUpdatedEmail::class, 'handle']);

        // Register KPI cache invalidation observers
        \App\Models\Tenant::observe(\App\Observers\TenantObserver::class);
        \App\Models\User::observe(\App\Observers\UserObserver::class);
        \App\Models\SamplingEvent::observe(\App\Observers\SamplingEventObserver::class);
    }
}
