// Accessibility enhancements for MyZubster Gateway
(function() {
  'use strict';

  // Inject skip link
  const skipLink = document.createElement('a');
  skipLink.href = '#root';
  skipLink.className = 'skip-link';
  skipLink.textContent = 'Skip to main content';
  document.body.prepend(skipLink);

  // Add ARIA live region for dynamic content updates
  const liveRegion = document.createElement('div');
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.className = 'sr-only';
  liveRegion.id = 'aria-live-region';
  document.body.appendChild(liveRegion);

  // Observe DOM for new focusable elements
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        if (node.nodeType === 1) {
          // Ensure new interactive elements are keyboard accessible
          const focusable = node.querySelectorAll && node.querySelectorAll('div[onclick], span[onclick], li[onclick]');
          focusable.forEach(function(el) {
            if (!el.hasAttribute('tabindex')) {
              el.setAttribute('tabindex', '0');
              el.setAttribute('role', 'button');
            }
          });
        }
      });
    });
  });
  
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Trap focus in modals/dialogs (auto-detect)
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      const openModal = document.querySelector('[role="dialog"][open], dialog[open]');
      if (openModal) {
        openModal.close && openModal.close();
      }
    }
  });

  console.log('[a11y] MyZubster Gateway accessibility enhancements loaded');
})();
