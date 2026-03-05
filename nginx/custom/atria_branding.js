/* atrIA Branding - Dynamic DOM Replacement */
(function () {
    function rebrand() {
        // Replace text in the whole body
        const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while (node = walk.nextNode()) {
            if (node.nodeValue.includes('Dify')) {
                node.nodeValue = node.nodeValue.replace(/Dify/g, 'atrIA');
            }
        }

        // Hide specific elements that are hard to reach via CSS
        const communityHeader = Array.from(document.querySelectorAll('div')).find(el => el.textContent === 'Participe da comunidade');
        if (communityHeader) {
            communityHeader.parentElement.style.display = 'none';
        }

        // Change window title
        if (document.title.includes('Dify')) {
            document.title = document.title.replace(/Dify/g, 'atrIA');
        }

        // Hide specific logos by class
        document.querySelectorAll('[class*="Logo"], [class*="logo"]').forEach(el => {
            if (el.tagName === 'IMG' && el.src.includes('dify')) {
                el.style.display = 'none';
            }
        });
    }

    // Run periodically to catch Next.js hydration/navigation
    setInterval(rebrand, 1000);
    rebrand();
})();
