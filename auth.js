// Centralized Authentication Module
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.API_BASE_URL = 'http://localhost:8080/api';
    }

    // Check if user is authenticated
    isAuthenticated() {
        const token = localStorage.getItem('token');
        const username = localStorage.getItem('username');
        return token && username;
    }

    // Get current user info
    getCurrentUser() {
        if (this.isAuthenticated()) {
            return {
                username: localStorage.getItem('username'),
                token: localStorage.getItem('token')
            };
        }
        return null;
    }

    // Update authentication UI elements
    updateAuthUI() {
        const authLinks = document.querySelectorAll('#authLink, #loginLink, #mobileAuthLink');

        if (this.isAuthenticated()) {
            const username = localStorage.getItem('username');
            authLinks.forEach(link => {
                if (link) {
                    link.textContent = `Welcome, ${username}`;
                    link.href = '#';
                    link.onclick = (e) => {
                        e.preventDefault();
                        this.logout();
                    };
                }
            });
        } else {
            authLinks.forEach(link => {
                if (link) {
                    link.textContent = 'Login';
                    link.href = 'login.html';
                    link.onclick = null;
                }
            });
        }
    }

    // Logout user
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        this.currentUser = null;
        this.updateAuthUI();
        window.location.href = 'index.html';
    }

    // Initialize authentication on page load
    init() {
        this.currentUser = this.getCurrentUser();
        this.updateAuthUI();
    }

    // Check backend availability
    async isBackendAvailable() {
        try {
            const response = await fetch(`${this.API_BASE_URL.replace('/api', '')}/actuator/health`, {
                method: 'GET'
            });
            return response.ok;
        } catch (error) {
            console.warn('Backend server not available:', error);
            return false;
        }
    }
}

// Global auth instance
const authManager = new AuthManager();

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    authManager.init();
});
