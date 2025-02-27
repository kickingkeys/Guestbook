// Import necessary modules
import { CanvasManager } from './canvas/CanvasManager.js';
import { Viewport } from './canvas/Viewport.js';
import { ToolManager } from './tools/ToolManager.js';
import { ModeManager } from './utils/ModeManager.js';
import { SelectionManager } from './utils/SelectionManager.js';

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
        
        // Initialize tool manager with canvas manager
        this.toolManager = new ToolManager(this.canvasManager);
        
        // Pan and zoom state tracking
        this.isPanning = false;
        this.isSpacebarDown = false;
        
        // Zoom indicator fade timeout
        this.zoomFadeTimeout = null;
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize the application
        this.init();
    }
    
    init() {
        // Initialize canvas with grid pattern
        this.canvasManager.init();
        
        // Set default mode
        this.modeManager.setMode('navigation');
        
        // Set default tool (sticky for mobile, drawing for desktop)
        const isMobile = window.innerWidth <= 768;
        this.selectTool(isMobile ? 'sticky' : 'drawing');
        
        // Set up canvas click handler for direct selection
        this.setupDirectSelection();
        
        // Initialize UI elements
        this.updateZoomIndicator();
        this.updateShortcutIndicator(this.modeManager.getMode());
        
        // Start the render loop
        this.startRenderLoop();
        
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
        
        // Touch events for mobile panning and zooming
        canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
        // Keyboard events for spacebar panning and shortcuts
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Tool selection events
        const toolButtons = document.querySelectorAll('.tool-button');
        toolButtons.forEach(button => {
            // Add click event for desktop
            button.addEventListener('click', (e) => {
                const toolName = button.getAttribute('data-tool');
                this.selectTool(this.mapLegacyToolName(toolName));
            });
            
            // Add touch events for mobile to improve responsiveness
            button.addEventListener('touchstart', (e) => {
                // Prevent default to avoid any scrolling/zooming
                e.preventDefault();
                button.classList.add('active-touch');
            });
            
            button.addEventListener('touchend', (e) => {
                // Prevent default to avoid any scrolling/zooming
                e.preventDefault();
                button.classList.remove('active-touch');
                
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
            
            // Update shortcut indicator text based on device
            this.updateShortcutIndicator(this.modeManager.getMode());
        });
        
        // Set up info button event listener
        const infoButton = document.querySelector('.info-button');
        if (infoButton) {
            infoButton.addEventListener('click', () => {
                alert(
                    'Surya\'s Guestbook\n\n' +
                    'Navigation:\n' +
                    '- Pan: Spacebar + click/drag or two-finger touch\n' +
                    '- Zoom: Mouse wheel or pinch gesture\n' +
                    '- Reset View: Ctrl+R or Ctrl+0\n\n' +
                    'Tools:\n' +
                    '- Drawing: Create freehand drawings\n' +
                    '- Selection: Select and move elements\n' +
                    '- Hand: Pan the canvas\n' +
                    '- Text: Add text elements\n' +
                    '- Sticky Note: Add sticky notes\n' +
                    '- Image: Upload and place images\n' +
                    '- Eraser: Precisely erase parts of drawings (use [ and ] to adjust size)\n\n' +
                    'Keyboard Shortcuts:\n' +
                    '- Ctrl/Cmd + V: Selection tool\n' +
                    '- Ctrl/Cmd + H: Hand tool\n' +
                    '- Ctrl/Cmd + P: Drawing tool\n' +
                    '- Ctrl/Cmd + E: Eraser tool\n' +
                    '- Ctrl/Cmd + T: Text tool\n' +
                    '- Ctrl/Cmd + N: Sticky note tool\n' +
                    '- Ctrl/Cmd + I: Image tool\n' +
                    '- [ and ]: Adjust eraser size when eraser tool is active'
                );
            });
        }
        
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
     * Handle mouse move event for panning and tool interactions
     * @param {MouseEvent} e - The mouse event
     */
    handleMouseMove(e) {
        if (this.isPanning) {
            // Get mouse position
            const rect = this.canvasManager.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Continue panning to this position
            this.viewport.pan(mouseX, mouseY);
            
            // Trigger a render
            this.canvasManager.render();
        } else {
            // Pass the event to the current tool
            this.toolManager.onMouseMove(e.clientX, e.clientY, e);
        }
    }
    
    /**
     * Handle mouse up event for panning and tool interactions
     * @param {MouseEvent} e - The mouse event
     */
    handleMouseUp(e) {
        if (this.isPanning) {
            this.isPanning = false;
            this.viewport.endPan();
            
            // Update cursor
            this.updateCursor(this.modeManager.getMode());
        } else {
            // Pass the event to the current tool
            this.toolManager.onMouseUp(e.clientX, e.clientY, e);
        }
    }
    
    /**
     * Handle touch start event for mobile panning and zooming
     * @param {TouchEvent} e - The touch event
     */
    handleTouchStart(e) {
        // Check if we're in navigation mode or using a tool
        if (this.isSpacebarDown || this.modeManager.getMode() === 'navigation') {
            e.preventDefault();
            
            if (e.touches.length === 1) {
                // Single touch - start panning
                const touch = e.touches[0];
                const rect = this.canvasManager.canvas.getBoundingClientRect();
                const touchX = touch.clientX - rect.left;
                const touchY = touch.clientY - rect.top;
                
                this.isPanning = true;
                this.viewport.startPan(touchX, touchY);
                
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
            
            this.toolManager.onTouchStart(touchX, touchY, e);
        }
    }
    
    /**
     * Handle touch move event for mobile panning and zooming
     * @param {TouchEvent} e - The touch event
     */
    handleTouchMove(e) {
        if (this.isSpacebarDown || this.modeManager.getMode() === 'navigation') {
            e.preventDefault();
            
            if (e.touches.length === 1 && this.isPanning) {
                // Single touch - continue panning
                const touch = e.touches[0];
                const rect = this.canvasManager.canvas.getBoundingClientRect();
                const touchX = touch.clientX - rect.left;
                const touchY = touch.clientY - rect.top;
                
                this.viewport.pan(touchX, touchY);
                this.canvasManager.render();
            } else if (e.touches.length === 2) {
                // Two touches - handle pinch zoom
                const currentDistance = this.getTouchDistance(e.touches);
                const currentCenter = this.getTouchCenter(e.touches);
                
                // Calculate zoom factor based on pinch
                const zoomFactor = currentDistance / this.pinchStartDistance;
                
                // Apply zoom at pinch center
                const rect = this.canvasManager.canvas.getBoundingClientRect();
                const centerX = currentCenter.x - rect.left;
                const centerY = currentCenter.y - rect.top;
                
                this.viewport.zoom(centerX, centerY, zoomFactor);
                
                // Update zoom indicator
                this.updateZoomIndicator();
                
                // Update pinch start values
                this.pinchStartDistance = currentDistance;
                this.pinchStartCenter = currentCenter;
                
                this.canvasManager.render();
            }
        } else {
            // Pass the event to the current tool
            const touch = e.touches[0];
            const rect = this.canvasManager.canvas.getBoundingClientRect();
            const touchX = touch.clientX - rect.left;
            const touchY = touch.clientY - rect.top;
            
            this.toolManager.onTouchMove(touchX, touchY, e);
        }
    }
    
    /**
     * Handle touch end event for mobile panning and zooming
     * @param {TouchEvent} e - The touch event
     */
    handleTouchEnd(e) {
        if (this.isSpacebarDown || this.modeManager.getMode() === 'navigation') {
            e.preventDefault();
            
            if (e.touches.length === 0) {
                // All touches ended
                this.isPanning = false;
                this.viewport.endPan();
                
                // Update cursor
                this.updateCursor(this.modeManager.getMode());
            } else if (e.touches.length === 1) {
                // One touch left - start panning from here
                const touch = e.touches[0];
                const rect = this.canvasManager.canvas.getBoundingClientRect();
                const touchX = touch.clientX - rect.left;
                const touchY = touch.clientY - rect.top;
                
                this.isPanning = true;
                this.viewport.startPan(touchX, touchY);
                
                // Update cursor
                this.updateCursor(this.modeManager.getMode());
            }
        } else {
            // Pass the event to the current tool
            // For touch end, we need to use the last known position if no touches remain
            let touchX, touchY;
            
            if (e.touches.length > 0) {
                const touch = e.touches[0];
                const rect = this.canvasManager.canvas.getBoundingClientRect();
                touchX = touch.clientX - rect.left;
                touchY = touch.clientY - rect.top;
            } else if (e.changedTouches.length > 0) {
                // Use the position of the touch that ended
                const touch = e.changedTouches[0];
                const rect = this.canvasManager.canvas.getBoundingClientRect();
                touchX = touch.clientX - rect.left;
                touchY = touch.clientY - rect.top;
            }
            
            if (touchX !== undefined && touchY !== undefined) {
                this.toolManager.onTouchEnd(touchX, touchY, e);
            }
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
        
        // Update shortcut indicator visibility
        this.updateShortcutIndicator(mode);
        
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
    
    /**
     * Update the shortcut indicator visibility based on the current mode
     * @param {string} mode - The current mode
     */
    updateShortcutIndicator(mode) {
        const shortcutIndicator = document.querySelector('.shortcut-indicator');
        if (!shortcutIndicator) return;
        
        // Check if we're on mobile
        const isMobile = window.innerWidth <= 768;
        const shortcutText = document.querySelector('.shortcut-text');
        const shortcutKey = document.querySelector('.shortcut-key');
        
        if (isMobile) {
            // Always show on mobile and update text
            shortcutIndicator.style.display = 'flex';
            if (shortcutKey) {
                shortcutKey.textContent = 'zoom';
            }
            if (shortcutText) {
                shortcutText.textContent = 'pinch to';
            }
        } else {
            // On desktop, only show in drawing or creation mode
            if (mode === 'drawing' || mode === 'creation') {
                shortcutIndicator.style.display = 'flex';
                if (shortcutText) {
                    shortcutText.textContent = '+ drag to pan';
                }
                if (shortcutKey) {
                    shortcutKey.textContent = 'Space';
                }
            } else {
                shortcutIndicator.style.display = 'none';
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
            // Clear canvas
            this.canvasManager.clear();
            
            // Draw grid
            this.canvasManager.drawGrid();
            
            // Render canvas elements
            this.canvasManager.render();
            
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
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    
    // Make app accessible for debugging
    window.app = app;
    
    console.log('Application loaded and ready.');
}); 