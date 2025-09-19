// Theme Management System for ParseFlow
class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('parseflow-theme') || 'blue';
        this.init();
    }

    init() {
        // Apply saved theme on page load
        this.applyTheme(this.currentTheme);
        
        // Create theme selector if it doesn't exist
        this.createThemeSelector();
    }

    applyTheme(themeName) {
        // Remove all existing theme classes
        document.body.classList.remove('theme-blue', 'theme-purple', 'theme-teal', 'theme-orange');
        
        // Add the new theme class
        document.body.classList.add(`theme-${themeName}`);
        
        // Save to localStorage
        localStorage.setItem('parseflow-theme', themeName);
        this.currentTheme = themeName;
        
        // Dispatch theme change event
        window.dispatchEvent(new CustomEvent('themeChanged', { 
            detail: { theme: themeName } 
        }));
    }

    createThemeSelector() {
        // Check if theme selector already exists
        if (document.querySelector('.theme-selector')) return;

        const selector = document.createElement('div');
        selector.className = 'theme-selector';
        selector.innerHTML = `
            <div class="theme-selector-content">
                <h4>🎨 Theme</h4>
                <div class="theme-options">
                    <button class="theme-btn" data-theme="blue" title="Modern Blue">
                        <div class="theme-preview" style="background: #2563eb;"></div>
                    </button>
                    <button class="theme-btn" data-theme="purple" title="Elegant Purple">
                        <div class="theme-preview" style="background: #9333ea;"></div>
                    </button>
                    <button class="theme-btn" data-theme="teal" title="Sophisticated Teal">
                        <div class="theme-preview" style="background: #0d9488;"></div>
                    </button>
                    <button class="theme-btn" data-theme="orange" title="Warm Orange">
                        <div class="theme-preview" style="background: #ea580c;"></div>
                    </button>
                </div>
            </div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .theme-selector {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                border-radius: 12px;
                padding: 1rem;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
                z-index: 1000;
                border: 1px solid var(--gray-200, #e5e7eb);
                backdrop-filter: blur(10px);
            }

            .theme-selector h4 {
                margin: 0 0 0.75rem 0;
                font-size: 0.9rem;
                color: var(--gray-800, #1f2937);
                text-align: center;
            }

            .theme-options {
                display: flex;
                gap: 0.5rem;
            }

            .theme-btn {
                background: none;
                border: 2px solid transparent;
                border-radius: 8px;
                padding: 0.25rem;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .theme-btn:hover {
                border-color: var(--gray-300, #d1d5db);
            }

            .theme-btn.active {
                border-color: var(--theme-primary, #2563eb);
                box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
            }

            .theme-preview {
                width: 24px;
                height: 24px;
                border-radius: 4px;
                border: 2px solid white;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }

            @media (max-width: 768px) {
                .theme-selector {
                    top: 10px;
                    right: 10px;
                    padding: 0.75rem;
                }
                
                .theme-preview {
                    width: 20px;
                    height: 20px;
                }
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(selector);

        // Add event listeners
        const themeButtons = selector.querySelectorAll('.theme-btn');
        themeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const theme = btn.dataset.theme;
                this.applyTheme(theme);
                this.updateActiveButton(btn);
            });
        });

        // Set initial active button
        this.updateActiveButton(selector.querySelector(`[data-theme="${this.currentTheme}"]`));
    }

    updateActiveButton(activeBtn) {
        const allButtons = document.querySelectorAll('.theme-btn');
        allButtons.forEach(btn => btn.classList.remove('active'));
        if (activeBtn) activeBtn.classList.add('active');
    }

    // Method to get current theme colors
    getCurrentColors() {
        const root = document.documentElement;
        const computedStyle = getComputedStyle(root);
        
        return {
            primary: computedStyle.getPropertyValue('--theme-primary').trim(),
            accent: computedStyle.getPropertyValue('--theme-accent').trim(),
            primaryLight: computedStyle.getPropertyValue('--theme-primary-light').trim(),
            primaryDark: computedStyle.getPropertyValue('--theme-primary-dark').trim()
        };
    }

    // Method to set custom theme
    setCustomTheme(colors) {
        const root = document.documentElement;
        Object.entries(colors).forEach(([key, value]) => {
            root.style.setProperty(`--theme-${key}`, value);
        });
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager();
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
}
