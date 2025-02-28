import { CanvasElement } from './CanvasElement.js';

/**
 * TextElement class
 * Represents a text element on the canvas
 */
export class TextElement extends CanvasElement {
    /**
     * Constructor
     * @param {Object} options - Element options
     */
    constructor(options = {}) {
        super(options);
        
        // Set element type
        this.type = 'text';
        
        // Text properties
        this.text = options.text || '';
        this.fontSize = options.fontSize || 16;
        this.fontFamily = options.fontFamily || 'Arial, sans-serif';
        this.color = options.color || '#000000';
        this.align = options.align || 'left';
        this.bold = options.bold || false;
        this.italic = options.italic || false;
        this.underline = options.underline || false;
        this.opacity = options.opacity || 1;
        
        // Calculated properties
        this._boundingBox = null;
        this._isEditing = false;
        this._textWidth = 0;
        this._textHeight = 0;
    }
    
    /**
     * Render the text on the canvas
     * @param {CanvasRenderingContext2D} ctx - The canvas context
     */
    render(ctx) {
        if (!this.visible || !this.text) return;
        
        // Save context state
        ctx.save();
        
        // Apply transformations
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.scale(this.scaleX, this.scaleY);
        
        // Set text style
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.opacity;
        ctx.textAlign = this.align;
        ctx.textBaseline = 'top';
        
        // Set font
        let fontStyle = '';
        if (this.italic) fontStyle += 'italic ';
        if (this.bold) fontStyle += 'bold ';
        ctx.font = `${fontStyle}${this.fontSize}px ${this.fontFamily}`;
        
        // Draw text
        ctx.fillText(this.text, 0, 0);
        
        // Draw underline if needed
        if (this.underline) {
            const metrics = ctx.measureText(this.text);
            const lineY = this.fontSize * 0.1;
            
            ctx.beginPath();
            ctx.moveTo(0, this.fontSize + lineY);
            ctx.lineTo(metrics.width, this.fontSize + lineY);
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.fontSize * 0.05;
            ctx.stroke();
        }
        
        // Draw editing indicator if in edit mode
        if (this._isEditing) {
            // Draw an orange border around the text to indicate it's being edited
            const metrics = ctx.measureText(this.text);
            const padding = 4;
            
            ctx.strokeStyle = '#F97316'; // Orange color
            ctx.lineWidth = 2;
            ctx.strokeRect(
                -padding, 
                -padding, 
                metrics.width + padding * 2, 
                this.fontSize + padding * 2
            );
            
            // Draw a blinking cursor at the end of the text
            const cursorVisible = Math.floor(Date.now() / 500) % 2 === 0;
            if (cursorVisible) {
                const cursorX = metrics.width + 2;
                ctx.beginPath();
                ctx.moveTo(cursorX, 0);
                ctx.lineTo(cursorX, this.fontSize);
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }
        
        // Update text dimensions
        if (ctx.measureText) {
            const metrics = ctx.measureText(this.text);
            this._textWidth = metrics.width;
            this._textHeight = this.fontSize;
        }
        
        // Restore context state
        ctx.restore();
    }
    
    /**
     * Check if a point is inside the text element
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @returns {boolean} - True if the point is inside the text element, false otherwise
     */
    containsPoint(x, y) {
        // Get the bounding box
        const bbox = this.getBoundingBox();
        
        // Check if the point is inside the bounding box
        return (
            x >= bbox.x && 
            x <= bbox.x + bbox.width && 
            y >= bbox.y && 
            y <= bbox.y + bbox.height
        );
    }
    
    /**
     * Get the text element's bounding box
     * @returns {Object} - The bounding box {x, y, width, height}
     */
    getBoundingBox() {
        // Return cached bounding box if available and not editing
        if (this._boundingBox && !this._isEditing) return this._boundingBox;
        
        // Calculate width and height
        const width = this._textWidth;
        const height = this._textHeight;
        
        // Add padding for selection
        const padding = 4;
        
        // Cache the bounding box
        this._boundingBox = {
            x: this.x - (this.align === 'center' ? width / 2 : 0) - padding,
            y: this.y - padding,
            width: width + padding * 2,
            height: height + padding * 2
        };
        
        return this._boundingBox;
    }
    
    /**
     * Update the text element
     * @param {Object} options - The options to update
     */
    update(options = {}) {
        super.update(options);
        
        // Update text properties
        if (options.text !== undefined) this.text = options.text;
        if (options.fontSize !== undefined) this.fontSize = options.fontSize;
        if (options.fontFamily !== undefined) this.fontFamily = options.fontFamily;
        if (options.color !== undefined) this.color = options.color;
        if (options.align !== undefined) this.align = options.align;
        if (options.bold !== undefined) this.bold = options.bold;
        if (options.italic !== undefined) this.italic = options.italic;
        if (options.underline !== undefined) this.underline = options.underline;
        if (options.opacity !== undefined) this.opacity = options.opacity;
        
        // Reset cached bounding box
        this._boundingBox = null;
    }
    
    /**
     * Clone the text element
     * @returns {TextElement} - A clone of the text element
     */
    clone() {
        return new TextElement({
            x: this.x,
            y: this.y,
            rotation: this.rotation,
            scaleX: this.scaleX,
            scaleY: this.scaleY,
            zIndex: this.zIndex,
            text: this.text,
            fontSize: this.fontSize,
            fontFamily: this.fontFamily,
            color: this.color,
            align: this.align,
            bold: this.bold,
            italic: this.italic,
            underline: this.underline,
            opacity: this.opacity
        });
    }
    
    /**
     * Set editing mode
     * @param {boolean} isEditing - Whether the text element is being edited
     */
    setEditing(isEditing) {
        this._isEditing = isEditing;
        
        // Reset cached bounding box
        this._boundingBox = null;
    }
    
    /**
     * Check if the text element is being edited
     * @returns {boolean} - True if the text element is being edited, false otherwise
     */
    isEditing() {
        return this._isEditing;
    }
    
    /**
     * Calculate text dimensions
     * @param {CanvasRenderingContext2D} ctx - The canvas context
     */
    calculateDimensions(ctx) {
        // Save context state
        const originalFont = ctx.font;
        
        // Set font for measurement
        let fontStyle = '';
        if (this.italic) fontStyle += 'italic ';
        if (this.bold) fontStyle += 'bold ';
        ctx.font = `${fontStyle}${this.fontSize}px ${this.fontFamily}`;
        
        // Measure text
        const metrics = ctx.measureText(this.text);
        this._textWidth = metrics.width;
        this._textHeight = this.fontSize;
        
        // Reset cached bounding box
        this._boundingBox = null;
        
        // Restore context state
        ctx.font = originalFont;
    }
} 