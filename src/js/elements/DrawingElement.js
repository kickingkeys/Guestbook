import { CanvasElement } from './CanvasElement.js';

/**
 * DrawingElement class
 * Represents a freehand drawing on the canvas
 */
export class DrawingElement extends CanvasElement {
    /**
     * Constructor
     * @param {Object} options - Element options
     */
    constructor(options = {}) {
        super(options);
        
        // Set element type
        this.type = 'drawing';
        
        // Drawing properties
        this.points = options.points || [];
        this.color = options.color || '#000000';
        this.width = options.width || 2;
        this.opacity = options.opacity || 1;
        
        // Calculated properties
        this._boundingBox = null;
    }
    
    /**
     * Render the drawing on the canvas
     * @param {CanvasRenderingContext2D} ctx - The canvas context
     */
    render(ctx) {
        if (!this.visible || this.points.length === 0) return;
        
        // Save context state
        ctx.save();
        
        // Apply transformations
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.scale(this.scaleX, this.scaleY);
        
        // Set drawing style
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = this.opacity;
        
        // Draw the path
        ctx.beginPath();
        
        // Move to the first point
        ctx.moveTo(this.points[0].x, this.points[0].y);
        
        // Draw lines to subsequent points
        for (let i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i].x, this.points[i].y);
        }
        
        ctx.stroke();
        
        // Restore context state
        ctx.restore();
    }
    
    /**
     * Check if a point is inside the drawing
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {boolean} - True if the point is inside the drawing, false otherwise
     */
    containsPoint(x, y) {
        // Get the bounding box (this will recalculate if needed)
        const bbox = this.getBoundingBox();
        
        // Add a hit tolerance that scales inversely with zoom level
        let hitTolerance = 15; // Base tolerance in pixels
        
        // If we can access the viewport scale through the canvas manager
        if (window.canvasManager && window.canvasManager.viewport) {
            const scale = window.canvasManager.viewport.scale;
            
            // Scale the tolerance inversely with the zoom level
            hitTolerance = hitTolerance / scale;
            
            // Add extra tolerance at very low zoom levels
            if (scale <= 0.5) {
                // Progressively increase tolerance as zoom decreases
                const zoomFactor = Math.max(0.1, scale) / 0.5; // 1.0 at scale=0.5, increases as scale decreases
                hitTolerance = hitTolerance * (2.0 / zoomFactor);
            }
            
            // Cap the maximum tolerance to prevent excessive hit areas
            hitTolerance = Math.min(hitTolerance, 100);
        }
        
        // Check if the point is inside the expanded bounding box
        if (x < bbox.x - hitTolerance || x > bbox.x + bbox.width + hitTolerance || 
            y < bbox.y - hitTolerance || y > bbox.y + bbox.height + hitTolerance) {
            return false;
        }
        
        // For more precise detection, check if the point is near any line segment
        // Transform the point to account for element transformations
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
        
        // Calculate threshold based on line width and zoom level
        // Adjust hit area based on line width and zoom level
        const baseThreshold = Math.max(5, this.width * 2);
        const threshold = baseThreshold + hitTolerance;
        
        for (let i = 1; i < this.points.length; i++) {
            const p1 = this.points[i - 1];
            const p2 = this.points[i];
            
            // Calculate distance from point to line segment
            const distance = this._distanceToLineSegment(sx, sy, p1.x, p1.y, p2.x, p2.y);
            
            if (distance <= threshold) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Calculate the distance from a point to a line segment
     * @param {number} px - Point x coordinate
     * @param {number} py - Point y coordinate
     * @param {number} x1 - Line segment start x
     * @param {number} y1 - Line segment start y
     * @param {number} x2 - Line segment end x
     * @param {number} y2 - Line segment end y
     * @returns {number} - The distance from the point to the line segment
     */
    _distanceToLineSegment(px, py, x1, y1, x2, y2) {
        // Calculate squared length of line segment
        const lengthSquared = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
        
        // If the line segment is just a point, return distance to that point
        if (lengthSquared === 0) {
            return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
        }
        
        // Calculate projection of point onto line segment
        const t = Math.max(0, Math.min(1, ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / lengthSquared));
        
        // Calculate closest point on line segment
        const projX = x1 + t * (x2 - x1);
        const projY = y1 + t * (y2 - y1);
        
        // Return distance to closest point
        return Math.sqrt((px - projX) * (px - projX) + (py - projY) * (py - projY));
    }
    
    /**
     * Get the drawing's bounding box
     * @returns {Object} - The bounding box {x, y, width, height}
     */
    getBoundingBox() {
        // Calculate bounding box if we have points
        if (this.points.length === 0) {
            return { x: this.x, y: this.y, width: 0, height: 0 };
        }
        
        // Find min and max coordinates of the drawing points
        let minX = this.points[0].x;
        let minY = this.points[0].y;
        let maxX = minX;
        let maxY = minY;
        
        for (let i = 1; i < this.points.length; i++) {
            const point = this.points[i];
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        }
        
        // Add some padding for stroke width
        const padding = this.width / 2;
        minX -= padding;
        minY -= padding;
        maxX += padding;
        maxY += padding;
        
        // Calculate width and height of the unrotated bounding box
        const width = maxX - minX;
        const height = maxY - minY;
        
        // Apply scaling
        const scaledWidth = width * this.scaleX;
        const scaledHeight = height * this.scaleY;
        
        // If there's no rotation, return the simple bounding box
        if (this.rotation === 0 || Math.abs(this.rotation) < 0.001) {
            const bbox = {
                x: this.x + minX * this.scaleX,
                y: this.y + minY * this.scaleY,
                width: scaledWidth,
                height: scaledHeight
            };
            return bbox;
        }
        
        // For rotated drawings, calculate the corners of the rotated rectangle
        const cos = Math.cos(this.rotation);
        const sin = Math.sin(this.rotation);
        
        // Calculate the center of the unrotated bounding box in local coordinates
        const localCenterX = (minX + maxX) / 2;
        const localCenterY = (minY + maxY) / 2;
        
        // Transform the center to world coordinates
        const centerX = this.x + localCenterX * this.scaleX;
        const centerY = this.y + localCenterY * this.scaleY;
        
        // Calculate the four corners of the rotated rectangle
        const halfWidth = scaledWidth / 2;
        const halfHeight = scaledHeight / 2;
        
        const corners = [
            { // Top-left
                x: centerX + (-halfWidth * cos - -halfHeight * sin),
                y: centerY + (-halfWidth * sin + -halfHeight * cos)
            },
            { // Top-right
                x: centerX + (halfWidth * cos - -halfHeight * sin),
                y: centerY + (halfWidth * sin + -halfHeight * cos)
            },
            { // Bottom-right
                x: centerX + (halfWidth * cos - halfHeight * sin),
                y: centerY + (halfWidth * sin + halfHeight * cos)
            },
            { // Bottom-left
                x: centerX + (-halfWidth * cos - halfHeight * sin),
                y: centerY + (-halfWidth * sin + halfHeight * cos)
            }
        ];
        
        // Find the min and max coordinates to create the bounding box
        let boundMinX = corners[0].x;
        let boundMinY = corners[0].y;
        let boundMaxX = corners[0].x;
        let boundMaxY = corners[0].y;
        
        for (let i = 1; i < corners.length; i++) {
            boundMinX = Math.min(boundMinX, corners[i].x);
            boundMinY = Math.min(boundMinY, corners[i].y);
            boundMaxX = Math.max(boundMaxX, corners[i].x);
            boundMaxY = Math.max(boundMaxY, corners[i].y);
        }
        
        const bbox = {
            x: boundMinX,
            y: boundMinY,
            width: boundMaxX - boundMinX,
            height: boundMaxY - boundMinY
        };
        
        return bbox;
    }
    
    /**
     * Update the drawing
     * @param {Object} options - The options to update
     */
    update(options = {}) {
        // Check if position or transformation is changing
        const isTransforming = options.x !== undefined || 
                              options.y !== undefined || 
                              options.rotation !== undefined || 
                              options.scaleX !== undefined || 
                              options.scaleY !== undefined;
        
        // Call parent update method
        super.update(options);
        
        // Update drawing properties
        if (options.points !== undefined) this.points = options.points;
        if (options.color !== undefined) this.color = options.color;
        if (options.width !== undefined) this.width = options.width;
        if (options.opacity !== undefined) this.opacity = options.opacity;
        
        // Reset cached bounding box if position or points changed
        if (isTransforming || options.points !== undefined) {
            this._boundingBox = null;
        }
    }
    
    /**
     * Clone the drawing
     * @returns {DrawingElement} - A clone of the drawing
     */
    clone() {
        return new DrawingElement({
            x: this.x,
            y: this.y,
            rotation: this.rotation,
            scaleX: this.scaleX,
            scaleY: this.scaleY,
            zIndex: this.zIndex,
            points: [...this.points],
            color: this.color,
            width: this.width,
            opacity: this.opacity
        });
    }
    
    /**
     * Add a point to the drawing
     * @param {Object} point - The point to add {x, y}
     */
    addPoint(point) {
        this.points.push(point);
        
        // Reset cached bounding box
        this._boundingBox = null;
        
        // Update timestamp
        this.updatedAt = Date.now();
    }
    
    /**
     * Serialize the drawing element for Firebase
     * @returns {Object} - Serialized drawing element data
     */
    serialize() {
        const baseData = super.serialize();
        
        return {
            ...baseData,
            points: this.points,
            color: this.color,
            width: this.width,
            opacity: this.opacity
        };
    }
    
    /**
     * Deserialize drawing element data from Firebase
     * @param {Object} data - The drawing element data from Firebase
     * @returns {DrawingElement} - Deserialized drawing element
     */
    static deserialize(data) {
        return new DrawingElement({
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
            points: data.points || [],
            color: data.color || '#000000',
            width: data.width || 2,
            opacity: data.opacity || 1,
            isSynced: true
        });
    }
} 