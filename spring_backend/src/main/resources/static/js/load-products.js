// Load products from backend API on website pages
(function() {
    // Check if we're on a page that needs products
    const productContainer = document.getElementById('product1') || document.querySelector('.product-grid');
    
    if (!productContainer) return; // Not a product page
    
    async function loadProductsFromAPI() {
        try {
            console.log('Loading products from API...');
            // Use relative URL instead of absolute URL to avoid CORS issues and deployment problems
            const response = await fetch('/api/products');
            
            if (!response.ok) {
                console.error('Failed to load products:', response.status);
                return;
            }
            
            const products = await response.json();
            console.log('Products loaded:', products);
            
            if (!products || products.length === 0) {
                console.warn('No products found');
                return;
            }
            
            // Render products dynamically
            renderProducts(products);
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }
    
    function renderProducts(products) {
        const container = document.getElementById('product1') || 
                         document.querySelector('.product-section .product-grid') ||
                         document.querySelector('.product-grid');
        
        if (!container) {
            console.warn('Product container not found');
            return;
        }
        
        // Create product HTML
        let html = '';
        products.forEach((product, index) => {
            const productId = product.id || (index + 1);
            const title = product.title || 'Product';
            // Get image path from product
            let imagePath = product.imagePath || '';
            
            // Normalize the image path
            if (!imagePath || imagePath === 'img/products/default.png' || imagePath === '/img/products/default.png') {
                // Use fallback images from the products folder
                const fallbackImages = ['d1-1.png', 'd2-1.jpg', 'd3-1.png', 'd4-1.png', 'd5-1.png'];
                imagePath = 'img/products/' + fallbackImages[index % fallbackImages.length];
            } else {
                // Handle absolute URLs (with http:// or https://)
                if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
                    // Keep absolute URLs as they are
                } 
                // Handle root-relative paths (starting with /)
                else if (imagePath.startsWith('/')) {
                    // Remove leading slash for relative path handling
                    imagePath = imagePath.substring(1);
                }
                // Handle relative paths that don't start with img/
                else if (!imagePath.startsWith('img/')) {
                    // Prepend img/products/ only if it's not already there
                    imagePath = 'img/products/' + imagePath;
                }
                // If it already starts with img/, leave it as is
            }
            const price = product.price || 0;
            const description = product.description || 'Premium product';
            
            html += `
                <div class="product-card" data-product-id="${productId}">
                    <img src="${imagePath}" alt="${title}" class="product-image" 
                         onerror="this.src='img/products/d1-1.png'"
                         onclick="goToProductDetails(${productId}, '${title}', '${imagePath}', ${price}, ${price * 2}, '${description}')">
                    <div class="product-info">
                        <h3 class="product-name" onclick="goToProductDetails(${productId}, '${title}', '${imagePath}', ${price}, ${price * 2}, '${description}')">${title}</h3>
                        <div class="price-container">
                            <span class="original-price">₹ ${(price * 2).toLocaleString()}</span>
                            <span class="discount-price">₹ ${price.toLocaleString()}</span>
                        </div>
                        <button class="add-to-cart-btn" onclick="addToCart(${productId})"><i class="fas fa-shopping-cart"></i></button>
                    </div>
                </div>
            `;
        });
        
        // Replace container content if it's .product-grid
        const gridContainer = container.querySelector('.product-grid') || container;
        if (gridContainer.classList && gridContainer.classList.contains('product-grid')) {
            gridContainer.innerHTML = html;
        } else if (container.id === 'product1') {
            // For #product1 container, we need to find or create the grid
            let grid = container.querySelector('.product-grid');
            if (!grid) {
                grid = document.createElement('div');
                grid.className = 'product-grid';
                container.appendChild(grid);
            }
            grid.innerHTML = html;
        } else {
            container.innerHTML = html;
        }
        
        console.log('Products rendered:', products.length);
    }
    
    // Load products when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadProductsFromAPI);
    } else {
        // DOM is already ready
        setTimeout(loadProductsFromAPI, 500);
    }
})();

// Global image load error fallback: if any <img> fails to load, replace with placeholder
(function() {
    function imageErrorHandler(e) {
        var el = e.target || e.srcElement;
        if (el && el.tagName === 'IMG') {
            try {
                if (!el.dataset.fallbackApplied) {
                    el.dataset.fallbackApplied = '1';
                    el.src = '/img/products/d1-1.png';
                }
            } catch (err) {
                // swallow errors silently
            }
        }
    }
    window.addEventListener('error', imageErrorHandler, true);
})();