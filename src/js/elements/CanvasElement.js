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
        this.id = options.id || this.generateId();
        
        // Firebase ID (if synced with Firebase)
        this.firebaseId = options.firebaseId || null;
        
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
        this.createdAt = options.createdAt || Date.now();
        this.updatedAt = options.updatedAt || this.createdAt;
        
        // User attribution
        this.createdBy = options.createdBy || null;
        this.updatedBy = options.updatedBy || null;
        
        // Visibility
        this.visible = options.visible !== undefined ? options.visible : true;
        
        // Sync status
        this.isSynced = options.isSynced || false;
        
        // Owner highlighting
        this.isOwnerHighlighted = false;
        
        // Flag to indicate if the element is being dragged locally
        this.isBeingDragged = false;
        
        // Animation state for new elements
        this.isNew = options.isNew !== undefined ? options.isNew : true;
        this.animationStartTime = options.isNew ? Date.now() : null;
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
     * Apply owner highlighting effect if needed
     * @param {CanvasRenderingContext2D} ctx - The canvas context
     */
    applyOwnerHighlighting(ctx) {
        if (this.isOwnerHighlighted) {
            ctx.save();
            // Apply a glow effect
            ctx.shadowColor = 'rgba(237, 104, 43, 0.8)';
            ctx.shadowBlur = 10;
            return true;
        }
        return false;
    }
    
    /**
     * Restore context after owner highlighting
     * @param {CanvasRenderingContext2D} ctx - The canvas context
     * @param {boolean} wasHighlighted - Whether highlighting was applied
     */
    restoreAfterHighlighting(ctx, wasHighlighted) {
        if (wasHighlighted) {
            ctx.restore();
        }
    }
    
    /**
     * Apply new element animation if needed
     * @param {CanvasRenderingContext2D} ctx - The canvas context
     */
    applyNewElementAnimation(ctx) {
        if (this.isNew && this.animationStartTime) {
            const elapsed = Date.now() - this.animationStartTime;
            const duration = 500; // Animation duration in ms
            
            if (elapsed < duration) {
                const progress = elapsed / duration;
                const scale = 0.8 + (0.2 * progress); // Scale from 0.8 to 1.0
                const opacity = progress; // Fade in from 0 to 1
                
                ctx.save();
                ctx.globalAlpha = opacity;
                ctx.translate(this.x, this.y);
                ctx.scale(scale, scale);
                ctx.translate(-this.x, -this.y);
                return true;
            } else {
                // Animation complete
                this.isNew = false;
                this.animationStartTime = null;
            }
        }
        return false;
    }
    
    /**
     * Restore context after new element animation
     * @param {CanvasRenderingContext2D} ctx - The canvas context
     * @param {boolean} wasAnimated - Whether animation was applied
     */
    restoreAfterAnimation(ctx, wasAnimated) {
        if (wasAnimated) {
            ctx.restore();
        }
    }
    
    /**
     * Set owner highlighting state
     * @param {boolean} highlighted - Whether to highlight this element
     */
    setOwnerHighlight(highlighted) {
        this.isOwnerHighlighted = highlighted;
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
        if (options.updatedBy !== undefined) this.updatedBy = options.updatedBy;
        if (options.firebaseId !== undefined) this.firebaseId = options.firebaseId;
        if (options.isSynced !== undefined) this.isSynced = options.isSynced;
        if (options.isOwnerHighlighted !== undefined) this.isOwnerHighlighted = options.isOwnerHighlighted;
        
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
            zIndex: this.zIndex,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            createdBy: this.createdBy,
            updatedBy: this.updatedBy,
            isOwnerHighlighted: this.isOwnerHighlighted,
            isNew: false
        });
    }
    
    /**
     * Serialize the element for Firebase
     * @returns {Object} - Serialized element data
     */
    serialize() {
        return {
            id: this.id,
            type: this.type,
            x: this.x,
            y: this.y,
            rotation: this.rotation,
            scaleX: this.scaleX,
            scaleY: this.scaleY,
            zIndex: this.zIndex,
            visible: this.visible,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            createdBy: this.createdBy,
            updatedBy: this.updatedBy
        };
    }
    
    /**
     * Deserialize element data from Firebase
     * @param {Object} data - The element data from Firebase
     * @returns {CanvasElement} - Deserialized element
     */
    static deserialize(data) {
        return new CanvasElement({
            id: data.id,
            firebaseId: data.firebaseId,
            x: data.x,
            y: data.y,
            rotation: data.rotation,
            scaleX: data.scaleX,
            scaleY: data.scaleY,
            zIndex: data.zIndex,
            visible: data.visible,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            createdBy: data.createdBy,
            updatedBy: data.updatedBy,
            isSynced: true,
            isNew: false
        });
    }
} 