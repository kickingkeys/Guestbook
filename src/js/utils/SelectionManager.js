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
        
        // Rotation state
        this.isRotating = false;
        this.rotateElement = null;
        this.rotateStartX = 0;
        this.rotateStartY = 0;
        this.elementStartRotation = 0;
        this.elementCenter = { x: 0, y: 0 };
        
        // Debug mode
        this.debugMode = true; // Enable debug logging
        
        // Bind event handlers to maintain 'this' context
        this.handleKeyDown = this.handleKeyDown.bind(this);
        
        // Add keyboard event listener for delete key
        document.addEventListener('keydown', this.handleKeyDown);
        
        if (this.debugMode) {
            console.log('SelectionManager: Debug mode enabled');
        }
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
        if (this.debugMode) {
            console.log(`SelectionManager.startDrag - Selected elements: ${this.selectedElements.length}`);
            console.log(`SelectionManager.startDrag - Mouse position: (${x.toFixed(2)}, ${y.toFixed(2)})`);
            
            if (this.selectedElements.length === 1) {
                const element = this.selectedElements[0];
                const boundingBox = element.getBoundingBox();
                console.log(`SelectionManager.startDrag - Element bounding box:`, {
                    x: boundingBox.x.toFixed(2),
                    y: boundingBox.y.toFixed(2),
                    width: boundingBox.width.toFixed(2),
                    height: boundingBox.height.toFixed(2)
                });
            }
        }
        
        if (this.selectedElements.length === 0) return;
        
        // Check if we're clicking on a rotation handle
        const rotateInfo = this.checkRotationHandle(x, y);
        if (rotateInfo.isHandle && this.selectedElements.length === 1) {
            // Start rotating
            this.isRotating = true;
            this.rotateElement = this.selectedElements[0];
            this.rotateStartX = x;
            this.rotateStartY = y;
            
            if (this.debugMode) {
                console.log(`SelectionManager.startDrag - Starting rotation from corner: ${rotateInfo.corner}`);
            }
            
            // Store the element's starting rotation and center
            this.elementStartRotation = this.rotateElement.rotation || 0;
            
            // Calculate the center of the element
            const boundingBox = this.rotateElement.getBoundingBox();
            this.elementCenter = {
                x: boundingBox.x + boundingBox.width / 2,
                y: boundingBox.y + boundingBox.height / 2
            };
            
            if (this.debugMode) {
                console.log(`SelectionManager.startDrag - Element center: (${this.elementCenter.x.toFixed(2)}, ${this.elementCenter.y.toFixed(2)})`);
                console.log(`SelectionManager.startDrag - Element start rotation: ${this.elementStartRotation.toFixed(4)} radians (${(this.elementStartRotation * 180 / Math.PI).toFixed(2)}°)`);
            }
            
            return;
        }
        
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
     * Check if a point is over a rotation handle
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {Object} - Object with isHandle and corner properties
     */
    checkRotationHandle(x, y) {
        // Only check if we have exactly one element selected
        if (this.selectedElements.length !== 1) {
            return { isHandle: false, corner: null };
        }
        
        const element = this.selectedElements[0];
        const boundingBox = element.getBoundingBox();
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Define the rotation handle detection area around each corner
        // We'll check if the cursor is within a certain distance from each corner
        const handleDistance = isMobile ? 35 : 25; // Larger detection area on mobile
        
        // For mobile, we'll check for the specific rotation handle positions
        if (isMobile) {
            const rotationIndicatorDistance = 25; // Same as in CanvasManager.drawSelectionIndicators
            const rotationHandles = {
                'tl': { 
                    x: boundingBox.x - rotationIndicatorDistance, 
                    y: boundingBox.y - rotationIndicatorDistance 
                },
                'tr': { 
                    x: boundingBox.x + boundingBox.width + rotationIndicatorDistance, 
                    y: boundingBox.y - rotationIndicatorDistance 
                },
                'bl': { 
                    x: boundingBox.x - rotationIndicatorDistance, 
                    y: boundingBox.y + boundingBox.height + rotationIndicatorDistance 
                },
                'br': { 
                    x: boundingBox.x + boundingBox.width + rotationIndicatorDistance, 
                    y: boundingBox.y + boundingBox.height + rotationIndicatorDistance 
                }
            };
            
            // Check if the point is near any of the rotation handles
            for (const [corner, pos] of Object.entries(rotationHandles)) {
                const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
                
                // Use a larger detection radius for mobile
                const touchRadius = 20;
                
                if (distance <= touchRadius) {
                    if (this.debugMode) {
                        console.log(`Mobile rotation handle detected at ${corner} corner, distance: ${distance.toFixed(2)}`);
                    }
                    return { isHandle: true, corner: corner };
                }
            }
        } else {
            // Desktop behavior - check corners
            const corners = {
                'tl': { x: boundingBox.x, y: boundingBox.y },
                'tr': { x: boundingBox.x + boundingBox.width, y: boundingBox.y },
                'bl': { x: boundingBox.x, y: boundingBox.y + boundingBox.height },
                'br': { x: boundingBox.x + boundingBox.width, y: boundingBox.y + boundingBox.height }
            };
            
            // Check if the point is near any of the corners
            for (const [corner, pos] of Object.entries(corners)) {
                const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
                
                // Check if the point is within the handle distance
                // and outside the bounding box by at least 5px to avoid conflicts with resize handles
                const isOutsideBox = (
                    x < boundingBox.x - 5 || 
                    x > boundingBox.x + boundingBox.width + 5 || 
                    y < boundingBox.y - 5 || 
                    y > boundingBox.y + boundingBox.height + 5
                );
                
                if (distance <= handleDistance && isOutsideBox) {
                    if (this.debugMode) {
                        console.log(`Rotation handle detected at ${corner} corner, distance: ${distance.toFixed(2)}`);
                    }
                    return { isHandle: true, corner: corner };
                }
            }
        }
        
        return { isHandle: false, corner: null };
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
        if (this.debugMode) {
            console.log(`SelectionManager.drag - Position: (${x.toFixed(2)}, ${y.toFixed(2)})`);
            console.log(`SelectionManager.drag - States: isDragging=${this.isDragging}, isResizing=${this.isResizing}, isRotating=${this.isRotating}`);
        }
        
        // Handle rotation
        if (this.isRotating && this.rotateElement) {
            if (this.debugMode) {
                console.log(`SelectionManager.drag - Rotating element ${this.rotateElement.id}`);
            }
            this.rotate(x, y);
            return;
        }
        
        // Handle resizing
        if (this.isResizing && this.resizeElement) {
            if (this.debugMode) {
                console.log(`SelectionManager.drag - Resizing element ${this.resizeElement.id}`);
            }
            this.resize(x, y);
            return;
        }
        
        // Handle dragging
        if (!this.isDragging || this.selectedElements.length === 0) {
            // Not dragging or no elements selected
            if (this.debugMode) {
                console.log(`SelectionManager.drag - Not dragging: isDragging=${this.isDragging}, selectedElements=${this.selectedElements.length}`);
            }
            return;
        }
        
        // Calculate the distance moved
        const dx = x - this.dragStartX;
        const dy = y - this.dragStartY;
        
        if (this.debugMode) {
            console.log(`SelectionManager.drag - Moving by (${dx.toFixed(2)}, ${dy.toFixed(2)})`);
            console.log(`SelectionManager.drag - Current position: (${x.toFixed(2)}, ${y.toFixed(2)}), Start position: (${this.dragStartX.toFixed(2)}, ${this.dragStartY.toFixed(2)})`);
        }
        
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
     * Rotate the selected element
     * @param {number} x - The current x coordinate
     * @param {number} y - The current y coordinate
     */
    rotate(x, y) {
        if (!this.isRotating || !this.rotateElement) {
            if (this.debugMode) {
                console.log(`SelectionManager.rotate - Not rotating: isRotating=${this.isRotating}, rotateElement=${this.rotateElement ? this.rotateElement.id : 'null'}`);
            }
            return;
        }
        
        if (this.debugMode) {
            console.log(`SelectionManager.rotate - Mouse position: (${x.toFixed(2)}, ${y.toFixed(2)})`);
            console.log(`SelectionManager.rotate - Element center: (${this.elementCenter.x.toFixed(2)}, ${this.elementCenter.y.toFixed(2)})`);
        }
        
        // Calculate the angle between the center of the element and the current mouse position
        const dx = x - this.elementCenter.x;
        const dy = y - this.elementCenter.y;
        const currentAngle = Math.atan2(dy, dx);
        
        // Calculate the angle between the center of the element and the starting mouse position
        const startDx = this.rotateStartX - this.elementCenter.x;
        const startDy = this.rotateStartY - this.elementCenter.y;
        const startAngle = Math.atan2(startDy, startDx);
        
        if (this.debugMode) {
            console.log(`SelectionManager.rotate - Current vector: (${dx.toFixed(2)}, ${dy.toFixed(2)}), angle: ${(currentAngle * 180 / Math.PI).toFixed(2)}°`);
            console.log(`SelectionManager.rotate - Start vector: (${startDx.toFixed(2)}, ${startDy.toFixed(2)}), angle: ${(startAngle * 180 / Math.PI).toFixed(2)}°`);
        }
        
        // Calculate the rotation angle (in radians)
        let rotationAngle = currentAngle - startAngle;
        
        // Convert to degrees for easier debugging and more intuitive rotation
        const rotationDegrees = rotationAngle * (180 / Math.PI);
        
        // Update the element's rotation (add to the starting rotation)
        // The element.rotation is stored in radians
        const newRotation = this.elementStartRotation + rotationAngle;
        
        if (this.debugMode) {
            console.log(`SelectionManager.rotate - Rotation change: ${rotationDegrees.toFixed(2)}° degrees, New rotation: ${(newRotation * 180 / Math.PI).toFixed(2)}°`);
        }
        
        this.rotateElement.update({
            rotation: newRotation
        });
        
        // Request a render update
        this.canvasManager.requestRender();
    }
    
    /**
     * Stop dragging, resizing, or rotating the selected elements
     */
    stopDrag() {
        if (this.debugMode) {
            console.log(`SelectionManager.stopDrag - isDragging: ${this.isDragging}, isResizing: ${this.isResizing}, isRotating: ${this.isRotating}`);
            
            if (this.isRotating && this.rotateElement) {
                console.log(`SelectionManager.stopDrag - Final rotation: ${(this.rotateElement.rotation * 180 / Math.PI).toFixed(2)}°`);
            }
        }
        
        // Request a final render update to ensure the elements are in their final positions
        if (this.isDragging || this.isResizing || this.isRotating) {
            this.canvasManager.requestRender();
        }
        
        this.isDragging = false;
        this.elementStartPositions.clear();
        
        this.isResizing = false;
        this.resizeElement = null;
        this.resizeHandle = null;
        
        this.isRotating = false;
        this.rotateElement = null;
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