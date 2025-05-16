window.initSwitcher = () => {
    const tabsContainer = document.querySelector('.settings-tabs');
    if (!tabsContainer) {
        console.warn('Settings tabs container not found.');
        return;
    }

    const tabs = Array.from(tabsContainer.querySelectorAll('.tab-item'));
    const contentPanels = document.querySelectorAll('.settings-content .content-panel');

    let secretSequence = [];
    const correctSecretSequence = [];

    if (tabs.length >= 3) {
        let left = 0;
        let right = tabs.length - 1;

        while (left <= right) {
            if (left === right) {
                correctSecretSequence.push(left);
            } else {
                correctSecretSequence.push(left);
                correctSecretSequence.push(right);
            }
            left++;
            right--;
        }
    }

    function activateTab(tabElement) {
        if (!tabElement) return;

        const targetId = tabElement.getAttribute('data-target');
        const targetPanel = document.getElementById(targetId);

        if (!targetPanel) {
            console.warn('Target panel not found:', targetId);
            return;
        }

        tabs.forEach(tab => {
            tab.classList.remove('active');
            tab.setAttribute('aria-selected', 'false');
        });
        tabElement.classList.add('active');
        tabElement.setAttribute('aria-selected', 'true');

        contentPanels.forEach(panel => panel.classList.remove('active'));
        targetPanel.classList.add('active');

        window.scrollTo(0, 0);
    }

    function unhideAllSettings(tabElement) {
        if (!tabElement) return;

        const targetId = tabElement.getAttribute('data-target');
        const targetPanel = document.getElementById(targetId);

        if (!targetPanel) {
            console.warn('Target panel not found:', targetId);
            return;
        }

        targetPanel.querySelectorAll('fieldset').forEach(child => {
            child.classList.remove('hidden');
        });
    }

    function showConfetti(event, options = {}) {
        const defaultOptions = {
            emoji: '✨',
            numConfetti: 20,
            fontSizeMin: 10,
            fontSizeMax: 25,
            centralAngleDegrees: 90,
            angleSpreadDegrees: 180,
            speedMin: 50,
            speedMax: 150,
            durationMin: 0.8,
            durationMax: 1.4,
        };

        const config = { ...defaultOptions, ...options };

        const clickedTabRect = event.target.getBoundingClientRect();
        const startX = clickedTabRect.left + clickedTabRect.width / 2;
        const startY = clickedTabRect.top + clickedTabRect.height / 2;

        const centralAngleRadians = config.centralAngleDegrees * Math.PI / 180;
        const angleSpreadRadians = config.angleSpreadDegrees * Math.PI / 180;

        for (let i = 0; i < config.numConfetti; i++) {
            const confetti = document.createElement('div');
            confetti.textContent = config.emoji;
            confetti.style.cssText = `
                position: fixed;
                font-size: ${Math.random() * (config.fontSizeMax - config.fontSizeMin) + config.fontSizeMin}px;
                left: ${startX}px;
                top: ${startY}px;
                pointer-events: none;
                z-index: 9999;
                opacity: 1;
                will-change: transform, opacity;
                transform: translate(0, 0);
            `;

            const randomOffset = (Math.random() - 0.5) * angleSpreadRadians;
            const angle = centralAngleRadians + randomOffset;

            const speed = Math.random() * (config.speedMax - config.speedMin) + config.speedMin;
            const duration = Math.random() * (config.durationMax - config.durationMin) + config.durationMin;
            const ease = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';

            document.body.appendChild(confetti);

            setTimeout(() => {
                const deltaX = Math.cos(angle) * speed;
                const deltaY = Math.sin(angle) * speed;

                confetti.style.transition = `transform ${duration}s ${ease}, opacity ${duration}s ${ease}`;
                confetti.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
                confetti.style.opacity = '0';
            }, 10);

            setTimeout(() => {
                confetti.remove();
            }, duration * 1000 + 100);
        }
    }

    let speedMultiplier = 1;
    function checkSecretSequence(tabIndex) {
        secretSequence.push(tabIndex);

        if (secretSequence.length > correctSecretSequence.length) {
            secretSequence.shift();
        }

        if (secretSequence.length === correctSecretSequence.length) {
            let isMatch = true;
            for (let i = 0; i < correctSecretSequence.length; i++) {
                if (secretSequence[i] !== correctSecretSequence[i]) {
                    isMatch = false;
                    break;
                }
            }

            if (isMatch) {
                let timeout = 0;

                tabs.forEach((tab, index) => {
                    setTimeout(() => {
                        const fakeEvent = { target: tab };
                        showConfetti(fakeEvent, {
                            emoji: '🎉',
                            numConfetti: 30,
                            fontSizeMin: 15,
                            fontSizeMax: 30,
                            centralAngleDegrees: 90,
                            angleSpreadDegrees: 360,
                            speedMin: 100,
                            speedMax: 200 * speedMultiplier
                        });
                    }, index * 150);
                    timeout += index * 150;
                });

                setTimeout(() => {
                    const letters = ["🇬", "🇴", "🇴", "🇫", "🇨", "🇴", "🇷", "🇩"];
                    for (let i = 0; i < 8; i++) {
                        setTimeout(() => {
                            const div = document.createElement('div');
                            div.style.top = `${randomIntFromInterval(25, 75)}%`;
                            div.style.left = `${randomIntFromInterval(25, 75)}%`;
                            div.style.position = 'fixed';
                            document.body.appendChild(div);
                            const fakeEvent = { target: div };
                            showConfetti(fakeEvent, {
                                emoji: letters[i],
                                numConfetti: 15,
                                fontSizeMin: 15,
                                fontSizeMax: 30,
                                centralAngleDegrees: 90,
                                angleSpreadDegrees: 360,
                                speedMin: 100,
                                speedMax: 200 * speedMultiplier,
                                durationMin: 1,
                                durationMax: 3
                            });
                            div.remove();
                        }, i * 250);
                    }
                }, timeout);

                secretSequence = [];
                speedMultiplier += 0.5;
                return true;
            }
        }

        return false;
    }

    let lastClickTime = 0;
    let clickCount = 0;
    let lastClickedTab = null;
    const clickTimeout = 300;

    tabsContainer.addEventListener('click', (event) => {
        const clickedTab = event.target.closest('.tab-item');
        if (!clickedTab) return;

        const tabIndex = tabs.indexOf(clickedTab);

        if (clickedTab !== lastClickedTab) clickCount = 0;
        lastClickedTab = clickedTab;

        const now = new Date().getTime();

        if (now - lastClickTime < clickTimeout) {
            clickCount++;
        } else {
            clickCount = 1;
        }

        lastClickTime = now;

        if (clickCount === 3) {
            unhideAllSettings(clickedTab);
            showConfetti(event, { emoji: '👁️', numConfetti: 25 });
            clickCount = 0;
        } else {
            if (clickCount === 1) {
                activateTab(clickedTab);
                const secretTriggered = checkSecretSequence(tabIndex);
                if (secretTriggered) {
                    console.log("Secret sequence activated! 🎉");
                }
            }
        }
    });

    tabs.forEach(tab => {
        if (!tab.hasAttribute('tabindex')) {
            tab.setAttribute('tabindex', '0');
        }
        tab.setAttribute('role', 'tab');
        const targetId = tab.getAttribute('data-target');
        tab.setAttribute('aria-controls', targetId);
        const isActive = tab.classList.contains('active');
        tab.setAttribute('aria-selected', isActive.toString());
    });

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
            return;
        }

        const activeTab = tabsContainer.querySelector('.tab-item.active');
        if (!activeTab) return;

        const activeIndex = tabs.indexOf(activeTab);
        let nextTab = null;

        if (event.key === 'ArrowRight') {
            event.preventDefault();
            nextTab = tabs[(activeIndex + 1) % tabs.length];
            activateTab(nextTab);
        } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            nextTab = tabs[(activeIndex - 1 + tabs.length) % tabs.length];
            activateTab(nextTab);
        }
    });

    tabsContainer.setAttribute('role', 'tablist');

    contentPanels.forEach(panel => {
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('tabindex', '0');
    });

    if (!tabsContainer.querySelector('.tab-item.active') && tabs.length > 0) {
        activateTab(tabs[0]);
    }

    function randomIntFromInterval(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }
}