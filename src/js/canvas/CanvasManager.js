/**
 * CanvasManager class
 * Handles canvas initialization, resizing, and rendering the grid pattern
 */
export class CanvasManager {
    /**
     * Constructor
     * @param {string} canvasId - The ID of the canvas element
     */
    constructor(canvasId) {
        this.canvasId = canvasId;
        this.canvas = null;
        this.ctx = null;
        this.width = 0;
        this.height = 0;
        this.elements = [];
        
        // Grid pattern properties
        this.gridSpacing = 20; // Space between grid dots
        this.gridDotSize = 1; // Size of grid dots
        this.gridColor = '#CCCCCC'; // Color of grid dots
        
        // Background color
        this.backgroundColor = '#FAF8F4'; // Light beige
        
        // Viewport reference (will be set by the app)
        this.viewport = null;
        
        // Render request state
        this._renderRequested = false;
        this._animationFrameId = null;
    }
    
    /**
     * Initialize the canvas
     */
    init() {
        // Get canvas element
        this.canvas = document.getElementById(this.canvasId);
        if (!this.canvas) {
            console.error(`Canvas element with ID "${this.canvasId}" not found.`);
            return;
        }
        
        // Get canvas context
        this.ctx = this.canvas.getContext('2d');
        
        // Set initial canvas dimensions
        this.handleResize();
        
        console.log('Canvas initialized successfully.');
    }
    
    /**
     * Handle window resize to maintain proper canvas dimensions
     */
    handleResize() {
        // Check if canvas exists
        if (!this.canvas) {
            console.error('Canvas not initialized yet, cannot resize');
            return;
        }
        
        const container = this.canvas.parentElement;
        
        // Check if container exists
        if (!container) {
            console.error('Canvas parent element not found, cannot resize');
            return;
        }
        
        // Set canvas dimensions to match container
        this.width = container.clientWidth;
        this.height = container.clientHeight;
        
        // Set canvas attributes
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        // Redraw after resize
        this.clear();
        this.drawGrid();
        this.render();
        
        console.log(`Canvas resized to ${this.width}x${this.height}`);
    }
    
    /**
     * Set the viewport reference
     * @param {Viewport} viewport - The viewport instance
     */
    setViewport(viewport) {
        this.viewport = viewport;
    }
    
    /**
     * Clear the canvas
     */
    clear() {
        // Check if context exists
        if (!this.ctx) {
            console.error('Canvas context not initialized, cannot clear');
            return;
        }
        
        // Clear the entire canvas
        this.ctx.fillStyle = this.backgroundColor;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }
    
