/* ======================================
    Smart Closet App JS - v1.0
    --------------------------------------
    - Encapsulated in an IIFE.
    - Loads data from localStorage *once*.
    - Uses a router to run page-specific code.
    ======================================
*/

(function() {
    'use strict'; // Enable strict mode

    const STORAGE_KEY = 'smartClosetData';
    
    // In-memory state. All functions will read/write to this.
    let appData = {
        clothes: [],
        combinations: []
    };

    // --- Data Management ---

    function loadData() {
        const storedData = localStorage.getItem(STORAGE_KEY);
        if (storedData) {
            appData = JSON.parse(storedData);
        } else {
            // If no data, save the initial empty state
            saveData();
        }
    }

    function saveData() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    }

    // --- Cloth Management ---

    function addCloth(cloth) {
        const newCloth = {
            id: Date.now().toString(),
            ...cloth,
            createdAt: new Date().toISOString()
        };
        appData.clothes.push(newCloth);
        saveData();
        return newCloth;
    }

    function getClothes() {
        return appData.clothes;
    }

    function getClothById(id) {
        return appData.clothes.find(cloth => cloth.id === id);
    }

    function updateCloth(id, updates) {
        const index = appData.clothes.findIndex(cloth => cloth.id === id);
        if (index !== -1) {
            appData.clothes[index] = { ...appData.clothes[index], ...updates };
            saveData();
            return true;
        }
        return false;
    }

    function deleteCloth(id) {
        const index = appData.clothes.findIndex(cloth => cloth.id === id);
        if (index !== -1) {
            appData.clothes.splice(index, 1);
            saveData();
            return true;
        }
        return false;
    }

    // --- Combination Management ---

    function addCombination(combination) {
        const newCombination = {
            id: Date.now().toString(),
            ...combination,
            createdAt: new Date().toISOString()
        };
        appData.combinations.push(newCombination);
        saveData();
        return newCombination;
    }

    function getCombinations() {
        return appData.combinations;
    }

    function deleteCombination(id) {
        const index = appData.combinations.findIndex(combo => combo.id === id);
        if (index !== -1) {
            appData.combinations.splice(index, 1);
            saveData();
            return true;
        }
        return false;
    }

    // --- UI Rendering ---

    function createClothCard(cloth) {
        const imageUrl = cloth.imagePreview || 'https://via.placeholder.com/300x300.png?text=No+Image';
        
        return `
            <div class="cloth-card" data-id="${cloth.id}">
                <img src="${imageUrl}" alt="${cloth.category}" class="cloth-image" onerror="this.src='https://via.placeholder.com/300x300.png?text=Image+Error'">
                <div class="cloth-info">
                    <div class="cloth-category">${cloth.category || 'Uncategorized'}</div>
                    <div class="color-container">
                        <span class="cloth-color" style="background-color: ${cloth.color || '#ccc'}"></span>
                        <span>${cloth.color || 'No Color'}</span>
                    </div>
                    ${cloth.notes ? `<p class="cloth-notes">${cloth.notes}</p>` : ''}
                    <div class="cloth-actions">
                        <a href="add-cloth.html?edit=${cloth.id}" class="btn-icon btn-edit" aria-label="Edit item">
                            <i class="fas fa-edit"></i> Edit
                        </a>
                        <button class="btn-icon btn-delete" data-id="${cloth.id}" aria-label="Delete item">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // --- Page Initializers ---

    /**
     * Initializes the Dashboard page (index.html)
     */
    function initDashboardPage() {
        const totalClothesEl = document.getElementById('totalClothes');
        if (totalClothesEl) {
            totalClothesEl.textContent = appData.clothes.length;
        }

        const categoryStatsEl = document.getElementById('categoryStats');
        if (categoryStatsEl) {
            const categories = {};
            appData.clothes.forEach(cloth => {
                const category = cloth.category || 'Uncategorized';
                categories[category] = (categories[category] || 0) + 1;
            });
            
            let html = '';
            for (const [category, count] of Object.entries(categories)) {
                html += `
                    <div class="stat-card" style="padding: 1rem;"> 
                        <h4 style="font-weight: 500; color: var(--gray); margin-bottom: 0.5rem;">${category}</h4>
                        <div class="stat-number" style="font-size: 2rem;">${count}</div>
                    </div>`;
            }
            categoryStatsEl.style.display = 'grid';
            categoryStatsEl.style.gridTemplateColumns = 'repeat(auto-fit, minmax(100px, 1fr))';
            categoryStatsEl.style.gap = '1rem';
            categoryStatsEl.innerHTML = html || '<p>No categories yet</p>';
        }

        const favoriteCombosEl = document.getElementById('favoriteCombos');
        if (favoriteCombosEl) {
            favoriteCombosEl.textContent = appData.combinations.length;
        }

        const recentClothesEl = document.getElementById('recentClothes');
        if (recentClothesEl) {
            const recent = [...appData.clothes]
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 4); 
                
            recentClothesEl.innerHTML = recent.length > 0 
                ? recent.map(createClothCard).join('')
                : '<div class="empty-state" style="grid-column: 1 / -1;"><p>No clothes added yet. Add your first item!</p></div>';
        }
    }

    /**
     * Initializes the View Clothes page (view-clothes.html)
     */
    function initViewClothesPage() {
        const clothesContainer = document.getElementById('clothesContainer');
        if (!clothesContainer) return; // Not on view-clothes page

        const searchInput = document.getElementById('searchInput');
        const categoryFilter = document.getElementById('categoryFilter');
        const deleteModal = document.getElementById('deleteModal');
        const confirmDeleteBtn = document.getElementById('confirmDelete');
        const cancelDeleteBtn = document.getElementById('cancelDelete');

        if (!deleteModal) return; // Modal is essential

        let allClothes = [];
        let filteredClothes = [];
        let itemToDelete = null;

        function loadClothes() {
            allClothes = getClothes();
            filteredClothes = [...allClothes];
            renderClothes(filteredClothes);
        }

        function renderClothes(clothesToRender) {
            if (clothesToRender.length === 0) {
                clothesContainer.innerHTML = `
                    <div class="empty-state">
                        <h3>No clothes found</h3>
                        <p>Try adjusting your search or add a new item to your wardrobe.</p>
                        <a href="add-cloth.html" class="btn btn-primary">Add Your First Item</a>
                    </div>
                `;
                return;
            }
            clothesContainer.innerHTML = clothesToRender.map(createClothCard).join('');
        }

        function filterClothes() {
            const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
            const category = categoryFilter ? categoryFilter.value : '';

            filteredClothes = allClothes.filter(cloth => {
                const matchesSearch = !searchTerm || 
                    (cloth.color && cloth.color.toLowerCase().includes(searchTerm)) || 
                    (cloth.notes && cloth.notes.toLowerCase().includes(searchTerm)) ||
                    (cloth.category && cloth.category.toLowerCase().includes(searchTerm));
                
                const matchesCategory = !category || cloth.category === category;
                
                return matchesSearch && matchesCategory;
            });
            renderClothes(filteredClothes);
        }

        function openDeleteModal(id) {
            itemToDelete = id;
            if (itemToDelete) {
                // Update modal text for deleting a cloth
                deleteModal.querySelector('h3').textContent = 'Delete Item';
                deleteModal.querySelector('p').textContent = 'Are you sure you want to delete this item? This action cannot be undone.';
                deleteModal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            }
        }

        function closeDeleteModal() {
            deleteModal.style.display = 'none';
            document.body.style.overflow = '';
            itemToDelete = null;
        }

        function deleteItem() {
            if (itemToDelete) {
                if (deleteCloth(itemToDelete)) {
                    allClothes = getClothes();
                    filterClothes();
                }
                closeDeleteModal();
            }
        }

        clothesContainer.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.btn-delete');
            if (deleteBtn) {
                e.preventDefault();
                openDeleteModal(deleteBtn.getAttribute('data-id'));
            }
        });

        if (searchInput) searchInput.addEventListener('input', filterClothes);
        if (categoryFilter) categoryFilter.addEventListener('change', filterClothes);
        if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', deleteItem);
        if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeDeleteModal);

        deleteModal.addEventListener('click', (e) => {
            if (e.target === deleteModal) {
                closeDeleteModal();
            }
        });

        loadClothes();
    }

    /**
     * Initializes the Add/Edit Cloth page (add-cloth.html)
     */
    function initAddClothPage() {
        const addClothForm = document.getElementById('addClothForm');
        if (!addClothForm) return; // Not on this page

        const pageTitle = document.getElementById('pageTitle');
        const submitBtn = document.getElementById('submitBtn');
        const categoryField = document.getElementById('cloth-category');
        const colorField = document.getElementById('cloth-color');
        const notesField = document.getElementById('cloth-notes');
        const clothImageInput = document.getElementById('cloth-image');
        const imagePreviewEl = document.getElementById('image-preview');

        const urlParams = new URLSearchParams(window.location.search);
        const editId = urlParams.get('edit');
        let isEditMode = false;
        let clothToEdit = null;

        if (clothImageInput && imagePreviewEl) {
            clothImageInput.addEventListener('change', function() {
                if (this.files && this.files[0]) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        imagePreviewEl.src = e.target.result;
                        imagePreviewEl.style.display = 'block';
                    };
                    reader.readAsDataURL(this.files[0]);
                } else {
                    imagePreviewEl.src = '';
                    imagePreviewEl.style.display = 'none';
                }
            });
        }

        if (editId) {
            clothToEdit = getClothById(editId);
            if (clothToEdit) {
                isEditMode = true;
                if (pageTitle) pageTitle.textContent = 'Edit Cloth';
                if (submitBtn) submitBtn.textContent = 'Save Changes';
                if (categoryField) categoryField.value = clothToEdit.category;
                if (colorField) colorField.value = clothToEdit.color;
                if (notesField) notesField.value = clothToEdit.notes;
                if (imagePreviewEl && clothToEdit.imagePreview) {
                    imagePreviewEl.src = clothToEdit.imagePreview;
                    imagePreviewEl.style.display = 'block';
                }
            } else {
                console.error('Edit item not found');
                window.location.href = 'view-clothes.html'; 
            }
        }

        addClothForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            }

            const itemData = {
                category: categoryField.value,
                color: colorField.value,
                notes: notesField.value
            };

            const readImageAsDataURL = (file) => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = (error) => reject(error);
                    reader.readAsDataURL(file);
                });
            };

            try {
                if (clothImageInput.files && clothImageInput.files[0]) {
                    itemData.imagePreview = await readImageAsDataURL(clothImageInput.files[0]);
                } else if (isEditMode && clothToEdit.imagePreview) {
                    itemData.imagePreview = clothToEdit.imagePreview;
                } else {
                    itemData.imagePreview = null;
                }

                if (isEditMode) {
                    updateCloth(editId, itemData);
                } else {
                    addCloth(itemData);
                }
                window.location.href = 'view-clothes.html';

            } catch (error) {
                console.error('Error saving item:', error);
                alert('An error occurred while saving.');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = isEditMode ? 'Save Changes' : 'Save Item';
                }
            }
        });
    }

    /**
     * Initializes the Combinations page (combinations.html)
     */
    function initCombinationsPage() {
        const combinationsContainer = document.getElementById('combinationsContainer');
        if (!combinationsContainer) return; // Not on this page

        const createCombinationBtn = document.getElementById('createCombinationBtn');
        const createCombinationModal = document.getElementById('createCombinationModal');
        const closeModalBtn = document.getElementById('closeModal');
        const cancelCombinationBtn = document.getElementById('cancelCombination');
        const saveCombinationBtn = document.getElementById('saveCombination');
        const deleteModal = document.getElementById('deleteModal');
        const cancelDeleteBtn = document.getElementById('cancelDelete');
        const confirmDeleteBtn = document.getElementById('confirmDelete');
        const availableItemsContainer = document.getElementById('availableItems');
        const selectedItemsContainer = document.getElementById('selectedItems');
        
        let clothes = [];
        let selectedClothes = [];
        let combinationToDelete = null;
        
        // Load and display combinations
        function loadCombinations() {
            const combinations = getCombinations();
            const allClothes = getClothes();
            
            if (combinations.length === 0) {
                combinationsContainer.innerHTML = `
                    <div class="no-combinations">
                        <h3>No combinations yet</h3>
                        <p>Create your first outfit combination to get started!</p>
                        <button id="createFirstCombination" class="btn btn-primary mt-2">
                            <i class="fas fa-plus"></i> Create Combination
                        </button>
                    </div>
                `;
                return;
            }
            
            combinationsContainer.innerHTML = combinations.map(combo => {
                const comboClothes = combo.items.map(id => 
                    allClothes.find(item => item.id === id)
                ).filter(Boolean); // Filter out any missing/deleted items
                
                return `
                    <div class="combination-card" data-id="${combo.id}">
                        <div class="combination-header">
                            <h3 class="combination-title">${combo.name || 'Unnamed Outfit'}</h3>
                            <div class="combination-actions">
                                <button class="btn-icon btn-delete" data-id="${combo.id}" aria-label="Delete combination">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div class="combination-items">
                            ${comboClothes.length > 0 ? 
                                comboClothes.map(item => `
                                    <div class="combination-item">
                                        <img src="${item.imagePreview || 'https://via.placeholder.com/80'}" 
                                             alt="${item.category}">
                                        <div class="combination-item-category">${item.category}</div>
                                    </div>
                                `).join('') :
                                '<p style="grid-column: 1 / -1; text-align: center; color: var(--gray);">No items in this outfit</p>'
                            }
                        </div>
                        
                        ${combo.tags && combo.tags.length > 0 ? `
                            <div class="combination-tags">
                                ${combo.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');
        }
        
        // Load available clothes for the create modal
        function loadAvailableClothes() {
            clothes = getClothes();
            
            if (clothes.length === 0) {
                availableItemsContainer.innerHTML = `
                    <div class="text-center" style="padding: 2rem;">
                        <p>No clothes found in your wardrobe.</p>
                        <a href="add-cloth.html" class="btn btn-primary mt-2">Add Clothes</a>
                    </div>
                `;
                return;
            }
            
            // Group clothes by category
            const clothesByCategory = clothes.reduce((acc, item) => {
                const category = item.category || 'Uncategorized';
                if (!acc[category]) {
                    acc[category] = [];
                }
                acc[category].push(item);
                return acc;
            }, {});
            
            // Render clothes by category
            availableItemsContainer.innerHTML = Object.entries(clothesByCategory)
                .map(([category, items]) => `
                    <div class="category-section">
                        <div class="category-title">
                            <span>${category}</span>
                            <span>${items.length} items</span>
                        </div>
                        <div class="category-items">
                            ${items.map(item => `
                                <div class="item-checkbox-container">
                                    <input type="checkbox" 
                                           id="item-${item.id}" 
                                           class="item-checkbox" 
                                           value="${item.id}"
                                           ${selectedClothes.includes(item.id) ? 'checked' : ''}>
                                    <label for="item-${item.id}" class="item-label">
                                        <img src="${item.imagePreview || 'https://via.placeholder.com/80'}" 
                                             alt="${item.category}">
                                        <span class="item-category">${item.color}</span>
                                    </label>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('');
        }
        
        // Update the selected items display
        function updateSelectedItems() {
            if (selectedClothes.length === 0) {
                selectedItemsContainer.innerHTML = `
                    <p class="text-center" style="grid-column: 1 / -1; color: #6b7280;">
                        Select items from below to add to this combination
                    </p>
                `;
                return;
            }
            
            selectedItemsContainer.innerHTML = selectedClothes.map(id => {
                const item = clothes.find(c => c.id === id);
                if (!item) return '';
                
                return `
                    <div class="selected-item">
                        <button class="remove-item" data-id="${item.id}" aria-label="Remove item">&times;</button>
                        <img src="${item.imagePreview || 'https://via.placeholder.com/80'}" 
                             alt="${item.category}"
                             style="width: 100%; height: 80px; object-fit: cover; border-radius: 0.25rem;">
                        <div class="item-category">${item.category}</div>
                    </div>
                `;
            }).join('');
        }

        // --- Modal and Action Functions ---
        
        function openCreateModal() {
            selectedClothes = [];
            document.getElementById('combinationName').value = '';
            document.getElementById('combinationTags').value = '';
            loadAvailableClothes();
            updateSelectedItems();
            createCombinationModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
        
        function closeCreateModal() {
            createCombinationModal.style.display = 'none';
            document.body.style.overflow = '';
        }

        function openDeleteModal(id) {
            combinationToDelete = id;
            // Update modal text for deleting a combination
            deleteModal.querySelector('h3').textContent = 'Delete Combination';
            deleteModal.querySelector('p').textContent = 'Are you sure you want to delete this combination? This action cannot be undone.';
            deleteModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }

        function closeDeleteModal() {
            deleteModal.style.display = 'none';
            document.body.style.overflow = '';
            combinationToDelete = null;
        }
        
        function saveCombination() {
            const name = document.getElementById('combinationName').value.trim() || 'Unnamed Outfit';
            const tags = document.getElementById('combinationTags').value
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0);
            
            if (selectedClothes.length === 0) {
                alert('Please select at least one item for this combination.');
                return;
            }
            
            const newCombination = {
                name,
                tags,
                items: [...selectedClothes]
            };
            
            addCombination(newCombination);
            closeCreateModal();
            loadCombinations();
        }

        function deleteSelectedCombination() {
            if (combinationToDelete) {
                deleteCombination(combinationToDelete);
                closeDeleteModal();
                loadCombinations();
            }
        }
        
        // --- Event Listeners ---
        
        if (createCombinationBtn) {
            createCombinationBtn.addEventListener('click', openCreateModal);
        }
        
        if (saveCombinationBtn) saveCombinationBtn.addEventListener('click', saveCombination);
        if (cancelCombinationBtn) cancelCombinationBtn.addEventListener('click', closeCreateModal);
        if (closeModalBtn) closeModalBtn.addEventListener('click', closeCreateModal);

        if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', deleteSelectedCombination);
        if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeDeleteModal);

        if (availableItemsContainer) {
            availableItemsContainer.addEventListener('change', (e) => {
                if (e.target.classList.contains('item-checkbox')) {
                    const itemId = e.target.value;
                    if (e.target.checked) {
                        if (!selectedClothes.includes(itemId)) {
                            selectedClothes.push(itemId);
                        }
                    } else {
                        selectedClothes = selectedClothes.filter(id => id !== itemId);
                    }
                    updateSelectedItems();
                }
            });
        }

        if (selectedItemsContainer) {
            selectedItemsContainer.addEventListener('click', (e) => {
                const removeBtn = e.target.closest('.remove-item');
                if (removeBtn) {
                    const itemId = removeBtn.getAttribute('data-id');
                    selectedClothes = selectedClothes.filter(id => id !== itemId);
                    
                    const checkbox = document.querySelector(`#item-${itemId}`);
                    if (checkbox) {
                        checkbox.checked = false;
                    }
                    updateSelectedItems();
                }
            });
        }
        
        combinationsContainer.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.btn-delete');
            if (deleteBtn) {
                e.stopPropagation();
                openDeleteModal(deleteBtn.getAttribute('data-id'));
            }

            const createBtn = e.target.closest('#createFirstCombination');
            if (createBtn) {
                openCreateModal();
            }
        });

        window.addEventListener('click', (e) => {
            if (e.target === createCombinationModal) {
                closeCreateModal();
            }
            if (e.target === deleteModal) {
                closeDeleteModal();
            }
        });
        
        // Initial load
        loadCombinations();
    }


    /**
     * Initializes the Mobile Menu functionality (runs on all pages)
     */
    function initMobileMenu() {
        const menuBtn = document.querySelector('.mobile-menu-btn');
        const menuIcon = document.querySelector('.menu-icon');
        const navLinks = document.querySelector('.nav-links');
        const navOverlay = document.querySelector('.nav-overlay');

        if (!menuBtn || !menuIcon || !navLinks || !navOverlay) {
            return; // No mobile menu on this page
        }

        const closeMenu = () => {
            document.body.classList.remove('menu-open');
            navLinks.classList.remove('active');
            navOverlay.classList.remove('active');
            menuIcon.classList.remove('active');
            menuBtn.setAttribute('aria-expanded', 'false');
            document.removeEventListener('keydown', handleEscape);
        };

        const openMenu = () => {
            document.body.classList.add('menu-open');
            navLinks.classList.add('active');
            navOverlay.classList.add('active');
            menuIcon.classList.add('active');
            menuBtn.setAttribute('aria-expanded', 'true');
            document.addEventListener('keydown', handleEscape);
        };

        const toggleMenu = () => {
            if (navLinks.classList.contains('active')) {
                closeMenu();
            } else {
                openMenu();
            }
        };

        function handleEscape(e) {
            if (e.key === 'Escape') {
                closeMenu();
            }
        }

        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMenu();
        });

        navOverlay.addEventListener('click', closeMenu);

        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', closeMenu);
        });
        
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && navLinks.classList.contains('active')) {
                closeMenu();
            }
        });
    }


    // --- Main Initializer (Router) ---
    
    document.addEventListener('DOMContentLoaded', () => {
        // 1. Load data into memory
        loadData();
        
        // 2. Initialize mobile menu (runs on all pages)
        initMobileMenu();
        
        // 3. Run page-specific setup
        const path = window.location.pathname.split('/').pop();

        if (path === '' || path === 'index.html') {
            initDashboardPage();
        } else if (path === 'view-clothes.html') {
            initViewClothesPage();
        } else if (path === 'add-cloth.html') {
            initAddClothPage();
        } else if (path === 'combinations.html') {
            initCombinationsPage();
        }
    });

})(); // End of IIFE