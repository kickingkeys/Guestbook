import { Tool } from './Tool.js';
import { DrawingElement } from '../elements/DrawingElement.js';

/**
 * DrawingTool class
 * Handles freehand drawing on the canvas
 */
export class DrawingTool extends Tool {
    /**
     * Constructor
     * @param {CanvasManager} canvasManager - The canvas manager instance
     */
    constructor(canvasManager) {
        super('draw', {
            icon: 'draw',
            cursor: 'crosshair',
            description: 'Draw freehand on the canvas'
        });
        
        this.canvasManager = canvasManager;
        this.isDrawing = false;
        this.currentPath = null;
        this.strokeColor = '#ED682B';
        this.strokeWidth = 2;
        this.currentElement = null;
    }
    
    /**
     * Activate the tool
     */
    activate() {
        super.activate();
        // Set cursor to crosshair
        if (this.canvasManager && this.canvasManager.canvas) {
            this.canvasManager.canvas.style.cursor = this.config.cursor;
        }
    }
    
    /**
     * Deactivate the tool
     */
    deactivate() {
        super.deactivate();
        // Clean up any ongoing drawing
        if (this.isDrawing && this.currentElement && this.canvasManager) {
            // Remove the in-progress element from the canvas manager
            this.canvasManager.removeElement(this.currentElement);
            this.canvasManager.requestRender();
        }
        
        // Reset drawing state
        this.isDrawing = false;
        this.currentPath = null;
        this.currentElement = null;
    }
    
    /**
     * Handle mouse down event
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {Event} event - The original event
     */
    onMouseDown(x, y, event) {
        if (!this.active) return;
        
        // Convert screen coordinates to canvas coordinates
        const canvasPoint = this.canvasManager.viewport.screenToCanvas(x, y);
        
        // Start a new drawing path
        this.isDrawing = true;
        this.currentPath = {
            points: [{ x: canvasPoint.x, y: canvasPoint.y }],
            color: this.strokeColor,
            width: this.strokeWidth
        };
        
        // Create a new drawing element
        this.currentElement = new DrawingElement({
            points: [...this.currentPath.points],
            color: this.strokeColor,
            width: this.strokeWidth
        });
        
        console.log(`✏️ DRAWING: Started new drawing - ID: ${this.currentElement.id}, Color: ${this.strokeColor}, Width: ${this.strokeWidth}`);
        console.log(`✏️ DRAWING: Initial point at (${canvasPoint.x.toFixed(2)}, ${canvasPoint.y.toFixed(2)})`);
        
        // Add the element to the canvas manager immediately
        if (this.canvasManager) {
            this.canvasManager.addElement(this.currentElement);
            this.canvasManager.requestRender();
            console.log(`✏️ DRAWING: Element added to canvas manager - ID: ${this.currentElement.id}`);
        }
    }
    
    /**
     * Handle mouse move event
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {Event} event - The original event
     */
    onMouseMove(x, y, event) {
        if (!this.active || !this.isDrawing) return;
        
        // Convert screen coordinates to canvas coordinates
        const canvasPoint = this.canvasManager.viewport.screenToCanvas(x, y);
        
        // Add point to the current path
        this.currentPath.points.push({ x: canvasPoint.x, y: canvasPoint.y });
        
        // Update the current element
        if (this.currentElement) {
            this.currentElement.addPoint({ x: canvasPoint.x, y: canvasPoint.y });
            
            // Log every 10th point to avoid excessive logging
            if (this.currentPath.points.length % 10 === 0) {
                console.log(`✏️ DRAWING: Added point #${this.currentPath.points.length} at (${canvasPoint.x.toFixed(2)}, ${canvasPoint.y.toFixed(2)})`);
            }
            
            // Request a render update
            if (this.canvasManager) {
                this.canvasManager.requestRender();
            }
        }
    }
    
    /**
     * Handle mouse up event
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {Event} event - The original event
     */
    onMouseUp(x, y, event) {
        if (!this.active || !this.isDrawing) return;
        
        // Convert screen coordinates to canvas coordinates
        const canvasPoint = this.canvasManager.viewport.screenToCanvas(x, y);
        
        // Add final point to the path
        this.currentPath.points.push({ x: canvasPoint.x, y: canvasPoint.y });
        
        // Update the current element with the final point
        if (this.currentElement) {
            this.currentElement.addPoint({ x: canvasPoint.x, y: canvasPoint.y });
            
            console.log(`✏️ DRAWING: Finished drawing - ID: ${this.currentElement.id}, Total points: ${this.currentPath.points.length}`);
            console.log(`✏️ DRAWING: Final point at (${canvasPoint.x.toFixed(2)}, ${canvasPoint.y.toFixed(2)})`);
            
            // Request a render update (element is already added to canvas manager)
            if (this.canvasManager) {
                this.canvasManager.requestRender();
            }
        }
        
        // Reset drawing state
        this.isDrawing = false;
        this.currentPath = null;
        this.currentElement = null;
    }
    
