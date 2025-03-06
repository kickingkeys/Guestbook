// Import necessary modules
import { CanvasManager } from './canvas/CanvasManager.js';
import { Viewport } from './canvas/Viewport.js';
import { ToolManager } from './tools/ToolManager.js';
import { ModeManager } from './utils/ModeManager.js';
import { SelectionManager } from './utils/SelectionManager.js';
import { FirebaseManager } from './firebase/FirebaseManager.js';
import { UserPresence } from './firebase/UserPresence.js';
import { ElementAttribution } from './components/ElementAttribution.js';
import { NetworkStatus } from './components/NetworkStatus.js';
import { LoadingState } from './components/LoadingState.js';
import { WelcomeOverlay } from './components/WelcomeOverlay.js';
import { ErrorToast } from './components/ErrorToast.js';
import { SavingIndicator } from './components/SavingIndicator.js';

// Main application class
class App {
    constructor() {
        // Initialize managers
        this.viewport = new Viewport();
        this.canvasManager = new CanvasManager('main-canvas');
        this.modeManager = new ModeManager();
        
        // Set viewport reference in canvas manager
        this.canvasManager.setViewport(this.viewport);
        
        // Initialize selection manager
        this.selectionManager = new SelectionManager(this.canvasManager);
        
        // Initialize tool manager with canvas manager and selection manager
        this.toolManager = new ToolManager(this.canvasManager, this.selectionManager);
        
        // Set tool manager reference in canvas manager
        this.canvasManager.setToolManager(this.toolManager);
        
        // Initialize Firebase manager
        this.firebaseManager = new FirebaseManager();
        
        this.canvasManager.setFirebaseManager(this.firebaseManager);
        // Initialize user presence
        this.userPresence = new UserPresence(this.firebaseManager);
        
        // Initialize element attribution
        this.elementAttribution = new ElementAttribution(this.firebaseManager);
        
        // Initialize network status
        this.networkStatus = new NetworkStatus(this.firebaseManager);
        
        // Initialize loading state
        this.loadingState = new LoadingState();
        
        // Pan and zoom state tracking
        this.isPanning = false;
        this.isSpacebarDown = false;
        
        // Zoom indicator fade timeout
        this.zoomFadeTimeout = null;
        
        // Cursor update throttling
        this.cursorUpdateTimeout = null;
        
        // Element hover tracking
        this.hoveredElement = null;
        this.hoverTimeout = null;
        
        // Initialize new components
        this.welcomeOverlay = new WelcomeOverlay();
        this.errorToast = new ErrorToast();
        this.savingIndicator = new SavingIndicator();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize the application
        this.init();
    }
    
    async init() {
        // Initialize canvas with grid pattern
        this.canvasManager.init();
        
        // Set default mode
        this.modeManager.setMode('navigation');
        
        // Set default tool to selection for both mobile and desktop
        const isMobile = window.innerWidth <= 768;
        this.selectTool('selection'); // Always use selection tool as default
        
        // Set up canvas click handler for direct selection
        this.setupDirectSelection();
        
        // Initialize UI elements
        this.updateZoomIndicator();
        
        // Initialize element attribution
        this.elementAttribution.initialize();
        
        // Initialize new components
        this.welcomeOverlay.initialize();
        this.errorToast.initialize();
        this.savingIndicator.initialize();
        
        // Initialize Firebase integration
        await this.initializeFirebase();
        
        // Start the render loop
        this.startRenderLoop();
        
        // Initial toolbar position check
        this.updateToolbarPosition();
        
        // Ensure the current tool is not one of the disabled tools
        const disabledTools = ['hand', 'drawing'];
        const currentTool = this.toolManager.getCurrentTool();
        
        if (currentTool) {
            // Find the name of the current tool
            let currentToolName = null;
            for (const [name, tool] of Object.entries(this.toolManager.tools)) {
                if (tool === currentTool) {
                    currentToolName = name;
                    break;
                }
            }
            
            // If the current tool is disabled, switch to selection tool
            if (currentToolName && disabledTools.includes(currentToolName)) {
                console.log(`Current tool "${currentToolName}" is disabled, switching to selection tool`);
                this.selectTool('selection');
            }
        }
        
        console.log('Application initialized successfully.');
    }
    
    setupDirectSelection() {
        // Add click event listener to canvas for direct selection
        if (this.canvasManager && this.canvasManager.canvas) {
            this.canvasManager.canvas.addEventListener('click', (e) => {
                // Only handle selection if not in drawing mode
                if (!this.modeManager.isMode('drawing')) {
                    const element = this.canvasManager.getElementAtPosition(e.clientX, e.clientY);
                    if (element) {
                        this.selectElement(element);
                    } else {
                        this.deselectAllElements();
                    }
                }
            });
        }
    }
    
    selectElement(element) {
        console.log(`Selected element: ${element.id}`);
        
        // Use the selection manager to select the element
        this.selectionManager.selectElement(element);
        
        // Enter selection mode
        this.modeManager.setMode('selection');
    }
    
    deselectAllElements() {
        // Use the selection manager to clear the selection
        this.selectionManager.clearSelection();
    }
    
