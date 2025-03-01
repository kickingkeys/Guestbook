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
        this.isMobile = this._checkIfMobile();
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.lastTouchTime = 0;
        this.doubleTapDelay = 300; // ms
    }
    
    /**
     * Check if the current device is mobile
     * @returns {boolean} True if mobile device
     */
    _checkIfMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    /**
     * Activate the tool
     */
    activate() {
        super.activate();
        // Set cursor to default
        if (this.canvasManager && this.canvasManager.canvas) {
            this.canvasManager.canvas.style.cursor = this.config.cursor;
            
            // Add touch event listeners for mobile
            if (this.isMobile) {
                this.canvasManager.canvas.addEventListener('touchstart', this._handleTouchStart.bind(this), { passive: false });
                this.canvasManager.canvas.addEventListener('touchmove', this._handleTouchMove.bind(this), { passive: false });
                this.canvasManager.canvas.addEventListener('touchend', this._handleTouchEnd.bind(this), { passive: false });
                console.log('Touch events registered for selection tool');
            }
        }
    }
    
    /**
     * Deactivate the tool
     */
    deactivate() {
        super.deactivate();
        this.selectionManager.clearSelection();
        
        // Remove touch event listeners
        if (this.isMobile && this.canvasManager && this.canvasManager.canvas) {
            this.canvasManager.canvas.removeEventListener('touchstart', this._handleTouchStart.bind(this));
            this.canvasManager.canvas.removeEventListener('touchmove', this._handleTouchMove.bind(this));
            this.canvasManager.canvas.removeEventListener('touchend', this._handleTouchEnd.bind(this));
        }
    }
    
    /**
     * Handle touch start event
     * @param {TouchEvent} event - The touch event
     */
    _handleTouchStart(event) {
        if (!this.active) return;
        
        // Prevent default to avoid scrolling/zooming
        event.preventDefault();
        
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            const x = touch.clientX;
            const y = touch.clientY;
            
            // Check for double tap (for multi-select)
            const now = new Date().getTime();
            const timeSinceLastTouch = now - this.lastTouchTime;
            
            if (timeSinceLastTouch < this.doubleTapDelay) {
                // Double tap detected - toggle multi-select
                this.isMultiSelect = true;
                console.log('Double tap detected - multi-select enabled');
            } else {
                this.isMultiSelect = false;
            }
            
            this.lastTouchTime = now;
            this.touchStartX = x;
            this.touchStartY = y;
            
            // Process as mouse down
            this.onMouseDown(x, y, event);
        }
    }
    
    /**
     * Handle touch move event
     * @param {TouchEvent} event - The touch event
     */
    _handleTouchMove(event) {
        if (!this.active) return;
        
        // Prevent default to avoid scrolling/zooming
        event.preventDefault();
        
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            const x = touch.clientX;
            const y = touch.clientY;
            
            // Process as mouse move
            this.onMouseMove(x, y, event);
        }
    }
    
    /**
     * Handle touch end event
     * @param {TouchEvent} event - The touch event
     */
    _handleTouchEnd(event) {
        if (!this.active) return;
        
        // Prevent default
        event.preventDefault();
        
        // Use the last known position since touches array might be empty
        const x = this.touchStartX;
        const y = this.touchStartY;
        
        // Process as mouse up
        this.onMouseUp(x, y, event);
        
        // Reset multi-select after a short delay
        setTimeout(() => {
            this.isMultiSelect = false;
        }, this.doubleTapDelay + 50);
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
        
        // Check if Shift key is pressed for multi-select (or if double-tap on mobile)
        if (!this.isMobile) {
            this.isMultiSelect = event.shiftKey;
        }
        
        // Convert screen coordinates to canvas coordinates
        const canvasPoint = this.canvasManager.viewport.screenToCanvas(x, y);
        console.log(`SelectionTool.onMouseDown - Canvas point: (${canvasPoint.x.toFixed(2)}, ${canvasPoint.y.toFixed(2)})`);
        
        // First, check if we're clicking on a rotation handle
        if (this.selectionManager.selectedElements.length === 1) {
            const rotateInfo = this.selectionManager.checkRotationHandle(canvasPoint.x, canvasPoint.y);
            if (rotateInfo.isHandle) {
                console.log(`SelectionTool.onMouseDown - Clicked on rotation handle: ${rotateInfo.corner}`);
                
                // Start rotation
                this.selectionManager.startDrag(canvasPoint.x, canvasPoint.y);
                
                // Prevent default behavior
                event.preventDefault();
                event.stopPropagation();
                return;
            }
        }
        
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
            
            // Select the element (add to selection if Shift is pressed or double-tap on mobile)
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
        
        // Check all interaction states
        const isDragging = this.selectionManager.isDragging;
        const isResizing = this.selectionManager.isResizing;
        const isRotating = this.selectionManager.isRotating;
        
        if (isDragging || isResizing || isRotating) {
            console.log(`SelectionTool.onMouseMove - Dragging: ${isDragging}, Resizing: ${isResizing}, Rotating: ${isRotating}`);
            console.log(`SelectionTool.onMouseMove - Canvas point: (${canvasPoint.x.toFixed(2)}, ${canvasPoint.y.toFixed(2)})`);
            console.log(`SelectionTool.onMouseMove - Selected elements: ${this.selectionManager.selectedElements.length}`);
            
            // Drag/resize/rotate the selected elements
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
        
        // Don't change cursor on mobile devices
        if (this.isMobile) return;
        
        // Convert screen coordinates to canvas coordinates
        const canvasPoint = this.canvasManager.viewport.screenToCanvas(x, y);
        
        // Check if we're over a rotation handle
        const rotateInfo = this.selectionManager.checkRotationHandle(canvasPoint.x, canvasPoint.y);
        if (rotateInfo.isHandle) {
            // Set rotation cursor directly
            this.canvasManager.canvas.style.cursor = 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 24 24\'><path d=\'M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z\' fill=\'%23ED682B\'/></svg>") 16 16, auto';
            console.log('Rotation cursor activated at corner:', rotateInfo.corner);
            return;
        }
        
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
        // Remove touch event listeners
        if (this.isMobile && this.canvasManager && this.canvasManager.canvas) {
            this.canvasManager.canvas.removeEventListener('touchstart', this._handleTouchStart.bind(this));
            this.canvasManager.canvas.removeEventListener('touchmove', this._handleTouchMove.bind(this));
            this.canvasManager.canvas.removeEventListener('touchend', this._handleTouchEnd.bind(this));
        }
        
        if (this.selectionManager) {
            this.selectionManager.destroy();
        }
    }
}