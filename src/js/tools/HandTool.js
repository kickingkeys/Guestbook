import { Tool } from './Tool.js';

/**
 * HandTool class
 * Handles panning the canvas view
 */
export class HandTool extends Tool {
    /**
     * Constructor
     * @param {CanvasManager} canvasManager - The canvas manager instance
     */
    constructor(canvasManager) {
        super('hand', {
            icon: 'hand',
            cursor: 'grab',
            description: 'Pan the canvas'
        });
        
        this.canvasManager = canvasManager;
        this.isPanning = false;
        this.lastX = 0;
        this.lastY = 0;
    }
    
    /**
     * Activate the tool
     */
    activate() {
        super.activate();
        // Set cursor to grab
        if (this.canvasManager && this.canvasManager.canvas) {
            this.canvasManager.canvas.style.cursor = this.config.cursor;
        }
    }
    
    /**
     * Deactivate the tool
     */
    deactivate() {
        super.deactivate();
        this.isPanning = false;
    }
    
    /**
     * Handle mouse down event
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {Event} event - The original event
     */
    onMouseDown(x, y, event) {
        if (!this.active) return;
        
        this.isPanning = true;
        this.lastX = x;
        this.lastY = y;
        
        // Change cursor to grabbing
        if (this.canvasManager && this.canvasManager.canvas) {
            this.canvasManager.canvas.style.cursor = 'grabbing';
        }
    }
    
    /**
     * Handle mouse move event
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {Event} event - The original event
     */
    onMouseMove(x, y, event) {
        if (!this.active || !this.isPanning) return;
        
        // Calculate the distance moved
        const dx = x - this.lastX;
        const dy = y - this.lastY;
        
        // Pan the canvas
        this.canvasManager.pan(dx, dy);
        
        // Update last position
        this.lastX = x;
        this.lastY = y;
    }
    
    /**
     * Handle mouse up event
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {Event} event - The original event
     */
    onMouseUp(x, y, event) {
        if (!this.active) return;
        
        this.isPanning = false;
        
        // Change cursor back to grab
        if (this.canvasManager && this.canvasManager.canvas) {
            this.canvasManager.canvas.style.cursor = this.config.cursor;
        }
    }
    
    /**
     * Handle key down event
     * @param {KeyboardEvent} event - The keyboard event
     */
    onKeyDown(event) {
        // Space key can also activate the hand tool temporarily
        if (event.code === 'Space' && !this.active) {
            this.temporaryActivate();
        }
    }
    
    /**
     * Handle key up event
     * @param {KeyboardEvent} event - The keyboard event
     */
    onKeyUp(event) {
        // Deactivate temporary hand tool when space is released
        if (event.code === 'Space' && this.isTemporaryActive) {
            this.temporaryDeactivate();
        }
    }
    
    /**
     * Temporarily activate the hand tool (e.g., when space is pressed)
     */
    temporaryActivate() {
        this.isTemporaryActive = true;
        this.previousCursor = this.canvasManager.canvas.style.cursor;
        this.activate();
    }
    
    /**
     * Deactivate the temporary hand tool
     */
    temporaryDeactivate() {
        this.isTemporaryActive = false;
        this.deactivate();
        
        // Restore previous cursor
        if (this.canvasManager && this.canvasManager.canvas && this.previousCursor) {
            this.canvasManager.canvas.style.cursor = this.previousCursor;
        }
    }
} 