    setupEventListeners() {
        // Get canvas element
        const canvas = document.getElementById('main-canvas');
        if (!canvas) {
            console.error('Canvas element not found, cannot set up event listeners');
            return;
        }
        
        // Mouse wheel event for zooming
        canvas.addEventListener('wheel', this.handleWheel.bind(this));
        
        // Mouse events for panning and tool interactions
        canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        window.addEventListener('mousemove', this.handleMouseMove.bind(this));
        window.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        // Add beforeunload event to clean up resources
        window.addEventListener('beforeunload', () => {
            // Clean up user presence
            if (this.userPresence) {
                this.userPresence.cleanup();
            }
        });
        
        // Touch events for mobile panning and zooming
        canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
        // Keyboard events for spacebar panning and shortcuts
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Add visualViewport resize listener for mobile keyboard
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => {
                // Handle mobile keyboard resize issues
                this.handleMobileKeyboardResize();
            });
            
            // Also listen for scroll events on visualViewport
            window.visualViewport.addEventListener('scroll', () => {
                // Ensure we're at the top of the page
                if (window.scrollY !== 0) {
                    window.scrollTo(0, 0);
                }
            });
        }
        
        // Tool selection events
        const toolButtons = document.querySelectorAll('.tool-button');
        toolButtons.forEach(button => {
            const toolName = button.getAttribute('data-tool');
            
            // Remove the hand (move) tool from the toolbar
            if (toolName === 'hand') {
                button.style.display = 'none';
                return;
            }
            
            // Disable the drawing tool only (eraser is now enabled)
            if (toolName === 'draw') {
                button.classList.add('disabled');
                
                // Update tooltip to indicate the tool is disabled
                const originalTooltip = button.getAttribute('data-tooltip');
                button.setAttribute('data-tooltip', originalTooltip + ' (Disabled)');
                
                // Skip adding event listeners for disabled tools
                return;
            }
            
            // Add click event for desktop
            button.addEventListener('click', (e) => {
                const toolName = button.getAttribute('data-tool');
                
                // Prevent selecting disabled tools
                if (button.classList.contains('disabled')) {
                    return;
                }
                
                this.selectTool(this.mapLegacyToolName(toolName));
            });
            
            // Add touch events for mobile to improve responsiveness
            button.addEventListener('touchstart', (e) => {
                // Prevent default to avoid any scrolling/zooming
                e.preventDefault();
                
                // Don't add active-touch class to disabled tools
                if (button.classList.contains('disabled')) {
                    return;
                }
                
                button.classList.add('active-touch');
            });
            
            button.addEventListener('touchend', (e) => {
                // Prevent default to avoid any scrolling/zooming
                e.preventDefault();
                button.classList.remove('active-touch');
                
                // Prevent selecting disabled tools
                if (button.classList.contains('disabled')) {
                    return;
                }
                
                // Get the tool name and select it
                const toolName = button.getAttribute('data-tool');
                this.selectTool(this.mapLegacyToolName(toolName));
            });
        });
        
        // Window resize event
        window.addEventListener('resize', () => {
            // Resize canvas
            this.canvasManager.handleResize();
            
            // Update toolbar position for mobile
            this.updateToolbarPosition();
            
            // Handle mobile keyboard resize issues
            this.handleMobileKeyboardResize();
        });
        
        // Listen for mode changes
        this.modeManager.addEventListener('modeChange', (data) => {
            console.log(`Mode changed: ${data.previousMode} -> ${data.currentMode}`);
            // Update cursor or other UI elements based on mode
            this.updateCursor(data.currentMode);
        });
        
        // Listen for tool changes
        this.toolManager.addEventListener('toolChange', (data) => {
            console.log(`Tool changed to: ${data.tool}`);
            this.updateToolUI(data.tool);
            
            // Show/hide eraser-specific UI elements
            this.updateEraserUI(data.tool === 'eraser');
        });
        
        // Initial toolbar position check
        this.updateToolbarPosition();
    }
    
    /**
     * Map legacy tool names to new tool names
     * @param {string} legacyName - The legacy tool name
     * @returns {string} - The new tool name
     */
    mapLegacyToolName(legacyName) {
        const toolMap = {
            'draw': 'drawing',
            'sticky-note': 'sticky',
            'eraser': 'eraser',
            'image': 'image',
            'text': 'text',
            'selection': 'selection',
            'hand': 'hand'
        };
        
        return toolMap[legacyName] || legacyName;
    }
    
    /**
     * Update the UI to reflect the current tool
     * @param {string} toolName - The name of the current tool
     */
    updateToolUI(toolName) {
        // Map new tool names back to legacy names for UI
        const reverseToolMap = {
            'drawing': 'draw',
            'sticky': 'sticky-note',
            'eraser': 'eraser',
            'image': 'image',
            'text': 'text',
            'selection': 'selection',
            'hand': 'hand'
        };
        
        const uiToolName = reverseToolMap[toolName] || toolName;
        
        // Update tool buttons
        const toolButtons = document.querySelectorAll('.tool-button');
        toolButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-tool') === uiToolName) {
                btn.classList.add('active');
            }
        });
    }
    
    /**
     * Handle mouse wheel event for zooming
     * @param {WheelEvent} e - The wheel event
     */
    handleWheel(e) {
        e.preventDefault();
        
        // Calculate zoom factor based on wheel delta
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        
        // Get mouse position
        const rect = this.canvasManager.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Apply zoom at mouse position
        this.viewport.zoom(mouseX, mouseY, zoomFactor);
        
        // Update zoom indicator
        this.updateZoomIndicator();
        
        // Trigger a render
        this.canvasManager.render();
    }
    
    /**
     * Handle mouse down event for panning and tool interactions
     * @param {MouseEvent} e - The mouse event
     */
    handleMouseDown(e) {
        // Only start panning if spacebar is down or in navigation mode
        if (this.isSpacebarDown || this.modeManager.getMode() === 'navigation') {
            this.isPanning = true;
            
            // Get mouse position
            const rect = this.canvasManager.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Start panning from this position
            this.viewport.startPan(mouseX, mouseY);
            
            // Update cursor
            this.updateCursor(this.modeManager.getMode());
        } else {
            // Pass the event to the current tool
            this.toolManager.onMouseDown(e.clientX, e.clientY, e);
        }
    }
    
    /**
     * Handle mouse move event
     * @param {MouseEvent} e - The mouse event
     */
    handleMouseMove(e) {
        // Get mouse position
        const x = e.clientX;
        const y = e.clientY;
        
        // Check if mouse is over an element for attribution
        if (!this.isPanning && !this.isDrawing) {
            const element = this.canvasManager.getElementAtPosition(x, y);
            
            if (element) {
                // If hovering over a different element, clear previous timeout
                if (this.hoveredElement !== element) {
                    if (this.hoverTimeout) {
                        clearTimeout(this.hoverTimeout);
                    }
                    
                    // Set new hovered element
                    this.hoveredElement = element;
                    
                    // Show attribution after a delay
                    this.hoverTimeout = setTimeout(() => {
                        this.elementAttribution.showAttribution(element, x, y);
                    }, 500);
                }
            } else {
                // If not hovering over any element, clear timeout and hide attribution
                if (this.hoverTimeout) {
                    clearTimeout(this.hoverTimeout);
                    this.hoverTimeout = null;
                }
                
                if (this.hoveredElement) {
                    // Hide attribution
                    this.elementAttribution.hideAttribution();
                    
                    // Reset hovered element
                    this.hoveredElement = null;
                }
            }
        }
        
        // If panning, update viewport
        if (this.isPanning) {
            const dx = e.movementX;
            const dy = e.movementY;
            
            this.viewport.pan(dx, dy);
            this.canvasManager.requestRender();
        }
        
        // If a tool is active, delegate to tool manager
        if (this.toolManager.getCurrentTool()) {
            this.toolManager.onMouseMove(x, y, e);
        }
        
        // Update cursor
        this.updateCursor(this.modeManager.getMode());
    }
    
    /**
     * Handle mouse up event
     * @param {MouseEvent} e - The mouse event
     */
    handleMouseUp(e) {
        // End panning
        if (this.isPanning) {
            this.isPanning = false;
            
            // Update cursor
            this.updateCursor(this.modeManager.getMode());
        }
        
        // Hide attribution tooltip
        if (this.hoveredElement) {
            this.elementAttribution.hideAttribution();
            this.hoveredElement = null;
            
            if (this.hoverTimeout) {
                clearTimeout(this.hoverTimeout);
                this.hoverTimeout = null;
            }
        }
        
        // If a tool is active, delegate to tool manager
        if (this.toolManager.getCurrentTool()) {
            this.toolManager.onMouseUp(e.clientX, e.clientY, e);
        }
    }
    
    /**
     * Handle touch start event for mobile panning and zooming
     * @param {TouchEvent} e - The touch event
     */
    handleTouchStart(e) {
        // Check if we're in navigation mode, using a tool, or using two fingers (always allow panning with two fingers)
        if (this.isSpacebarDown || this.modeManager.getMode() === 'navigation' || e.touches.length === 2) {
            e.preventDefault();
            
            if (e.touches.length === 1) {
                // Single touch - start panning
                const touch = e.touches[0];
                const rect = this.canvasManager.canvas.getBoundingClientRect();
                const touchX = touch.clientX - rect.left;
                const touchY = touch.clientY - rect.top;
                
                this.isPanning = true;
                this.viewport.startPan(touchX, touchY);
                
                // Store initial touch position for panning
                this.lastTouchX = touch.clientX;
                this.lastTouchY = touch.clientY;
                
                // Update cursor
                this.updateCursor(this.modeManager.getMode());
            } else if (e.touches.length === 2) {
                // Two touches - prepare for pinch zoom
                this.isPanning = false;
                this.pinchStartDistance = this.getTouchDistance(e.touches);
                this.pinchStartCenter = this.getTouchCenter(e.touches);
                
                // Update cursor
                this.updateCursor(this.modeManager.getMode());
            }
        } else {
            // Pass the event to the current tool
            const touch = e.touches[0];
            const rect = this.canvasManager.canvas.getBoundingClientRect();
            const touchX = touch.clientX - rect.left;
            const touchY = touch.clientY - rect.top;
            
            // Store initial touch position for potential panning
            this.lastTouchX = touch.clientX;
            this.lastTouchY = touch.clientY;
            
            this.toolManager.onTouchStart(touchX, touchY, e);
        }
    }
    
    /**
     * Handle touch move event
     * @param {TouchEvent} e - The touch event
     */
    handleTouchMove(e) {
        // Prevent default scrolling behavior
        e.preventDefault();
        
        // Get primary touch
        const touch = e.touches[0];
        const x = touch.clientX;
        const y = touch.clientY;
        
        // Update user presence with throttled cursor position
        if (this.userPresence && !this.isPanning) {
            this.userPresence.updateCursorPosition(x, y);
        }
        
        // Handle multi-touch gestures
        if (e.touches.length >= 2) {
            // Hide attribution if showing
            if (this.hoveredElement) {
                this.elementAttribution.hideAttribution();
                this.hoveredElement = null;
                
                if (this.hoverTimeout) {
                    clearTimeout(this.hoverTimeout);
                    this.hoverTimeout = null;
                }
            }
            
            // Get the current touch points
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            
            // Calculate the current distance between touches
            const currentDistance = this.getTouchDistance(e.touches);
            
            // If we have a previous distance, calculate the scale factor
            if (this.previousTouchDistance) {
                const scaleFactor = currentDistance / this.previousTouchDistance;
                
                // Only zoom if the scale factor is significant
                if (Math.abs(scaleFactor - 1) > 0.01) {
                    // Calculate the center point between the two touches
                    const centerX = (touch1.clientX + touch2.clientX) / 2;
                    const centerY = (touch1.clientY + touch2.clientY) / 2;
                    
                    // Apply zoom
                    this.viewport.zoom(centerX, centerY, scaleFactor);
                    this.canvasManager.requestRender();
                    
                    // Update zoom indicator
                    this.updateZoomIndicator();
                }
            }
            
            // Store the current distance for the next move event
            this.previousTouchDistance = currentDistance;
        } else if (this.isPanning) {
            // Single touch panning
            const dx = touch.clientX - this.lastTouchX;
            const dy = touch.clientY - this.lastTouchY;
            
            this.viewport.pan(dx, dy);
            this.canvasManager.requestRender();
            
            this.lastTouchX = touch.clientX;
            this.lastTouchY = touch.clientY;
        } else if (e.touches.length === 1) {
            // Check if we should start panning with selection tool
            const currentTool = this.toolManager.getCurrentTool();
            const isSelectionTool = currentTool && currentTool.config && currentTool.config.name === 'selection';
            
            // Check if touch has moved significantly (to distinguish from a tap)
            const touchMoveDistance = Math.sqrt(
                Math.pow(touch.clientX - this.lastTouchX, 2) + 
                Math.pow(touch.clientY - this.lastTouchY, 2)
            );
            
            // If using selection tool and touch has moved significantly, start panning
            if (isSelectionTool && touchMoveDistance > 10 && !this.isDrawing) {
                // Check if we're not interacting with an element
                const element = this.canvasManager.getElementAtPosition(touch.clientX, touch.clientY);
                if (!element) {
                    this.isPanning = true;
                    this.viewport.startPan(touch.clientX, touch.clientY);
                    
                    // Hide attribution if showing
                    if (this.hoveredElement) {
                        this.elementAttribution.hideAttribution();
                        this.hoveredElement = null;
                        
                        if (this.hoverTimeout) {
                            clearTimeout(this.hoverTimeout);
                            this.hoverTimeout = null;
                        }
                    }
                }
            }
            
            // Check if touch is over an element for attribution (long press)
            if (!this.isPanning && !this.isDrawing) {
                const element = this.canvasManager.getElementAtPosition(x, y);
                
                if (element) {
                    // If hovering over a different element, clear previous timeout
                    if (this.hoveredElement !== element) {
                        if (this.hoverTimeout) {
                            clearTimeout(this.hoverTimeout);
                        }
                        
                        // Set new hovered element
                        this.hoveredElement = element;
                        
                        // Show attribution after a longer delay for mobile (800ms)
                        this.hoverTimeout = setTimeout(() => {
                            this.elementAttribution.showAttribution(element, x, y);
                        }, 800);
                    }
                } else {
                    // If not hovering over any element, clear timeout and hide attribution
                    if (this.hoverTimeout) {
                        clearTimeout(this.hoverTimeout);
                        this.hoverTimeout = null;
                    }
                    
                    if (this.hoveredElement) {
                        // Hide attribution
                        this.elementAttribution.hideAttribution();
                        
                        // Reset hovered element
                        this.hoveredElement = null;
                    }
                }
            }
        }
        
        // If a tool is active, delegate to tool manager
        if (this.toolManager.getCurrentTool() && !this.isPanning) {
            this.toolManager.onTouchMove(x, y, e);
        }
    }
    
    /**
     * Handle touch end event
     * @param {TouchEvent} e - The touch event
     */
    handleTouchEnd(e) {
        // Prevent default behavior
        e.preventDefault();
        
        // End panning
        if (this.isPanning) {
            this.isPanning = false;
        }
        
        // Reset pinch zoom tracking
        this.previousTouchDistance = null;
        
        // Hide attribution tooltip
        if (this.hoveredElement) {
            this.elementAttribution.hideAttribution();
            this.hoveredElement = null;
            
            if (this.hoverTimeout) {
                clearTimeout(this.hoverTimeout);
                this.hoverTimeout = null;
            }
        }
        
        // Get touch position (if any touches remain)
        let x = 0;
        let y = 0;
        
        if (e.changedTouches.length > 0) {
            const touch = e.changedTouches[0];
            x = touch.clientX;
            y = touch.clientY;
        }
        
        // If a tool is active, delegate to tool manager
        if (this.toolManager.getCurrentTool()) {
            this.toolManager.onTouchEnd(x, y, e);
        }
    }
    
    /**
     * Handle key down event for spacebar panning and shortcuts
     * @param {KeyboardEvent} e - The keyboard event
     */
    handleKeyDown(e) {
        // Pass the event to the tool manager for tool shortcuts
        this.toolManager.onKeyDown(e);
        
        if (e.code === 'Space' && !this.isSpacebarDown) {
            this.isSpacebarDown = true;
            
            // Update cursor to indicate panning is available
            this.updateCursor(this.modeManager.getMode());
        } else if (e.code === 'KeyR' && (e.ctrlKey || e.metaKey)) {
            // Ctrl+R or Cmd+R to reset viewport
            e.preventDefault(); // Prevent browser refresh
            this.resetViewport();
        } else if (e.code === 'Digit0' && (e.ctrlKey || e.metaKey)) {
            // Ctrl+0 or Cmd+0 to reset viewport
            e.preventDefault();
            this.resetViewport();
        } else if ((e.key === 'Delete' || e.key === 'Backspace') && 
                  !e.target.matches('input, textarea') && 
                  this.modeManager.getMode() === 'selection') {
            // Delete or Backspace to delete selected elements
            // Only if not typing in an input field and in selection mode
            e.preventDefault();
            this.selectionManager.deleteSelectedElements();
        }
    }
    
    /**
     * Handle key up event for spacebar panning
     * @param {KeyboardEvent} e - The keyboard event
     */
    handleKeyUp(e) {
        // Pass the event to the tool manager
        this.toolManager.onKeyUp(e);
        
        if (e.code === 'Space') {
            this.isSpacebarDown = false;
            
            // Reset cursor
            this.updateCursor(this.modeManager.getMode());
        }
    }
    
    /**
     * Calculate distance between two touch points
     * @param {TouchList} touches - The touch list
     * @returns {number} - The distance between touches
     */
    getTouchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Calculate center point between two touches
     * @param {TouchList} touches - The touch list
     * @returns {Object} - The center point {x, y}
     */
    getTouchCenter(touches) {
        const x = (touches[0].clientX + touches[1].clientX) / 2;
        const y = (touches[0].clientY + touches[1].clientY) / 2;
        return { x, y };
    }
    
    /**
     * Update cursor based on current mode
     * @param {string} mode - The current mode
     */
    updateCursor(mode) {
        if (!this.canvasManager || !this.canvasManager.canvas) return;
        
        // Remove all cursor-related classes
        this.canvasManager.canvas.classList.remove('can-pan', 'panning', 'drawing', 'creating');
        
        if (this.isPanning) {
            // Currently panning
            this.canvasManager.canvas.classList.add('panning');
            this.canvasManager.canvas.style.cursor = 'grabbing';
        } else if (this.isSpacebarDown) {
            // Spacebar is down, ready to pan
            this.canvasManager.canvas.classList.add('can-pan');
            this.canvasManager.canvas.style.cursor = 'grab';
        } else if (mode === 'navigation') {
            // Navigation mode
            this.canvasManager.canvas.classList.add('can-pan');
            this.canvasManager.canvas.style.cursor = 'grab';
        } else {
            // Get the current tool configuration
            const toolConfig = this.toolManager.getCurrentToolConfig();
            
            if (toolConfig) {
                // Set cursor based on tool configuration
                this.canvasManager.canvas.style.cursor = toolConfig.cursor;
                
                // Add appropriate class
                if (toolConfig.name === 'drawing' || toolConfig.name === 'eraser') {
                    this.canvasManager.canvas.classList.add('drawing');
                } else if (toolConfig.name === 'sticky' || toolConfig.name === 'text' || toolConfig.name === 'image') {
                    this.canvasManager.canvas.classList.add('creating');
                }
            } else {
                // Default cursor
                this.canvasManager.canvas.style.cursor = 'default';
            }
        }
    }
    
    updateToolbarPosition() {
        // Check if we're on mobile and update toolbar position if needed
        const isMobile = window.innerWidth <= 768;
        const toolbar = document.querySelector('.toolbar');
        
        if (toolbar) {
            // Get the current tool before potentially changing it
            const currentTool = this.toolManager.getCurrentTool();
            
            if (isMobile) {
                console.log('Mobile view detected - toolbar at bottom');
                // Only default to sticky if no tool is selected
                if (!currentTool) {
                    this.selectTool('sticky');
                }
            } else {
                console.log('Desktop view detected - toolbar at left');
                // Only default to drawing if no tool is selected
                if (!currentTool) {
                    this.selectTool('drawing');
                }
            }
            
            // Update the UI to reflect the current tool
            if (currentTool) {
                this.updateToolUI(currentTool);
            }
        }
    }
    
    startRenderLoop() {
        // Check if canvas manager is initialized
        if (!this.canvasManager || !this.canvasManager.ctx) {
            console.error('Canvas manager not properly initialized');
            return;
        }
        
        const render = () => {
            // Only render if no drag operation is in progress
            // This prevents the render loop from interfering with element movement
            // Check both mouse and touch interactions
            if (!this.selectionManager.isDragging && !this.selectionManager.isResizing) {
                // Clear canvas
                this.canvasManager.clear();
                
                // Draw grid
                this.canvasManager.drawGrid();
                
                // Render canvas elements
                this.canvasManager.render();
            } else {
                console.log('Skipping render during drag/resize operation');
            }
            
            // Render user cursors
            this.renderUserCursors(this.canvasManager.ctx);
            
            // Request next frame
            requestAnimationFrame(render);
        };
        
        // Start the render loop
        render();
        
        console.log('Render loop started.');
    }
    
    selectTool(toolName) {
        // Update tool manager with the new tool
        this.toolManager.setTool(toolName);
        
        // Update mode based on tool
        if (toolName === 'drawing' || toolName === 'eraser') {
            this.modeManager.setMode('drawing');
        } else if (toolName === 'selection') {
            this.modeManager.setMode('selection');
        } else if (toolName === 'hand') {
            this.modeManager.setMode('navigation');
        } else {
            this.modeManager.setMode('creation');
        }
        
        // Update cursor based on new mode
        this.updateCursor(this.modeManager.getMode());
    }
    
    updateMobileToolbarState(selectedTool) {
        // Map the new tool name to legacy tool name for UI
        const reverseToolMap = {
            'drawing': 'draw',
            'sticky': 'sticky-note',
            'eraser': 'eraser',
            'image': 'image',
            'text': 'text',
            'selection': 'selection',
            'hand': 'hand'
        };
        
        const uiToolName = reverseToolMap[selectedTool] || selectedTool;
        
        // Remove active class from all buttons first
        const toolButtons = document.querySelectorAll('.tool-button');
        toolButtons.forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active class to the selected button
        const selectedButton = document.querySelector(`.tool-button[data-tool="${uiToolName}"]`);
        if (selectedButton) {
            selectedButton.classList.add('active');
        }
    }
    
    /**
     * Update the zoom indicator with the current zoom level
     */
    updateZoomIndicator() {
        const zoomIndicator = document.querySelector('.zoom-indicator');
        const zoomValue = document.querySelector('.zoom-value');
        
        if (zoomIndicator && zoomValue) {
            // Calculate zoom percentage
            const zoomPercentage = Math.round(this.viewport.scale * 100);
            zoomValue.textContent = `${zoomPercentage}%`;
            
            // Remove fade class
            zoomIndicator.classList.remove('fade');
            
            // Clear any existing timeout
            if (this.zoomFadeTimeout) {
                clearTimeout(this.zoomFadeTimeout);
            }
            
            // Set timeout to fade the indicator after 2 seconds
            this.zoomFadeTimeout = setTimeout(() => {
                zoomIndicator.classList.add('fade');
            }, 2000);
        }
    }
    
    /**
     * Reset the viewport to its default state
     */
    resetViewport() {
        this.viewport.reset();
        this.updateZoomIndicator();
        this.canvasManager.render();
        console.log('Viewport reset to default state');
    }
    
    /**
     * Update eraser-specific UI elements
     * @param {boolean} isEraserActive - Whether the eraser tool is active
     */
    updateEraserUI(isEraserActive) {
        const eraserSizeIndicator = document.querySelector('.eraser-size-indicator');
        const eraserTooltip = document.querySelector('.eraser-tooltip');
        
        if (isEraserActive) {
            // Show eraser size indicator
            if (eraserSizeIndicator) {
                eraserSizeIndicator.classList.add('visible');
                
                // Update the size value
                const eraserTool = this.toolManager.tools['eraser'];
                if (eraserTool) {
                    const sizeValueElement = eraserSizeIndicator.querySelector('.eraser-size-value');
                    if (sizeValueElement) {
                        sizeValueElement.textContent = `${eraserTool.eraserSize}px`;
                    }
                }
            }
            
            // Show eraser tooltip briefly
            if (eraserTooltip) {
                eraserTooltip.classList.add('visible');
                setTimeout(() => {
                    eraserTooltip.classList.remove('visible');
                }, 3000); // Hide after 3 seconds
            }
        } else {
            // Hide eraser UI elements
            if (eraserSizeIndicator) {
                eraserSizeIndicator.classList.remove('visible');
            }
            if (eraserTooltip) {
                eraserTooltip.classList.remove('visible');
            }
        }
    }
    
    /**
     * Render user cursors
     * @param {CanvasRenderingContext2D} ctx - The canvas context
     */
    renderUserCursors(ctx) {
        if (!this.userPresence || !ctx) return;
        
        const onlineUsers = this.userPresence.getOnlineUsers();
        const currentUser = this.firebaseManager.getCurrentUser();
        
        onlineUsers.forEach((user) => {
            // Don't render current user's cursor
            if (currentUser && user.uid === currentUser.uid) return;
            
            // Get cursor position
            const { x, y } = user.cursorPosition || { x: 0, y: 0 };
            
            // Apply viewport transformation
            const screenX = (x - this.viewport.x) * this.viewport.scale;
            const screenY = (y - this.viewport.y) * this.viewport.scale;
            
            // Draw cursor
            ctx.save();
            ctx.fillStyle = user.color;
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1;
            
            // Draw cursor triangle
            ctx.beginPath();
            ctx.moveTo(screenX, screenY);
            ctx.lineTo(screenX + 15, screenY + 5);
            ctx.lineTo(screenX + 5, screenY + 15);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // Draw user name
            ctx.font = '16px Caveat, cursive';
            ctx.fillStyle = user.color;
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.strokeText(user.name, screenX + 15, screenY + 20);
            ctx.fillText(user.name, screenX + 15, screenY + 20);
            
            ctx.restore();
        });
    }
    
    /**
     * Initialize Firebase integration
     * @returns {Promise<void>}
     */
    async initializeFirebase() {
        // Show loading state
        this.loadingState.show(100);
        this.loadingState.updateMessage('Initializing Firebase...');
        
        try {
            if (!this.isInitialized) { 
            // Initialize Firebase
            await this.firebaseManager.initialize();
            this.loadingState.updateProgress(20);
            this.loadingState.updateMessage('Connecting to database...');
            
            // Initialize network status and add listener
            this.networkStatus.initialize();
            this.networkStatus.addListener(this.handleNetworkStatusChange.bind(this));
            this.loadingState.updateProgress(30);
            this.isInitialized = true;
            }
            // Initialize user presence
            try {
                await this.userPresence.initialize();
                this.loadingState.updateProgress(40);
            } catch (presenceError) {
                console.warn('User presence initialization failed:', presenceError);
                this.loadingState.updateProgress(40);
                // Continue anyway - presence is not critical
            }
            
            this.loadingState.updateMessage('Loading canvas elements...');
            
            // Setup element loading listener
            this.setupElementLoadingListener();
            
            // Start syncing elements with Firebase
            try {
                console.log('[APP] Starting element synchronization with full loading');
                await this.canvasManager.startSyncingElements(false); // Use full loading instead of viewport-based loading
                this.loadingState.updateProgress(60);
            } catch (syncError) {
                console.error('[APP] Element syncing failed:', syncError);
                this.loadingState.updateProgress(60);
                // Continue anyway - we can still use the app without syncing
            }
            
            // Setup online users UI
            this.setupOnlineUsersUI();
            this.loadingState.updateProgress(80);
            
            // Setup owner highlighting
            this.setupOwnerHighlighting();
            this.loadingState.updateProgress(90);
            
            // Complete loading
            this.loadingState.updateProgress(100);
            setTimeout(() => {
                this.loadingState.hide();
                
                // Show welcome overlay after loading
                setTimeout(() => {
                    this.welcomeOverlay.initialize();
                }, 500);
            }, 500);
            
        } catch (error) {
            console.error('Error initializing Firebase:', error);
            this.loadingState.updateMessage('Error connecting to Firebase. Please try again.');
            this.errorToast.show('Failed to connect to the guestbook. Please refresh the page.');
            
            // Hide loading state after a delay
            setTimeout(() => {
                this.loadingState.hide();
            }, 3000);
        }
    }
    
    /**
     * Set up element loading listener
     */
    setupElementLoadingListener() {
        // Create a listener for element changes
        const elementLoadingListener = (elements, changes) => {
            // Update loading progress based on elements loaded
            if (changes.added.length > 0) {
                this.loadingState.updateProgress(50 + Math.min(changes.added.length, 50));
                this.loadingState.updateMessage(`Loaded ${changes.added.length} elements`);
            }
            
            // If we have elements and no more are being added, complete loading
            if (elements.length > 0 && changes.added.length === 0) {
                this.loadingState.updateProgress(100);
                this.loadingState.updateMessage('Loading complete');
                
                // Remove the listener after initial load
                this.canvasManager.removeElementChangeListener(elementLoadingListener);
            }
        };
        
        // Add the listener
        this.canvasManager.addElementChangeListener(elementLoadingListener);
    }
    
    /**
     * Handle network status change
     * @param {Object} status - Network status object
     */
    handleNetworkStatusChange(status) {
        // Update body class for offline styling
        if (status.online === false) {
            document.body.classList.add('offline-mode');
        } else {
            document.body.classList.remove('offline-mode');
        }
        
        // Show error toast for connection issues
        if (status.online === false) {
            this.errorToast.show('You are offline. Changes will be saved when you reconnect.', 7000);
        } else if (status.firestoreConnected === false && status.online === true) {
            this.errorToast.show('Connection to the server is unstable. Trying to reconnect...', 5000);
        } else if (status.reconnected) {
            this.errorToast.show('Connected! Your changes have been saved.', 3000);
        }
    }
    
    /**
     * Set up online users UI
     */
    setupOnlineUsersUI() {
        // Remove any existing online status pill (if it exists from previous versions)
        const existingPill = document.querySelector('.online-status-pill');
        if (existingPill) {
            existingPill.remove();
        }
        
        // Create online users toggle button if it doesn't exist
        if (!document.querySelector('.online-users-toggle')) {
            const toggleButton = document.createElement('div');
            toggleButton.className = 'online-users-toggle';
            toggleButton.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="#333"/>
                </svg>
            `;
            document.querySelector('.canvas-container').appendChild(toggleButton);
            
            // Add click event listener to toggle button
            toggleButton.addEventListener('click', () => {
                const panel = document.querySelector('.online-users-panel');
                if (panel) {
                    panel.classList.toggle('visible');
                    toggleButton.classList.toggle('active');
                }
            });
        }
        
        // Create online users panel if it doesn't exist
        if (!document.querySelector('.online-users-panel')) {
            const panel = document.createElement('div');
            panel.className = 'online-users-panel';
            panel.innerHTML = `
                <div class="panel-header">
                    <h3>Online Users</h3>
                    <div class="panel-close">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="#333"/>
                        </svg>
                    </div>
                </div>
                <div class="users-list"></div>
                <div class="user-settings">
                    <input type="text" class="username-input" placeholder="Your name" value="${this.userPresence.getUserName()}">
                    <button class="update-name-button">Update</button>
                </div>
            `;
            
            document.querySelector('.canvas-container').appendChild(panel);
            
            // Add event listener for close button
            const closeButton = panel.querySelector('.panel-close');
            closeButton.addEventListener('click', () => {
                panel.classList.remove('visible');
                document.querySelector('.online-users-toggle').classList.remove('active');
            });
            
            // Add event listener for name update
            const updateButton = panel.querySelector('.update-name-button');
            const nameInput = panel.querySelector('.username-input');
            
            updateButton.addEventListener('click', () => {
                const newName = nameInput.value.trim();
                if (newName) {
                    this.userPresence.updateUserName(newName);
                    // Close the panel after updating the name
                    panel.classList.remove('visible');
                    document.querySelector('.online-users-toggle').classList.remove('active');
                }
            });
        }
        
        // Add listener for online users updates
        this.userPresence.addOnlineUsersListener(this.updateOnlineUsersUI.bind(this));
    }
    
    /**
     * Update online users UI
     * @param {Array} users - Array of online users
     */
    updateOnlineUsersUI(users) {
        const usersList = document.querySelector('.users-list');
        if (!usersList) return;
        
        // Clear existing users
        usersList.innerHTML = '';
        
        // Add users to list
        users.forEach((user) => {
            const userElement = document.createElement('div');
            userElement.className = 'user-item';
            userElement.innerHTML = `
                <div class="user-color" style="background-color: ${user.color}"></div>
                <div class="user-name">${user.name}</div>
            `;
            
            usersList.appendChild(userElement);
        });
    }
    
    /**
     * Setup owner highlighting for elements
     */
    setupOwnerHighlighting() {
        // Get current user ID
        const currentUserId = this.firebaseManager.getCurrentUser()?.uid;
        if (!currentUserId) return;
        
        // Add element change listener to highlight elements
        this.canvasManager.addElementChangeListener((elements, changes) => {
            // Process all elements to find ones created by the current user
            elements.forEach(element => {
                const isOwner = element.createdBy === currentUserId;
                element.setOwnerHighlight(isOwner);
            });
            
            // Request render to show highlighting
            this.canvasManager.requestRender();
        });
    }
    
    async saveElementToFirebase(element) {
        try {
            this.savingIndicator.showSaving();
            await this.canvasManager.saveElementToFirebase(element);
            this.savingIndicator.showSaved();
        } catch (error) {
            console.error('Error saving element:', error);
            this.errorToast.show('Failed to save your changes. Please try again.');
            this.savingIndicator.showError();
        }
    }
    
    async updateElementInFirebase(element) {
        try {
            this.savingIndicator.showSaving();
            await this.canvasManager.updateElementInFirebase(element);
            this.savingIndicator.showSaved();
        } catch (error) {
            console.error('Error updating element:', error);
            this.errorToast.show('Failed to update your changes. Please try again.');
            this.savingIndicator.showError();
        }
    }
    
    async deleteElementFromFirebase(element) {
        try {
            this.savingIndicator.showSaving('Deleting...');
            await this.canvasManager.deleteElementFromFirebase(element);
            this.savingIndicator.showSaved('Deleted!');
        } catch (error) {
            console.error('Error deleting element:', error);
            this.errorToast.show('Failed to delete the element. Please try again.');
            this.savingIndicator.showError('Error deleting');
        }
    }
    
    /**
     * Handle mobile keyboard appearance and disappearance
     * This fixes the issue where the screen doesn't restore to its original size
     * after the keyboard is dismissed on mobile devices
     */
    handleMobileKeyboardResize() {
        // Check if we're on a mobile device
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (!isMobile) return;
        
        // Check if we're on iOS
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        
        // Get the visual viewport height (accounts for keyboard)
        const visualViewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        const windowHeight = window.innerHeight;
        
        // If the visual viewport is significantly smaller than the window height,
        // the keyboard is likely open
        const isKeyboardOpen = visualViewportHeight < windowHeight * 0.8;
        
        console.log(`Mobile keyboard state: ${isKeyboardOpen ? 'open' : 'closed'}, ` +
                   `visualViewport: ${visualViewportHeight}, window: ${windowHeight}, iOS: ${isIOS}`);
        
        if (!isKeyboardOpen) {
            // Force a full refresh of the viewport when keyboard is closed
            // This is a workaround for iOS and some Android devices
            setTimeout(() => {
                // Scroll to top to ensure proper layout
                window.scrollTo(0, 0);
                
                // iOS-specific fixes
                if (isIOS) {
                    // On iOS, we need to force the body to full height
                    document.body.style.height = '100%';
                    document.documentElement.style.height = '100%';
                    
                    // Force a reflow
                    document.body.offsetHeight;
                }
                
                // Force redraw by triggering a small resize
                document.body.style.height = `${windowHeight + 1}px`;
                setTimeout(() => {
                    document.body.style.height = `${windowHeight}px`;
                    
                    // Resize canvas again after a short delay
                    setTimeout(() => {
                        this.canvasManager.handleResize();
                        this.updateToolbarPosition();
                        console.log('Forced viewport refresh after keyboard closed');
                    }, 50);
                }, 0);
            }, isIOS ? 500 : 300); // Longer delay for iOS
        } else if (isIOS) {
            // When keyboard opens on iOS, ensure content is visible
            setTimeout(() => {
                window.scrollTo(0, 0);
            }, 100);
        }
    }
}

// Create and initialize the application
const app = new App();

// Initialize Firebase after the app is loaded
window.addEventListener('load', () => {
    app.initializeFirebase();
}); 