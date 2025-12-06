(function() {
    'use strict';
    
    // Filter configurations
    const filterConfigs = [
        {
            paramName: 'author_id',
            title: 'post author',
            searchTerms: ['author', 'post author'],
            apiUrl: '/api/core/users/search/',
            modalTitle: 'Search User',
            placeholder: 'Search by username, email, or ID...',
            emptyText: 'Enter a search query to find users',
            noResultsText: 'No users found',
            errorText: 'Error searching users. Please try again.',
            resultIdField: 'id',
            resultDisplayField: 'username',
            resultSecondaryField: 'email',
            resultTertiaryField: 'fullname'
        },
        {
            paramName: 'user_id',
            title: 'filter by user',
            searchTerms: ['filter by user', 'user filter'],
            apiUrl: '/api/core/users/search/',
            modalTitle: 'Search User',
            placeholder: 'Search by username, email, or ID...',
            emptyText: 'Enter a search query to find users',
            noResultsText: 'No users found',
            errorText: 'Error searching users. Please try again.',
            resultIdField: 'id',
            resultDisplayField: 'username',
            resultSecondaryField: 'email',
            resultTertiaryField: 'fullname'
        },
        {
            paramName: 'collective_id',
            title: 'collective',
            searchTerms: ['collective'],
            apiUrl: '/api/collective/search/',
            modalTitle: 'Search Collective',
            placeholder: 'Search by title or ID...',
            emptyText: 'Enter a search query to find collectives',
            noResultsText: 'No collectives found',
            errorText: 'Error searching collectives. Please try again.',
            resultIdField: 'collective_id',
            resultDisplayField: 'title',
            resultSecondaryField: 'description',
            resultTertiaryField: null
        }
    ];
    
    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        // Wait a bit for Django admin to render filters
        setTimeout(function() {
            // Look for the filter sidebar
            const filterSidebar = document.querySelector(
                '#changelist-filter, .changelist-filters, [id*="changelist-filter"], ' +
                '.filtered, .module.filtered, [class*="filter"], ' +
                'aside, [role="complementary"], .sidebar'
            );
            
            const container = filterSidebar || document.body;
            
            // Initialize all filters
            filterConfigs.forEach(function(config) {
                initializeFilter(container, config);
            });
        }, 200);
    });
    
    function initializeFilter(container, config) {
        const paramName = config.paramName;
        const filterId = 'filter-' + paramName;
        
        // First, try to find existing custom button
        const existingBtn = document.getElementById(filterId + '-btn');
        if (existingBtn) {
            initSearchFilter(config);
            return;
        }
        
        // Look for filter by title
        const filterTitles = container.querySelectorAll('h3, .filter-title, [class*="filter"] h3');
        let filterSection = null;
        
        filterTitles.forEach(function(title) {
            const text = title.textContent.toLowerCase();
            const matches = config.searchTerms.some(function(term) {
                return text.includes(term);
            });
            
            if (matches) {
                // Find the parent filter section
                filterSection = title.closest('div, li, .filter-section');
                if (!filterSection) {
                    filterSection = title.parentElement;
                }
            }
        });
        
        if (filterSection) {
            // Hide default filter links immediately
            const filterLinks = filterSection.querySelectorAll('a[href*="' + paramName + '"]');
            filterLinks.forEach(function(link) {
                link.style.display = 'none';
            });
            
            // Intercept clicks on filter links to open modal instead
            filterLinks.forEach(function(link) {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Ensure modal and button exist
                    let modal = document.getElementById(filterId + '-modal');
                    let searchBtn = document.getElementById(filterId + '-btn');
                    
                    if (!modal || !searchBtn) {
                        // Create button and modal if they don't exist
                        createFilterButton(filterSection, config);
                        initSearchFilter(config);
                        modal = document.getElementById(filterId + '-modal');
                        searchBtn = document.getElementById(filterId + '-btn');
                    }
                    
                    // Open modal
                    if (modal) {
                        modal.style.display = 'flex';
                        const searchInput = document.getElementById(filterId + '-input');
                        if (searchInput) {
                            setTimeout(function() {
                                searchInput.focus();
                            }, 100);
                        }
                    }
                    
                    return false;
                });
            });
            
            // Create and inject custom button and modal
            createFilterButton(filterSection, config);
            initSearchFilter(config);
        } else {
            // Fallback: look for any filter with the parameter name in URL
            const allLinks = container.querySelectorAll('a[href*="' + paramName + '"]');
            if (allLinks.length > 0) {
                const filterParent = allLinks[0].closest('div, li');
                if (filterParent) {
                    // Intercept clicks
                    allLinks.forEach(function(link) {
                        link.addEventListener('click', function(e) {
                            e.preventDefault();
                            e.stopPropagation();
                            
                            let modal = document.getElementById(filterId + '-modal');
                            let searchBtn = document.getElementById(filterId + '-btn');
                            
                            if (!modal || !searchBtn) {
                                createFilterButton(filterParent, config);
                                initSearchFilter(config);
                                modal = document.getElementById(filterId + '-modal');
                                searchBtn = document.getElementById(filterId + '-btn');
                            }
                            
                            if (modal) {
                                modal.style.display = 'flex';
                                const searchInput = document.getElementById(filterId + '-input');
                                if (searchInput) {
                                    setTimeout(function() {
                                        searchInput.focus();
                                    }, 100);
                                }
                            }
                            
                            return false;
                        });
                    });
                    
                    createFilterButton(filterParent, config);
                    initSearchFilter(config);
                }
            }
        }
    }
    
    function createFilterButton(container, config) {
        const filterId = 'filter-' + config.paramName;
        
        // Check if button already exists
        if (document.getElementById(filterId + '-btn')) {
            return;
        }
        
        // Check if filter is currently active in URL
        const urlParams = new URLSearchParams(window.location.search);
        const isFilterActive = urlParams.has(config.paramName) && urlParams.get(config.paramName) !== '__custom__';
        
        // Hide default filter links
        const defaultLinks = container.querySelectorAll('a[href*="' + config.paramName + '"]');
        defaultLinks.forEach(function(link) {
            link.style.display = 'none';
        });
        
        // Create and insert the search button
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'user-search-btn' + (isFilterActive ? ' active' : '');
        button.id = filterId + '-btn';
        button.innerHTML = '<span>Search</span><svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>';
        
        // Insert button
        container.appendChild(button);
        
        // Create modal if it doesn't exist
        if (!document.getElementById(filterId + '-modal')) {
            createFilterModal(container, config);
        }
    }
    
    function createFilterModal(container, config) {
        const filterId = 'filter-' + config.paramName;
        
        // Create modal structure
        const modalHTML = `
            <div class="user-search-modal-overlay" id="${filterId}-modal" style="display: none;">
                <div class="user-search-modal">
                    <div class="user-search-modal-header">
                        <h3>${config.modalTitle}</h3>
                        <button type="button" class="user-search-modal-close" id="${filterId}-close">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div class="user-search-input-container">
                        <input type="text" class="user-search-input" id="${filterId}-input" placeholder="${config.placeholder}" autocomplete="off" />
                        <div class="user-search-loading" id="${filterId}-loading" style="display: none;">
                            <span>Searching...</span>
                        </div>
                    </div>
                    <div class="user-search-results" id="${filterId}-results">
                        <div class="user-search-empty">${config.emptyText}</div>
                    </div>
                    <div class="user-search-modal-footer">
                        <button type="button" class="user-search-filter-btn" id="${filterId}-filter-btn" disabled>Filter</button>
                        <button type="button" class="user-search-cancel-btn" id="${filterId}-cancel">Cancel</button>
                    </div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    function initSearchFilter(config) {
        const filterId = 'filter-' + config.paramName;
        const searchBtn = document.getElementById(filterId + '-btn');
        const modal = document.getElementById(filterId + '-modal');
        const closeBtn = document.getElementById(filterId + '-close');
        const cancelBtn = document.getElementById(filterId + '-cancel');
        const searchInput = document.getElementById(filterId + '-input');
        const resultsContainer = document.getElementById(filterId + '-results');
        const filterBtn = document.getElementById(filterId + '-filter-btn');
        const loadingIndicator = document.getElementById(filterId + '-loading');
        
        if (!searchBtn || !modal || !searchInput || !resultsContainer || !filterBtn) {
            return; // Elements not found, skip initialization
        }
        
        let selectedId = null;
        let searchTimeout = null;
        
        // Open modal
        searchBtn.addEventListener('click', function() {
            modal.style.display = 'flex';
            searchInput.focus();
        });
        
        // Close modal
        function closeModal() {
            modal.style.display = 'none';
            searchInput.value = '';
            resultsContainer.innerHTML = '<div class="user-search-empty">' + config.emptyText + '</div>';
            selectedId = null;
            filterBtn.disabled = true;
        }
        
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        
        // Close on overlay click
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });
        
        // Close on Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                closeModal();
            }
        });
        
        // Search input with debouncing
        searchInput.addEventListener('input', function() {
            const query = this.value.trim();
            
            // Clear previous timeout
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
            
            // Clear selection when typing
            selectedId = null;
            filterBtn.disabled = true;
            
            if (!query) {
                resultsContainer.innerHTML = '<div class="user-search-empty">' + config.emptyText + '</div>';
                return;
            }
            
            // Debounce search (300ms)
            searchTimeout = setTimeout(function() {
                performSearch(query);
            }, 300);
        });
        
        // Perform search
        function performSearch(query) {
            loadingIndicator.style.display = 'block';
            resultsContainer.innerHTML = '';
            
            // Get CSRF token from cookie
            const csrftoken = getCookie('csrftoken');
            
            fetch(config.apiUrl + '?q=' + encodeURIComponent(query), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken || '',
                },
                credentials: 'same-origin'
            })
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('Search failed');
                }
                return response.json();
            })
            .then(function(data) {
                loadingIndicator.style.display = 'none';
                displayResults(data.results || []);
            })
            .catch(function(error) {
                loadingIndicator.style.display = 'none';
                resultsContainer.innerHTML = '<div class="user-search-error">' + config.errorText + '</div>';
            });
        }
        
        // Display search results
        function displayResults(results) {
            if (results.length === 0) {
                resultsContainer.innerHTML = '<div class="user-search-empty">' + config.noResultsText + '</div>';
                return;
            }
            
            const resultsHTML = results.map(function(result) {
                const primary = escapeHtml(result[config.resultDisplayField] || '');
                const secondary = result[config.resultSecondaryField] ? escapeHtml(result[config.resultSecondaryField]) : '';
                const tertiary = config.resultTertiaryField && result[config.resultTertiaryField] 
                    ? escapeHtml(result[config.resultTertiaryField]) 
                    : '';
                const resultId = result[config.resultIdField];
                
                return `
                    <div class="user-search-result-item" data-result-id="${resultId}">
                        <div class="user-search-result-info">
                            <div class="user-search-result-username">${primary}</div>
                            <div class="user-search-result-details">
                                ${secondary ? '<span>' + secondary + '</span>' : ''}
                                ${tertiary ? '<span>•</span><span>' + tertiary + '</span>' : ''}
                            </div>
                        </div>
                        <div class="user-search-result-id">ID: ${resultId}</div>
                    </div>
                `;
            }).join('');
            
            resultsContainer.innerHTML = resultsHTML;
            
            // Add click handlers to result items
            const resultItems = resultsContainer.querySelectorAll('.user-search-result-item');
            resultItems.forEach(function(item) {
                item.addEventListener('click', function() {
                    // Remove previous selection
                    resultItems.forEach(function(i) {
                        i.classList.remove('selected');
                    });
                    
                    // Select this item
                    item.classList.add('selected');
                    selectedId = item.dataset.resultId;
                    filterBtn.disabled = false;
                });
            });
        }
        
        // Apply filter
        filterBtn.addEventListener('click', function() {
            if (!selectedId) {
                return;
            }
            
            // Get current URL and add/update filter parameter
            const url = new URL(window.location.href);
            url.searchParams.set(config.paramName, selectedId);
            
            // Reload page with filter
            window.location.href = url.toString();
        });
        
        // Helper function to get CSRF token
        function getCookie(name) {
            let cookieValue = null;
            if (document.cookie && document.cookie !== '') {
                const cookies = document.cookie.split(';');
                for (let i = 0; i < cookies.length; i++) {
                    const cookie = cookies[i].trim();
                    if (cookie.substring(0, name.length + 1) === (name + '=')) {
                        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                        break;
                    }
                }
            }
            return cookieValue;
        }
        
        // Helper function to escape HTML
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    }
})();

