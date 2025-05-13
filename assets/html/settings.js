window.initSwitcher = () => {
    const tabsContainer = document.querySelector('.settings-tabs');
    const tabs = Array.from(tabsContainer.querySelectorAll('.tab-item'));
    const contentPanels = document.querySelectorAll('.settings-content .content-panel');

    // Function to activate a specific tab
    const activateTab = (tabElement) => {
        if (!tabElement) return;

        const targetId = tabElement.getAttribute('data-target');
        const targetPanel = document.getElementById(targetId);

        if (!targetPanel) {
            console.warn('Target panel not found:', targetId);
            return;
        }

        // Update tab states
        tabs.forEach(tab => tab.classList.remove('active'));
        tabElement.classList.add('active');

        // Update ARIA selected state
        tabs.forEach(tab => tab.setAttribute('aria-selected', 'false'));
        tabElement.setAttribute('aria-selected', 'true');

        // Update panel visibility
        contentPanels.forEach(panel => panel.classList.remove('active'));
        targetPanel.classList.add('active');

        // Scroll to top
        window.scrollTo(0, 0);
    };

    // Handle mouse clicks on tabs
    tabsContainer.addEventListener('click', (event) => {
        const clickedTab = event.target.closest('.tab-item');
        if (!clickedTab) return;
        activateTab(clickedTab);
    });

    // Make tabs focusable
    tabs.forEach(tab => {
        if (!tab.hasAttribute('tabindex')) {
            tab.setAttribute('tabindex', '0');
        }
    });

    // Global keyboard navigation (works even when header is unfocused)
    document.addEventListener('keydown', (event) => {
        // Only handle left/right arrows for tab navigation
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
            return;
        }

        const activeTab = tabsContainer.querySelector('.tab-item.active');
        if (!activeTab) return;

        const activeIndex = tabs.indexOf(activeTab);
        let nextTab = null;

        if (event.key === 'ArrowRight') {
            // Move to next tab (with wraparound)
            event.preventDefault();
            nextTab = tabs[(activeIndex + 1) % tabs.length];
            activateTab(nextTab);
        } else if (event.key === 'ArrowLeft') {
            // Move to previous tab (with wraparound)
            event.preventDefault();
            nextTab = tabs[(activeIndex - 1 + tabs.length) % tabs.length];
            activateTab(nextTab);
        }
    });

    // Add ARIA attributes for better accessibility
    tabsContainer.setAttribute('role', 'tablist');
    tabs.forEach(tab => {
        tab.setAttribute('role', 'tab');
        const targetId = tab.getAttribute('data-target');
        tab.setAttribute('aria-controls', targetId);

        const isActive = tab.classList.contains('active');
        tab.setAttribute('aria-selected', isActive.toString());
    });

    contentPanels.forEach(panel => {
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('tabindex', '0');
    });

    // Initialize: If no tab is active, activate the first one
    if (!tabsContainer.querySelector('.tab-item.active') && tabs.length > 0) {
        activateTab(tabs[0]);
    }
}