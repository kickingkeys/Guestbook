/**
 * SelectionManager class
 * Manages selection, movement, and deletion of canvas elements
 */
export class SelectionManager {
    /**
     * Constructor
     * @param {CanvasManager} canvasManager - The canvas manager instance
     */
    constructor(canvasManager) {
        this.canvasManager = canvasManager;
        this.selectedElements = [];
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.elementStartPositions = new Map(); // Map of element id to {x, y} start positions
        
        // Resizing state
        this.isResizing = false;
        this.resizeElement = null;
        this.resizeHandle = null; // 'tl', 'tr', 'bl', 'br' (top-left, top-right, etc.)
        this.resizeStartX = 0;
        this.resizeStartY = 0;
        this.elementStartSize = { width: 0, height: 0 };
        this.elementStartPos = { x: 0, y: 0 };
        
        // Bind event handlers to maintain 'this' context
        this.handleKeyDown = this.handleKeyDown.bind(this);
        
        // Add keyboard event listener for delete key
        document.addEventListener('keydown', this.handleKeyDown);
    }
    
    /**
     * Select a single element
     * @param {Object} element - The element to select
     * @param {boolean} addToSelection - Whether to add to existing selection (for multi-select)
     */
    selectElement(element, addToSelection = false) {
        if (!element) return;
        
        if (!addToSelection) {
            this.clearSelection();
        }
        
        // Only add if not already selected
        if (!this.isSelected(element)) {
            this.selectedElements.push(element);
            element.selected = true;
            
            // Request a render update
            this.canvasManager.requestRender();
        }
    }
    
    /**
     * Check if an element is currently selected
     * @param {Object} element - The element to check
     * @returns {boolean} - Whether the element is selected
     */
    isSelected(element) {
        return this.selectedElements.includes(element);
    }
    
    /**
     * Clear the current selection
     */
    clearSelection() {
        // Remove selection styling from all elements
        this.selectedElements.forEach(element => {
            element.selected = false;
        });
        
        // Clear the selection array
        this.selectedElements = [];
        
        // Request a render update
        this.canvasManager.requestRender();
    }
    
    /**
     * Get all currently selected elements
     * @returns {Array} - Array of selected elements
     */
    getSelectedElements() {
        return [...this.selectedElements];
    }
    
    /**
     * Start dragging the selected elements
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     */
    startDrag(x, y) {
        console.log(`SelectionManager.startDrag - Selected elements: ${this.selectedElements.length}`);
        if (this.selectedElements.length === 0) return;
        
        // Check if we're clicking on a resize handle
        const resizeInfo = this.checkResizeHandles(x, y);
        if (resizeInfo.isHandle && this.selectedElements.length === 1) {
            // Start resizing
            this.isResizing = true;
            this.resizeElement = this.selectedElements[0];
            this.resizeHandle = resizeInfo.handle;
            this.resizeStartX = x;
            this.resizeStartY = y;
            
            console.log(`SelectionManager.startDrag - Starting resize with handle: ${this.resizeHandle}`);
            
            // Store the element's starting size and position
            if (this.resizeElement.type === 'image') {
                this.elementStartSize = {
                    width: this.resizeElement.width,
                    height: this.resizeElement.height
                };
                this.elementStartPos = {
                    x: this.resizeElement.x,
                    y: this.resizeElement.y
                };
                console.log(`SelectionManager.startDrag - Element start size: ${this.elementStartSize.width}x${this.elementStartSize.height}`);
            }
            return;
        }
        
        // Otherwise, start dragging
        this.isDragging = true;
        this.dragStartX = x;
        this.dragStartY = y;
        
        console.log(`SelectionManager.startDrag - Starting drag at (${x.toFixed(2)}, ${y.toFixed(2)})`);
        
        // Store the starting position of each selected element
        this.elementStartPositions.clear();
        this.selectedElements.forEach(element => {
            // Make sure we're using the current position of the element
            this.elementStartPositions.set(element.id, {
                x: element.x,
                y: element.y
            });
            console.log(`SelectionManager.startDrag - Element ${element.id} start position: (${element.x.toFixed(2)}, ${element.y.toFixed(2)})`);
        });
    }
    
    /**
     * Check if a point is over a resize handle of the selected element
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @returns {Object} - { isHandle: boolean, handle: string }
     */
    checkResizeHandles(x, y) {
        // Only check if we have exactly one element selected
        if (this.selectedElements.length !== 1) {
            return { isHandle: false, handle: null };
        }
        
        const element = this.selectedElements[0];
        
        // Only images can be resized for now
        if (element.type !== 'image') {
            return { isHandle: false, handle: null };
        }
        
        const boundingBox = element.getBoundingBox();
        const handleSize = 8; // Size of the resize handles
        
        // Define the four corner handles
        const handles = {
            'tl': { x: boundingBox.x, y: boundingBox.y },
            'tr': { x: boundingBox.x + boundingBox.width, y: boundingBox.y },
            'bl': { x: boundingBox.x, y: boundingBox.y + boundingBox.height },
            'br': { x: boundingBox.x + boundingBox.width, y: boundingBox.y + boundingBox.height }
        };
        
        // Check if the point is over any of the handles
        for (const [handle, pos] of Object.entries(handles)) {
            if (
                x >= pos.x - handleSize/2 && 
                x <= pos.x + handleSize/2 && 
                y >= pos.y - handleSize/2 && 
                y <= pos.y + handleSize/2
            ) {
                return { isHandle: true, handle };
            }
        }
        
        return { isHandle: false, handle: null };
    }
    