    /**
     * Draw the dotted grid pattern
     */
    drawGrid() {
        // Check if context exists
        if (!this.ctx) {
            console.error('Canvas context not initialized, cannot draw grid');
            return;
        }
        
        // Save current context state
        this.ctx.save();
        
        // Apply viewport transformation if available
        if (this.viewport) {
            this.viewport.applyTransform(this.ctx);
        }
        
        // Set grid dot style
        this.ctx.fillStyle = this.gridColor;
        
        // Calculate grid dimensions with viewport
        let startX = 0;
        let startY = 0;
        let endX = this.width;
        let endY = this.height;
        
        // If viewport exists, adjust grid boundaries
        if (this.viewport) {
            // Convert screen coordinates to canvas coordinates
            const topLeft = this.viewport.screenToCanvas(0, 0);
            const bottomRight = this.viewport.screenToCanvas(this.width, this.height);
            
            // Adjust grid boundaries
            startX = Math.floor(topLeft.x / this.gridSpacing) * this.gridSpacing;
            startY = Math.floor(topLeft.y / this.gridSpacing) * this.gridSpacing;
            endX = Math.ceil(bottomRight.x / this.gridSpacing) * this.gridSpacing;
            endY = Math.ceil(bottomRight.y / this.gridSpacing) * this.gridSpacing;
        }
        
        // Draw grid dots
        for (let x = startX; x <= endX; x += this.gridSpacing) {
            for (let y = startY; y <= endY; y += this.gridSpacing) {
                // Draw a small dot
                this.ctx.beginPath();
                this.ctx.arc(x, y, this.gridDotSize, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        
        // Restore context state
        this.ctx.restore();
    }
    
    /**
     * Request a render update
     * Uses requestAnimationFrame for efficient rendering
     */
    requestRender() {
        if (this._renderRequested) return;
        
        this._renderRequested = true;
        this._animationFrameId = window.requestAnimationFrame(() => {
            this.render();
            this._renderRequested = false;
            this._animationFrameId = null;
        });
    }
    
    /**
     * Cancel a pending render request
     */
    cancelRenderRequest() {
        if (this._animationFrameId) {
            window.cancelAnimationFrame(this._animationFrameId);
            this._renderRequested = false;
            this._animationFrameId = null;
        }
    }
    
    /**
     * Render all canvas elements
     */
    render() {
        // Check if context exists
        if (!this.ctx) {
            console.error('Canvas context not initialized, cannot render');
            return;
        }
        
        // Clear the canvas
        this.clear();
        
        // Draw the grid with viewport transformation
        this.drawGrid();
        
        // Sort elements by z-index
        const sortedElements = [...this.elements].sort((a, b) => a.zIndex - b.zIndex);
        
        // Render each element
        sortedElements.forEach(element => {
            if (element.visible) {
                // Save context state
                this.ctx.save();
                
                // Apply viewport transformation if available
                if (this.viewport) {
                    this.viewport.applyTransform(this.ctx);
                }
                
                // Render the element
                element.render(this.ctx);
                
                // If the element is selected, draw selection indicators
                if (element.selected) {
                    this.drawSelectionIndicators(element);
                }
                
                // Restore context state
                this.ctx.restore();
            }
        });
    }
    
    /**
     * Draw selection indicators around an element
     * @param {Object} element - The selected element
     */
    drawSelectionIndicators(element) {
        if (!this.ctx) return;
        
        const boundingBox = element.getBoundingBox();
        
        // Draw selection border
        this.ctx.strokeStyle = '#ED682B';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(
            boundingBox.x - 2,
            boundingBox.y - 2,
            boundingBox.width + 4,
            boundingBox.height + 4
        );
        
        // Draw resize handles
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.strokeStyle = '#ED682B';
        this.ctx.lineWidth = 1;
        
        // Corner handles
        const handleSize = 8;
        const corners = [
            { x: boundingBox.x - handleSize/2, y: boundingBox.y - handleSize/2 },
            { x: boundingBox.x + boundingBox.width - handleSize/2, y: boundingBox.y - handleSize/2 },
            { x: boundingBox.x - handleSize/2, y: boundingBox.y + boundingBox.height - handleSize/2 },
            { x: boundingBox.x + boundingBox.width - handleSize/2, y: boundingBox.y + boundingBox.height - handleSize/2 }
        ];
        
        corners.forEach(corner => {
            this.ctx.beginPath();
            this.ctx.rect(corner.x, corner.y, handleSize, handleSize);
            this.ctx.fill();
            this.ctx.stroke();
        });
    }
    
    /**
     * Get the element at a specific position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {string} [preferredType] - Preferred element type to select
     * @returns {Object|null} - The element at the position or null if none
     */
    getElementAtPosition(x, y, preferredType = null) {
        // Convert screen coordinates to canvas coordinates if viewport exists
        let canvasX = x;
        let canvasY = y;
        
        if (this.viewport) {
            const canvasPoint = this.viewport.screenToCanvas(x, y);
            canvasX = canvasPoint.x;
            canvasY = canvasPoint.y;
        }
        
        // Check elements in reverse order (top to bottom)
        const sortedElements = [...this.elements].sort((a, b) => b.zIndex - a.zIndex);
        
        // First, check if there's a preferred type element at this position
        if (preferredType) {
            for (const element of sortedElements) {
                if (element.visible && element.type === preferredType && element.containsPoint(canvasX, canvasY)) {
                    return element;
                }
            }
        }
        
        // Define element type priority (sticky notes and text should be easier to select than drawings)
        const typePriority = {
            'sticky-note': 3,
            'text': 2,
            'image': 1,
            'drawing': 0
        };
        
        // Find all elements at this position
        const elementsAtPosition = sortedElements.filter(element => 
            element.visible && element.containsPoint(canvasX, canvasY)
        );
        
        if (elementsAtPosition.length === 0) {
            return null;
        }
        
        // If there's only one element, return it
        if (elementsAtPosition.length === 1) {
            return elementsAtPosition[0];
        }
        
        // If there are multiple elements, prioritize by type and then by z-index
        return elementsAtPosition.sort((a, b) => {
            // First sort by type priority
            const priorityDiff = (typePriority[b.type] || 0) - (typePriority[a.type] || 0);
            if (priorityDiff !== 0) {
                return priorityDiff;
            }
            // Then by z-index
            return b.zIndex - a.zIndex;
        })[0];
    }
    
    /**
     * Get all elements
     * @returns {Array} - All canvas elements
     */
    getElements() {
        return this.elements;
    }
    
    /**
     * Select an element
     * @param {Object} element - The element to select
     */
    selectElement(element) {
        // Deselect all other elements
        this.deselectAllElements();
        
        // Mark this element as selected
        element.selected = true;
        this.requestRender();
    }
    
    /**
     * Deselect all elements
     */
    deselectAllElements() {
        this.elements.forEach(element => {
            element.selected = false;
        });
        this.requestRender();
    }
    
    /**
     * Add an element to the canvas
     * @param {Object} element - The element to add
     */
    addElement(element) {
        this.elements.push(element);
        this.requestRender();
    }
    
    /**
     * Remove an element from the canvas
     * @param {Object} element - The element to remove
     */
    removeElement(element) {
        const index = this.elements.indexOf(element);
        if (index !== -1) {
            this.elements.splice(index, 1);
            this.requestRender();
        }
    }
} 