/**
 * ModeManager class
 * Manages the current interaction mode of the application
 * Updated for Phase 2 to support navigation features
 */
export class ModeManager {
    /**
     * Constructor
     */
    constructor() {
        // Available modes
        this.modes = [
            'navigation',  // For panning and zooming
            'drawing',     // For drawing on the canvas
            'selection',   // For selecting and manipulating elements
            'creation'     // For creating new elements
        ];
        
        // Current mode
        this.currentMode = 'navigation';
        
        // Event listeners
        this.listeners = {};
    }
    
    /**
     * Set the current mode
     * @param {string} mode - The mode to set
     */
    setMode(mode) {
        // Check if the mode exists
        if (!this.modes.includes(mode)) {
            console.error(`Mode "${mode}" does not exist.`);
            return;
        }
        
        // Set current mode
        const previousMode = this.currentMode;
        this.currentMode = mode;
        
        console.log(`Mode changed from "${previousMode}" to "${mode}".`);
        
        // Trigger mode change event
        this.triggerEvent('modeChange', { 
            previousMode, 
            currentMode: mode 
        });
    }
    
    /**
     * Get the current mode
     * @returns {string} - The current mode
     */
    getMode() {
        return this.currentMode;
    }
    
    /**
     * Check if a specific mode is active
     * @param {string} mode - The mode to check
     * @returns {boolean} - True if the mode is active, false otherwise
     */
    isMode(mode) {
        return this.currentMode === mode;
    }
    
    /**
     * Toggle between navigation mode and the previous mode
     * @returns {string} - The new current mode
     */
    toggleNavigationMode() {
        if (this.currentMode === 'navigation') {
            // If we're already in navigation mode, switch to the previous mode
            // or default to drawing mode
            this.setMode(this.previousMode || 'drawing');
        } else {
            // Store the current mode before switching to navigation
            this.previousMode = this.currentMode;
            this.setMode('navigation');
        }
        
        return this.currentMode;
    }
    
    /**
     * Check if navigation features are available in the current mode
     * @returns {boolean} - True if navigation is available
     */
    canNavigate() {
        // Navigation is always available in navigation mode
        // In other modes, it might be available with modifier keys (e.g., spacebar)
        return this.currentMode === 'navigation';
    }
    
    /**
     * Add an event listener
     * @param {string} event - The event to listen for
     * @param {Function} callback - The callback function
     */
    addEventListener(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        
        this.listeners[event].push(callback);
    }
    
    /**
     * Remove an event listener
     * @param {string} event - The event to remove the listener from
     * @param {Function} callback - The callback function to remove
     */
    removeEventListener(event, callback) {
        if (!this.listeners[event]) {
            return;
        }
        
        this.listeners[event] = this.listeners[event].filter(
            listener => listener !== callback
        );
    }
    
    /**
     * Trigger an event
     * @param {string} event - The event to trigger
     * @param {Object} data - The data to pass to the event listeners
     */
    triggerEvent(event, data) {
        if (!this.listeners[event]) {
            return;
        }
        
        this.listeners[event].forEach(callback => {
            callback(data);
        });
    }
} 