    /**
     * Drag the selected elements
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     */
    drag(x, y) {
        // Handle resizing
        if (this.isResizing && this.resizeElement) {
            console.log(`SelectionManager.drag - Resizing element ${this.resizeElement.id}`);
            this.resize(x, y);
            return;
        }
        
        // Handle dragging
        if (!this.isDragging || this.selectedElements.length === 0) {
            // Not dragging or no elements selected
            console.log(`SelectionManager.drag - Not dragging: isDragging=${this.isDragging}, selectedElements=${this.selectedElements.length}`);
            return;
        }
        
        // Calculate the distance moved
        const dx = x - this.dragStartX;
        const dy = y - this.dragStartY;
        
        console.log(`SelectionManager.drag - Moving by (${dx.toFixed(2)}, ${dy.toFixed(2)})`);
        console.log(`SelectionManager.drag - Current position: (${x.toFixed(2)}, ${y.toFixed(2)}), Start position: (${this.dragStartX.toFixed(2)}, ${this.dragStartY.toFixed(2)})`);
        
        // Update the position of each selected element
        this.selectedElements.forEach(element => {
            const startPos = this.elementStartPositions.get(element.id);
            if (startPos) {
                const newX = startPos.x + dx;
                const newY = startPos.y + dy;
                
                console.log(`SelectionManager.drag - Moving element ${element.id} from (${startPos.x.toFixed(2)}, ${startPos.y.toFixed(2)}) to (${newX.toFixed(2)}, ${newY.toFixed(2)})`);
                
                // Use the update method to ensure proper handling of the position change
                element.update({
                    x: newX,
                    y: newY
                });
                
                // Update the start position for the next drag operation
                // This is important to prevent the element from snapping back
                this.elementStartPositions.set(element.id, {
                    x: newX,
                    y: newY
                });
            } else {
                console.warn(`SelectionManager.drag - No start position for element ${element.id}`);
            }
        });
        
        // Update drag start position for the next move
        this.dragStartX = x;
        this.dragStartY = y;
        
        // Request a render update
        this.canvasManager.requestRender();
    }
    
    /**
     * Resize the selected element
     * @param {number} x - The current x coordinate
     * @param {number} y - The current y coordinate
     */
    resize(x, y) {
        if (!this.isResizing || !this.resizeElement || this.resizeElement.type !== 'image') return;
        
        // Calculate the distance moved
        const dx = x - this.resizeStartX;
        const dy = y - this.resizeStartY;
        
        // Calculate new width and height based on which handle is being dragged
        let newWidth = this.elementStartSize.width;
        let newHeight = this.elementStartSize.height;
        let newX = this.elementStartPos.x;
        let newY = this.elementStartPos.y;
        
        // Maintain aspect ratio
        const aspectRatio = this.elementStartSize.width / this.elementStartSize.height;
        
        switch (this.resizeHandle) {
            case 'br': // Bottom-right
                newWidth = this.elementStartSize.width + dx;
                newHeight = this.elementStartSize.height + dy;
                break;
                
            case 'bl': // Bottom-left
                newWidth = this.elementStartSize.width - dx;
                newHeight = this.elementStartSize.height + dy;
                newX = this.elementStartPos.x + dx;
                break;
                
            case 'tr': // Top-right
                newWidth = this.elementStartSize.width + dx;
                newHeight = this.elementStartSize.height - dy;
                newY = this.elementStartPos.y + dy;
                break;
                
            case 'tl': // Top-left
                newWidth = this.elementStartSize.width - dx;
                newHeight = this.elementStartSize.height - dy;
                newX = this.elementStartPos.x + dx;
                newY = this.elementStartPos.y + dy;
                break;
        }
        
        // Ensure minimum size
        const minSize = 20;
        if (newWidth < minSize) {
            newWidth = minSize;
            if (this.resizeHandle === 'bl' || this.resizeHandle === 'tl') {
                newX = this.elementStartPos.x + (this.elementStartSize.width - minSize);
            }
        }
        
        if (newHeight < minSize) {
            newHeight = minSize;
            if (this.resizeHandle === 'tl' || this.resizeHandle === 'tr') {
                newY = this.elementStartPos.y + (this.elementStartSize.height - minSize);
            }
        }
        
        // Update the element
        this.resizeElement.update({
            x: newX,
            y: newY,
            width: newWidth,
            height: newHeight
        });
        
        // Request a render update
        this.canvasManager.requestRender();
    }
    
    /**
     * Stop dragging or resizing the selected elements
     */
    stopDrag() {
        console.log(`SelectionManager.stopDrag - isDragging: ${this.isDragging}, isResizing: ${this.isResizing}`);
        
        // Request a final render update to ensure the elements are in their final positions
        if (this.isDragging || this.isResizing) {
            this.canvasManager.requestRender();
        }
        
        this.isDragging = false;
        this.elementStartPositions.clear();
        
        this.isResizing = false;
        this.resizeElement = null;
        this.resizeHandle = null;
    }
    
    /**
     * Delete the selected elements
     */
    deleteSelectedElements() {
        if (this.selectedElements.length === 0) return;
        
        // Remove each selected element from the canvas
        this.selectedElements.forEach(element => {
            this.canvasManager.removeElement(element);
        });
        
        // Clear the selection
        this.selectedElements = [];
        
        // Request a render update
        this.canvasManager.requestRender();
    }
    
    /**
     * Handle keyboard events
     * @param {KeyboardEvent} event - The keyboard event
     */
    handleKeyDown(event) {
        // Delete key (Delete or Backspace)
        if ((event.key === 'Delete' || event.key === 'Backspace') && this.selectedElements.length > 0) {
            // Prevent default browser behavior (like navigating back with Backspace)
            event.preventDefault();
            
            // Delete the selected elements
            this.deleteSelectedElements();
        }
    }
    
    /**
     * Clean up event listeners when no longer needed
     */
    destroy() {
        document.removeEventListener('keydown', this.handleKeyDown);
    }
} 