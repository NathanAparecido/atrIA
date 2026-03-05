/* atrIA Branding - Dynamic DOM Replacement (Hardened) */
(function () {
    console.log("atrIA Branding Script Active");

    function rebrand() {
        try {
            // 1. Safe Logo Replacement (Avoid breaking React)
            const logoContainers = document.querySelectorAll('a[href*="dify.ai"], div[class*="logo"]');
            logoContainers.forEach(container => {
                // If it's the main header logo
                if (!container.hasAttribute('data-atria-branded')) {
                    container.setAttribute('data-atria-branded', 'true');
                    container.style.visibility = 'hidden'; // Hide original

                    // Inject our own absolute positioned logo safely next to it
                    const atriaLogo = document.createElement('div');
                    atriaLogo.innerText = 'atrIA';
                    atriaLogo.style.cssText = 'position: absolute; font-weight: 800; font-size: 20px; color: #fff; font-family: sans-serif; cursor: pointer; display: flex; align-items: center; z-index: 9999; margin-top: 5px; margin-left: 10px;';

                    if (container.parentElement) {
                        container.parentElement.style.position = 'relative';
                        container.parentElement.insertBefore(atriaLogo, container);
                    }
                }
            });

            // 2. Hide community/Dify specific elements
            const targets = [
                'Participe da comunidade',
                'Discord',
                'Roadmap',
                'GitHub',
                'Documentation'
            ];

            document.querySelectorAll('div, span, a').forEach(el => {
                if (targets.some(t => el.textContent === t)) {
                    el.style.display = 'none';
                    if (el.parentElement) el.parentElement.style.display = 'none';
                }
            });

            // 3. Icon and Logo Neutralization
            document.querySelectorAll('img, svg').forEach(el => {
                const src = el.src || "";
                const cls = el.className || "";
                if (src.includes('dify') || (typeof cls === 'string' && cls.toLowerCase().includes('logo'))) {
                    el.style.visibility = 'hidden';
                    el.style.display = 'none';
                }
            });

            // 4. Page Title
            if (document.title.includes('Dify')) {
                document.title = document.title.replace(/Dify/g, 'atrIA');
            }
        } catch (e) {
            // Silently fail to avoid breaking Next.js hydration
        }
    }

    // Run every 500ms to catch dynamic Next.js changes
    setInterval(rebrand, 500);
    rebrand();
})();
