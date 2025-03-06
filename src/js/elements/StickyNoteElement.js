import { CanvasElement } from './CanvasElement.js';

/**
 * StickyNoteElement class
 * Represents a sticky note element on the canvas
 */
export class StickyNoteElement extends CanvasElement {
    /**
     * Constructor
     * @param {Object} options - Element options
     */
    constructor(options = {}) {
        super(options);
        
        // Set element type
        this.type = 'sticky-note';
        
        // Sticky note properties
        this.width = options.width || 200;
        this.height = options.height || 150;
        this.color = options.color || '#ED682B';
        this.text = options.text || 'New Sticky Note';
        this.fontSize = options.fontSize || 16;
        this.fontFamily = options.fontFamily || 'Arial, sans-serif';
        this.textColor = options.textColor || '#FFFFFF';
        this.opacity = options.opacity !== undefined ? options.opacity : 1;
        
        // Calculated properties
        this._isEditing = false;
        this._isDragging = false;
        this._dragOffsetX = 0;
        this._dragOffsetY = 0;
        this._textLines = [];
        
        // Calculate text lines
        this._calculateTextLines();
    }
    
    /**
     * Render the sticky note on the canvas
     * @param {CanvasRenderingContext2D} ctx - The canvas context
     */
    render(ctx) {
        if (!this.visible) return;
        
        // Save context state
        ctx.save();
        
        // Apply transformations
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.scale(this.scaleX, this.scaleY);
        
        // Set global alpha
        ctx.globalAlpha = this.opacity;
        
        // Draw sticky note background
        ctx.fillStyle = this.color;
        this._drawRoundedRect(ctx, 0, 0, this.width, this.height, 8);
        ctx.fill();
        
        // Draw text
        ctx.fillStyle = this.textColor;
        ctx.font = `${this.fontSize}px ${this.fontFamily}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        const padding = 10;
        const lineHeight = this.fontSize * 1.2;
        
        // Draw each line of text
        this._textLines.forEach((line, index) => {
            ctx.fillText(line, padding, padding + index * lineHeight);
        });
        
        // Draw editing indicator if in edit mode
        if (this._isEditing) {
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 3]);
            ctx.strokeRect(-2, -2, this.width + 4, this.height + 4);
        }
        
        // Restore context state
        ctx.restore();
    }
    
    /**
     * Draw a rounded rectangle
     * @param {CanvasRenderingContext2D} ctx - The canvas context
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {number} width - The width
     * @param {number} height - The height
     * @param {number} radius - The corner radius
     */
    _drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
    
    /**
     * Calculate text lines based on width
     * @private
     */
    _calculateTextLines() {
        // Simple text wrapping algorithm
        const words = this.text.split(' ');
        const lines = [];
        let currentLine = '';
        
        // Estimate character width (this is a rough approximation)
        const charWidth = this.fontSize * 0.6;
        const maxCharsPerLine = Math.floor((this.width - 20) / charWidth);
        
        words.forEach(word => {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            
            if (testLine.length <= maxCharsPerLine) {
                currentLine = testLine;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        });
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        this._textLines = lines;
    }
    
    /**
     * Check if a point is inside the sticky note
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {boolean} - True if the point is inside the sticky note, false otherwise
     */
    containsPoint(x, y) {
        // Transform the point to account for rotation and scale
        const dx = x - this.x;
        const dy = y - this.y;
        
        // Apply inverse rotation
        const cosR = Math.cos(-this.rotation);
        const sinR = Math.sin(-this.rotation);
        const rx = dx * cosR - dy * sinR;
        const ry = dx * sinR + dy * cosR;
        
        // Apply inverse scale
        const sx = rx / this.scaleX;
        const sy = ry / this.scaleY;
        
        // Add a hit tolerance that scales inversely with zoom level
        // This makes it easier to select elements when zoomed out
        let hitTolerance = 10; // Base tolerance in pixels
        
        // If we can access the viewport scale through the canvas manager
        if (window.canvasManager && window.canvasManager.viewport) {
            // Scale the tolerance inversely with the zoom level
            hitTolerance = hitTolerance / window.canvasManager.viewport.scale;
        }
        
        // Check if the point is inside the rectangle with added tolerance
        return (
            sx >= -hitTolerance && 
            sx <= this.width + hitTolerance && 
            sy >= -hitTolerance && 
            sy <= this.height + hitTolerance
        );
    }
    
    /**
     * Get the sticky note's bounding box
     * @returns {Object} - The bounding box {x, y, width, height}
     */
    getBoundingBox() {
        const width = this.width * this.scaleX;
        const height = this.height * this.scaleY;
        
        // If there's no rotation, return the simple bounding box
        if (this.rotation === 0 || Math.abs(this.rotation) < 0.001) {
            return {
                x: this.x,
                y: this.y,
                width: width,
                height: height
            };
        }
        
        // For rotated sticky notes, calculate the corners of the rotated rectangle
        const cos = Math.cos(this.rotation);
        const sin = Math.sin(this.rotation);
        
        // Calculate the four corners of the rotated rectangle
        const corners = [
            { // Top-left
                x: this.x + (0 * cos - 0 * sin),
                y: this.y + (0 * sin + 0 * cos)
            },
            { // Top-right
                x: this.x + (width * cos - 0 * sin),
                y: this.y + (width * sin + 0 * cos)
            },
            { // Bottom-right
                x: this.x + (width * cos - height * sin),
                y: this.y + (width * sin + height * cos)
            },
            { // Bottom-left
                x: this.x + (0 * cos - height * sin),
                y: this.y + (0 * sin + height * cos)
            }
        ];
        
        // Find the min and max coordinates to create the bounding box
        let minX = corners[0].x;
        let minY = corners[0].y;
        let maxX = corners[0].x;
        let maxY = corners[0].y;
        
        for (let i = 1; i < corners.length; i++) {
            minX = Math.min(minX, corners[i].x);
            minY = Math.min(minY, corners[i].y);
            maxX = Math.max(maxX, corners[i].x);
            maxY = Math.max(maxY, corners[i].y);
        }
        
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }
    
    /**
     * Update the sticky note
     * @param {Object} options - The options to update
     */
    update(options = {}) {
        super.update(options);
        
        // Update sticky note properties
        if (options.width !== undefined) this.width = options.width;
        if (options.height !== undefined) this.height = options.height;
        if (options.color !== undefined) this.color = options.color;
        if (options.text !== undefined) {
            this.text = options.text;
            this._calculateTextLines();
        }
        if (options.fontSize !== undefined) {
            this.fontSize = options.fontSize;
            this._calculateTextLines();
        }
        if (options.fontFamily !== undefined) this.fontFamily = options.fontFamily;
        if (options.textColor !== undefined) this.textColor = options.textColor;
        if (options.opacity !== undefined) this.opacity = options.opacity;
    }
    
    /**
     * Clone the sticky note
     * @returns {StickyNoteElement} - A clone of the sticky note
     */
    clone() {
        return new StickyNoteElement({
            x: this.x,
            y: this.y,
            rotation: this.rotation,
            scaleX: this.scaleX,
            scaleY: this.scaleY,
            zIndex: this.zIndex,
            width: this.width,
            height: this.height,
            color: this.color,
            text: this.text,
            fontSize: this.fontSize,
            fontFamily: this.fontFamily,
            textColor: this.textColor,
            opacity: this.opacity
        });
    }
    
    /**
     * Set editing mode
     * @param {boolean} isEditing - Whether the sticky note is being edited
     */
    setEditing(isEditing) {
        this._isEditing = isEditing;
    }
    
    /**
     * Check if the sticky note is in editing mode
     * @returns {boolean} - True if the sticky note is being edited, false otherwise
     */
    isEditing() {
        return this._isEditing;
    }
    
    /**
     * Start dragging the sticky note
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     */
    startDrag(x, y) {
        this._isDragging = true;
        this._dragOffsetX = x - this.x;
        this._dragOffsetY = y - this.y;
    }
    
    /**
     * Drag the sticky note
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     */
    drag(x, y) {
        if (this._isDragging) {
            this.x = x - this._dragOffsetX;
            this.y = y - this._dragOffsetY;
        }
    }
    
    /**
     * Stop dragging the sticky note
     */
    stopDrag() {
        this._isDragging = false;
    }
    
    /**
     * Check if the sticky note is being dragged
     * @returns {boolean} - True if the sticky note is being dragged, false otherwise
     */
    isDragging() {
        return this._isDragging;
    }
    
    /**
     * Serialize the sticky note element for Firebase
     * @returns {Object} - Serialized sticky note element data
     */
    serialize() {
        const baseData = super.serialize();
        
        return {
            ...baseData,
            width: this.width,
            height: this.height,
            color: this.color,
            text: this.text,
            fontSize: this.fontSize,
            fontFamily: this.fontFamily,
            textColor: this.textColor,
            opacity: this.opacity
        };
    }
    
    /**
     * Deserialize sticky note element data from Firebase
     * @param {Object} data - The sticky note element data from Firebase
     * @returns {StickyNoteElement} - Deserialized sticky note element
     */
    static deserialize(data) {
        return new StickyNoteElement({
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
            width: data.width || 200,
            height: data.height || 200,
            color: data.color || '#FFFF88',
            text: data.text || '',
            fontSize: data.fontSize || 14,
            fontFamily: data.fontFamily || 'Arial, sans-serif',
            textColor: data.textColor || '#000000',
            opacity: data.opacity || 1,
            isSynced: true
        });
    }
} 