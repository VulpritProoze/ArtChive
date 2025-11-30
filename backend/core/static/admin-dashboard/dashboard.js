// Dashboard JavaScript

(function() {
    'use strict';

    const htmlElement = document.documentElement;
    
    // Theme Manager - Manual reactivity without Alpine.js
    const ThemeManager = {
        STORAGE_KEY: 'adminTheme',
        currentTheme: 'auto',
        systemPrefersDark: false,
        
        // Get theme from localStorage (matching $persist behavior)
        getTheme() {
            try {
                const stored = localStorage.getItem(this.STORAGE_KEY);
                return stored || 'auto';
            } catch (e) {
                return 'auto';
            }
        },
        
        // Set theme in localStorage
        setTheme(theme) {
            try {
                localStorage.setItem(this.STORAGE_KEY, theme);
                this.currentTheme = theme;
                this.applyTheme();
            } catch (e) {
                console.error('Failed to save theme:', e);
            }
        },
        
        // Check if system prefers dark mode
        getSystemPrefersDark() {
            if (window.matchMedia) {
                return window.matchMedia('(prefers-color-scheme: dark)').matches;
            }
            return false;
        },
        
        // Determine if dark mode should be active
        shouldBeDark() {
            if (this.currentTheme === 'dark') return true;
            if (this.currentTheme === 'light') return false;
            // 'auto' mode - use system preference
            return this.systemPrefersDark;
        },
        
        // Apply theme to HTML element
        applyTheme() {
            const shouldBeDark = this.shouldBeDark();
            const currentlyDark = htmlElement.classList.contains('dark');
            
            // Only update if state actually changed
            if (shouldBeDark === currentlyDark) {
                this.updateThemeIcon();
                return;
            }
            
            if (shouldBeDark) {
                htmlElement.classList.add('dark');
            } else {
                htmlElement.classList.remove('dark');
            }
            
            // Also apply to body for good measure
            const body = document.body;
            if (body) {
                if (shouldBeDark) {
                    body.classList.add('dark');
                } else {
                    body.classList.remove('dark');
                }
            }
            
            // Force multiple reflows to ensure styles apply
            void htmlElement.offsetHeight;
            void body.offsetHeight;
            
            // Trigger a custom event for any listeners
            window.dispatchEvent(new CustomEvent('themechange', {
                detail: { isDark: shouldBeDark, theme: this.currentTheme }
            }));
            
            this.updateThemeIcon();
        },
        
        // Update theme toggle button icon
        updateThemeIcon() {
            const darkIcon = document.getElementById('theme-icon-dark'); // Sun icon
            const lightIcon = document.getElementById('theme-icon-light'); // Moon icon
            const systemIcon = document.getElementById('theme-icon-system'); // Monitor icon
            
            if (darkIcon && lightIcon && systemIcon) {
                // Hide all icons first
                darkIcon.style.display = 'none';
                lightIcon.style.display = 'none';
                systemIcon.style.display = 'none';
                
                // Show the appropriate icon based on current theme
                // Note: icon naming is confusing - darkIcon is actually sun, lightIcon is moon
                // light mode -> sun icon (theme-icon-dark, which is actually the sun)
                // dark mode -> moon icon (theme-icon-light, which is actually the moon)
                // auto/system mode -> monitor icon (theme-icon-system)
                if (this.currentTheme === 'light') {
                    darkIcon.style.display = 'block'; // Sun for light mode
                } else if (this.currentTheme === 'dark') {
                    lightIcon.style.display = 'block'; // Moon for dark mode
                } else {
                    // auto/system mode
                    systemIcon.style.display = 'block'; // Monitor for system mode
                }
            }
        },
        
        // Toggle theme: dark -> light -> auto -> dark
        toggleTheme() {
            const themes = ['dark', 'light', 'auto'];
            const currentIndex = themes.indexOf(this.currentTheme);
            const nextIndex = (currentIndex + 1) % themes.length;
            this.setTheme(themes[nextIndex]);
        },
        
        // Initialize theme manager
        init() {
            // Prevent multiple initializations
            if (this._initialized) {
                return;
            }
            this._initialized = true;
            
            // Get initial theme
            this.currentTheme = this.getTheme();
            this.systemPrefersDark = this.getSystemPrefersDark();
            
            // Apply initial theme
            this.applyTheme();
            
            // Watch for system preference changes
            if (window.matchMedia) {
                const mq = window.matchMedia('(prefers-color-scheme: dark)');
                const self = this;
                mq.addEventListener('change', function(e) {
                    self.systemPrefersDark = e.matches;
                    // Only update if in 'auto' mode
                    if (self.currentTheme === 'auto') {
                        self.applyTheme();
                    }
                });
            }
            
            // Watch for localStorage changes (in case theme is changed in another tab/window)
            window.addEventListener('storage', (e) => {
                if (e.key === this.STORAGE_KEY) {
                    this.currentTheme = e.newValue || 'auto';
                    this.applyTheme();
                }
            });
            
            // Set up theme toggle button
            const toggleBtn = document.getElementById('theme-toggle-btn');
            if (toggleBtn) {
                // Remove any existing listeners to prevent duplicates
                const newToggleBtn = toggleBtn.cloneNode(true);
                toggleBtn.parentNode.replaceChild(newToggleBtn, toggleBtn);
                
                newToggleBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.toggleTheme();
                });
            }
        }
    };
    
    // Initialize theme manager - wait a bit to ensure DOM is ready
    function initializeThemeManager() {
        // Small delay to ensure all scripts are loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => ThemeManager.init(), 100);
            });
        } else {
            // DOM already loaded, but wait a bit for other scripts
            setTimeout(() => ThemeManager.init(), 100);
        }
    }
    
    initializeThemeManager();
    
    // Expose ThemeManager globally for debugging
    window.ThemeManager = ThemeManager;

    // Get current theme from ThemeManager or detect from DOM
    function getCurrentTheme() {
        // First check DOM directly (most reliable for initial load)
        const htmlHasDark = htmlElement.classList.contains('dark');
        const bodyHasDark = document.body && document.body.classList.contains('dark');
        
        if (htmlHasDark || bodyHasDark) {
            return 'dark';
        }
        
        // Then check ThemeManager if available
        if (window.ThemeManager && window.ThemeManager.shouldBeDark) {
            return window.ThemeManager.shouldBeDark() ? 'dark' : 'light';
        }
        
        // Final fallback: check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        
        return 'light';
    }

    // Helper function to get CSS variable value
    function getCSSVariable(variableName) {
        const root = document.documentElement;
        const value = getComputedStyle(root).getPropertyValue(variableName).trim();
        return value || null;
    }

    // ApexCharts Theme Configuration - uses Unfold CSS variables
    function getApexChartsTheme(theme) {
        const isDark = theme === 'dark';
        
        // Get Unfold theme colors from CSS variables
        // Fallback to sensible defaults if variables aren't available
        const getColor = (varName, lightFallback, darkFallback) => {
            const value = getCSSVariable(varName);
            if (value) return value;
            return isDark ? darkFallback : lightFallback;
        };

        if (isDark) {
            return {
                theme: {
                    mode: 'dark',
                    palette: 'palette2'
                },
                chart: {
                    background: getColor('--color-base-800', '#1f2937', '#1f2937'),
                    foreColor: getColor('--color-font-default-dark', '#f3f4f6', '#f3f4f6'),
                    toolbar: {
                        tools: {
                            download: false,
                            selection: false,
                            zoom: false,
                            zoomin: false,
                            zoomout: false,
                            pan: false,
                            reset: false
                        }
                    }
                },
                grid: {
                    borderColor: getColor('--color-base-700', '#374151', '#374151'),
                    strokeDashArray: 3
                },
                tooltip: {
                    theme: 'dark',
                    style: {
                        fontSize: '12px',
                        fontFamily: 'inherit'
                    }
                },
                legend: {
                    labels: {
                        colors: getColor('--color-font-default-dark', '#f3f4f6', '#f3f4f6')
                    }
                },
                xaxis: {
                    labels: {
                        style: {
                            colors: getColor('--color-font-muted-dark', '#9ca3af', '#9ca3af'),
                            fontSize: '12px',
                            fontFamily: 'inherit'
                        }
                    },
                    axisBorder: {
                        color: getColor('--color-base-700', '#374151', '#374151')
                    },
                    axisTicks: {
                        color: getColor('--color-base-700', '#374151', '#374151')
                    }
                },
                yaxis: {
                    labels: {
                        style: {
                            colors: getColor('--color-font-muted-dark', '#9ca3af', '#9ca3af'),
                            fontSize: '12px',
                            fontFamily: 'inherit'
                        }
                    }
                }
            };
        } else {
            return {
                theme: {
                    mode: 'light',
                    palette: 'palette1'
                },
                chart: {
                    background: getColor('--color-base-100', '#ffffff', '#ffffff'),
                    foreColor: getColor('--color-font-default-light', '#111827', '#111827'),
                    toolbar: {
                        tools: {
                            download: false,
                            selection: false,
                            zoom: false,
                            zoomin: false,
                            zoomout: false,
                            pan: false,
                            reset: false
                        }
                    }
                },
                grid: {
                    borderColor: getColor('--color-base-300', '#e5e7eb', '#e5e7eb'),
                    strokeDashArray: 3
                },
                tooltip: {
                    theme: 'light',
                    style: {
                        fontSize: '12px',
                        fontFamily: 'inherit'
                    }
                },
                legend: {
                    labels: {
                        colors: getColor('--color-font-default-light', '#111827', '#111827')
                    }
                },
                xaxis: {
                    labels: {
                        style: {
                            colors: getColor('--color-font-muted-light', '#6b7280', '#6b7280'),
                            fontSize: '12px',
                            fontFamily: 'inherit'
                        }
                    },
                    axisBorder: {
                        color: getColor('--color-base-300', '#e5e7eb', '#e5e7eb')
                    },
                    axisTicks: {
                        color: getColor('--color-base-300', '#e5e7eb', '#e5e7eb')
                    }
                },
                yaxis: {
                    labels: {
                        style: {
                            colors: getColor('--color-font-muted-light', '#6b7280', '#6b7280'),
                            fontSize: '12px',
                            fontFamily: 'inherit'
                        }
                    }
                }
            };
        }
    }

    // Store all chart instances globally
    window._dashboardCharts = window._dashboardCharts || [];

    // Update all ApexCharts instances with new theme
    function updateApexChartsTheme(theme) {
        // If theme is not provided, detect it
        if (!theme) {
            theme = getCurrentTheme();
        }
        
        const chartConfig = getApexChartsTheme(theme);
        
        // Update all registered chart instances
        if (window._dashboardCharts && window._dashboardCharts.length > 0) {
            window._dashboardCharts.forEach(function(chart) {
                if (chart && typeof chart.updateOptions === 'function') {
                    try {
                        // Update with full theme config including axes and legend
                        chart.updateOptions({
                            theme: chartConfig.theme,
                            chart: chartConfig.chart,
                            grid: chartConfig.grid,
                            tooltip: chartConfig.tooltip,
                            legend: chartConfig.legend,
                            xaxis: chartConfig.xaxis,
                            yaxis: chartConfig.yaxis
                        }, false, false, false);
                    } catch (e) {
                        console.warn('Failed to update chart theme:', e);
                    }
                }
            });
        }
        
        // Also try to find charts by ID pattern (backward compatibility)
        if (window.ApexCharts) {
            const chartContainers = document.querySelectorAll('[id$="-chart"]');
            chartContainers.forEach(function(container) {
                const chartId = container.id;
                const chartInstance = window[chartId + '_chart'];
                if (chartInstance && typeof chartInstance.updateOptions === 'function') {
                    try {
                        chartInstance.updateOptions({
                            theme: chartConfig.theme,
                            chart: chartConfig.chart,
                            grid: chartConfig.grid,
                            tooltip: chartConfig.tooltip,
                            legend: chartConfig.legend,
                            xaxis: chartConfig.xaxis,
                            yaxis: chartConfig.yaxis
                        }, false, false, false);
                    } catch (e) {
                        // Chart might not be ready yet, ignore
                    }
                }
            });
        }
    }

    // Helper function to create ApexCharts with theme support and fixed height
    window.createDashboardChart = function(elementId, options) {
        // Detect theme more reliably on initial load
        // Check DOM directly first, then ThemeManager
        let currentTheme = 'light';
        const htmlHasDark = htmlElement.classList.contains('dark');
        const bodyHasDark = document.body && document.body.classList.contains('dark');
        
        if (htmlHasDark || bodyHasDark) {
            currentTheme = 'dark';
        } else if (window.ThemeManager && window.ThemeManager.shouldBeDark) {
            // Use ThemeManager if available and DOM doesn't have dark class
            currentTheme = window.ThemeManager.shouldBeDark() ? 'dark' : 'light';
        } else {
            // Final fallback: check system preference
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                currentTheme = 'dark';
            }
        }
        
        const themeConfig = getApexChartsTheme(currentTheme);
        
        // Get the chart container
        const chartElement = document.querySelector('#' + elementId);
        if (!chartElement) {
            console.error('Chart element not found:', elementId);
            return null;
        }
        
        // Fixed height - default 400px, can be overridden in options
        const fixedHeight = options.chart?.height || 400;
        
        const defaultOptions = {
            chart: {
                type: 'line',
                height: fixedHeight,
                toolbar: {
                    show: false
                },
                ...themeConfig.chart,
                ...(options.chart || {})
            },
            theme: themeConfig.theme,
            grid: themeConfig.grid,
            tooltip: themeConfig.tooltip,
            legend: themeConfig.legend,
            xaxis: {
                ...themeConfig.xaxis,
                ...(options.xaxis || {})
            },
            yaxis: {
                ...themeConfig.yaxis,
                ...(options.yaxis || {})
            },
            // Keep responsive breakpoints but with fixed heights
            responsive: [{
                breakpoint: 1024,
                options: {
                    chart: {
                        height: fixedHeight
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }, {
                breakpoint: 768,
                options: {
                    chart: {
                        height: fixedHeight
                    },
                    legend: {
                        position: 'bottom',
                        fontSize: '12px'
                    },
                    xaxis: {
                        labels: {
                            rotate: -45,
                            style: {
                                fontSize: '10px'
                            }
                        }
                    }
                }
            }, {
                breakpoint: 640,
                options: {
                    chart: {
                        height: fixedHeight
                    },
                    legend: {
                        position: 'bottom',
                        fontSize: '10px'
                    },
                    xaxis: {
                        labels: {
                            rotate: -45,
                            style: {
                                fontSize: '9px'
                            }
                        }
                    },
                    yaxis: {
                        labels: {
                            style: {
                                fontSize: '10px'
                            }
                        }
                    }
                }
            }],
            ...options
        };

        const chart = new ApexCharts(chartElement, defaultOptions);
        chart.render();
        
        // Store chart instance globally for theme updates
        window[elementId + '_chart'] = chart;
        
        // Also add to global charts array for easier theme updates
        if (!window._dashboardCharts) {
            window._dashboardCharts = [];
        }
        window._dashboardCharts.push(chart);
        
        return chart;
    };

    // Update ApexCharts when theme changes
    function watchThemeChanges() {
        // Watch for dark class changes on html element
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    // Small delay to ensure CSS variables are updated
                    setTimeout(function() {
                        const currentTheme = getCurrentTheme();
                        updateApexChartsTheme(currentTheme);
                    }, 50);
                }
            });
        });

        observer.observe(htmlElement, {
            attributes: true,
            attributeFilter: ['class']
        });
        
        // Also watch body element for dark class changes
        if (document.body) {
            observer.observe(document.body, {
                attributes: true,
                attributeFilter: ['class']
            });
        }

        // Also listen to system theme changes if using 'auto'
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function() {
                setTimeout(function() {
                    const currentTheme = getCurrentTheme();
                    updateApexChartsTheme(currentTheme);
                }, 50);
            });
        }
        
        // Listen to custom themechange event from ThemeManager
        window.addEventListener('themechange', function(e) {
            setTimeout(function() {
                const currentTheme = getCurrentTheme();
                updateApexChartsTheme(currentTheme);
            }, 50);
        });
        
        // Initial theme check after a delay to ensure all charts are created
        // This fixes the issue where charts load before theme is properly applied
        setTimeout(function() {
            const currentTheme = getCurrentTheme();
            updateApexChartsTheme(currentTheme);
        }, 200);
    }

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', function() {
        watchThemeChanges();
    });
    
    // Also initialize immediately if DOM is already loaded
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(watchThemeChanges, 100);
    }
    
    // Additional check after window load to catch any late-loading charts
    window.addEventListener('load', function() {
        setTimeout(function() {
            const currentTheme = getCurrentTheme();
            updateApexChartsTheme(currentTheme);
        }, 300);
    });
})();

