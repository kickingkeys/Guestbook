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
        // Calculate width and height
        const width = this._textWidth || 0;
        const height = this._textHeight || 0;
        
        // Add padding for selection
        const padding = 4;
        
        // Calculate the base bounding box (without rotation)
        const baseX = this.x - (this.align === 'center' ? width / 2 : 0) - padding;
        const baseY = this.y - padding;
        const baseWidth = width + padding * 2;
        const baseHeight = height + padding * 2;
        
        // If there's no rotation, return the simple bounding box
        if (this.rotation === 0 || Math.abs(this.rotation) < 0.001) {
            this._boundingBox = {
                x: baseX,
                y: baseY,
                width: baseWidth,
                height: baseHeight
            };
            return this._boundingBox;
        }
        
        // For rotated text, calculate the corners of the rotated rectangle
        const cos = Math.cos(this.rotation);
        const sin = Math.sin(this.rotation);
        
        // Calculate the center of the unrotated bounding box relative to the rotation point (this.x, this.y)
        const centerOffsetX = baseX + baseWidth / 2 - this.x;
        const centerOffsetY = baseY + baseHeight / 2 - this.y;
        
        // Calculate the four corners of the rotated rectangle
        const corners = [
            { // Top-left
                x: this.x + ((baseX - this.x) * cos - (baseY - this.y) * sin),
                y: this.y + ((baseX - this.x) * sin + (baseY - this.y) * cos)
            },
            { // Top-right
                x: this.x + ((baseX + baseWidth - this.x) * cos - (baseY - this.y) * sin),
                y: this.y + ((baseX + baseWidth - this.x) * sin + (baseY - this.y) * cos)
            },
            { // Bottom-right
                x: this.x + ((baseX + baseWidth - this.x) * cos - (baseY + baseHeight - this.y) * sin),
                y: this.y + ((baseX + baseWidth - this.x) * sin + (baseY + baseHeight - this.y) * cos)
            },
            { // Bottom-left
                x: this.x + ((baseX - this.x) * cos - (baseY + baseHeight - this.y) * sin),
                y: this.y + ((baseX - this.x) * sin + (baseY + baseHeight - this.y) * cos)
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
        
        this._boundingBox = {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
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
    
    /**
     * Serialize the text element for Firebase
     * @returns {Object} - Serialized text element data
     */
    serialize() {
        const baseData = super.serialize();
        
        return {
            ...baseData,
            text: this.text,
            fontSize: this.fontSize,
            fontFamily: this.fontFamily,
            color: this.color,
            align: this.align,
            bold: this.bold,
            italic: this.italic,
            underline: this.underline,
            opacity: this.opacity
        };
    }
    
    /**
     * Deserialize text element data from Firebase
     * @param {Object} data - The text element data from Firebase
     * @returns {TextElement} - Deserialized text element
     */
    static deserialize(data) {
        return new TextElement({
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
            text: data.text || '',
            fontSize: data.fontSize || 16,
            fontFamily: data.fontFamily || 'Arial, sans-serif',
            color: data.color || '#000000',
            align: data.align || 'left',
            bold: data.bold || false,
            italic: data.italic || false,
            underline: data.underline || false,
            opacity: data.opacity || 1,
            isSynced: true
        });
    }
} 