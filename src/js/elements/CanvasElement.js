/**
 * CanvasElement class
 * Base class for all canvas elements
 * This is a placeholder for Phase 5-7 implementation
 */
export class CanvasElement {
    /**
     * Constructor
     * @param {Object} options - Element options
     */
    constructor(options = {}) {
        // Generate a unique ID
        this.id = this.generateId();
        
        // Element type
        this.type = 'base';
        
        // Position
        this.x = options.x || 0;
        this.y = options.y || 0;
        
        // Rotation angle (in radians)
        this.rotation = options.rotation || 0;
        
        // Scale
        this.scaleX = options.scaleX || 1;
        this.scaleY = options.scaleY || 1;
        
        // Z-index for stacking
        this.zIndex = options.zIndex || 0;
        
        // Timestamps
        this.createdAt = Date.now();
        this.updatedAt = this.createdAt;
        
        // Visibility
        this.visible = true;
    }
    
    /**
     * Generate a unique ID
     * @returns {string} - A unique ID
     */
    generateId() {
        return 'element_' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * Render the element on the canvas
     * @param {CanvasRenderingContext2D} ctx - The canvas context
     */
    render(ctx) {
        // This method should be overridden by subclasses
        console.warn('render() method not implemented for this element type.');
    }
    
    /**
     * Check if a point is inside the element
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @returns {boolean} - True if the point is inside the element, false otherwise
     */
    containsPoint(x, y) {
        // This method should be overridden by subclasses
        return false;
    }
    
    /**
     * Update the element
     * @param {Object} options - The options to update
     */
    update(options = {}) {
        // Update properties
        if (options.x !== undefined) this.x = options.x;
        if (options.y !== undefined) this.y = options.y;
        if (options.rotation !== undefined) this.rotation = options.rotation;
        if (options.scaleX !== undefined) this.scaleX = options.scaleX;
        if (options.scaleY !== undefined) this.scaleY = options.scaleY;
        if (options.zIndex !== undefined) this.zIndex = options.zIndex;
        if (options.visible !== undefined) this.visible = options.visible;
        
        // Update timestamp
        this.updatedAt = Date.now();
    }
    
    /**
     * Get the element's bounding box
     * @returns {Object} - The bounding box {x, y, width, height}
     */
    getBoundingBox() {
        // This method should be overridden by subclasses
        return { x: this.x, y: this.y, width: 0, height: 0 };
    }
    
    /**
     * Clone the element
     * @returns {CanvasElement} - A clone of the element
     */
    clone() {
        // This method should be overridden by subclasses
        return new CanvasElement({
            x: this.x,
            y: this.y,
            rotation: this.rotation,
            scaleX: this.scaleX,
            scaleY: this.scaleY,
            zIndex: this.zIndex
        });
    }
} 