    /**
     * Render the current path (temporary rendering)
     * This is now handled by the DrawingElement
     */
    renderCurrentPath() {
        // The rendering is now handled by the DrawingElement
        // We just need to request a render update
        if (this.canvasManager) {
            this.canvasManager.requestRender();
        }
    }
    
    /**
     * Set the stroke color
     * @param {string} color - The color to set
     */
    setStrokeColor(color) {
        this.strokeColor = color;
    }
    
    /**
     * Set the stroke width
     * @param {number} width - The width to set
     */
    setStrokeWidth(width) {
        this.strokeWidth = width;
    }
    
    /**
     * Handle keyboard events
     * @param {KeyboardEvent} event - The keyboard event
     */
    onKeyDown(event) {
        // If Escape key is pressed while drawing, cancel the current drawing
        if (event.key === 'Escape' && this.isDrawing) {
            if (this.currentElement && this.canvasManager) {
                // Remove the in-progress element from the canvas manager
                this.canvasManager.removeElement(this.currentElement);
                this.canvasManager.requestRender();
            }
            
            // Reset drawing state
            this.isDrawing = false;
            this.currentPath = null;
            this.currentElement = null;
        }
    }
    
    /**
     * Get the current configuration
     * @returns {Object} - The current configuration
     */
    getCurrentConfig() {
        return {
            color: this.strokeColor,
            width: this.strokeWidth
        };
    }
    
    /**
     * Handle touch start event
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {TouchEvent} event - The original event
     */
    onTouchStart(x, y, event) {
        if (!this.active) return;
        
        // Prevent default to stop scrolling/zooming
        event.preventDefault();
        
        // Convert screen coordinates to canvas coordinates
        const canvasPoint = this.canvasManager.viewport.screenToCanvas(x, y);
        
        // Start a new drawing path
        this.isDrawing = true;
        this.currentPath = {
            points: [{ x: canvasPoint.x, y: canvasPoint.y }],
            color: this.strokeColor,
            width: this.strokeWidth
        };
        
        // Create a new drawing element
        this.currentElement = new DrawingElement({
            points: [...this.currentPath.points],
            color: this.strokeColor,
            width: this.strokeWidth
        });
        
        // Add the element to the canvas manager immediately
        if (this.canvasManager) {
            this.canvasManager.addElement(this.currentElement);
            this.canvasManager.requestRender();
        }
    }
    
    /**
     * Handle touch move event
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {TouchEvent} event - The original event
     */
    onTouchMove(x, y, event) {
        if (!this.active || !this.isDrawing) return;
        
        // Prevent default to stop scrolling/zooming
        event.preventDefault();
        
        // Convert screen coordinates to canvas coordinates
        const canvasPoint = this.canvasManager.viewport.screenToCanvas(x, y);
        
        // Add point to the current path
        this.currentPath.points.push({ x: canvasPoint.x, y: canvasPoint.y });
        
        // Update the current element
        if (this.currentElement) {
            this.currentElement.addPoint({ x: canvasPoint.x, y: canvasPoint.y });
            
            // Request a render update
            if (this.canvasManager) {
                this.canvasManager.requestRender();
            }
        }
    }
    
    /**
     * Handle touch end event
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {TouchEvent} event - The original event
     */
    onTouchEnd(x, y, event) {
        if (!this.active || !this.isDrawing) return;
        
        // Prevent default behavior
        event.preventDefault();
        
        // Convert screen coordinates to canvas coordinates
        const canvasPoint = this.canvasManager.viewport.screenToCanvas(x, y);
        
        // Add final point to the path
        this.currentPath.points.push({ x: canvasPoint.x, y: canvasPoint.y });
        
        // Update the current element with the final point
        if (this.currentElement) {
            this.currentElement.addPoint({ x: canvasPoint.x, y: canvasPoint.y });
            
            // Request a render update (element is already added to canvas manager)
            if (this.canvasManager) {
                this.canvasManager.requestRender();
            }
        }
        
        // Reset drawing state
        this.isDrawing = false;
        this.currentPath = null;
        this.currentElement = null;
    }
    
    cancelDrawing() {
        if (this.isDrawing) {
            // Reset drawing state
            this.isDrawing = false;
            this.currentPath = null;
            
            // Remove the current element from the canvas manager
            if (this.currentElement && this.canvasManager) {
                this.canvasManager.removeElement(this.currentElement.id);
                this.currentElement = null;
                this.canvasManager.requestRender();
            }
        }
    }
} 