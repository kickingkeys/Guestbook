import { Tool } from './Tool.js';
import { DrawingElement } from '../elements/DrawingElement.js';

/**
 * EraserTool class
 * Handles erasing elements from the canvas
 */
export class EraserTool extends Tool {
    /**
     * Constructor
     * @param {CanvasManager} canvasManager - The canvas manager instance
     */
    constructor(canvasManager) {
        super('eraser', {
            icon: 'eraser',
            cursor: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\'%3E%3Cpath fill=\'%23ED682B\' d=\'M15.14 3c-.51 0-1.02.2-1.41.59L2.59 14.73c-.78.77-.78 2.04 0 2.83L5.03 20h7.97l8.41-8.41c.78-.78.78-2.05 0-2.83l-4.86-4.86c-.39-.39-.9-.59-1.41-.59z\'/%3E%3C/svg%3E") 12 12, auto',
            description: 'Precisely erase parts of drawings'
        });
        
        this.canvasManager = canvasManager;
        this.eraserSize = 20; // Size of the eraser in pixels
        this.previewElement = null; // Element for showing eraser preview
    }
    
    /**
     * Activate the tool
     */
    activate() {
        super.activate();
        // Set custom cursor
        if (this.canvasManager && this.canvasManager.canvas) {
            this.canvasManager.canvas.style.cursor = this.config.cursor;
        }
        
        // Create eraser preview element
        this.createPreviewElement();
    }
    
    /**
     * Deactivate the tool
     */
    deactivate() {
        super.deactivate();
        
        // Remove preview element
        this.removePreviewElement();
    }
    
    /**
     * Create a visual preview element for the eraser
     */
    createPreviewElement() {
        // Remove any existing preview
        this.removePreviewElement();
        
        // Create a div element for the eraser preview
        const preview = document.createElement('div');
        preview.className = 'eraser-preview';
        preview.style.position = 'absolute';
        preview.style.width = `${this.eraserSize}px`;
        preview.style.height = `${this.eraserSize}px`;
        preview.style.borderRadius = '50%';
        preview.style.border = '2px solid #ED682B';
        preview.style.backgroundColor = 'rgba(237, 104, 43, 0.2)';
        preview.style.pointerEvents = 'none'; // Don't interfere with mouse events
        preview.style.zIndex = '1000';
        preview.style.transform = 'translate(-50%, -50%)';
        preview.style.display = 'none'; // Initially hidden
        
        // Add to document
        document.body.appendChild(preview);
        this.previewElement = preview;
    }
    
    /**
     * Remove the preview element
     */
    removePreviewElement() {
        if (this.previewElement && this.previewElement.parentNode) {
            this.previewElement.parentNode.removeChild(this.previewElement);
            this.previewElement = null;
        }
    }
    
    /**
     * Handle mouse down event
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {Event} event - The original event
     */
    onMouseDown(x, y, event) {
        if (!this.active) return;
        
        // Show the eraser preview
        this.updatePreviewPosition(x, y);
        
        // Check for elements under the eraser and erase them
        this.eraseElementsAtPosition(x, y);
    }
    
    /**
     * Handle mouse move event
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {Event} event - The original event
     */
    onMouseMove(x, y, event) {
        if (!this.active) return;
        
        // Update the eraser preview position
        this.updatePreviewPosition(x, y);
        
        // If mouse button is pressed, erase elements
        if (event.buttons === 1) {
            this.eraseElementsAtPosition(x, y);
        }
    }
    
    /**
     * Handle mouse up event
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {Event} event - The original event
     */
    onMouseUp(x, y, event) {
        if (!this.active) return;
        
        // Final erase at the release position
        this.eraseElementsAtPosition(x, y);
    }
    
    /**
     * Update the position of the eraser preview
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     */
    updatePreviewPosition(x, y) {
        if (this.previewElement) {
            this.previewElement.style.display = 'block';
            this.previewElement.style.left = `${x}px`;
            this.previewElement.style.top = `${y}px`;
        }
    }
    
    /**
     * Erase elements at the specified position
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     */
    eraseElementsAtPosition(x, y) {
        // Get all elements
        const elements = this.canvasManager.getElements();
        
        // Convert screen coordinates to canvas coordinates
        const canvasPoint = this.canvasManager.viewport.screenToCanvas(x, y);
        
        // Calculate eraser radius in canvas coordinates
        const eraserRadius = this.eraserSize / (2 * this.canvasManager.viewport.scale);
        
        // Check each element
        for (const element of elements) {
            if (this.isElementUnderEraser(element, canvasPoint.x, canvasPoint.y, eraserRadius)) {
                this.eraseElement(element, canvasPoint.x, canvasPoint.y, eraserRadius);
            }
        }
    }
    
