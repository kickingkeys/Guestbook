/**
 * Base Tool class
 * Provides common functionality for all tools
 */
export class Tool {
    /**
     * Constructor
     * @param {string} name - The name of the tool
     * @param {Object} config - The tool configuration
     */
    constructor(name, config = {}) {
        this.name = name;
        this.active = false;
        this.config = {
            icon: 'default',
            cursor: 'default',
            description: 'Tool',
            ...config
        };
    }
    
    /**
     * Activate the tool
     */
    activate() {
        this.active = true;
        console.log(`Tool activated: ${this.name}`);
    }
    
    /**
     * Deactivate the tool
     */
    deactivate() {
        this.active = false;
        console.log(`Tool deactivated: ${this.name}`);
    }
    
    /**
     * Check if the tool is active
     * @returns {boolean} - True if the tool is active, false otherwise
     */
    isActive() {
        return this.active;
    }
    
    /**
     * Get the tool configuration
     * @returns {Object} - The tool configuration
     */
    getConfig() {
        return this.config;
    }
    
    /**
     * Get the tool name
     * @returns {string} - The tool name
     */
    getName() {
        return this.name;
    }
    
    /**
     * Handle mouse down event
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {Event} event - The original event
     */
    onMouseDown(x, y, event) {
        // To be implemented by subclasses
    }
    
    /**
     * Handle mouse move event
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {Event} event - The original event
     */
    onMouseMove(x, y, event) {
        // To be implemented by subclasses
    }
    
    /**
     * Handle mouse up event
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {Event} event - The original event
     */
    onMouseUp(x, y, event) {
        // To be implemented by subclasses
    }
    
    /**
     * Handle key down event
     * @param {KeyboardEvent} event - The keyboard event
     */
    onKeyDown(event) {
        // To be implemented by subclasses
    }
    
    /**
     * Handle key up event
     * @param {KeyboardEvent} event - The keyboard event
     */
    onKeyUp(event) {
        // To be implemented by subclasses
    }
    
    /**
     * Handle touch start event
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {TouchEvent} event - The original event
     */
    onTouchStart(x, y, event) {
        // Default implementation: call onMouseDown for compatibility
        this.onMouseDown(x, y, event);
    }
    
    /**
     * Handle touch move event
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {TouchEvent} event - The original event
     */
    onTouchMove(x, y, event) {
        // Default implementation: call onMouseMove for compatibility
        this.onMouseMove(x, y, event);
    }
    
    /**
     * Handle touch end event
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {TouchEvent} event - The original event
     */
    onTouchEnd(x, y, event) {
        // Default implementation: call onMouseUp for compatibility
        this.onMouseUp(x, y, event);
    }
} 