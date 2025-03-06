/**
 * ErrorToast Component
 * Displays error messages to users
 */

export class ErrorToast {
    /**
     * Create a new ErrorToast
     */
    constructor() {
        this.toastElement = null;
        this.timeout = null;
        this.duration = 5000; // Default duration in ms
    }

    /**
     * Initialize the error toast
     */
    initialize() {
        if (!this.toastElement) {
            this.createToastElement();
        }
    }

    /**
     * Create the toast DOM element
     */
    createToastElement() {
        this.toastElement = document.createElement('div');
        this.toastElement.className = 'error-toast';
        document.body.appendChild(this.toastElement);
    }

    /**
     * Show an error message
     * @param {string} message - The error message to display
     * @param {number} [duration=5000] - How long to show the message in ms
     */
    show(message, duration = this.duration) {
        if (!this.toastElement) {
            this.createToastElement();
        }

        // Clear any existing timeout
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }

        // Remove fade-out class if present
        this.toastElement.classList.remove('fade-out');
        
        // Set the message
        this.toastElement.textContent = message;
        
        // Make visible
        this.toastElement.classList.add('visible');
        
        // Set timeout to hide
        this.timeout = setTimeout(() => {
            this.hide();
        }, duration);
    }

    /**
     * Hide the error toast
     */
    hide() {
        if (!this.toastElement) return;
        
        // Add fade-out class
        this.toastElement.classList.add('fade-out');
        
        // Remove visible class after animation
        setTimeout(() => {
            this.toastElement.classList.remove('visible');
        }, 300); // Match the CSS transition duration
        
        // Clear timeout
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
    }
} 