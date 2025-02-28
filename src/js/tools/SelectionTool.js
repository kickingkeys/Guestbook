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
     * @param {SelectionManager} selectionManager - The selection manager instance (optional)
     */
    constructor(canvasManager, selectionManager = null) {
        super('selection', {
            icon: 'select',
            cursor: 'default',
            description: 'Select, move, and resize elements'
        });
        
        this.canvasManager = canvasManager;
        // Use the provided selection manager or create a new one
        this.selectionManager = selectionManager || new SelectionManager(canvasManager);
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
        console.log(`SelectionTool.onMouseDown - Tool active: ${this.active}`);
        if (!this.active) return;
        
        // Check if Shift key is pressed for multi-select
        this.isMultiSelect = event.shiftKey;
        
        // Convert screen coordinates to canvas coordinates
        const canvasPoint = this.canvasManager.viewport.screenToCanvas(x, y);
        console.log(`SelectionTool.onMouseDown - Canvas point: (${canvasPoint.x.toFixed(2)}, ${canvasPoint.y.toFixed(2)})`);
        
        // Get the currently selected element type (if any)
        let preferredType = null;
        if (this.selectionManager.selectedElements.length === 1) {
            preferredType = this.selectionManager.selectedElements[0].type;
            console.log(`SelectionTool.onMouseDown - Preferred type: ${preferredType}`);
        }
        
        // Check if there's an element at the clicked position
        // If we have a selected element, try to keep selecting the same type
        const element = this.canvasManager.getElementAtPosition(canvasPoint.x, canvasPoint.y, preferredType);
        
        if (element) {
            console.log(`SelectionTool.onMouseDown - Hit element: ${element.type} (id: ${element.id})`);
            console.log(`SelectionTool.onMouseDown - Element position: (${element.x.toFixed(2)}, ${element.y.toFixed(2)})`);
            
            // Select the element (add to selection if Shift is pressed)
            this.selectionManager.selectElement(element, this.isMultiSelect);
            console.log(`SelectionTool.onMouseDown - Selected elements count: ${this.selectionManager.selectedElements.length}`);
            
            // Start dragging the selected elements
            this.selectionManager.startDrag(canvasPoint.x, canvasPoint.y);
            console.log(`SelectionTool.onMouseDown - Started dragging, isDragging: ${this.selectionManager.isDragging}`);
            console.log(`SelectionTool.onMouseDown - Element start positions: ${JSON.stringify([...this.selectionManager.elementStartPositions.entries()].map(([id, pos]) => ({ id, x: pos.x, y: pos.y })))}`);
            
            // Prevent default behavior to avoid any unwanted interactions
            event.preventDefault();
            event.stopPropagation();
        } else {
            console.log('SelectionTool.onMouseDown - No element hit');
            
            // Clear selection if clicking on empty space and not multi-selecting
            if (!this.isMultiSelect) {
                this.selectionManager.clearSelection();
                console.log(`SelectionTool.onMouseDown - Cleared selection`);
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
        const isDragging = this.selectionManager.isDragging;
        const isResizing = this.selectionManager.isResizing;
        
        if (isDragging || isResizing) {
            console.log(`SelectionTool.onMouseMove - Dragging: ${isDragging}, Resizing: ${isResizing}`);
            console.log(`SelectionTool.onMouseMove - Canvas point: (${canvasPoint.x.toFixed(2)}, ${canvasPoint.y.toFixed(2)})`);
            console.log(`SelectionTool.onMouseMove - Selected elements: ${this.selectionManager.selectedElements.length}`);
            
            // Drag the selected elements
            this.selectionManager.drag(canvasPoint.x, canvasPoint.y);
            
            // Prevent default behavior to avoid any unwanted interactions
            event.preventDefault();
            event.stopPropagation();
        } else {
            // Update cursor based on what's under it
            this.updateCursor(x, y);
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
        
        console.log(`SelectionTool.onMouseUp - Stopping drag`);
        
        // Convert screen coordinates to canvas coordinates
        const canvasPoint = this.canvasManager.viewport.screenToCanvas(x, y);
        
        // Stop dragging
        this.selectionManager.stopDrag();
        
        // Force a render update to ensure the elements are in their final positions
        this.canvasManager.requestRender();
        
        // Prevent default behavior to avoid any unwanted interactions
        event.preventDefault();
        event.stopPropagation();
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
    
    /**
     * Handle touch start event (for mobile devices)
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {TouchEvent} event - The original event
     */
    onTouchStart(x, y, event) {
        console.log(`SelectionTool.onTouchStart - Tool active: ${this.active}`);
        if (!this.active) return;
        
        // Always prevent default to avoid unwanted scrolling on mobile
        event.preventDefault();
        
        // Convert screen coordinates to canvas coordinates
        const canvasPoint = this.canvasManager.viewport.screenToCanvas(x, y);
        console.log(`SelectionTool.onTouchStart - Screen point: (${x.toFixed(2)}, ${y.toFixed(2)})`);
        console.log(`SelectionTool.onTouchStart - Canvas point: (${canvasPoint.x.toFixed(2)}, ${canvasPoint.y.toFixed(2)})`);
        console.log(`SelectionTool.onTouchStart - Viewport scale: ${this.canvasManager.viewport.scale.toFixed(2)}`);
        
        // Get the currently selected element type (if any)
        let preferredType = null;
        if (this.selectionManager.selectedElements.length === 1) {
            preferredType = this.selectionManager.selectedElements[0].type;
            console.log(`SelectionTool.onTouchStart - Preferred type: ${preferredType}`);
        }
        
        // Check if there's an element at the touched position
        const element = this.canvasManager.getElementAtPosition(canvasPoint.x, canvasPoint.y, preferredType);
        
        if (element) {
            console.log(`SelectionTool.onTouchStart - Hit element: ${element.type} (id: ${element.id})`);
            console.log(`SelectionTool.onTouchStart - Element position: (${element.x.toFixed(2)}, ${element.y.toFixed(2)})`);
            
            // Select the element (no multi-select on touch)
            this.selectionManager.selectElement(element, false);
            console.log(`SelectionTool.onTouchStart - Selected elements count: ${this.selectionManager.selectedElements.length}`);
            
            // Start dragging the selected elements
            this.selectionManager.startDrag(canvasPoint.x, canvasPoint.y);
            console.log(`SelectionTool.onTouchStart - Started dragging, isDragging: ${this.selectionManager.isDragging}`);
            console.log(`SelectionTool.onTouchStart - Element start positions: ${JSON.stringify([...this.selectionManager.elementStartPositions.entries()].map(([id, pos]) => ({ id, x: pos.x, y: pos.y })))}`);
        } else {
            console.log('SelectionTool.onTouchStart - No element hit');
            
            // Clear selection if touching on empty space
            this.selectionManager.clearSelection();
            console.log(`SelectionTool.onTouchStart - Cleared selection`);
        }
    }
    
    /**
     * Handle touch move event (for mobile devices)
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {TouchEvent} event - The original event
     */
    onTouchMove(x, y, event) {
        if (!this.active) return;
        
        // Always prevent default to avoid unwanted scrolling on mobile
        event.preventDefault();
        
        // Convert screen coordinates to canvas coordinates
        const canvasPoint = this.canvasManager.viewport.screenToCanvas(x, y);
        
        // Drag the selected elements
        const isDragging = this.selectionManager.isDragging;
        const isResizing = this.selectionManager.isResizing;
        
        if (isDragging || isResizing) {
            console.log(`SelectionTool.onTouchMove - Dragging: ${isDragging}, Resizing: ${isResizing}`);
            console.log(`SelectionTool.onTouchMove - Screen point: (${x.toFixed(2)}, ${y.toFixed(2)})`);
            console.log(`SelectionTool.onTouchMove - Canvas point: (${canvasPoint.x.toFixed(2)}, ${canvasPoint.y.toFixed(2)})`);
            console.log(`SelectionTool.onTouchMove - Selected elements: ${this.selectionManager.selectedElements.length}`);
            
            // Drag the selected elements
            this.selectionManager.drag(canvasPoint.x, canvasPoint.y);
        }
    }
    
    /**
     * Handle touch end event (for mobile devices)
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {TouchEvent} event - The original event
     */
    onTouchEnd(x, y, event) {
        if (!this.active) return;
        
        // Always prevent default to avoid unwanted scrolling on mobile
        event.preventDefault();
        
        console.log(`SelectionTool.onTouchEnd - Stopping drag`);
        console.log(`SelectionTool.onTouchEnd - Screen point: (${x.toFixed(2)}, ${y.toFixed(2)})`);
        
        // Convert screen coordinates to canvas coordinates
        const canvasPoint = this.canvasManager.viewport.screenToCanvas(x, y);
        console.log(`SelectionTool.onTouchEnd - Canvas point: (${canvasPoint.x.toFixed(2)}, ${canvasPoint.y.toFixed(2)})`);
        
        // Stop dragging
        this.selectionManager.stopDrag();
        
        // Force a render update to ensure the elements are in their final positions
        this.canvasManager.requestRender();
    }
}