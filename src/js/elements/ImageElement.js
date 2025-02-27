import { CanvasElement } from './CanvasElement.js';

/**
 * ImageElement class
 * Represents an image on the canvas
 */
export class ImageElement extends CanvasElement {
    /**
     * Constructor
     * @param {Object} options - Element options
     * @param {string} options.src - Image source URL
     * @param {number} options.x - X position
     * @param {number} options.y - Y position
     * @param {number} options.width - Image width
     * @param {number} options.height - Image height
     */
    constructor(options = {}) {
        super(options);
        
        // Set element type
        this.type = 'image';
        
        // Image properties
        this.src = options.src || '';
        this.width = options.width || 200;
        this.height = options.height || 200;
        
        // Original dimensions (for aspect ratio)
        this.originalWidth = this.width;
        this.originalHeight = this.height;
        
        // Create and load the image
        this.image = new Image();
        this.image.src = this.src;
        
        // Image loaded state
        this.isLoaded = false;
        
        // Set up image load event
        this.image.onload = () => {
            this.isLoaded = true;
            
            // If no width/height was provided, use the image's natural dimensions
            if (!options.width || !options.height) {
                this.width = this.image.naturalWidth;
                this.height = this.image.naturalHeight;
                
                // Store original dimensions
                this.originalWidth = this.width;
                this.originalHeight = this.height;
                
                // Scale down large images to a reasonable size
                const maxDimension = 500;
                if (this.width > maxDimension || this.height > maxDimension) {
                    const aspectRatio = this.width / this.height;
                    
                    if (this.width > this.height) {
                        this.width = maxDimension;
                        this.height = maxDimension / aspectRatio;
                    } else {
                        this.height = maxDimension;
                        this.width = maxDimension * aspectRatio;
                    }
                    
                    // Update original dimensions
                    this.originalWidth = this.width;
                    this.originalHeight = this.height;
                }
            }
        };
        
        // Handle image load errors
        this.image.onerror = () => {
            console.error('Failed to load image:', this.src);
            this.isLoaded = false;
        };
    }
    
    /**
     * Render the image on the canvas
     * @param {CanvasRenderingContext2D} ctx - The canvas context
     */
    render(ctx) {
        if (!this.isLoaded || !this.visible) return;
        
        // Save context state
        ctx.save();
        
        // Apply transformations
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.scale(this.scaleX, this.scaleY);
        
        // Draw the image
        ctx.drawImage(this.image, -this.width / 2, -this.height / 2, this.width, this.height);
        
        // Restore context state
        ctx.restore();
    }
    
    /**
     * Check if a point is inside the image
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @returns {boolean} - True if the point is inside the image, false otherwise
     */
    containsPoint(x, y) {
        // Calculate the transformed point
        const dx = x - this.x;
        const dy = y - this.y;
        
        // Rotate the point
        const cos = Math.cos(-this.rotation);
        const sin = Math.sin(-this.rotation);
        const rx = dx * cos - dy * sin;
        const ry = dx * sin + dy * cos;
        
        // Scale the point
        const sx = rx / this.scaleX;
        const sy = ry / this.scaleY;
        
        // Check if the point is inside the image
        return (
            sx >= -this.width / 2 &&
            sx <= this.width / 2 &&
            sy >= -this.height / 2 &&
            sy <= this.height / 2
        );
    }
    
    /**
     * Get the image's bounding box
     * @returns {Object} - The bounding box {x, y, width, height}
     */
    getBoundingBox() {
        const halfWidth = (this.width * this.scaleX) / 2;
        const halfHeight = (this.height * this.scaleY) / 2;
        
        return {
            x: this.x - halfWidth,
            y: this.y - halfHeight,
            width: this.width * this.scaleX,
            height: this.height * this.scaleY
        };
    }
    
    /**
     * Update the image
     * @param {Object} options - The options to update
     */
    update(options = {}) {
        super.update(options);
        
        // Update image properties
        if (options.src !== undefined) {
            this.src = options.src;
            this.image.src = this.src;
        }
        
        if (options.width !== undefined) this.width = options.width;
        if (options.height !== undefined) this.height = options.height;
    }
    
    /**
     * Clone the image
     * @returns {ImageElement} - A clone of the image
     */
    clone() {
        return new ImageElement({
            x: this.x,
            y: this.y,
            rotation: this.rotation,
            scaleX: this.scaleX,
            scaleY: this.scaleY,
            zIndex: this.zIndex,
            src: this.src,
            width: this.width,
            height: this.height
        });
    }
} 