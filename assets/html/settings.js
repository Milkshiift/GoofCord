window.initSwitcher = () => {
    const tabsContainer = document.querySelector('.settings-tabs');
    const tabs = tabsContainer.querySelectorAll('.tab-item');
    const contentPanels = document.querySelectorAll('.settings-content .content-panel');

    tabsContainer.addEventListener('click', (event) => {
        const clickedTab = event.target.closest('.tab-item');
        if (!clickedTab) return;

        const targetId = clickedTab.getAttribute('data-target');
        const targetPanel = document.getElementById(targetId);

        if (!targetPanel) {
            console.warn('Target panel not found:', targetId);
            return;
        }

        tabs.forEach(tab => {
            tab.classList.remove('active');
        });
        clickedTab.classList.add('active');

        contentPanels.forEach(panel => {
            panel.classList.remove('active');
        });
        targetPanel.classList.add('active');

        window.scrollTo(0, 0);
    });
}