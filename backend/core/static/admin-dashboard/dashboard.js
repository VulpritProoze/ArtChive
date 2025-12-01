// Dashboard JavaScript

(function() {
    'use strict';

    const htmlElement = document.documentElement;
    
    // Theme Manager - Manual reactivity without Alpine.js
    const ThemeManager = {
        STORAGE_KEY: 'adminTheme',
        currentTheme: 'auto',
        systemPrefersDark: false,
        
        // Get theme from localStorage (matching $persist behavior - JSON format)
        getTheme() {
            try {
                const stored = localStorage.getItem(this.STORAGE_KEY);
                if (!stored) return 'auto';
                // Try to parse as JSON (Alpine.js persist format)
                try {
                    return JSON.parse(stored);
                } catch (e) {
                    // If not JSON, treat as plain string (backward compatibility)
                    return stored;
                }
            } catch (e) {
                return 'auto';
            }
        },
        
        // Set theme in localStorage (as JSON to match Alpine.js persist format)
        setTheme(theme) {
            try {
                // Store as JSON to match Alpine.js persist behavior
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(theme));
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

    // Helper function to create ApexCharts - SIMPLIFIED, let ApexCharts handle everything
    window.createDashboardChart = function(elementId, options) {
        // Detect theme
        let currentTheme = 'light';
        const htmlHasDark = htmlElement.classList.contains('dark');
        const bodyHasDark = document.body && document.body.classList.contains('dark');
        
        if (htmlHasDark || bodyHasDark) {
            currentTheme = 'dark';
        } else if (window.ThemeManager && window.ThemeManager.shouldBeDark) {
            currentTheme = window.ThemeManager.shouldBeDark() ? 'dark' : 'light';
        } else {
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                currentTheme = 'dark';
            }
        }
        
        const themeConfig = getApexChartsTheme(currentTheme);
        
        // Get the chart element
        const chartElement = document.querySelector('#' + elementId);
        if (!chartElement) {
            console.error('Chart element not found:', elementId);
            return null;
        }
        
        // Simple, clean options - ApexCharts handles responsive natively
        const defaultOptions = {
            chart: {
                type: 'line',
                height: 400,
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
                labels: {
                    ...themeConfig.xaxis?.labels,
                    rotate: -45,
                    ...(options.xaxis?.labels || {})
                },
                ...(options.xaxis || {})
            },
            yaxis: {
                ...themeConfig.yaxis,
                ...(options.yaxis || {})
            },
            // Simple responsive breakpoints - ApexCharts handles the rest
            responsive: [{
                breakpoint: 1000,
                options: {
                    chart: {
                        height: 500
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }, {
                breakpoint: 768,
                options: {
                    chart: {
                        height: 300
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
            }],
            ...options
        };

        const chart = new ApexCharts(chartElement, defaultOptions);
        chart.render();
        
        // Store chart instance globally for theme updates
        window[elementId + '_chart'] = chart;
        
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

    // ============================================================================
    // Skeleton Loader Utility
    // ============================================================================
    const SkeletonLoader = {
        // Show skeleton for a stat card
        showCardSkeleton(cardId) {
            const card = document.querySelector(`[data-stat-id="${cardId}"]`);
            if (card) {
                const skeleton = card.querySelector('.skeleton-card');
                const content = card.querySelector('.stat-card-content');
                
                if (skeleton) {
                    skeleton.classList.add('loading');
                    skeleton.style.display = 'block';
                }
                if (content) {
                    content.style.display = 'none';
                }
            }
        },
        
        // Hide skeleton and show content for a stat card
        hideCardSkeleton(cardId) {
            const card = document.querySelector(`[data-stat-id="${cardId}"]`);
            if (card) {
                const skeleton = card.querySelector('.skeleton-card');
                const content = card.querySelector('.stat-card-content');
                
                if (skeleton) {
                    skeleton.classList.remove('loading');
                    skeleton.style.display = 'none';
                }
                if (content) {
                    content.style.display = 'block';
                }
            }
        },
        
        // Show loading spinner for heavy computation charts
        showChartSpinner(chartId) {
            const chartContainer = document.getElementById(`${chartId}-container`) || document.querySelector(`#${chartId}`);
            if (chartContainer) {
                // Show existing spinner (already in HTML)
                const spinnerContainer = chartContainer.querySelector('.chart-loading-spinner');
                if (spinnerContainer) {
                    spinnerContainer.classList.remove('hidden');
                    spinnerContainer.style.display = 'flex';
                } else {
                    // Fallback: create spinner if not in HTML
                    const spinner = document.createElement('div');
                    spinner.className = 'chart-loading-spinner';
                    spinner.innerHTML = `
                        <div class="spinner"></div>
                        <div class="chart-loading-text">Crunching numbers, this may take a while...</div>
                    `;
                    chartContainer.appendChild(spinner);
                }
                
                // Hide chart content
                const chartContent = chartContainer.querySelector('.chart-content');
                if (chartContent) {
                    chartContent.style.display = 'none';
                }
            }
        },
        
        // Hide spinner and show chart
        hideChartSpinner(chartId) {
            const chartContainer = document.getElementById(`${chartId}-container`) || document.querySelector(`#${chartId}`);
            if (chartContainer) {
                const spinner = chartContainer.querySelector('.chart-loading-spinner');
                if (spinner) {
                    spinner.classList.add('hidden');
                    spinner.style.display = 'none';
                }
                
                // Show chart content
                const chartContent = chartContainer.querySelector('.chart-content');
                if (chartContent) {
                    chartContent.style.display = 'block';
                }
            }
        }
    };

    // Expose SkeletonLoader globally
    window.SkeletonLoader = SkeletonLoader;

    // ============================================================================
    // Dashboard API Loading Functions
    // ============================================================================
    
    // Helper function to get current range from URL
    function getCurrentRange() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('range') || '1m';
    }

    // Helper function to update stat card value
    function updateStatCardValue(cardId, value) {
        const card = document.querySelector(`[data-stat-id="${cardId}"]`);
        if (card) {
            const valueElement = card.querySelector('.stat-card-value');
            if (valueElement) {
                valueElement.textContent = value.toLocaleString();
            }
        }
    }

    // Load Core Dashboard Statistics
    window.loadCoreDashboardStats = async function(range = null) {
        if (!range) {
            range = getCurrentRange();
        }
        const baseUrl = '/api/core/dashboard/core';
        
        // Phase 1: Load lightweight counts first (fast feedback)
        const lightweightStats = [
            { 
                id: 'users', 
                url: `${baseUrl}/users/counts/`, 
                updateFn: function(data) {
                    // Update all user stat cards
                    updateStatCardValue('users-total', data.total);
                    updateStatCardValue('users-active', data.active);
                    updateStatCardValue('users-inactive', data.inactive);
                    updateStatCardValue('users-24h', data['24h']);
                    updateStatCardValue('users-1w', data['1w']);
                    updateStatCardValue('users-1m', data['1m']);
                    updateStatCardValue('users-1y', data['1y']);
                    // Hide skeletons for all user cards
                    ['users-total', 'users-active', 'users-inactive', 'users-24h', 'users-1w', 'users-1m', 'users-1y'].forEach(id => {
                        SkeletonLoader.hideCardSkeleton(id);
                    });
                }
            },
            { 
                id: 'artists', 
                url: `${baseUrl}/artists/counts/`, 
                updateFn: function(data) {
                    // Update all artist stat cards
                    updateStatCardValue('artists-total', data.total);
                    updateStatCardValue('artists-active', data.active);
                    updateStatCardValue('artists-deleted', data.deleted);
                    updateStatCardValue('artists-24h', data['24h']);
                    updateStatCardValue('artists-1w', data['1w']);
                    updateStatCardValue('artists-1m', data['1m']);
                    updateStatCardValue('artists-1y', data['1y']);
                    // Hide skeletons for all artist cards
                    ['artists-total', 'artists-active', 'artists-deleted', 'artists-24h', 'artists-1w', 'artists-1m', 'artists-1y'].forEach(id => {
                        SkeletonLoader.hideCardSkeleton(id);
                    });
                }
            },
            { 
                id: 'transactions', 
                url: `${baseUrl}/transactions/counts/`, 
                updateFn: function(data) {
                    // Update all transaction stat cards
                    updateStatCardValue('transactions-total', data.total);
                    updateStatCardValue('transactions-24h', data['24h']);
                    updateStatCardValue('transactions-1w', data['1w']);
                    updateStatCardValue('transactions-1m', data['1m']);
                    updateStatCardValue('transactions-1y', data['1y']);
                    // Hide skeletons for all transaction cards
                    ['transactions-total', 'transactions-24h', 'transactions-1w', 'transactions-1m', 'transactions-1y'].forEach(id => {
                        SkeletonLoader.hideCardSkeleton(id);
                    });
                }
            }
        ];
        
        // Phase 2: Load heavy computations after counts are shown
        const heavyStats = [
            { 
                id: 'user-growth-chart', 
                url: `${baseUrl}/users/growth/?range=${range}`, 
                updateFn: function(data) {
                    if (data.growth_data && window.createDashboardChart) {
                        // Remove spinner before creating chart
                        SkeletonLoader.hideChartSpinner('user-growth-chart');
                        createDashboardChart('user-growth-chart', {
                            chart: { type: 'line' },
                            series: [{
                                name: 'New Users',
                                data: data.growth_data.map(item => item.y)
                            }],
                            xaxis: {
                                categories: data.growth_data.map(item => item.x),
                                labels: { rotate: -45 }
                            },
                            yaxis: { title: { text: 'Number of Users' } },
                            title: { text: 'User Growth', align: 'left' }
                        });
                    }
                }
            },
            { 
                id: 'artist-growth-chart', 
                url: `${baseUrl}/artists/growth/?range=${range}`, 
                updateFn: function(data) {
                    if (data.growth_data && window.createDashboardChart) {
                        SkeletonLoader.hideChartSpinner('artist-growth-chart');
                        createDashboardChart('artist-growth-chart', {
                            chart: { type: 'line' },
                            series: [{
                                name: 'New Artists',
                                data: data.growth_data.map(item => item.y)
                            }],
                            xaxis: {
                                categories: data.growth_data.map(item => item.x),
                                labels: { rotate: -45 }
                            },
                            yaxis: { title: { text: 'Number of Artists' } },
                            title: { text: 'Artist Growth', align: 'left' }
                        });
                    }
                }
            },
            { 
                id: 'artist-type-chart', 
                url: `${baseUrl}/artists/types/`, 
                updateFn: function(data) {
                    if (data.data && window.createDashboardChart) {
                        SkeletonLoader.hideChartSpinner('artist-type-chart');
                        createDashboardChart('artist-type-chart', {
                            chart: { type: 'pie' },
                            series: data.data.map(item => item.y),
                            labels: data.data.map(item => item.x),
                            title: { text: 'Artists by Type', align: 'left' }
                        });
                    }
                }
            },
            { 
                id: 'transaction-type-chart', 
                url: `${baseUrl}/transactions/types/`, 
                updateFn: function(data) {
                    if (data.data && window.createDashboardChart) {
                        SkeletonLoader.hideChartSpinner('transaction-type-chart');
                        createDashboardChart('transaction-type-chart', {
                            chart: { type: 'bar' },
                            series: [{
                                name: 'Transactions',
                                data: data.data.map(item => item.y)
                            }],
                            xaxis: {
                                categories: data.data.map(item => item.x),
                                labels: { rotate: -45 }
                            },
                            yaxis: { title: { text: 'Number of Transactions' } },
                            title: { text: 'Transactions by Type', align: 'left' }
                        });
                    }
                }
            },
            { 
                id: 'transaction-volume-chart', 
                url: `${baseUrl}/transactions/volume/?range=${range}`, 
                updateFn: function(data) {
                    if (data.volume_data && window.createDashboardChart) {
                        SkeletonLoader.hideChartSpinner('transaction-volume-chart');
                        createDashboardChart('transaction-volume-chart', {
                            chart: { type: 'line' },
                            series: [{
                                name: 'Volume',
                                data: data.volume_data.map(item => item.y)
                            }],
                            xaxis: {
                                categories: data.volume_data.map(item => item.x),
                                labels: { rotate: -45 }
                            },
                            yaxis: { title: { text: 'Brush Drips' } },
                            title: { text: 'Transaction Volume', align: 'left' }
                        });
                    }
                }
            }
        ];
        
        // Load lightweight stats first
        for (const stat of lightweightStats) {
            try {
                // Show skeleton loaders for all related cards
                if (stat.id === 'users') {
                    ['users-total', 'users-active', 'users-inactive', 'users-24h', 'users-1w', 'users-1m', 'users-1y'].forEach(id => {
                        SkeletonLoader.showCardSkeleton(id);
                    });
                } else if (stat.id === 'artists') {
                    ['artists-total', 'artists-active', 'artists-deleted', 'artists-24h', 'artists-1w', 'artists-1m', 'artists-1y'].forEach(id => {
                        SkeletonLoader.showCardSkeleton(id);
                    });
                } else if (stat.id === 'transactions') {
                    ['transactions-total', 'transactions-24h', 'transactions-1w', 'transactions-1m', 'transactions-1y'].forEach(id => {
                        SkeletonLoader.showCardSkeleton(id);
                    });
                }
                
                const response = await fetch(stat.url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                
                // Update DOM with data (this will also hide skeletons)
                stat.updateFn(data);
            } catch (error) {
                console.error(`Error loading ${stat.id}:`, error);
                // Hide skeletons on error
                if (stat.id === 'users') {
                    ['users-total', 'users-active', 'users-inactive', 'users-24h', 'users-1w', 'users-1m', 'users-1y'].forEach(id => {
                        SkeletonLoader.hideCardSkeleton(id);
                    });
                } else if (stat.id === 'artists') {
                    ['artists-total', 'artists-active', 'artists-deleted', 'artists-24h', 'artists-1w', 'artists-1m', 'artists-1y'].forEach(id => {
                        SkeletonLoader.hideCardSkeleton(id);
                    });
                } else if (stat.id === 'transactions') {
                    ['transactions-total', 'transactions-24h', 'transactions-1w', 'transactions-1m', 'transactions-1y'].forEach(id => {
                        SkeletonLoader.hideCardSkeleton(id);
                    });
                }
            }
        }
        
        // Then load heavy stats
        for (const stat of heavyStats) {
            try {
                // Spinner is already visible in HTML, no need to show it
                
                const response = await fetch(stat.url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                
                // Update chart with data (updateFn will hide spinner)
                stat.updateFn(data);
            } catch (error) {
                console.error(`Error loading ${stat.id}:`, error);
                SkeletonLoader.hideChartSpinner(stat.id);
                // Could show error message here
            }
        }
    };

    // Load Post Dashboard Statistics
    window.loadPostDashboardStats = async function(range = null) {
        if (!range) {
            range = getCurrentRange();
        }
        const baseUrl = '/api/post/dashboard/post';
        
        // Phase 1: Load lightweight counts first
        const lightweightStats = [
            { 
                id: 'posts', 
                url: `${baseUrl}/posts/counts/`, 
                updateFn: function(data) {
                    updateStatCardValue('posts-total', data.total);
                    updateStatCardValue('posts-active', data.active);
                    updateStatCardValue('posts-deleted', data.deleted);
                    updateStatCardValue('posts-24h', data['24h']);
                    updateStatCardValue('posts-1w', data['1w']);
                    updateStatCardValue('posts-1m', data['1m']);
                    updateStatCardValue('posts-1y', data['1y']);
                    ['posts-total', 'posts-active', 'posts-deleted', 'posts-24h', 'posts-1w', 'posts-1m', 'posts-1y'].forEach(id => {
                        SkeletonLoader.hideCardSkeleton(id);
                    });
                }
            },
            { 
                id: 'engagement', 
                url: `${baseUrl}/engagement/counts/`, 
                updateFn: function(data) {
                    updateStatCardValue('engagement-hearts', data.total_hearts);
                    updateStatCardValue('engagement-praises', data.total_praises);
                    updateStatCardValue('engagement-trophies', data.total_trophies);
                    ['engagement-hearts', 'engagement-praises', 'engagement-trophies'].forEach(id => {
                        SkeletonLoader.hideCardSkeleton(id);
                    });
                }
            },
            { 
                id: 'comments', 
                url: `${baseUrl}/comments/counts/`, 
                updateFn: function(data) {
                    updateStatCardValue('comments-total', data.total);
                    updateStatCardValue('comments-active', data.active);
                    updateStatCardValue('comments-deleted', data.deleted);
                    updateStatCardValue('comments-24h', data['24h']);
                    updateStatCardValue('comments-1w', data['1w']);
                    updateStatCardValue('comments-1m', data['1m']);
                    updateStatCardValue('comments-1y', data['1y']);
                    ['comments-total', 'comments-active', 'comments-deleted', 'comments-24h', 'comments-1w', 'comments-1m', 'comments-1y'].forEach(id => {
                        SkeletonLoader.hideCardSkeleton(id);
                    });
                }
            },
            { 
                id: 'critiques', 
                url: `${baseUrl}/critiques/counts/`, 
                updateFn: function(data) {
                    updateStatCardValue('critiques-total', data.total);
                    updateStatCardValue('critiques-24h', data['24h']);
                    updateStatCardValue('critiques-1w', data['1w']);
                    updateStatCardValue('critiques-1m', data['1m']);
                    updateStatCardValue('critiques-1y', data['1y']);
                    ['critiques-total', 'critiques-24h', 'critiques-1w', 'critiques-1m', 'critiques-1y'].forEach(id => {
                        SkeletonLoader.hideCardSkeleton(id);
                    });
                }
            },
            { 
                id: 'novels', 
                url: `${baseUrl}/novels/counts/`, 
                updateFn: function(data) {
                    updateStatCardValue('novels-total', data.total);
                    updateStatCardValue('novels-avg-chapters', data.average_chapters);
                    ['novels-total', 'novels-avg-chapters'].forEach(id => {
                        SkeletonLoader.hideCardSkeleton(id);
                    });
                }
            }
        ];
        
        // Phase 2: Load heavy computations
        const heavyStats = [
            { 
                id: 'post-growth-chart', 
                url: `${baseUrl}/posts/growth/?range=${range}`, 
                updateFn: function(data) {
                    if (data.growth_data && window.createDashboardChart) {
                        SkeletonLoader.hideChartSpinner('post-growth-chart');
                        createDashboardChart('post-growth-chart', {
                            chart: { type: 'line' },
                            series: [{
                                name: 'New Posts',
                                data: data.growth_data.map(item => item.y)
                            }],
                            xaxis: {
                                categories: data.growth_data.map(item => item.x),
                                labels: { rotate: -45 }
                            },
                            yaxis: { title: { text: 'Number of Posts' } },
                            title: { text: 'Post Growth', align: 'left' }
                        });
                    }
                }
            },
            { 
                id: 'posts-by-type-chart', 
                url: `${baseUrl}/posts/types/`, 
                updateFn: function(data) {
                    if (data.data && window.createDashboardChart) {
                        SkeletonLoader.hideChartSpinner('posts-by-type-chart');
                        createDashboardChart('posts-by-type-chart', {
                            chart: { type: 'pie' },
                            series: data.data.map(item => item.y),
                            labels: data.data.map(item => item.x),
                            title: { text: 'Posts by Type', align: 'left' }
                        });
                    }
                }
            },
            { 
                id: 'posts-per-channel-chart', 
                url: `${baseUrl}/posts/channels/`, 
                updateFn: function(data) {
                    if (data.data && window.createDashboardChart) {
                        SkeletonLoader.hideChartSpinner('posts-per-channel-chart');
                        createDashboardChart('posts-per-channel-chart', {
                            chart: { type: 'bar' },
                            series: [{
                                name: 'Posts',
                                data: data.data.map(item => item.y)
                            }],
                            xaxis: {
                                categories: data.data.map(item => item.x),
                                labels: { rotate: -45 }
                            },
                            yaxis: { title: { text: 'Number of Posts' } },
                            title: { text: 'Posts per Channel', align: 'left' }
                        });
                    }
                }
            },
            { 
                id: 'comment-growth-chart', 
                url: `${baseUrl}/comments/growth/?range=${range}`, 
                updateFn: function(data) {
                    if (data.growth_data && window.createDashboardChart) {
                        SkeletonLoader.hideChartSpinner('comment-growth-chart');
                        createDashboardChart('comment-growth-chart', {
                            chart: { type: 'line' },
                            series: [{
                                name: 'New Comments',
                                data: data.growth_data.map(item => item.y)
                            }],
                            xaxis: {
                                categories: data.growth_data.map(item => item.x),
                                labels: { rotate: -45 }
                            },
                            yaxis: { title: { text: 'Number of Comments' } },
                            title: { text: 'Comment Growth', align: 'left' }
                        });
                    }
                }
            },
            { 
                id: 'comments-by-type-chart', 
                url: `${baseUrl}/comments/types/`, 
                updateFn: function(data) {
                    if (data.data && window.createDashboardChart) {
                        SkeletonLoader.hideChartSpinner('comments-by-type-chart');
                        createDashboardChart('comments-by-type-chart', {
                            chart: { type: 'pie' },
                            series: data.data.map(item => item.y),
                            labels: data.data.map(item => item.x),
                            title: { text: 'Comments by Type', align: 'left' }
                        });
                    }
                }
            },
            { 
                id: 'critique-growth-chart', 
                url: `${baseUrl}/critiques/growth/?range=${range}`, 
                updateFn: function(data) {
                    if (data.growth_data && window.createDashboardChart) {
                        SkeletonLoader.hideChartSpinner('critique-growth-chart');
                        createDashboardChart('critique-growth-chart', {
                            chart: { type: 'line' },
                            series: [{
                                name: 'New Critiques',
                                data: data.growth_data.map(item => item.y)
                            }],
                            xaxis: {
                                categories: data.growth_data.map(item => item.x),
                                labels: { rotate: -45 }
                            },
                            yaxis: { title: { text: 'Number of Critiques' } },
                            title: { text: 'Critique Growth', align: 'left' }
                        });
                    }
                }
            },
            { 
                id: 'critiques-by-impression-chart', 
                url: `${baseUrl}/critiques/impressions/`, 
                updateFn: function(data) {
                    if (data.data && window.createDashboardChart) {
                        SkeletonLoader.hideChartSpinner('critiques-by-impression-chart');
                        createDashboardChart('critiques-by-impression-chart', {
                            chart: { type: 'pie' },
                            series: data.data.map(item => item.y),
                            labels: data.data.map(item => item.x),
                            title: { text: 'Critiques by Impression', align: 'left' }
                        });
                    }
                }
            }
        ];
        
        // Load lightweight stats first
        for (const stat of lightweightStats) {
            try {
                // Show skeleton loaders
                if (stat.id === 'posts') {
                    ['posts-total', 'posts-active', 'posts-deleted', 'posts-24h', 'posts-1w', 'posts-1m', 'posts-1y'].forEach(id => {
                        SkeletonLoader.showCardSkeleton(id);
                    });
                } else if (stat.id === 'engagement') {
                    ['engagement-hearts', 'engagement-praises', 'engagement-trophies'].forEach(id => {
                        SkeletonLoader.showCardSkeleton(id);
                    });
                } else if (stat.id === 'comments') {
                    ['comments-total', 'comments-active', 'comments-deleted', 'comments-24h', 'comments-1w', 'comments-1m', 'comments-1y'].forEach(id => {
                        SkeletonLoader.showCardSkeleton(id);
                    });
                } else if (stat.id === 'critiques') {
                    ['critiques-total', 'critiques-24h', 'critiques-1w', 'critiques-1m', 'critiques-1y'].forEach(id => {
                        SkeletonLoader.showCardSkeleton(id);
                    });
                } else if (stat.id === 'novels') {
                    ['novels-total', 'novels-avg-chapters'].forEach(id => {
                        SkeletonLoader.showCardSkeleton(id);
                    });
                }
                
                const response = await fetch(stat.url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                stat.updateFn(data);
            } catch (error) {
                console.error(`Error loading ${stat.id}:`, error);
                // Hide skeletons on error
                if (stat.id === 'posts') {
                    ['posts-total', 'posts-active', 'posts-deleted', 'posts-24h', 'posts-1w', 'posts-1m', 'posts-1y'].forEach(id => {
                        SkeletonLoader.hideCardSkeleton(id);
                    });
                } else if (stat.id === 'engagement') {
                    ['engagement-hearts', 'engagement-praises', 'engagement-trophies'].forEach(id => {
                        SkeletonLoader.hideCardSkeleton(id);
                    });
                } else if (stat.id === 'comments') {
                    ['comments-total', 'comments-active', 'comments-deleted', 'comments-24h', 'comments-1w', 'comments-1m', 'comments-1y'].forEach(id => {
                        SkeletonLoader.hideCardSkeleton(id);
                    });
                } else if (stat.id === 'critiques') {
                    ['critiques-total', 'critiques-24h', 'critiques-1w', 'critiques-1m', 'critiques-1y'].forEach(id => {
                        SkeletonLoader.hideCardSkeleton(id);
                    });
                } else if (stat.id === 'novels') {
                    ['novels-total', 'novels-avg-chapters'].forEach(id => {
                        SkeletonLoader.hideCardSkeleton(id);
                    });
                }
            }
        }
        
        // Then load heavy stats
        for (const stat of heavyStats) {
            try {
                // Spinner is already visible in HTML, no need to show it
                
                const response = await fetch(stat.url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                stat.updateFn(data);
            } catch (error) {
                console.error(`Error loading ${stat.id}:`, error);
                SkeletonLoader.hideChartSpinner(stat.id);
            }
        }
    };

    // Load Collective Dashboard Statistics
    window.loadCollectiveDashboardStats = async function(range = null) {
        if (!range) {
            range = getCurrentRange();
        }
        const baseUrl = '/api/collective/dashboard/collective';
        
        // Phase 1: Load lightweight counts first
        const lightweightStats = [
            { 
                id: 'collectives', 
                url: `${baseUrl}/collectives/counts/`, 
                updateFn: function(data) {
                    updateStatCardValue('collectives-total', data.total);
                    updateStatCardValue('collectives-24h', data['24h']);
                    updateStatCardValue('collectives-1w', data['1w']);
                    updateStatCardValue('collectives-1m', data['1m']);
                    updateStatCardValue('collectives-1y', data['1y']);
                    ['collectives-total', 'collectives-24h', 'collectives-1w', 'collectives-1m', 'collectives-1y'].forEach(id => {
                        SkeletonLoader.hideCardSkeleton(id);
                    });
                }
            },
            { 
                id: 'channels', 
                url: `${baseUrl}/channels/counts/`, 
                updateFn: function(data) {
                    updateStatCardValue('channels-total', data.total);
                    updateStatCardValue('channels-24h', data['24h']);
                    updateStatCardValue('channels-1w', data['1w']);
                    updateStatCardValue('channels-1m', data['1m']);
                    updateStatCardValue('channels-1y', data['1y']);
                    ['channels-total', 'channels-24h', 'channels-1w', 'channels-1m', 'channels-1y'].forEach(id => {
                        SkeletonLoader.hideCardSkeleton(id);
                    });
                }
            }
        ];
        
        // Phase 2: Load heavy computations (spinners already visible in HTML)
        const heavyStats = [
            { 
                id: 'collective-growth-chart', 
                url: `${baseUrl}/collectives/growth/?range=${range}`, 
                updateFn: function(data) {
                    if (data.growth_data && window.createDashboardChart) {
                        SkeletonLoader.hideChartSpinner('collective-growth-chart');
                        createDashboardChart('collective-growth-chart', {
                            chart: { type: 'line' },
                            series: [{
                                name: 'New Collectives',
                                data: data.growth_data.map(item => item.y)
                            }],
                            xaxis: {
                                categories: data.growth_data.map(item => item.x),
                                labels: { rotate: -45 }
                            },
                            yaxis: { title: { text: 'Number of Collectives' } },
                            title: { text: 'Collective Growth', align: 'left' }
                        });
                    }
                }
            },
            { 
                id: 'collective-artist-type-chart', 
                url: `${baseUrl}/collectives/types/`, 
                updateFn: function(data) {
                    if (data.data && window.createDashboardChart) {
                        SkeletonLoader.hideChartSpinner('collective-artist-type-chart');
                        createDashboardChart('collective-artist-type-chart', {
                            chart: { type: 'pie' },
                            series: data.data.map(item => item.y),
                            labels: data.data.map(item => item.x),
                            title: { text: 'Collectives by Artist Type', align: 'left' }
                        });
                    }
                }
            },
            { 
                id: 'channel-growth-chart', 
                url: `${baseUrl}/channels/growth/?range=${range}`, 
                updateFn: function(data) {
                    if (data.growth_data && window.createDashboardChart) {
                        SkeletonLoader.hideChartSpinner('channel-growth-chart');
                        createDashboardChart('channel-growth-chart', {
                            chart: { type: 'line' },
                            series: [{
                                name: 'New Channels',
                                data: data.growth_data.map(item => item.y)
                            }],
                            xaxis: {
                                categories: data.growth_data.map(item => item.x),
                                labels: { rotate: -45 }
                            },
                            yaxis: { title: { text: 'Number of Channels' } },
                            title: { text: 'Channel Growth', align: 'left' }
                        });
                    }
                }
            },
            { 
                id: 'channels-per-collective-chart', 
                url: `${baseUrl}/channels/per-collective/`, 
                updateFn: function(data) {
                    if (data.data && window.createDashboardChart) {
                        SkeletonLoader.hideChartSpinner('channels-per-collective-chart');
                        createDashboardChart('channels-per-collective-chart', {
                            chart: { type: 'bar' },
                            series: [{
                                name: 'Channels',
                                data: data.data.map(item => item.y)
                            }],
                            xaxis: {
                                categories: data.data.map(item => item.x),
                                labels: { rotate: -45 }
                            },
                            yaxis: { title: { text: 'Number of Channels' } },
                            title: { text: 'Channels per Collective', align: 'left' }
                        });
                    }
                }
            }
        ];
        
        // Load lightweight stats first
        for (const stat of lightweightStats) {
            try {
                // Show skeleton loaders
                if (stat.id === 'collectives') {
                    ['collectives-total', 'collectives-24h', 'collectives-1w', 'collectives-1m', 'collectives-1y'].forEach(id => {
                        SkeletonLoader.showCardSkeleton(id);
                    });
                } else if (stat.id === 'channels') {
                    ['channels-total', 'channels-24h', 'channels-1w', 'channels-1m', 'channels-1y'].forEach(id => {
                        SkeletonLoader.showCardSkeleton(id);
                    });
                }
                
                const response = await fetch(stat.url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                stat.updateFn(data);
            } catch (error) {
                console.error(`Error loading ${stat.id}:`, error);
                // Hide skeletons on error
                if (stat.id === 'collectives') {
                    ['collectives-total', 'collectives-24h', 'collectives-1w', 'collectives-1m', 'collectives-1y'].forEach(id => {
                        SkeletonLoader.hideCardSkeleton(id);
                    });
                } else if (stat.id === 'channels') {
                    ['channels-total', 'channels-24h', 'channels-1w', 'channels-1m', 'channels-1y'].forEach(id => {
                        SkeletonLoader.hideCardSkeleton(id);
                    });
                }
            }
        }
        
        // Then load heavy stats (spinners already visible in HTML)
        for (const stat of heavyStats) {
            try {
                // Spinner is already visible in HTML, no need to show it
                const response = await fetch(stat.url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                stat.updateFn(data);
            } catch (error) {
                console.error(`Error loading ${stat.id}:`, error);
                // Hide spinner on error
                SkeletonLoader.hideChartSpinner(stat.id);
            }
        }
    };

    // Load Gallery Dashboard Statistics
    window.loadGalleryDashboardStats = async function(range = null) {
        if (!range) {
            range = getCurrentRange();
        }
        const baseUrl = '/api/gallery/dashboard/gallery';
        
        // Phase 1: Load lightweight counts first
        const lightweightStats = [
            { 
                id: 'galleries', 
                url: `${baseUrl}/galleries/counts/`, 
                updateFn: function(data) {
                    updateStatCardValue('galleries-total', data.total);
                    updateStatCardValue('galleries-published', data.published);
                    updateStatCardValue('galleries-draft', data.draft);
                    updateStatCardValue('galleries-archived', data.archived);
                    updateStatCardValue('galleries-24h', data['24h']);
                    updateStatCardValue('galleries-1w', data['1w']);
                    updateStatCardValue('galleries-1m', data['1m']);
                    updateStatCardValue('galleries-1y', data['1y']);
                    ['galleries-total', 'galleries-published', 'galleries-draft', 'galleries-archived', 'galleries-24h', 'galleries-1w', 'galleries-1m', 'galleries-1y'].forEach(id => {
                        SkeletonLoader.hideCardSkeleton(id);
                    });
                }
            }
        ];
        
        // Phase 2: Load heavy computations
        const heavyStats = [
            { 
                id: 'gallery-growth-chart', 
                url: `${baseUrl}/galleries/growth/?range=${range}`, 
                updateFn: function(data) {
                    if (data.growth_data && window.createDashboardChart) {
                        SkeletonLoader.hideChartSpinner('gallery-growth-chart');
                        createDashboardChart('gallery-growth-chart', {
                            chart: { type: 'line' },
                            series: [{
                                name: 'New Galleries',
                                data: data.growth_data.map(item => item.y)
                            }],
                            xaxis: {
                                categories: data.growth_data.map(item => item.x),
                                labels: { rotate: -45 }
                            },
                            yaxis: { title: { text: 'Number of Galleries' } },
                            title: { text: 'Gallery Growth', align: 'left' }
                        });
                    }
                }
            }
        ];
        
        // Load lightweight stats first
        for (const stat of lightweightStats) {
            try {
                // Show skeleton loaders
                ['galleries-total', 'galleries-published', 'galleries-draft', 'galleries-archived', 'galleries-24h', 'galleries-1w', 'galleries-1m', 'galleries-1y'].forEach(id => {
                    SkeletonLoader.showCardSkeleton(id);
                });
                
                const response = await fetch(stat.url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                stat.updateFn(data);
            } catch (error) {
                console.error(`Error loading ${stat.id}:`, error);
                // Hide skeletons on error
                ['galleries-total', 'galleries-published', 'galleries-draft', 'galleries-archived', 'galleries-24h', 'galleries-1w', 'galleries-1m', 'galleries-1y'].forEach(id => {
                    SkeletonLoader.hideCardSkeleton(id);
                });
            }
        }
        
        // Then load heavy stats
        for (const stat of heavyStats) {
            try {
                // Spinner is already visible in HTML, no need to show it
                
                const response = await fetch(stat.url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                stat.updateFn(data);
            } catch (error) {
                console.error(`Error loading ${stat.id}:`, error);
                SkeletonLoader.hideChartSpinner(stat.id);
            }
        }
    };

    // Auto-load dashboard stats when page loads
    document.addEventListener('DOMContentLoaded', function() {
        // Check if we're on the core dashboard page
        if (document.querySelector('[data-dashboard="core"]')) {
            loadCoreDashboardStats();
        }
        // Check if we're on the post dashboard page
        if (document.querySelector('[data-dashboard="post"]')) {
            loadPostDashboardStats();
        }
        // Check if we're on the collective dashboard page
        if (document.querySelector('[data-dashboard="collective"]')) {
            loadCollectiveDashboardStats();
        }
        // Check if we're on the gallery dashboard page
        if (document.querySelector('[data-dashboard="gallery"]')) {
            loadGalleryDashboardStats();
        }
    });
})();

