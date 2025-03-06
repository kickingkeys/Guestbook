/**
 * SavingIndicator Component
 * Displays a visual indicator when data is being saved to Firebase
 */

export class SavingIndicator {
    /**
     * Create a new SavingIndicator
     */
    constructor() {
        this.indicatorElement = null;
        this.spinnerElement = null;
        this.textElement = null;
        this.hideTimeout = null;
        this.saveCount = 0;
    }

    /**
     * Initialize the saving indicator
     */
    initialize() {
        if (!this.indicatorElement) {
            this.createIndicatorElement();
        }
    }

    /**
     * Create the indicator DOM element
     */
    createIndicatorElement() {
        // Create main container
        this.indicatorElement = document.createElement('div');
        this.indicatorElement.className = 'saving-indicator';
        
        // Create spinner
        this.spinnerElement = document.createElement('div');
        this.spinnerElement.className = 'saving-spinner';
        this.indicatorElement.appendChild(this.spinnerElement);
        
        // Create text
        this.textElement = document.createElement('div');
        this.textElement.className = 'saving-text';
        this.textElement.textContent = 'Saving...';
        this.indicatorElement.appendChild(this.textElement);
        
        // Add to document
        document.body.appendChild(this.indicatorElement);
    }

    /**
     * Show the saving indicator
     * @param {string} [message='Saving...'] - Custom message to display
     */
    showSaving(message = 'Saving...') {
        if (!this.indicatorElement) {
            this.createIndicatorElement();
        }
        
        // Increment save counter
        this.saveCount++;
        
        // Update text if provided
        if (message) {
            this.textElement.textContent = message;
        }
        
        // Clear any existing timeout
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
        
        // Show the indicator
        this.indicatorElement.classList.add('visible');
    }

    /**
     * Show a saved success message briefly
     * @param {string} [message='Saved!'] - Success message to display
     */
    showSaved(message = 'Saved!') {
        if (!this.indicatorElement) {
            this.createIndicatorElement();
        }
        
        // Decrement save counter
        this.saveCount--;
        
        // If there are still pending saves, don't show "Saved" yet
        if (this.saveCount > 0) {
            return;
        }
        
        // Update text
        this.textElement.textContent = message;
        
        // Clear any existing timeout
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
        }
        
        // Set timeout to hide
        this.hideTimeout = setTimeout(() => {
            this.hide();
        }, 2000);
    }

    /**
     * Hide the saving indicator
     */
    hide() {
        if (!this.indicatorElement) return;
        
        // Only hide if no pending saves
        if (this.saveCount <= 0) {
            this.indicatorElement.classList.remove('visible');
            this.saveCount = 0; // Reset counter
        }
    }

    /**
     * Show an error with saving
     * @param {string} [message='Error saving'] - Error message to display
     */
    showError(message = 'Error saving') {
        if (!this.indicatorElement) {
            this.createIndicatorElement();
        }
        
        // Decrement save counter
        this.saveCount--;
        
        // Update text
        this.textElement.textContent = message;
        
        // Add error styling
        this.indicatorElement.classList.add('error');
        
        // Clear any existing timeout
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
        }
        
        // Set timeout to hide
        this.hideTimeout = setTimeout(() => {
            this.hide();
            this.indicatorElement.classList.remove('error');
        }, 3000);
    }
} 