/**
 * LoadingState class
 * Displays loading indicators during initial guestbook rendering
 */
export class LoadingState {
    /**
     * Constructor
     */
    constructor() {
        this.loadingElement = null;
        this.progressElement = null;
        this.messageElement = null;
        this.isVisible = false;
        this.progress = 0;
        this.totalItems = 0;
        this.loadedItems = 0;
    }
    
    /**
     * Initialize the loading state component
     */
    initialize() {
        // Create loading element if it doesn't exist
        if (!this.loadingElement) {
            this.loadingElement = document.createElement('div');
            this.loadingElement.className = 'loading-state';
            this.loadingElement.innerHTML = `
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <h3 class="loading-title">Loading Guestbook</h3>
                    <div class="loading-progress-container">
                        <div class="loading-progress-bar">
                            <div class="loading-progress-fill"></div>
                        </div>
                        <div class="loading-progress-text">0%</div>
                    </div>
                    <div class="loading-message">Initializing...</div>
                </div>
            `;
            document.body.appendChild(this.loadingElement);
            
            // Get progress and message elements
            this.progressElement = this.loadingElement.querySelector('.loading-progress-fill');
            this.progressTextElement = this.loadingElement.querySelector('.loading-progress-text');
            this.messageElement = this.loadingElement.querySelector('.loading-message');
        }
    }
    
    /**
     * Show the loading state
     * @param {number} totalItems - Total number of items to load
     */
    show(totalItems = 0) {
        if (!this.loadingElement) {
            this.initialize();
        }
        
        this.isVisible = true;
        this.totalItems = totalItems;
        this.loadedItems = 0;
        this.progress = 0;
        
        // Update progress display
        this.updateProgress(0);
        
        // Show loading element
        this.loadingElement.classList.add('visible');
        
        // Prevent scrolling on the body
        document.body.classList.add('loading-active');
    }
    
    /**
     * Hide the loading state
     */
    hide() {
        if (!this.loadingElement || !this.isVisible) return;
        
        this.isVisible = false;
        
        // Add fade-out class
        this.loadingElement.classList.add('fade-out');
        
        // Remove loading element after animation
        setTimeout(() => {
            this.loadingElement.classList.remove('visible', 'fade-out');
            document.body.classList.remove('loading-active');
        }, 500); // Match the CSS transition duration
    }
    
    /**
     * Update the loading progress
     * @param {number} increment - Number of items loaded
     */
    updateProgress(increment = 1) {
        // Increment loaded items
        this.loadedItems += increment;
        
        // Calculate progress percentage
        if (this.totalItems > 0) {
            this.progress = Math.min(Math.round((this.loadedItems / this.totalItems) * 100), 100);
        } else {
            // If total items is unknown, use a simulated progress
            this.progress = Math.min(this.progress + 5, 90); // Cap at 90% for unknown total
        }
        
        // Update progress bar and text
        if (this.progressElement) {
            this.progressElement.style.width = `${this.progress}%`;
        }
        
        if (this.progressTextElement) {
            this.progressTextElement.textContent = `${this.progress}%`;
        }
        
        // If progress is 100%, hide after a short delay
        if (this.progress >= 100) {
            setTimeout(() => {
                this.hide();
            }, 500);
        }
    }
    
    /**
     * Update the loading message
     * @param {string} message - The message to display
     */
    updateMessage(message) {
        if (this.messageElement) {
            this.messageElement.textContent = message;
        }
    }
} 