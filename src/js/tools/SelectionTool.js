import { Tool } from './Tool.js';
import { SelectionManager } from '../utils/SelectionManager.js';

/**
 * SelectionTool class
 * Handles selecting, moving, and resizing elements on the canvas
 */
export class SelectionTool extends Tool {
    /**
     * Constructor
     * @param {CanvasManager} canvasManager - The canvas manager instance
     */
    constructor(canvasManager) {
        super('selection', {
            icon: 'select',
            cursor: 'default',
            description: 'Select, move, and resize elements'
        });
        
        this.canvasManager = canvasManager;
        this.selectionManager = new SelectionManager(canvasManager);
        this.isMultiSelect = false; // For Shift+Click multi-selection
    }
    
    /**
     * Activate the tool
     */
    activate() {
        super.activate();
        // Set cursor to default
        if (this.canvasManager && this.canvasManager.canvas) {
            this.canvasManager.canvas.style.cursor = this.config.cursor;
        }
    }
    
    /**
     * Deactivate the tool
     */
    deactivate() {
        super.deactivate();
        this.selectionManager.clearSelection();
    }
    
    /**
     * Handle mouse down event
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {Event} event - The original event
     */
    onMouseDown(x, y, event) {
        if (!this.active) return;
        
        // Check if Shift key is pressed for multi-select
        this.isMultiSelect = event.shiftKey;
        
        // Convert screen coordinates to canvas coordinates
        const canvasPoint = this.canvasManager.viewport.screenToCanvas(x, y);
        
        // Get the currently selected element type (if any)
        let preferredType = null;
        if (this.selectionManager.selectedElements.length === 1) {
            preferredType = this.selectionManager.selectedElements[0].type;
        }
        
        // Debug: Log the click position
        console.log(`Click at canvas position: (${canvasPoint.x.toFixed(2)}, ${canvasPoint.y.toFixed(2)})`);
        
        // Check if there's an element at the clicked position
        // If we have a selected element, try to keep selecting the same type
        const element = this.canvasManager.getElementAtPosition(canvasPoint.x, canvasPoint.y, preferredType);
        
        // Debug: Log the result of the hit test
        if (element) {
            console.log(`Hit element: ${element.type} (id: ${element.id})`);
            
            // For drawings, log the bounding box
            if (element.type === 'drawing') {
                const bbox = element.getBoundingBox();
                console.log(`Drawing bounding box: x=${bbox.x.toFixed(2)}, y=${bbox.y.toFixed(2)}, w=${bbox.width.toFixed(2)}, h=${bbox.height.toFixed(2)}`);
            }
        } else {
            console.log('No element hit');
            
            // Debug: Check all drawings to see if any are close
            const drawings = this.canvasManager.elements.filter(e => e.type === 'drawing');
            drawings.forEach(drawing => {
                const bbox = drawing.getBoundingBox();
                console.log(`Drawing ${drawing.id}: x=${bbox.x.toFixed(2)}, y=${bbox.y.toFixed(2)}, w=${bbox.width.toFixed(2)}, h=${bbox.height.toFixed(2)}`);
            });
        }
        
        if (element) {
            // Select the element (add to selection if Shift is pressed)
            this.selectionManager.selectElement(element, this.isMultiSelect);
            
            // Start dragging the selected elements
            this.selectionManager.startDrag(canvasPoint.x, canvasPoint.y);
        } else {
            // Clear selection if clicking on empty space and not multi-selecting
            if (!this.isMultiSelect) {
                this.selectionManager.clearSelection();
            }
        }
    }
    
    /**
     * Handle mouse move event
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {Event} event - The original event
     */
    onMouseMove(x, y, event) {
        if (!this.active) return;
        
        // Convert screen coordinates to canvas coordinates
        const canvasPoint = this.canvasManager.viewport.screenToCanvas(x, y);
        
        // Drag the selected elements
        this.selectionManager.drag(canvasPoint.x, canvasPoint.y);
        
        // Update cursor based on what's under it
        this.updateCursor(x, y);
    }
    
    /**
     * Handle mouse up event
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {Event} event - The original event
     */
    onMouseUp(x, y, event) {
        if (!this.active) return;
        
        // Stop dragging
        this.selectionManager.stopDrag();
    }
    
    /**
     * Update the cursor based on what's under it
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     */
    updateCursor(x, y) {
        if (!this.canvasManager || !this.canvasManager.canvas) return;
        
        // Convert screen coordinates to canvas coordinates
        const canvasPoint = this.canvasManager.viewport.screenToCanvas(x, y);
        
        // Check if we're over a resize handle
        const resizeInfo = this.selectionManager.checkResizeHandles(canvasPoint.x, canvasPoint.y);
        if (resizeInfo.isHandle) {
            // Set appropriate resize cursor based on which handle
            switch (resizeInfo.handle) {
                case 'tl':
                case 'br':
                    this.canvasManager.canvas.style.cursor = 'nwse-resize';
                    break;
                case 'tr':
                case 'bl':
                    this.canvasManager.canvas.style.cursor = 'nesw-resize';
                    break;
            }
            return;
        }
        
        // Get the currently selected element type (if any)
        let preferredType = null;
        if (this.selectionManager.selectedElements.length === 1) {
            preferredType = this.selectionManager.selectedElements[0].type;
        }
        
        // Check if there's an element at the position
        const element = this.canvasManager.getElementAtPosition(canvasPoint.x, canvasPoint.y, preferredType);
        
        if (element) {
            // If over a selected element, show move cursor
            if (this.selectionManager.isSelected(element)) {
                this.canvasManager.canvas.style.cursor = 'move';
            } else {
                // If over an unselected element, show pointer cursor
                this.canvasManager.canvas.style.cursor = 'pointer';
            }
        } else {
            // If over empty space, show default cursor
            this.canvasManager.canvas.style.cursor = this.config.cursor;
        }
    }
    
    /**
     * Delete the selected elements
     */
    deleteSelectedElements() {
        this.selectionManager.deleteSelectedElements();
    }
    
    /**
     * Clean up when the tool is no longer needed
     */
    destroy() {
        if (this.selectionManager) {
            this.selectionManager.destroy();
        }
    }
} 