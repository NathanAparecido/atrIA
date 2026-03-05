/* atrIA Branding - Dynamic DOM Replacement (Hardened) */
(function () {
    console.log("atrIA Branding Script Active");

    function rebrand() {
        try {
            // 1. Precise Text Replacement in visible Nodes
            const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
            let node;
            while (node = walk.nextNode()) {
                if (node.nodeValue && /Dify/i.test(node.nodeValue)) {
                    node.nodeValue = node.nodeValue.replace(/Dify/g, 'atrIA').replace(/dify/g, 'atria');
                }
            }

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
