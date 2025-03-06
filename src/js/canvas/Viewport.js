/**
 * Viewport class
 * Manages the view transformation for the canvas
 * Implements pan and zoom functionality for Phase 2
 */
export class Viewport {
    /**
     * Constructor
     */
    constructor() {
        // Position of the viewport
        this.x = 0;
        this.y = 0;
        
        // Zoom level
        this.scale = 1;
        
        // Minimum and maximum zoom levels
        this.minScale = 0.25;
        this.maxScale = 5;
        
        // Transformation matrix
        this.transform = {
            a: 1, // scale x
            b: 0, // skew y
            c: 0, // skew x
            d: 1, // scale y
            e: 0, // translate x
            f: 0  // translate y
        };
        
        // Pan state tracking
        this.isPanning = false;
        this.lastPanPoint = { x: 0, y: 0 };
        
        // Change listeners
        this.changeListeners = [];
    }
    
    /**
     * Reset the viewport to default state
     */
    reset() {
        this.x = 0;
        this.y = 0;
        this.scale = 1;
        
        // Reset transform
        this.transform = {
            a: 1, b: 0, c: 0, d: 1, e: 0, f: 0
        };
        
        this.isPanning = false;
        
        // Notify listeners
        this.notifyChangeListeners();
    }
    
    /**
     * Start panning from a specific point
     * @param {number} x - Starting X coordinate
     * @param {number} y - Starting Y coordinate
     */
    startPan(x, y) {
        this.isPanning = true;
        this.lastPanPoint = { x, y };
    }
    
    /**
     * Continue panning to a new point
     * @param {number} x - Current X coordinate
     * @param {number} y - Current Y coordinate
     */
    pan(x, y) {
        if (!this.isPanning) return;
        
        // Calculate the difference from the last point
        const dx = x - this.lastPanPoint.x;
        const dy = y - this.lastPanPoint.y;
        
        // Update the viewport position
        this.x += dx;
        this.y += dy;
        
        // Update the transform
        this.transform.e += dx;
        this.transform.f += dy;
        
        // Update the last pan point
        this.lastPanPoint = { x, y };
        
        // Notify listeners
        this.notifyChangeListeners();
    }
    
    /**
     * End panning
     */
    endPan() {
        this.isPanning = false;
    }
    
    /**
     * Zoom at a specific point
     * @param {number} x - Center X coordinate for zooming
     * @param {number} y - Center Y coordinate for zooming
     * @param {number} deltaScale - Amount to change scale by
     */
    zoom(x, y, deltaScale) {
        // Calculate new scale with constraints
        const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * deltaScale));
        
        // Calculate scale factor
        const factor = newScale / this.scale;
        
        // Convert screen point to world space before scaling
        const worldX = (x - this.transform.e) / this.scale;
        const worldY = (y - this.transform.f) / this.scale;
        
        // Update scale
        this.scale = newScale;
        
        // Update transform matrix
        this.transform.a = this.scale;
        this.transform.d = this.scale;
        
        // Adjust translation to zoom at point
        this.transform.e = x - worldX * this.scale;
        this.transform.f = y - worldY * this.scale;
        
        // Update viewport position
        this.x = this.transform.e;
        this.y = this.transform.f;
        
        // Notify listeners
        this.notifyChangeListeners();
    }
    
    /**
     * Apply the viewport transformation to the canvas context
     * @param {CanvasRenderingContext2D} ctx - The canvas context
     */
    applyTransform(ctx) {
        // Save the current transformation matrix
        ctx.save();
        
        // Apply our transformation
        ctx.setTransform(
            this.transform.a,
            this.transform.b,
            this.transform.c,
            this.transform.d,
            this.transform.e,
            this.transform.f
        );
    }
    
    /**
     * Restore the canvas context to its original state
     * @param {CanvasRenderingContext2D} ctx - The canvas context
     */
    restoreTransform(ctx) {
        ctx.restore();
    }
    
    /**
     * Convert screen coordinates to canvas coordinates
     * @param {number} screenX - X coordinate on screen
     * @param {number} screenY - Y coordinate on screen
     * @returns {Object} - Canvas coordinates {x, y}
     */
    screenToCanvas(screenX, screenY) {
        // Invert the transformation to get canvas coordinates
        const x = (screenX - this.transform.e) / this.scale;
        const y = (screenY - this.transform.f) / this.scale;
        return { x, y };
    }
    
    /**
     * Convert canvas coordinates to screen coordinates
     * @param {number} canvasX - X coordinate on canvas
     * @param {number} canvasY - Y coordinate on canvas
     * @returns {Object} - Screen coordinates {x, y}
     */
    canvasToScreen(canvasX, canvasY) {
        // Apply the transformation to get screen coordinates
        const x = canvasX * this.scale + this.transform.e;
        const y = canvasY * this.scale + this.transform.f;
        return { x, y };
    }
    
    /**
     * Add a change listener
     * @param {Function} listener - The listener function
     */
    addChangeListener(listener) {
        if (typeof listener === 'function' && !this.changeListeners.includes(listener)) {
            this.changeListeners.push(listener);
        }
    }
    
    /**
     * Remove a change listener
     * @param {Function} listener - The listener function to remove
     */
    removeChangeListener(listener) {
        const index = this.changeListeners.indexOf(listener);
        if (index !== -1) {
            this.changeListeners.splice(index, 1);
        }
    }
    
    /**
     * Notify all change listeners
     */
    notifyChangeListeners() {
        this.changeListeners.forEach(listener => {
            try {
                listener(this);
            } catch (error) {
                console.error('Error in viewport change listener:', error);
            }
        });
    }
} 