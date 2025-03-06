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
        
        // Make the canvas manager available globally for hit detection
        // This allows elements to access the viewport scale in their containsPoint methods
        window.canvasManager = this;
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
        
        // Add viewport change listener to request render when viewport changes
        this.setupViewportChangeListener();
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
                
                if (this.viewport.scale < 0.15) {
                    adjustedGridSpacing = this.gridSpacing * 8;
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
        
        // Fill with background color
        this.ctx.fillStyle = this.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid
        this.drawGrid();
        
        // Apply viewport transformation
        this.viewport.applyTransform(this.ctx);
        
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
        
        // Make the canvas manager available globally for hit detection
        // This allows elements to access the viewport scale in their containsPoint methods
        window.canvasManager = this;
        
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
        // At low zoom levels, increase the priority difference to make selection more predictable
        let typePriority = {
            'sticky-note': 3,
            'text': 2,
            'image': 1,
            'drawing': 0
        };
        
        // At very low zoom levels, increase the priority difference to make selection more predictable
        if (this.viewport && this.viewport.scale <= 0.5) {
            // Increase the priority gap between different element types at low zoom levels
            typePriority = {
                'sticky-note': 6,
                'text': 4,
                'image': 2,
                'drawing': 0
            };
        }
        
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
     * Get element by ID
     * @param {string} id - The ID of the element to find
     * @returns {CanvasElement|null} - The element with the given ID or null if not found
     */
    getElementById(id) {
        if (!id) {
            console.warn('[CANVAS] Cannot find element with null or undefined ID');
            return null;
        }
        
        // Find element by ID or firebaseId
        return this.elements.find(element => 
            element.id === id || element.firebaseId === id
        );
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
        
        console.log('[CANVAS] Adding element to canvas:', {
            elementType: element.type,
            elementId: element.id,
            hasFirebaseManager: !!this.firebaseManager,
            isImageElement: element.type === 'image',
            isStorageUrl: element.isStorageUrl,
            hasUploadMethod: typeof element.uploadToFirebaseIfNeeded === 'function',
            isSyncing: this.isSyncing
        });
        
        // If it's an image element with a data URL, upload it to Firebase Storage
        if (element.type === 'image' && this.firebaseManager && !element.isStorageUrl) {
            console.log('[CANVAS] Image element detected, attempting to upload to Firebase Storage');
            
            // Check if the uploadToFirebaseIfNeeded method exists
            if (typeof element.uploadToFirebaseIfNeeded !== 'function') {
                console.error('[CANVAS] Error: uploadToFirebaseIfNeeded method not found on image element', element);
                // Still try to save the element
                if (this.isSyncing && this.firebaseManager && !element.isSynced) {
                    console.log('[CANVAS] Saving element to Firebase despite missing upload method');
                    this.saveElementToFirebase(element);
                }
                return;
            }
            
            // Upload the image to Firebase Storage before saving to Firestore
            (async () => {
                try {
                    // Try to upload the image, but don't wait too long
                    const uploadPromise = element.uploadToFirebaseIfNeeded(this.firebaseManager);
                    
                    // Create a timeout promise
                    const timeoutPromise = new Promise(resolve => {
                        setTimeout(() => {
                            console.log('[CANVAS] Upload timeout reached, proceeding with save anyway');
                            resolve(false);
                        }, 10000); // 10 second timeout
                    });
                    
                    // Race the upload against the timeout
                    const uploadSuccess = await Promise.race([uploadPromise, timeoutPromise]);
                    
                    console.log('[CANVAS] Image upload to Firebase Storage completed', {
                        elementId: element.id,
                        isStorageUrl: element.isStorageUrl,
                        uploadSuccess: uploadSuccess,
                        isSynced: element.isSynced,
                        firebaseId: element.firebaseId
                    });
                    
                    // Now save to Firestore after the upload is complete (or timed out)
                    if (this.isSyncing && this.firebaseManager && !element.isSynced) {
                        console.log('[CANVAS] Saving image element to Firebase after upload attempt');
                        await this.saveElementToFirebase(element);
                    }
                    
                    // Update the element in Firebase if it's already synced
                    if (this.isSyncing && element.isSynced && element.firebaseId) {
                        console.log('[CANVAS] Updating element in Firebase after upload attempt');
                        await this.updateElementInFirebase(element);
                    }
                } catch (error) {
                    console.error('[CANVAS] Error in image upload process:', {
                        errorMessage: error.message,
                        errorName: error.name,
                        elementId: element.id
                    });
                    
                    // Still try to save to Firestore even if upload fails
                    if (this.isSyncing && this.firebaseManager && !element.isSynced) {
                        console.log('[CANVAS] Saving element to Firebase despite upload failure');
                        await this.saveElementToFirebase(element);
                    }
                }
            })();
        } else if (element.type === 'image') {
            console.log('[CANVAS] Image element not uploaded to Firebase Storage', {
                hasFirebaseManager: !!this.firebaseManager,
                isStorageUrl: element.isStorageUrl
            });
            
            // Save non-upload image elements to Firestore
            if (this.isSyncing && this.firebaseManager && !element.isSynced) {
                console.log('[CANVAS] Saving image element to Firebase (no upload needed)');
                this.saveElementToFirebase(element);
            }
        } else {
            // Save non-image elements to Firestore
            if (this.isSyncing && this.firebaseManager && !element.isSynced) {
                console.log('[CANVAS] Saving non-image element to Firebase');
                this.saveElementToFirebase(element);
            } else {
                console.log('[CANVAS] Not saving element to Firebase', {
                    isSyncing: this.isSyncing,
                    hasFirebaseManager: !!this.firebaseManager,
                    isSynced: element.isSynced
                });
            }
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
    async startSyncingElements(useViewportLoading = false) {
        if (!this.firebaseManager) {
            console.error('[CANVAS] FirebaseManager not set, cannot sync elements');
            return;
        }
        
        console.log('[CANVAS] Starting element synchronization with Firebase');
        
        // Clean up any existing listeners
        this.stopSyncingElements();
        
        // Set syncing flag and track viewport loading setting
        this.isSyncing = true;
        this.isUsingViewportLoading = useViewportLoading;
        
        try {
            if (useViewportLoading) {
                // Use viewport-based loading
                console.log('[CANVAS] Using viewport-based element loading');
                this.setupViewportBasedLoading();
            } else {
                // Load all elements at once
                console.log('[CANVAS] Loading all elements at once');
                
                try {
                    // Call the async method to get the unsubscribe function directly
                    console.log('[CANVAS] Calling listenForElementChanges...');
                    
                    // Make sure we properly await the Promise
                    const unsubscribe = await this.firebaseManager.listenForElementChanges(
                        this.handleElementChanges.bind(this)
                    );
                    
                    // Log the type of the returned value for debugging
                    console.log('[CANVAS] listenForElementChanges returned:', typeof unsubscribe, unsubscribe);
                    
                    // Check if unsubscribe is a function
                    if (typeof unsubscribe === 'function') {
                        this.unsubscribeElementListener = unsubscribe;
                        console.log('[CANVAS] Element listener set up successfully');
                    } else {
                        console.error('[CANVAS] Failed to set up element listener - Unsubscribe is not a function:', unsubscribe);
                        // Create a fallback unsubscribe function to prevent errors
                        this.unsubscribeElementListener = () => {
                            console.log('[CANVAS] Called fallback unsubscribe function');
                        };
                        this.isSyncing = false;
                    }
                } catch (listenerError) {
                    console.error('[CANVAS] Error setting up element listener:', listenerError);
                    // Create a fallback unsubscribe function to prevent errors
                    this.unsubscribeElementListener = () => {
                        console.log('[CANVAS] Called fallback unsubscribe function after error');
                    };
                    this.isSyncing = false;
                }
            }
        } catch (error) {
            console.error('[CANVAS] Error starting element synchronization:', error);
            this.isSyncing = false;
        }
    }
    
    /**
     * Set up viewport-based loading
     */
    setupViewportBasedLoading() {
        if (!this.viewport) {
            console.error('[CANVAS] Cannot set up viewport-based loading - Viewport not set');
            return;
        }
        
        if (!this.firebaseManager) {
            console.error('[CANVAS] Cannot set up viewport-based loading - FirebaseManager not set');
            return;
        }
        
        console.log('[CANVAS] Setting up viewport-based element loading');
        
        // Initial viewport query
        this.queryElementsInViewport();
        
        // Set up viewport change listener
        this.viewportChangeHandler = this.handleViewportChange.bind(this);
        this.viewport.addChangeListener(this.viewportChangeHandler);
        
        console.log('[CANVAS] Viewport change listener set up for element loading');
        
        // Set syncing flag
        this.isSyncing = true;
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
        if (!this.firebaseManager || !this.viewport) {
            console.error('[CANVAS] Cannot query elements in viewport - Missing FirebaseManager or Viewport');
            return;
        }
        
        try {
            // Calculate viewport bounds with padding
            const padding = 500; // Add padding around viewport to preload nearby elements
            const bounds = this.getViewportBounds(padding);
            
            console.log('[CANVAS] Querying elements in viewport with bounds:', bounds);
            
            // Unsubscribe from previous listener if exists
            if (this.unsubscribeElementListener) {
                if (typeof this.unsubscribeElementListener === 'function') {
                    console.log('[CANVAS] Unsubscribing from previous viewport element listener');
                    this.unsubscribeElementListener();
                } else {
                    console.warn('[CANVAS] Previous unsubscribeElementListener is not a function:', this.unsubscribeElementListener);
                }
            }
            
            // Set up new listener with viewport bounds
            try {
                console.log('[CANVAS] Setting up new viewport element listener...');
                
                // Make sure we properly await the Promise
                const unsubscribe = await this.firebaseManager.listenForElementsInViewport(
                    bounds,
                    this.handleElementChanges.bind(this)
                );
                
                // Log the type of the returned value for debugging
                console.log('[CANVAS] listenForElementsInViewport returned:', typeof unsubscribe, unsubscribe);
                
                // Check if unsubscribe is a function
                if (typeof unsubscribe === 'function') {
                    this.unsubscribeElementListener = unsubscribe;
                    console.log('[CANVAS] New viewport element listener set up successfully');
                } else {
                    console.error('[CANVAS] Failed to set up viewport element listener - Unsubscribe is not a function:', unsubscribe);
                    // Create a fallback unsubscribe function to prevent errors
                    this.unsubscribeElementListener = () => {
                        console.log('[CANVAS] Called fallback viewport unsubscribe function');
                    };
                }
            } catch (listenerError) {
                console.error('[CANVAS] Error setting up viewport element listener:', listenerError);
                // Create a fallback unsubscribe function to prevent errors
                this.unsubscribeElementListener = () => {
                    console.log('[CANVAS] Called fallback viewport unsubscribe function after error');
                };
            }
            
            console.log('[CANVAS] Queried elements in viewport:', bounds);
        } catch (error) {
            console.error('[CANVAS] Error querying elements in viewport:', error);
        }
    }
    
    /**
     * Get the current viewport bounds with padding
     * @param {number} padding - Padding to add around viewport
     * @returns {Object} - Viewport bounds
     */
    getViewportBounds(padding = 0) {
        if (!this.viewport || !this.canvas) {
            console.error('[CANVAS] Cannot get viewport bounds - Missing viewport or canvas');
            // Return a default bounds object to prevent errors
            return { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };
        }
        
        try {
            // Get viewport dimensions
            const viewportWidth = this.canvas.width / this.viewport.scale;
            const viewportHeight = this.canvas.height / this.viewport.scale;
            
            // Calculate bounds with padding
            const bounds = {
                minX: this.viewport.x - padding,
                minY: this.viewport.y - padding,
                maxX: this.viewport.x + viewportWidth + padding,
                maxY: this.viewport.y + viewportHeight + padding
            };
            
            // Log the calculated bounds for debugging
            console.log('[CANVAS] Calculated viewport bounds:', 
                `X: ${bounds.minX.toFixed(0)} to ${bounds.maxX.toFixed(0)}, ` +
                `Y: ${bounds.minY.toFixed(0)} to ${bounds.maxY.toFixed(0)}, ` +
                `Width: ${(bounds.maxX - bounds.minX).toFixed(0)}, ` +
                `Height: ${(bounds.maxY - bounds.minY).toFixed(0)}, ` +
                `Scale: ${this.viewport.scale.toFixed(2)}`
            );
            
            return bounds;
        } catch (error) {
            console.error('[CANVAS] Error calculating viewport bounds:', error);
            // Return a default bounds object to prevent errors
            return { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };
        }
    }
    
    /**
     * Handle element changes from Firebase
     * @param {Array} elements - Array of all current elements
     * @param {Object} changes - Object containing added, modified, and removed elements
     */
    handleElementChanges(elements, changes) {
        if (!changes) {
            console.error('[CANVAS] Received null or undefined changes object');
            return;
        }
        
        try {
            // Process added elements
            if (changes.added && Array.isArray(changes.added) && changes.added.length > 0) {
                console.log(`[CANVAS] Received ${changes.added.length} new elements from Firebase`);
                
                // Count element types for logging
                const elementTypes = {};
                changes.added.forEach(el => {
                    if (!el) return;
                    const type = el.type || 'unknown';
                    elementTypes[type] = (elementTypes[type] || 0) + 1;
                });
                
                // Log element types
                Object.entries(elementTypes).forEach(([type, count]) => {
                    console.log(`[CANVAS] Received ${count} new ${type} elements`);
                });
                
                // Process elements in batches to avoid blocking the UI
                const processBatch = async (batch, index) => {
                    console.log(`[CANVAS] Processing batch ${index + 1}/${Math.ceil(changes.added.length / 10)}`);
                    
                    for (const elementData of batch) {
                        if (!elementData || !elementData.id) {
                            console.warn('[CANVAS] Skipping invalid element data:', elementData);
                            continue;
                        }
                        
                        try {
                            // Check if element already exists
                            const existingElement = this.getElementById(elementData.id);
                            if (existingElement) {
                                console.log(`[CANVAS] Element already exists, updating instead - ID: ${elementData.id}`);
                                // Update existing element instead of creating a new one
                                this.firebaseManager.deserializeElement(elementData, elementData.type)
                                    .then(updatedElement => {
                                        if (updatedElement) {
                                            const elementDataWithProperties = {
                                                ...elementData,
                                                properties: updatedElement
                                            };
                                            this.updateElementFromFirebase(existingElement, elementDataWithProperties);
                                        }
                                    })
                                    .catch(error => {
                                        console.error(`[CANVAS] Error deserializing element - ID: ${elementData.id}`, error);
                                    });
                                continue;
                            }
                            
                            // Also check by element ID (not just Firebase ID)
                            // This helps prevent duplicates when elements are moved
                            const elementWithSameId = this.elements.find(el => 
                                el.id === elementData.id || 
                                (elementData.properties && el.id === elementData.properties.id)
                            );
                            
                            if (elementWithSameId) {
                                console.log(`[CANVAS] Element with same ID exists, updating instead - ID: ${elementData.id}`);
                                // Update the element's Firebase ID to ensure proper tracking
                                elementWithSameId.firebaseId = elementData.id;
                                
                                // Update existing element instead of creating a new one
                                this.firebaseManager.deserializeElement(elementData, elementData.type)
                                    .then(updatedElement => {
                                        if (updatedElement) {
                                            const elementDataWithProperties = {
                                                ...elementData,
                                                properties: updatedElement
                                            };
                                            this.updateElementFromFirebase(elementWithSameId, elementDataWithProperties);
                                        }
                                    })
                                    .catch(error => {
                                        console.error(`[CANVAS] Error deserializing element - ID: ${elementData.id}`, error);
                                    });
                                continue;
                            }
                            
                            // Create element from Firebase data
                            const element = await this.createElementFromFirebase(elementData);
                            
                            if (element) {
                                // Mark as new for animation
                                element.isNew = true;
                                element.animationStartTime = Date.now();
                                
                                // Add to elements array
                                this.elements.push(element);
                                
                                if (element.type === 'drawing') {
                                    console.log(`✅ DRAWING SYNC: Created drawing element - ID: ${element.id}, Points: ${element.points?.length || 0}`);
                                }
                            }
                        } catch (error) {
                            console.error(`❌ SYNC: Error creating element - ID: ${elementData.id}`, error);
                        }
                    }
                    
                    // Request render after each batch
                    this.requestRender();
                    
                    // Process next batch if there are more
                    const nextIndex = index + 1;
                    const nextBatch = changes.added.slice(nextIndex * 10, (nextIndex + 1) * 10);
                    
                    if (nextBatch.length > 0) {
                        // Use setTimeout to avoid blocking the UI
                        setTimeout(() => processBatch(nextBatch, nextIndex), 0);
                    } else {
                        console.log(`[CANVAS] Finished processing all ${changes.added.length} new elements`);
                    }
                };
                
                // Start processing the first batch
                const firstBatch = changes.added.slice(0, 10);
                processBatch(firstBatch, 0);
            }
            
            // Process modified elements
            if (changes.modified && Array.isArray(changes.modified) && changes.modified.length > 0) {
                console.log(`[CANVAS] Received ${changes.modified.length} modified elements from Firebase`);
                
                // Process modified elements
                for (const elementData of changes.modified) {
                    if (!elementData || !elementData.id) {
                        console.warn('[CANVAS] Skipping invalid modified element data:', elementData);
                        continue;
                    }
                    
                    // Find the existing element
                    const existingElement = this.getElementById(elementData.id);
                    
                    if (existingElement) {
                        // Deserialize the element data
                        this.firebaseManager.deserializeElement(elementData, elementData.type)
                            .then(updatedElement => {
                                if (updatedElement) {
                                    // Ensure the element data has properties
                                    const elementDataWithProperties = {
                                        ...elementData,
                                        properties: updatedElement
                                    };
                                    
                                    // Update the existing element with the new properties
                                    const updateSuccess = this.updateElementFromFirebase(existingElement, elementDataWithProperties);
                                    
                                    if (updateSuccess) {
                                        // Request render after successful update
                                        this.requestRender();
                                    }
                                }
                            })
                            .catch(error => {
                                console.error(`❌ SYNC: Error deserializing modified element - ID: ${elementData.id}`, error);
                            });
                    } else {
                        console.log(`[CANVAS] Element not found for modification, creating new - ID: ${elementData.id}`);
                        // Element doesn't exist, create it
                        this.createElementFromFirebase(elementData)
                            .then(element => {
                                if (element) {
                                    this.elements.push(element);
                                    this.requestRender();
                                }
                            })
                            .catch(error => {
                                console.error(`❌ SYNC: Error creating missing modified element - ID: ${elementData.id}`, error);
                            });
                    }
                }
            }
            
            // Process removed elements
            if (changes.removed && Array.isArray(changes.removed) && changes.removed.length > 0) {
                console.log(`[CANVAS] Received ${changes.removed.length} removed elements from Firebase`);
                
                for (const elementData of changes.removed) {
                    if (!elementData || !elementData.id) {
                        console.warn('[CANVAS] Skipping invalid removed element data:', elementData);
                        continue;
                    }
                    
                    // Find existing element
                    const existingElement = this.getElementById(elementData.id);
                    
                    if (existingElement) {
                        console.log(`[CANVAS] Removing element - Type: ${existingElement.type}, ID: ${existingElement.id}`);
                        
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
        } catch (error) {
            console.error('[CANVAS] Error handling element changes:', error);
        }
    }
    
    /**
     * Create an element from Firebase data
     * @param {Object} elementData - Element data from Firebase
     * @returns {Promise<CanvasElement|null>} - Created element or null if creation failed
     */
    async createElementFromFirebase(elementData) {
        try {
            if (!elementData) {
                console.error('[CANVAS] Cannot create element from null or undefined data');
                return null;
            }
            
            if (!elementData.id) {
                console.error('[CANVAS] Cannot create element without an ID:', elementData);
                return null;
            }
            
            if (!elementData.type) {
                console.error('[CANVAS] Cannot create element without a type:', elementData);
                return null;
            }
            
            if (!this.firebaseManager) {
                console.error('[CANVAS] FirebaseManager not set, cannot create element from Firebase data');
                return null;
            }
            
            // Check if element already exists
            const existingElement = this.getElementById(elementData.id);
            if (existingElement) {
                console.log(`[CANVAS] Element already exists with ID: ${elementData.id}, updating instead of creating`);
                // Update the existing element instead
                this.updateElementFromFirebase(existingElement, elementData);
                return existingElement;
            }
            
            // Special logging for drawing elements
            if (elementData.type === 'drawing') {
                const pointCount = elementData.properties?.points?.length || 0;
                console.log(`✏️ DRAWING SYNC: Processing drawing element from Firebase - ID: ${elementData.id}, Points: ${pointCount}`);
            }
            // Special logging for text elements
            else if (elementData.type === 'text') {
                console.log(`📝 TEXT SYNC: Received text element from Firebase - ID: ${elementData.id}`);
                if (elementData.properties) {
                    console.log(`📝 TEXT SYNC: Text content: "${elementData.properties.text || ''}"`);
                    console.log(`📝 TEXT SYNC: Position: (${elementData.properties.x?.toFixed(2) || 0}, ${elementData.properties.y?.toFixed(2) || 0})`);
                } else {
                    console.warn(`⚠️ TEXT SYNC: Text element missing properties - ID: ${elementData.id}`);
                }
            } else {
                console.log('[CANVAS] Creating element from Firebase data:', {
                    elementId: elementData.id,
                    elementType: elementData.type,
                    hasProperties: !!elementData.properties
                });
            }
            
            // Use FirebaseManager to deserialize the element
            const element = await this.firebaseManager.deserializeElement(elementData, elementData.type);
            
            if (!element) {
                console.error(`❌ SYNC: Failed to deserialize element - ID: ${elementData.id}, Type: ${elementData.type || 'unknown'}`);
                return null;
            }
            
            // Set the Firebase ID
            element.firebaseId = elementData.id;
            
            // Set the element ID to match the Firebase ID
            element.id = elementData.id;
            
            // Mark as synced
            element.isSynced = true;
            
            // Log success
            console.log(`✅ SYNC: Successfully created element - Type: ${element.type}, ID: ${element.id}`);
            
            return element;
        } catch (error) {
            console.error(`❌ SYNC: Error creating element from Firebase data:`, error, elementData);
            return null;
        }
    }
    
    /**
     * Update an element from Firebase data
     * @param {CanvasElement} element - The element to update
     * @param {Object} elementData - Element data from Firebase
     * @returns {boolean} - Whether the update was successful
     */
    updateElementFromFirebase(element, elementData) {
        try {
            if (!element) {
                console.error('[CANVAS] Cannot update null or undefined element');
                return false;
            }
            
            if (!elementData) {
                console.error('[CANVAS] Cannot update element with null or undefined data');
                return false;
            }
            
            if (!elementData.id) {
                console.error('[CANVAS] Cannot update element without an ID:', elementData);
                return false;
            }
            
            // Skip updates for elements that are currently being dragged locally
            if (element.isBeingDragged) {
                console.log(`[CANVAS] Skipping Firebase update for element that is being dragged locally - ID: ${element.id}`);
                return false;
            }
            
            // Ensure element IDs match
            if (element.id !== elementData.id && element.firebaseId !== elementData.id) {
                console.error(`[CANVAS] Element ID mismatch - Element ID: ${element.id}, Firebase ID: ${element.firebaseId}, Data ID: ${elementData.id}`);
                return false;
            }
            
            // Get element properties
            let properties = elementData.properties;
            
            if (!properties) {
                console.warn(`⚠️ SYNC: Missing properties in element data - ID: ${elementData.id}`);
                
                // Try to use the elementData itself as properties
                console.log(`🔄 SYNC: Attempting to use element data as properties - ID: ${elementData.id}`);
                
                // Check if elementData has the necessary fields to be used as properties
                if (elementData.type || (element && element.type)) {
                    properties = { ...elementData };
                    
                    // Ensure the properties have the correct type
                    properties.type = properties.type || (element ? element.type : 'unknown');
                    
                    // For drawing elements, ensure points exist
                    if (properties.type === 'drawing' && !properties.points && element && element.points) {
                        properties.points = [...element.points];
                        console.log(`✏️ DRAWING SYNC: Using existing points - Count: ${properties.points.length}`);
                    }
                    
                    console.log(`✅ SYNC: Created properties from element data - ID: ${elementData.id}`);
                } else {
                    console.error(`❌ SYNC: Insufficient data to update element - ID: ${elementData.id}`);
                    return false;
                }
            }
            
            // Ensure properties is an object
            if (typeof properties !== 'object' || properties === null) {
                console.error(`❌ SYNC: Properties is not an object - ID: ${elementData.id}, Type: ${typeof properties}`);
                return false;
            }
            
            // Special handling for image elements to preserve aspect ratio
            if (element.type === 'image') {
                console.log(`🖼️ IMAGE SYNC: Updating image element from Firebase - ID: ${element.id}`);
                
                // Validate image properties to prevent data loss
                if (!properties.src && element.src) {
                    console.warn(`🖼️ IMAGE SYNC: Missing source in update, keeping existing source - ID: ${element.id}`);
                    properties.src = element.src;
                }
                
                // Don't allow empty sources unless explicitly intended
                if (properties.src === '') {
                    console.warn(`🖼️ IMAGE SYNC: Empty source in update, this may cause issues - ID: ${element.id}`);
                    
                    // If we have a valid existing source, keep it
                    if (element.src && element.src !== '') {
                        console.log(`🖼️ IMAGE SYNC: Keeping existing valid source - ID: ${element.id}`);
                        properties.src = element.src;
                    }
                }
                
                // Ensure dimensions are valid
                if (properties.width !== undefined && (properties.width <= 0 || isNaN(properties.width))) {
                    console.warn(`🖼️ IMAGE SYNC: Invalid width in update, using default - ID: ${element.id}`);
                    properties.width = element.width || 200;
                }
                
                if (properties.height !== undefined && (properties.height <= 0 || isNaN(properties.height))) {
                    console.warn(`🖼️ IMAGE SYNC: Invalid height in update, using default - ID: ${element.id}`);
                    properties.height = element.height || 200;
                }
                
                // If only one dimension is provided, calculate the other based on aspect ratio
                if ((properties.width !== undefined && properties.height === undefined) || 
                    (properties.height !== undefined && properties.width === undefined)) {
                    
                    // Use the aspect ratio from the element or calculate it
                    const aspectRatio = (element.originalWidth && element.originalHeight) ? 
                        (element.originalWidth / element.originalHeight) : 
                        (element.width / element.height);
                    
                    if (properties.width !== undefined && properties.height === undefined) {
                        properties.height = properties.width / aspectRatio;
                        console.log(`🖼️ IMAGE SYNC: Calculated height based on aspect ratio - Width: ${properties.width}, Height: ${properties.height}, Ratio: ${aspectRatio}`);
                    } else if (properties.height !== undefined && properties.width === undefined) {
                        properties.width = properties.height * aspectRatio;
                        console.log(`🖼️ IMAGE SYNC: Calculated width based on aspect ratio - Width: ${properties.width}, Height: ${properties.height}, Ratio: ${aspectRatio}`);
                    }
                }
                
                // Ensure original dimensions are preserved
                if (properties.originalWidth === undefined && element.originalWidth) {
                    properties.originalWidth = element.originalWidth;
                }
                if (properties.originalHeight === undefined && element.originalHeight) {
                    properties.originalHeight = element.originalHeight;
                }
                
                // If aspect ratio is missing, calculate it
                if (properties.aspectRatio === undefined) {
                    const originalWidth = properties.originalWidth || element.originalWidth || properties.width || element.width;
                    const originalHeight = properties.originalHeight || element.originalHeight || properties.height || element.height;
                    
                    if (originalWidth && originalHeight) {
                        properties.aspectRatio = originalWidth / originalHeight;
                        console.log(`🖼️ IMAGE SYNC: Calculated aspect ratio - Ratio: ${properties.aspectRatio}`);
                    }
                }
                
                // Position updates for image elements
                if (properties.x !== undefined && properties.y !== undefined) {
                    console.log(`🖼️ IMAGE SYNC: Position update - ID: ${element.id}, Old: (${element.x?.toFixed(2) || 0}, ${element.y?.toFixed(2) || 0}), New: (${properties.x.toFixed(2)}, ${properties.y.toFixed(2)})`);
                }
            }
            // Special logging for drawing elements
            else if (element.type === 'drawing') {
                const oldPointCount = element.points ? element.points.length : 0;
                const newPointCount = properties.points ? properties.points.length : 0;
                
                console.log(`✏️ DRAWING SYNC: Updating drawing element from Firebase - ID: ${element.id}, Firebase ID: ${element.firebaseId || 'none'}`);
                console.log(`✏️ DRAWING SYNC: Points update - Old: ${oldPointCount}, New: ${newPointCount}`);
                
                if (properties.x !== undefined && properties.y !== undefined) {
                    console.log(`✏️ DRAWING SYNC: Position update - Old: (${element.x?.toFixed(2) || 0}, ${element.y?.toFixed(2) || 0}), New: (${properties.x.toFixed(2)}, ${properties.y.toFixed(2)})`);
                }
            }
            // Special logging for text elements
            else if (element.type === 'text') {
                console.log(`📝 TEXT SYNC: Updating text element from Firebase - ID: ${element.id}, Firebase ID: ${element.firebaseId || 'none'}`);
                
                // Validate text properties to prevent data loss
                if (properties.text === undefined && element.text !== undefined) {
                    console.warn(`📝 TEXT SYNC: Missing text content in update, keeping existing content - ID: ${element.id}, Text: "${element.text}"`);
                    properties.text = element.text;
                } else if (properties.text === '') {
                    console.warn(`📝 TEXT SYNC: Empty text content in update - ID: ${element.id}`);
                    
                    // If we have existing text content, keep it
                    if (element.text) {
                        console.log(`📝 TEXT SYNC: Keeping existing non-empty text content - ID: ${element.id}, Text: "${element.text}"`);
                        properties.text = element.text;
                    }
                }
                
                // Ensure font properties are preserved
                if (properties.fontSize === undefined && element.fontSize !== undefined) {
                    properties.fontSize = element.fontSize;
                }
                if (properties.fontFamily === undefined && element.fontFamily !== undefined) {
                    properties.fontFamily = element.fontFamily;
                }
                if (properties.color === undefined && element.color !== undefined) {
                    properties.color = element.color;
                }
                if (properties.align === undefined && element.align !== undefined) {
                    properties.align = element.align;
                }
                if (properties.bold === undefined && element.bold !== undefined) {
                    properties.bold = element.bold;
                }
                if (properties.italic === undefined && element.italic !== undefined) {
                    properties.italic = element.italic;
                }
                if (properties.underline === undefined && element.underline !== undefined) {
                    properties.underline = element.underline;
                }
                if (properties.opacity === undefined && element.opacity !== undefined) {
                    properties.opacity = element.opacity;
                }
                
                if (properties.text !== undefined && properties.text !== element.text) {
                    console.log(`📝 TEXT SYNC: Text content changed - Old: "${element.text || ''}", New: "${properties.text}"`);
                }
                
                if (properties.x !== undefined && properties.y !== undefined) {
                    console.log(`📝 TEXT SYNC: Position update - Old: (${element.x?.toFixed(2) || 0}, ${element.y?.toFixed(2) || 0}), New: (${properties.x.toFixed(2)}, ${properties.y.toFixed(2)})`);
                }
            }
            // Position updates for other element types
            else if (properties.x !== undefined && properties.y !== undefined) {
                console.log(`📥 SYNC: Position update - ID: ${element.id}, Old: (${element.x?.toFixed(2) || 0}, ${element.y?.toFixed(2) || 0}), New: (${properties.x.toFixed(2)}, ${properties.y.toFixed(2)})`);
            }
            
            try {
                // Update the element with the new properties
                element.update(properties);
                
                // Ensure the element has the correct Firebase ID
                if (elementData.id && (!element.firebaseId || element.firebaseId !== elementData.id)) {
                    element.firebaseId = elementData.id;
                    console.log(`[CANVAS] Updated element Firebase ID - ID: ${element.id}, Firebase ID: ${element.firebaseId}`);
                }
                
                // Mark as synced
                element.isSynced = true;
                
                // Log successful update
                if (element.type === 'drawing') {
                    console.log(`✅ DRAWING SYNC: Drawing element successfully updated from Firebase - ID: ${element.id}, Points: ${element.points?.length || 0}`);
                } else if (element.type === 'text') {
                    console.log(`✅ TEXT SYNC: Text element successfully updated from Firebase - ID: ${element.id}`);
                } else {
                    console.log(`✅ SYNC: Element successfully updated from Firebase - Type: ${element.type}, ID: ${element.id}`);
                }
                
                return true;
            } catch (updateError) {
                console.error(`❌ SYNC: Error in element.update() - ID: ${element.id}`, updateError);
                return false;
            }
        } catch (error) {
            console.error(`❌ SYNC: Error updating element from Firebase data - ID: ${elementData?.id || 'unknown'}:`, error);
            return false;
        }
    }
    
    /**
     * Save element to Firebase
     * @param {CanvasElement} element - The element to save
     * @returns {Promise<string|null>} - The Firebase document ID or null if save failed
     */
    async saveElementToFirebase(element) {
        if (!this.firebaseManager) {
            console.error('FirebaseManager not set, cannot save element to Firebase');
            return null;
        }
        
        try {
            console.log(`[CANVAS] Saving element to Firebase - Type: ${element.type}, ID: ${element.id}`);
            
            // Save the element to Firebase
            const firebaseId = await this.firebaseManager.saveElement(element);
            
            if (firebaseId) {
                // Update the element with the Firebase ID
                element.firebaseId = firebaseId;
                element.isSynced = true;
                
                console.log(`[CANVAS] Element saved to Firebase - ID: ${element.id}, Firebase ID: ${firebaseId}`);
                return firebaseId;
            } else {
                console.error(`[CANVAS] Failed to save element to Firebase - ID: ${element.id}`);
                return null;
            }
        } catch (error) {
            console.error('Error saving element to Firebase:', error);
            return null;
        }
    }
    
    /**
     * Update element in Firebase
     * @param {CanvasElement} element - The element to update
     * @param {boolean} positionUpdateOnly - Whether this is just a position update
     * @returns {Promise<void>}
     */
    async updateElementInFirebase(element, positionUpdateOnly = false) {
        try {
            if (!element) {
                console.error('[CANVAS] Cannot update null or undefined element in Firebase');
                return false;
            }
            
            if (!this.firebaseManager) {
                console.error('[CANVAS] FirebaseManager not set, cannot update element in Firebase');
                return false;
            }
            
            if (!element.firebaseId) {
                console.log('Element has no Firebase ID, saving as new element instead', element);
                // If the element doesn't have a Firebase ID, save it as a new element
                return await this.saveElementToFirebase(element);
            }
            
            // For image elements, ensure we're not doing a position-only update
            // This ensures all image properties are included in the update
            if (element.type === 'image') {
                if (positionUpdateOnly) {
                    console.log(`🖼️ IMAGE SYNC: Converting position-only update to full update for image element - ID: ${element.id}`);
                    // We'll still use the special image handling in FirebaseManager.serializeElement
                }
                
                // Verify the image has a valid source before updating
                if (!element.src || element.src === '') {
                    console.warn(`🖼️ IMAGE SYNC: Image has empty source, this may cause issues - ID: ${element.id}`);
                }
            }
            // Special handling for text elements to ensure text content is preserved
            else if (element.type === 'text') {
                // Log the text element being updated
                console.log(`📝 TEXT UPDATE: Updating text element in Firebase - ID: ${element.id}, Text: "${element.text || ''}"`);
                
                // Validate text content
                if (!element.text && element.text !== '') {
                    console.warn(`⚠️ TEXT UPDATE: Text element has undefined text content - ID: ${element.id}`);
                    
                    // Try to find the element in the elements array to get its text content
                    const existingElement = this.getElementById(element.id);
                    if (existingElement && existingElement.type === 'text' && existingElement.text) {
                        element.text = existingElement.text;
                        console.log(`📝 TEXT UPDATE: Using existing text content - ID: ${element.id}, Text: "${element.text}"`);
                    } else {
                        // Set to empty string as fallback
                        element.text = '';
                        console.warn(`⚠️ TEXT UPDATE: Setting empty text content as fallback - ID: ${element.id}`);
                    }
                }
                
                // Force positionUpdateOnly to false for text elements to ensure all properties are included
                if (positionUpdateOnly) {
                    console.log(`📝 TEXT UPDATE: Overriding positionUpdateOnly to include text content - ID: ${element.id}`);
                    positionUpdateOnly = false;
                }
            }
            
            console.log(`[CANVAS] Updating element in Firebase - Type: ${element.type}, ID: ${element.id}, Firebase ID: ${element.firebaseId}, Position update only: ${positionUpdateOnly}`);
            
            // Update the element in Firebase using its Firebase ID
            const success = await this.firebaseManager.updateElement(element.firebaseId, element, positionUpdateOnly);
            
            if (success) {
                // Mark the element as synced
                element.isSynced = true;
                
                // Log success
                if (element.type === 'text') {
                    console.log(`✅ TEXT UPDATE: Successfully updated text element in Firebase - ID: ${element.id}, Text: "${element.text || ''}"`);
                } else {
                    console.log(`✅ SYNC: Successfully updated element in Firebase - ID: ${element.id}`);
                }
                
                return true;
            } else {
                console.error(`❌ SYNC: Failed to update element in Firebase - ID: ${element.id}`);
                return false;
            }
        } catch (error) {
            console.error(`❌ SYNC: Error updating element in Firebase:`, error, element);
            return false;
        }
    }
    
    /**
     * Delete element from Firebase
     * @param {CanvasElement} element - The element to delete
     */
    async deleteElementFromFirebase(element) {
        if (!this.firebaseManager) {
            console.error('FirebaseManager not set, cannot delete element from Firebase');
            return;
        }
        
        try {
            // Delete the element from Firebase
            await this.firebaseManager.deleteElement(element.firebaseId);
            
            console.log(`[CANVAS] Element removed from Firebase - ID: ${element.id}`);
        } catch (error) {
            console.error('Error deleting element from Firebase:', error);
        }
    }
    
    /**
     * Add an element change listener
     * @param {Function} listener - The listener function
     */
    addElementChangeListener(listener) {
        if (typeof listener === 'function' && !this.elementChangeListeners.includes(listener)) {
            console.log('[CANVAS] Adding element change listener');
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
            console.log('[CANVAS] Removing element change listener');
            this.elementChangeListeners.splice(index, 1);
        }
    }
    
    /**
     * Notify element change listeners
     * @param {Array} elements - Array of all current elements
     * @param {Object} changes - Object containing added, modified, and removed elements
     */
    notifyElementChangeListeners(elements, changes) {
        console.log(`[CANVAS] Notifying ${this.elementChangeListeners.length} element change listeners`, {
            elementsCount: elements.length,
            added: changes.added.length,
            modified: changes.modified.length,
            removed: changes.removed.length
        });
        
        this.elementChangeListeners.forEach(listener => {
            try {
                listener(elements, changes);
            } catch (error) {
                console.error('[CANVAS] Error in element change listener:', error);
            }
        });
    }
    
    /**
     * Set up viewport change listener for rendering
     */
    setupViewportChangeListener() {
        if (!this.viewport) return;
        
        // Remove existing render listener if any
        if (this.viewportRenderListener) {
            this.viewport.removeChangeListener(this.viewportRenderListener);
        }
        
        // Create a new listener that requests a render
        this.viewportRenderListener = () => {
            console.log('[CANVAS] Viewport changed, requesting render');
            this.requestRender();
        };
        
        // Add the listener to the viewport
        this.viewport.addChangeListener(this.viewportRenderListener);
        
        console.log('[CANVAS] Viewport change listener set up for rendering');
    }
    
    /**
     * Stop syncing elements with Firebase
     */
    stopSyncingElements() {
        // Unsubscribe from element changes
        if (this.unsubscribeElementListener) {
            console.log('[CANVAS] Unsubscribing from element listener');
            
            // Check if it's a function before calling it
            if (typeof this.unsubscribeElementListener === 'function') {
                this.unsubscribeElementListener();
            } else {
                console.warn('[CANVAS] unsubscribeElementListener is not a function:', this.unsubscribeElementListener);
            }
            
            this.unsubscribeElementListener = null;
        }
        
        // Remove viewport change listener if exists
        if (this.viewport && this.viewportChangeHandler) {
            console.log('[CANVAS] Removing viewport change listener');
            this.viewport.removeChangeListener(this.viewportChangeHandler);
            this.viewportChangeHandler = null;
        }
        
        // Remove viewport render listener if exists
        if (this.viewport && this.viewportRenderListener) {
            console.log('[CANVAS] Removing viewport render listener');
            this.viewport.removeChangeListener(this.viewportRenderListener);
            this.viewportRenderListener = null;
        }
        
        // Clear syncing flag
        this.isSyncing = false;
        
        console.log('[CANVAS] Stopped syncing elements with Firebase');
    }
    
    /**
     * Restart Firebase synchronization if it fails
     * This method can be called when elements disappear or when there are issues with Firebase listeners
     */
    restartFirebaseSynchronization() {
        console.log('[CANVAS] Restarting Firebase synchronization...');
        
        // Stop any existing synchronization
        this.stopSyncingElements();
        
        // Wait a moment before restarting
        setTimeout(() => {
            // Start synchronization again with the same viewport loading setting
            this.startSyncingElements(this.isUsingViewportLoading);
            console.log('[CANVAS] Firebase synchronization restarted');
        }, 1000);
    }
}