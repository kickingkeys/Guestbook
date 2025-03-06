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
        
        // Tool manager reference (will be set by the app)
        this.toolManager = null;
        
        // Firebase manager reference (will be set by the app)
        this.firebaseManager = null;
        
        // Render request state
        this._renderRequested = false;
        this._animationFrameId = null;
        
        // Element sync state
        this.isSyncing = false;
        this.unsubscribeElementListener = null;
        
        // Element change listeners
        this.elementChangeListeners = [];
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
     * Set the tool manager reference
     * @param {ToolManager} toolManager - The tool manager instance
     */
    setToolManager(toolManager) {
        this.toolManager = toolManager;
    }
    
    /**
     * Set Firebase manager reference
     * @param {FirebaseManager} firebaseManager - The Firebase manager instance
     */
    setFirebaseManager(firebaseManager) {
        this.firebaseManager = firebaseManager;
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
            
            // Adjust grid spacing based on zoom level to prevent too many dots
            let adjustedGridSpacing = this.gridSpacing;
            if (this.viewport.scale < 0.5) {
                // Double the grid spacing when zoomed out
                adjustedGridSpacing = this.gridSpacing * 2;
                
                // For very low zoom levels, increase spacing even more
                if (this.viewport.scale < 0.3) {
                    adjustedGridSpacing = this.gridSpacing * 4;
                }
            }
            
            // Draw grid dots
            for (let x = startX; x <= endX; x += adjustedGridSpacing) {
                for (let y = startY; y <= endY; y += adjustedGridSpacing) {
                    // Draw a small dot
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, this.gridDotSize, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        } else {
            // Draw grid dots with default spacing
            for (let x = startX; x <= endX; x += this.gridSpacing) {
                for (let y = startY; y <= endY; y += this.gridSpacing) {
                    // Draw a small dot
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, this.gridDotSize, 0, Math.PI * 2);
                    this.ctx.fill();
                }
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
     * Render the canvas
     */
    render() {
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Apply viewport transformation
        this.viewport.applyTransform(this.ctx);
        
        // Draw grid
        this.drawGrid();
        
        // Sort elements by z-index
        const sortedElements = [...this.elements].sort((a, b) => a.zIndex - b.zIndex);
        
        // Draw elements
        for (const element of sortedElements) {
            if (!element.visible) continue;
            
            // Apply animations and effects
            const isAnimated = element.applyNewElementAnimation(this.ctx);
            const isHighlighted = element.applyOwnerHighlighting(this.ctx);
            
            // Render the element
            element.render(this.ctx);
            
            // Restore context after effects
            element.restoreAfterHighlighting(this.ctx, isHighlighted);
            element.restoreAfterAnimation(this.ctx, isAnimated);
            
            // Draw selection indicators if element is selected
            if (this.selectedElement === element) {
                this.drawSelectionIndicators(element);
            }
        }
        
        // Restore the canvas transformation
        this.viewport.restoreTransform(this.ctx);
        
        // Reset render flag
        this.needsRender = false;
    }
    
    /**
     * Draw selection indicators around an element
     * @param {Object} element - The element to draw selection indicators for
     */
    drawSelectionIndicators(element) {
        if (!this.ctx) return;
        
        const boundingBox = element.getBoundingBox();
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
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
        
        // Corner handles - larger on mobile
        const handleSize = isMobile ? 14 : 8;
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
        
        // Draw rotation indicators at each corner
        const rotationIndicatorDistance = isMobile ? 25 : 15;
        const cornerPositions = [
            { x: boundingBox.x, y: boundingBox.y, label: 'tl' },
            { x: boundingBox.x + boundingBox.width, y: boundingBox.y, label: 'tr' },
            { x: boundingBox.x, y: boundingBox.y + boundingBox.height, label: 'bl' },
            { x: boundingBox.x + boundingBox.width, y: boundingBox.y + boundingBox.height, label: 'br' }
        ];
        
        // Draw small curved lines at each corner to indicate rotation
        this.ctx.strokeStyle = 'rgba(237, 104, 43, 0.6)'; // Semi-transparent orange
        this.ctx.lineWidth = isMobile ? 2.5 : 1.5;
        
        cornerPositions.forEach(corner => {
            // Draw a small arc to indicate rotation
            this.ctx.beginPath();
            
            // Determine the start and end angles based on which corner
            let startAngle, endAngle;
            
            switch(corner.label) {
                case 'tl':
                    startAngle = Math.PI;
                    endAngle = 1.5 * Math.PI;
                    break;
                case 'tr':
                    startAngle = 1.5 * Math.PI;
                    endAngle = 2 * Math.PI;
                    break;
                case 'bl':
                    startAngle = 0.5 * Math.PI;
                    endAngle = Math.PI;
                    break;
                case 'br':
                    startAngle = 0;
                    endAngle = 0.5 * Math.PI;
                    break;
            }
            
            this.ctx.arc(corner.x, corner.y, rotationIndicatorDistance, startAngle, endAngle);
            this.ctx.stroke();
            
            // On mobile, add a visible rotation handle at the end of each arc
            if (isMobile) {
                const handleRadius = 12;
                let handleX, handleY;
                
                // Calculate position for the rotation handle
                switch(corner.label) {
                    case 'tl':
                        handleX = corner.x - rotationIndicatorDistance;
                        handleY = corner.y - rotationIndicatorDistance;
                        break;
                    case 'tr':
                        handleX = corner.x + rotationIndicatorDistance;
                        handleY = corner.y - rotationIndicatorDistance;
                        break;
                    case 'bl':
                        handleX = corner.x - rotationIndicatorDistance;
                        handleY = corner.y + rotationIndicatorDistance;
                        break;
                    case 'br':
                        handleX = corner.x + rotationIndicatorDistance;
                        handleY = corner.y + rotationIndicatorDistance;
                        break;
                }
                
                // Draw the rotation handle
                this.ctx.beginPath();
                this.ctx.arc(handleX, handleY, handleRadius / 2, 0, 2 * Math.PI);
                this.ctx.fillStyle = '#ED682B';
                this.ctx.fill();
                this.ctx.strokeStyle = '#FFFFFF';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }
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
     * Add element
     * @param {CanvasElement} element - The element to add
     */
    addElement(element) {
        // Add element to array
        this.elements.push(element);
        
        // If it's an image element with a data URL, upload it to Firebase Storage
        if (element.type === 'image' && this.firebaseManager && !element.isStorageUrl) {
            // Upload the image to Firebase Storage
            element.uploadToFirebaseIfNeeded(this.firebaseManager).then(() => {
                // Update the element in Firebase if it's already synced
                if (this.isSyncing && element.isSynced && element.firebaseId) {
                    this.updateElementInFirebase(element);
                }
            });
        }
        
        // Save element to Firebase if syncing is enabled
        if (this.isSyncing && this.firebaseManager && !element.isSynced) {
            this.saveElementToFirebase(element);
        }
        
        // Request render
        this.requestRender();
    }
    
    /**
     * Remove element
     * @param {CanvasElement} element - The element to remove
     */
    removeElement(element) {
        // Find element index
        const index = this.elements.indexOf(element);
        if (index !== -1) {
            // Remove element from array
            this.elements.splice(index, 1);
            
            // Delete element from Firebase if syncing is enabled
            if (this.isSyncing && this.firebaseManager && element.firebaseId) {
                this.deleteElementFromFirebase(element);
            }
            
            // Request render
            this.requestRender();
        }
    }
    
    /**
     * Start syncing elements with Firebase
     * @param {boolean} useViewportLoading - Whether to use viewport-based loading
     */
    startSyncingElements(useViewportLoading = true) {
        if (!this.firebaseManager || this.isSyncing) return;
        
        this.isSyncing = true;
        
        // Use viewport-based loading if enabled
        if (useViewportLoading && this.viewport) {
            this.setupViewportBasedLoading();
        } else {
            // Traditional full loading
            this.unsubscribeElementListener = this.firebaseManager.listenForElementChanges(
                this.handleElementChanges.bind(this)
            );
        }
        
        console.log('Started syncing elements with Firebase');
    }
    
    /**
     * Set up viewport-based loading
     */
    setupViewportBasedLoading() {
        // Initial viewport query
        this.queryElementsInViewport();
        
        // Set up viewport change listener
        this.viewportChangeHandler = this.handleViewportChange.bind(this);
        this.viewport.addChangeListener(this.viewportChangeHandler);
    }
    
    /**
     * Handle viewport change for viewport-based loading
     */
    handleViewportChange() {
        // Throttle viewport queries to avoid excessive Firestore reads
        if (!this._throttledViewportQuery) {
            this._throttledViewportQuery = this.throttleViewportQuery();
        }
        
        this._throttledViewportQuery();
    }
    
    /**
     * Throttle viewport queries
     * @returns {Function} - Throttled function
     */
    throttleViewportQuery() {
        let timeout;
        let lastQueryTime = 0;
        const throttleDelay = 500; // ms
        
        return () => {
            const now = Date.now();
            const timeSinceLastQuery = now - lastQueryTime;
            
            // Clear any existing timeout
            if (timeout) {
                clearTimeout(timeout);
            }
            
            // If we've waited long enough, query immediately
            if (timeSinceLastQuery >= throttleDelay) {
                lastQueryTime = now;
                this.queryElementsInViewport();
            } else {
                // Otherwise, set a timeout for the remaining time
                timeout = setTimeout(() => {
                    lastQueryTime = Date.now();
                    this.queryElementsInViewport();
                }, throttleDelay - timeSinceLastQuery);
            }
        };
    }
    
    /**
     * Query elements in the current viewport
     */
    async queryElementsInViewport() {
        if (!this.firebaseManager || !this.viewport) return;
        
        try {
            // Calculate viewport bounds with padding
            const padding = 500; // Add padding around viewport to preload nearby elements
            const bounds = this.getViewportBounds(padding);
            
            // Unsubscribe from previous listener if exists
            if (this.unsubscribeElementListener) {
                this.unsubscribeElementListener();
            }
            
            // Set up new listener with viewport bounds
            this.unsubscribeElementListener = this.firebaseManager.listenForElementsInViewport(
                bounds,
                this.handleElementChanges.bind(this)
            );
            
            console.log('Queried elements in viewport:', bounds);
        } catch (error) {
            console.error('Error querying elements in viewport:', error);
        }
    }
    
    /**
     * Get the current viewport bounds with padding
     * @param {number} padding - Padding to add around viewport
     * @returns {Object} - Viewport bounds
     */
    getViewportBounds(padding = 0) {
        // Get viewport dimensions
        const viewportWidth = this.canvas.width / this.viewport.scale;
        const viewportHeight = this.canvas.height / this.viewport.scale;
        
        // Calculate bounds with padding
        return {
            minX: this.viewport.x - padding,
            minY: this.viewport.y - padding,
            maxX: this.viewport.x + viewportWidth + padding,
            maxY: this.viewport.y + viewportHeight + padding
        };
    }
    
    /**
     * Handle element changes from Firebase
     * @param {Array} elements - Array of all current elements
     * @param {Object} changes - Object containing added, modified, and removed elements
     */
    handleElementChanges(elements, changes) {
        // Process added elements
        if (changes.added && changes.added.length > 0) {
            for (const elementData of changes.added) {
                // Create element from Firebase data
                this.createElementFromFirebase(elementData)
                    .then(element => {
                        if (element) {
                            // Mark as new for animation
                            element.isNew = true;
                            element.animationStartTime = Date.now();
                            
                            // Add to elements array
                            this.elements.push(element);
                            
                            // Request render
                            this.requestRender();
                        }
                    })
                    .catch(error => {
                        console.error('Error creating element from Firebase:', error);
                    });
            }
        }
        
        // Process modified elements
        if (changes.modified && changes.modified.length > 0) {
            for (const elementData of changes.modified) {
                // Find existing element
                const existingElement = this.getElementById(elementData.id);
                
                if (existingElement) {
                    // Update element from Firebase data
                    this.updateElementFromFirebase(existingElement, elementData);
                    
                    // Request render
                    this.requestRender();
                }
            }
        }
        
        // Process removed elements
        if (changes.removed && changes.removed.length > 0) {
            for (const elementData of changes.removed) {
                // Find existing element
                const existingElement = this.getElementById(elementData.id);
                
                if (existingElement) {
                    // Remove element from array
                    const index = this.elements.indexOf(existingElement);
                    if (index !== -1) {
                        this.elements.splice(index, 1);
                    }
                    
                    // Request render
                    this.requestRender();
                }
            }
        }
        
        // Notify element change listeners
        this.notifyElementChangeListeners(this.elements, changes);
    }
    
    /**
     * Create an element from Firebase data
     * @param {Object} elementData - Element data from Firebase
     * @returns {Promise<CanvasElement|null>} - Created element or null if creation failed
     */
    async createElementFromFirebase(elementData) {
        try {
            if (!this.firebaseManager) {
                console.error('FirebaseManager not set, cannot create element from Firebase data');
                return null;
            }
            
            // Get element properties
            const properties = elementData.properties;
            
            // Use FirebaseManager to deserialize the element
            const element = await this.firebaseManager.deserializeElement(properties, elementData.type);
            
            if (!element) {
                console.error('Failed to deserialize element:', elementData);
                return null;
            }
            
            // Set Firebase ID and sync status
            element.firebaseId = elementData.id;
            element.isSynced = true;
            
            // Set attribution information
            element.createdBy = elementData.createdBy || 'anonymous';
            element.createdAt = elementData.createdAt?.toMillis() || Date.now();
            element.updatedBy = elementData.updatedBy || elementData.createdBy || 'anonymous';
            element.updatedAt = elementData.lastModified?.toMillis() || elementData.createdAt?.toMillis() || Date.now();
            
            return element;
        } catch (error) {
            console.error('Error creating element from Firebase data:', error);
            return null;
        }
    }
    
    /**
     * Update an element from Firebase data
     * @param {CanvasElement} element - The element to update
     * @param {Object} elementData - Element data from Firebase
     */
    updateElementFromFirebase(element, elementData) {
        try {
            // Get element properties
            const properties = elementData.properties;
            
            // Update element with properties
            element.update(properties);
            
            // Update attribution information
            if (elementData.updatedBy) {
                element.updatedBy = elementData.updatedBy;
            }
            if (elementData.lastModified) {
                element.updatedAt = elementData.lastModified.toMillis();
            }
            
            // Mark as synced
            element.isSynced = true;
            
            // Request render
            this.requestRender();
        } catch (error) {
            console.error('Error updating element from Firebase data:', error);
        }
    }
    
    /**
     * Get element by ID
     * @param {string} id - The element ID
     * @returns {CanvasElement|null} - The element or null if not found
     */
    getElementById(id) {
        return this.elements.find((element) => element.id === id || element.firebaseId === id);
    }
    
    /**
     * Save element to Firebase
     * @param {CanvasElement} element - The element to save
     */
    async saveElementToFirebase(element) {
        try {
            if (!this.firebaseManager) return;
            
            // Set created by if not set
            if (!element.createdBy && this.firebaseManager.getCurrentUser()) {
                element.createdBy = this.firebaseManager.getCurrentUser().uid;
                element.createdAt = Date.now();
            }
            
            // Set updated by
            element.updatedBy = this.firebaseManager.getCurrentUser() ? 
                this.firebaseManager.getCurrentUser().uid : 'anonymous';
            element.updatedAt = Date.now();
            
            // Save element to Firebase
            const firebaseId = await this.firebaseManager.saveElement(element);
            
            // Update element with Firebase ID
            element.update({
                firebaseId,
                isSynced: true
            });
            
            console.log('Element saved to Firebase:', firebaseId);
        } catch (error) {
            console.error('Error saving element to Firebase:', error);
        }
    }
    
    /**
     * Update element in Firebase
     * @param {CanvasElement} element - The element to update
     */
    async updateElementInFirebase(element) {
        try {
            if (!this.firebaseManager || !element.firebaseId) return;
            
            // Set updated by
            element.updatedBy = this.firebaseManager.getCurrentUser() ? 
                this.firebaseManager.getCurrentUser().uid : 'anonymous';
            element.updatedAt = Date.now();
            
            // Update element in Firebase
            await this.firebaseManager.updateElement(element.firebaseId, element);
            
            console.log('Element updated in Firebase:', element.firebaseId);
        } catch (error) {
            console.error('Error updating element in Firebase:', error);
        }
    }
    
    /**
     * Delete element from Firebase
     * @param {CanvasElement} element - The element to delete
     */
    async deleteElementFromFirebase(element) {
        try {
            if (!this.firebaseManager || !element.firebaseId) return;
            
            // Delete element from Firebase
            await this.firebaseManager.deleteElement(element.firebaseId);
            
            console.log('Element deleted from Firebase:', element.firebaseId);
        } catch (error) {
            console.error('Error deleting element from Firebase:', error);
        }
    }
    
    /**
     * Stop syncing elements with Firebase
     */
    stopSyncingElements() {
        if (!this.isSyncing) return;
        
        // Unsubscribe from element changes
        if (this.unsubscribeElementListener) {
            this.unsubscribeElementListener();
            this.unsubscribeElementListener = null;
        }
        
        // Remove viewport change listener if exists
        if (this.viewport && this.viewportChangeHandler) {
            this.viewport.removeChangeListener(this.viewportChangeHandler);
            this.viewportChangeHandler = null;
        }
        
        this.isSyncing = false;
        
        console.log('Stopped syncing elements with Firebase');
    }
    
    /**
     * Add an element change listener
     * @param {Function} listener - The listener function
     */
    addElementChangeListener(listener) {
        if (typeof listener === 'function' && !this.elementChangeListeners.includes(listener)) {
            this.elementChangeListeners.push(listener);
        }
    }
    
    /**
     * Remove an element change listener
     * @param {Function} listener - The listener function to remove
     */
    removeElementChangeListener(listener) {
        const index = this.elementChangeListeners.indexOf(listener);
        if (index !== -1) {
            this.elementChangeListeners.splice(index, 1);
        }
    }
    
    /**
     * Notify all element change listeners
     * @param {Array} elements - Array of elements
     * @param {Object} changes - Object with added, modified, and removed elements
     */
    notifyElementChangeListeners(elements, changes) {
        this.elementChangeListeners.forEach(listener => {
            try {
                listener(elements, changes);
            } catch (error) {
                console.error('Error in element change listener:', error);
            }
        });
    }
} 