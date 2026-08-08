// Marketplace Responsive JS — Bounty #874
// Mobile filter toggle, lazy loading, skeleton states

document.addEventListener('DOMContentLoaded', () => {
    initFilterToggle();
    initLazyImages();
    initInfiniteScroll();
});

// Mobile filter toggle
function initFilterToggle() {
    const toggle = document.querySelector('.filter-toggle');
    const filters = document.querySelector('.marketplace-filters');
    if (!toggle || !filters) return;
    
    toggle.addEventListener('click', () => {
        filters.classList.toggle('open');
        toggle.setAttribute('aria-expanded', filters.classList.contains('open'));
    });
    
    // Close on overlay click
    document.addEventListener('click', (e) => {
        if (!filters.contains(e.target) && e.target !== toggle) {
            filters.classList.remove('open');
            toggle.setAttribute('aria-expanded', 'false');
        }
    });
}

// Lazy image loading
function initLazyImages() {
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('skeleton');
                    observer.unobserve(img);
                }
            });
        }, { rootMargin: '100px' });
        
        document.querySelectorAll('.marketplace-card img[data-src]').forEach(img => {
            observer.observe(img);
        });
    }
}

// Infinite scroll
function initInfiniteScroll() {
    const grid = document.querySelector('.marketplace-grid');
    if (!grid || !grid.dataset.nextPage) return;
    
    const sentinel = document.createElement('div');
    sentinel.className = 'scroll-sentinel';
    grid.after(sentinel);
    
    const observer = new IntersectionObserver(async (entries) => {
        if (entries[0].isIntersecting && grid.dataset.nextPage) {
            await loadMore(grid);
        }
    }, { rootMargin: '200px' });
    
    observer.observe(sentinel);
}

async function loadMore(grid) {
    const nextPage = grid.dataset.nextPage;
    try {
        const resp = await fetch(nextPage);
        const html = await resp.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const newCards = doc.querySelectorAll('.marketplace-card');
        newCards.forEach(card => grid.appendChild(card));
        grid.dataset.nextPage = doc.querySelector('.marketplace-grid')?.dataset.nextPage || '';
    } catch (e) {
        console.warn('Failed to load more items:', e);
    }
}
