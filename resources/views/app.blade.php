<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>LakeView PH</title>
    @viteReactRefresh
    @vite('resources/js/app.jsx')

    <link rel="icon" type="image/png" href="{{ asset('lakeview-logo-alt.webp') }}">

        <!-- Preconnects to speed up first paint for OSM tiles and fonts -->
        <link rel="preconnect" href="https://{s}.tile.openstreetmap.org" crossorigin>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>

        <style>
            /* Instant, no-JS loading shell */
            :root { --lv-accent: #2563eb; }
            html, body { height: 100%; margin: 0; }
            #lv-boot { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: #0b1220; color: #e5e7eb; z-index: 9999; }
            #lv-boot .wrap { display: flex; flex-direction: column; align-items: center; gap: 16px; }
            #lv-boot img { width: 72px; height: 72px; object-fit: contain; filter: drop-shadow(0 2px 14px rgba(37,99,235,0.45)); }
            #lv-boot .brand { font: 600 18px/1.1 system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji'; letter-spacing: .3px; }
            #lv-boot .spinner { width: 28px; height: 28px; border: 3px solid rgba(255,255,255,.18); border-top-color: var(--lv-accent); border-radius: 50%; animation: lvspin 0.9s linear infinite; }
            @keyframes lvspin { to { transform: rotate(360deg); } }
            /* Hide boot once app mounted */
            .lv-boot-hidden { opacity: 0; pointer-events: none; transition: opacity .25s ease; }
        </style>

</head>
<body>
        <!-- Instant loader to avoid white flash before JS mounts -->
        <div id="lv-boot" role="status" aria-live="polite">
            <div class="wrap">
                <img src="{{ asset('lakeview-logo-alt.webp') }}" alt="LakeView PH" />
                <div class="brand">Loading LakeView PH…</div>
                <div class="spinner" aria-hidden="true"></div>
            </div>
        </div>
    <div id="root"></div>
        <script>
            // Hide the boot screen as soon as the SPA is ready
            (function() {
                function hideBoot() {
                    var b = document.getElementById('lv-boot');
                    if (!b) return;
                    b.classList.add('lv-boot-hidden');
                    setTimeout(function(){ b.parentNode && b.parentNode.removeChild(b); }, 320);
                }
                // App will dispatch this when React mounts
                window.addEventListener('lv-app-mounted', hideBoot);
                // Fallback timeout in case event is missed
                setTimeout(hideBoot, 5000);
            })();
        </script>
</body>
</html>