    /**
     * Check if an element is under the eraser
     * @param {Object} element - The element to check
     * @param {number} x - The x coordinate in canvas space
     * @param {number} y - The y coordinate in canvas space
     * @param {number} radius - The eraser radius in canvas space
     * @returns {boolean} - Whether the element is under the eraser
     */
    isElementUnderEraser(element, x, y, radius) {
        // Skip if the element is not visible
        if (!element.visible) return false;
        
        // Get the element's bounding box
        const bbox = element.getBoundingBox();
        
        // Simple circle-rectangle collision detection
        // Find the closest point on the rectangle to the circle center
        const closestX = Math.max(bbox.x, Math.min(x, bbox.x + bbox.width));
        const closestY = Math.max(bbox.y, Math.min(y, bbox.y + bbox.height));
        
        // Calculate the distance between the circle's center and the closest point
        const distanceX = x - closestX;
        const distanceY = y - closestY;
        const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);
        
        // If the distance is less than the radius, the circle and rectangle are colliding
        return distanceSquared <= (radius * radius);
    }
    
    /**
     * Erase an element from the canvas
     * @param {Object} element - The element to erase
     * @param {number} x - The x coordinate in canvas space
     * @param {number} y - The y coordinate in canvas space
     * @param {number} radius - The eraser radius in canvas space
     */
    eraseElement(element, x, y, radius) {
        console.log(`Erasing element:`, element);
        
        // Handle drawing elements differently to support partial erasing
        if (element.type === 'drawing') {
            this.eraseDrawingElement(element, x, y, radius);
        } else {
            // For non-drawing elements, remove the entire element
            this.canvasManager.removeElement(element);
        }
        
        // Request a render update to reflect the change
        this.canvasManager.requestRender();
    }
    
    /**
     * Erase parts of a drawing element
     * @param {DrawingElement} element - The drawing element to erase
     * @param {number} x - The x coordinate in canvas space
     * @param {number} y - The y coordinate in canvas space
     * @param {number} radius - The eraser radius in canvas space
     */
    eraseDrawingElement(element, x, y, radius) {
        // Get the points of the drawing
        const points = element.points;
        if (points.length < 2) {
            // If there's only one point or no points, just remove the element
            this.canvasManager.removeElement(element);
            return;
        }
        
        // Adjust coordinates to account for element position and transformations
        const eraserX = x - element.x;
        const eraserY = y - element.y;
        
        // Find line segments that intersect with the eraser
        const segments = this.findSegmentsUnderEraser(points, eraserX, eraserY, radius);
        
        if (segments.length === 0) {
            // No segments under eraser, do nothing
            return;
        }
        
        // Remove the original element
        this.canvasManager.removeElement(element);
        
        // Group continuous segments that are not under the eraser
        const newSegmentGroups = this.groupContinuousSegments(points, segments);
        
        // Create new drawing elements for each group of continuous segments
        for (const group of newSegmentGroups) {
            if (group.length >= 2) {
                const newElement = new DrawingElement({
                    x: element.x,
                    y: element.y,
                    rotation: element.rotation,
                    scaleX: element.scaleX,
                    scaleY: element.scaleY,
                    zIndex: element.zIndex,
                    points: group,
                    color: element.color,
                    width: element.width,
                    opacity: element.opacity
                });
                
                this.canvasManager.addElement(newElement);
            }
        }
    }
    
    /**
     * Find line segments that intersect with the eraser
     * @param {Array} points - The points of the drawing
     * @param {number} x - The x coordinate of the eraser
     * @param {number} y - The y coordinate of the eraser
     * @param {number} radius - The radius of the eraser
     * @returns {Array} - Array of segment indices that are under the eraser
     */
    findSegmentsUnderEraser(points, x, y, radius) {
        const segments = [];
        const radiusSquared = radius * radius;
        
        // Check each line segment
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            
            // Check if the segment is under the eraser
            if (this.isLineSegmentUnderEraser(p1.x, p1.y, p2.x, p2.y, x, y, radiusSquared)) {
                segments.push(i);
            }
        }
        
        return segments;
    }
    
    /**
     * Check if a line segment is under the eraser
     * @param {number} x1 - The x coordinate of the first point
     * @param {number} y1 - The y coordinate of the first point
     * @param {number} x2 - The x coordinate of the second point
     * @param {number} y2 - The y coordinate of the second point
     * @param {number} cx - The x coordinate of the eraser
     * @param {number} cy - The y coordinate of the eraser
     * @param {number} radiusSquared - The squared radius of the eraser
     * @returns {boolean} - Whether the line segment is under the eraser
     */
    isLineSegmentUnderEraser(x1, y1, x2, y2, cx, cy, radiusSquared) {
        // Check if either endpoint is inside the eraser
        const dx1 = x1 - cx;
        const dy1 = y1 - cy;
        const dx2 = x2 - cx;
        const dy2 = y2 - cy;
        
        if ((dx1 * dx1 + dy1 * dy1) <= radiusSquared || 
            (dx2 * dx2 + dy2 * dy2) <= radiusSquared) {
            return true;
        }
        
        // Calculate the closest point on the line segment to the eraser center
        const lineLength = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
        if (lineLength === 0) return false; // Line segment is a point
        
        // Calculate the projection of the eraser center onto the line
        const t = Math.max(0, Math.min(1, ((cx - x1) * (x2 - x1) + (cy - y1) * (y2 - y1)) / lineLength));
        
        // Calculate the closest point on the line segment
        const closestX = x1 + t * (x2 - x1);
        const closestY = y1 + t * (y2 - y1);
        
        // Check if the closest point is within the eraser radius
        const distX = closestX - cx;
        const distY = closestY - cy;
        
        return (distX * distX + distY * distY) <= radiusSquared;
    }
    
    /**
     * Group continuous segments that are not under the eraser
     * @param {Array} points - The points of the drawing
     * @param {Array} segmentsToRemove - The indices of segments to remove
     * @returns {Array} - Array of point groups for new drawing elements
     */
    groupContinuousSegments(points, segmentsToRemove) {
        const groups = [];
        let currentGroup = [];
        
        // Start with the first point
        currentGroup.push(points[0]);
        
        // Process each segment
        for (let i = 0; i < points.length - 1; i++) {
            // If this segment is not under the eraser, add the next point to the current group
            if (!segmentsToRemove.includes(i)) {
                currentGroup.push(points[i + 1]);
            } else {
                // This segment is under the eraser
                // If we have a valid group, save it and start a new one
                if (currentGroup.length >= 2) {
                    groups.push([...currentGroup]);
                }
                
                // Start a new group with the next point
                currentGroup = [points[i + 1]];
            }
        }
        
        // Add the last group if it has at least 2 points
        if (currentGroup.length >= 2) {
            groups.push(currentGroup);
        }
        
        return groups;
    }
    
    /**
     * Handle key down event
     * @param {KeyboardEvent} event - The keyboard event
     */
    onKeyDown(event) {
        // Increase/decrease eraser size with [ and ] keys
        if (event.key === '[') {
            this.setEraserSize(Math.max(5, this.eraserSize - 5));
            event.preventDefault();
        } else if (event.key === ']') {
            this.setEraserSize(Math.min(50, this.eraserSize + 5));
            event.preventDefault();
        }
    }
    
    /**
     * Set the eraser size
     * @param {number} size - The new size
     */
    setEraserSize(size) {
        this.eraserSize = size;
        
        // Update preview element size
        if (this.previewElement) {
            this.previewElement.style.width = `${size}px`;
            this.previewElement.style.height = `${size}px`;
        }
        
        // Update the size indicator in the UI
        const sizeIndicator = document.querySelector('.eraser-size-indicator');
        if (sizeIndicator) {
            const sizeValueElement = sizeIndicator.querySelector('.eraser-size-value');
            if (sizeValueElement) {
                sizeValueElement.textContent = `${size}px`;
            }
        }
        
        // Trigger a custom event for the size change
        const event = new CustomEvent('eraserSizeChange', { 
            detail: { size: size } 
        });
        document.dispatchEvent(event);
    }

    /**
     * Handle touch start event
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {TouchEvent} event - The touch event
     */
    onTouchStart(x, y, event) {
        if (!this.active) return;
        
        // Prevent default to avoid scrolling
        event.preventDefault();
        
        // Show the eraser preview
        this.updatePreviewPosition(x, y);
        
        // Check for elements under the eraser and erase them
        this.eraseElementsAtPosition(x, y);
    }

    /**
     * Handle touch move event
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {TouchEvent} event - The touch event
     */
    onTouchMove(x, y, event) {
        if (!this.active) return;
        
        // Prevent default to avoid scrolling
        event.preventDefault();
        
        // Update the eraser preview position
        this.updatePreviewPosition(x, y);
        
        // Erase elements at the touch position
        this.eraseElementsAtPosition(x, y);
    }

    /**
     * Handle touch end event
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {TouchEvent} event - The touch event
     */
    onTouchEnd(x, y, event) {
        if (!this.active) return;
        
        // Final erase at the release position
        this.eraseElementsAtPosition(x, y);
    }
} 