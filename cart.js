// Centralized Cart Management Module
class CartManager {
    constructor() {
        this.cartItems = [];
        this.API_BASE_URL = 'http://localhost:8080/api';
        this.authManager = authManager; // Reference to global auth manager
    }

    // Load cart from backend or local storage
    async loadCart() {
        try {
            const currentUser = this.authManager.getCurrentUser();

            // Check if user is logged in and backend is available
            if (currentUser && await this.authManager.isBackendAvailable()) {
                try {
                    console.log('Attempting to load cart from backend');
                    const response = await fetch(`${this.API_BASE_URL}/cart`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${currentUser.token}`
                        }
                    });

                    if (response.ok) {
                        const backendCart = await response.json();
                        console.log('Successfully loaded cart from backend:', backendCart);

                        // Sync backend cart to local storage for consistency
                        const localCart = { items: backendCart.map(item => ({
                            product: item.product,
                            quantity: item.quantity,
                            priceAtTime: item.product.price
                        })) };
                        localStorage.setItem('localCart', JSON.stringify(localCart));

                        this.cartItems = localCart.items;
                        return localCart;
                    } else {
                        console.warn('Failed to load cart from backend, falling back to local storage');
                    }
                } catch (backendError) {
                    console.warn('Error loading cart from backend:', backendError);
                }
            }

            // Fallback to local storage
            console.log('Loading cart from local storage');
            const localCart = JSON.parse(localStorage.getItem('localCart')) || { items: [] };
            this.cartItems = localCart.items;
            return localCart;

        } catch (err) {
            console.error('Error loading cart:', err);
            this.cartItems = [];
            return { items: [] };
        }
    }

    // Add item to cart
    async addToCart(productId, quantity = 1) {
        const currentUser = this.authManager.getCurrentUser();

        if (!currentUser) {
            alert('Please login to add items to cart');
            return false;
        }

        try {
            // Sync with local cart first for immediate feedback
            let localCart = JSON.parse(localStorage.getItem('localCart')) || { items: [] };
            const existingIndex = localCart.items.findIndex(i => i.product && i.product.id == productId);

            if (existingIndex >= 0) {
                localCart.items[existingIndex].quantity = (localCart.items[existingIndex].quantity || 1) + quantity;
            } else {
                // Get product details from DOM or create basic product object
                const productCard = document.querySelector(`.product-card[data-product-id="${productId}"]`);
                const name = productCard?.querySelector('.product-name')?.textContent?.trim() || `Product #${productId}`;
                const priceText = productCard?.querySelector('.discount-price')?.textContent || productCard?.querySelector('.product-price')?.textContent || '0';
                const price = parseFloat((priceText || '').toString().replace(/[^0-9.]/g, '')) || 0;
                const img = productCard?.querySelector('img.product-image')?.getAttribute('src') || null;

                localCart.items.push({
                    product: { id: productId, name: name, price: price, imageUrl: img },
                    quantity: quantity,
                    priceAtTime: price
                });
            }

            localStorage.setItem('localCart', JSON.stringify(localCart));
            this.cartItems = localCart.items;

            // Add to backend if available
            if (await this.authManager.isBackendAvailable()) {
                try {
                    const response = await fetch(`${this.API_BASE_URL}/cart/add`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${currentUser.token}`
                        },
                        body: JSON.stringify({ productId: productId, quantity: quantity })
                    });

                    if (response.status === 401) {
                        // Token expired or invalid, logout user
                        console.warn('Token expired, logging out user');
                        this.authManager.logout();
                        return false;
                    }

                    if (!response.ok) {
                        console.warn('Failed to sync with backend, but local cart updated');
                    }
                } catch (backendError) {
                    console.warn('Backend sync failed, but local cart updated:', backendError);
                }
            }

            return true;

        } catch (err) {
            console.error('Error adding to cart:', err);
            alert('Error adding item to cart: ' + err.message);
            return false;
        }
    }

    // Update item quantity
    updateQuantity(productId, newQuantity) {
        if (newQuantity < 1) {
            alert('Quantity must be at least 1');
            return false;
        }

        try {
            let cart = JSON.parse(localStorage.getItem('localCart')) || { items: [] };
            const itemIndex = cart.items.findIndex(item => item.product.id === productId);

            if (itemIndex !== -1) {
                cart.items[itemIndex].quantity = newQuantity;
                localStorage.setItem('localCart', JSON.stringify(cart));
                this.cartItems = cart.items;
                return true;
            } else {
                console.error('Product not found in cart');
                alert('Error: Product not found in cart');
                return false;
            }
        } catch (err) {
            console.error('Error updating quantity:', err);
            alert('Error updating quantity: ' + err.message);
            return false;
        }
    }

    // Remove item from cart
    removeFromCart(productId) {
        if (!confirm('Are you sure you want to remove this item from your cart?')) {
            return false;
        }

        try {
            let cart = JSON.parse(localStorage.getItem('localCart')) || { items: [] };
            const itemIndex = cart.items.findIndex(item => item.product.id === productId);

            if (itemIndex !== -1) {
                cart.items.splice(itemIndex, 1);
                localStorage.setItem('localCart', JSON.stringify(cart));
                this.cartItems = cart.items;
                return true;
            } else {
                console.error('Product not found in cart');
                alert('Error: Product not found in cart');
                return false;
            }
        } catch (err) {
            console.error('Error removing item from cart:', err);
            alert('Error removing item from cart: ' + err.message);
            return false;
        }
    }

    // Clear entire cart
    clearCart() {
        if (!confirm('Are you sure you want to clear your cart? This action cannot be undone.')) {
            return false;
        }

        try {
            const emptyCart = { items: [] };
            localStorage.setItem('localCart', JSON.stringify(emptyCart));
            this.cartItems = [];
            return true;
        } catch (err) {
            console.error('Error clearing cart:', err);
            alert('Error clearing cart: ' + err.message);
            return false;
        }
    }

    // Get cart total
    getTotal() {
        return this.cartItems.reduce((total, item) => {
            const price = item.priceAtTime || item.product.price;
            return total + (price * item.quantity);
        }, 0);
    }

    // Get cart item count
    getItemCount() {
        return this.cartItems.reduce((count, item) => count + item.quantity, 0);
    }
}

// Global cart instance
const cartManager = new CartManager();
