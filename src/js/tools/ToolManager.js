import { DrawingTool } from './DrawingTool.js';
import { EraserTool } from './EraserTool.js';
import { HandTool } from './HandTool.js';
import { ImageTool } from './ImageTool.js';
import { SelectionTool } from './SelectionTool.js';
import { StickyNoteTool } from './StickyNoteTool.js';
import { TextTool } from './TextTool.js';
import { CameraTool } from './CameraTool.js';

/**
 * ToolManager class
 * Manages the available tools and the currently selected tool
 */
export class ToolManager {
    /**
     * Constructor
     * @param {CanvasManager} canvasManager - The canvas manager instance
     * @param {SelectionManager} selectionManager - The selection manager instance (optional)
     */
    constructor(canvasManager, selectionManager = null) {
        this.canvasManager = canvasManager;
        this.currentTool = null;
        this.eventListeners = {};
        
        // Initialize tools
        this.tools = {
            selection: new SelectionTool(canvasManager, selectionManager),
            hand: new HandTool(canvasManager),
            drawing: new DrawingTool(canvasManager),
            eraser: new EraserTool(canvasManager),
            text: new TextTool(canvasManager),
            sticky: new StickyNoteTool(canvasManager),
            image: new ImageTool(canvasManager),
            camera: new CameraTool(canvasManager)
        };
        
        // Define disabled tools
        this.disabledTools = ['hand', 'drawing'];
        
        // Set default tool to selection
        this.setTool('selection');
    }
    
    /**
     * Set the current tool
     * @param {string} toolName - The name of the tool to set
     * @returns {boolean} - Whether the tool was successfully set
     */
    setTool(toolName) {
        if (!this.tools[toolName]) {
            console.error(`Tool "${toolName}" not found`);
            return false;
        }
        
        // Prevent setting disabled tools
        if (this.disabledTools && this.disabledTools.includes(toolName)) {
            console.warn(`Tool "${toolName}" is disabled and cannot be activated`);
            return false;
        }
        
        // Deactivate current tool
        if (this.currentTool) {
            this.currentTool.deactivate();
        }
        
        // Set and activate new tool
        this.currentTool = this.tools[toolName];
        this.currentTool.activate();
        
        // Trigger event
        this.triggerEvent('toolChange', { tool: toolName, config: this.getCurrentToolConfig() });
        
        return true;
    }
    
    /**
     * Get the current tool
     * @returns {Object} - The current tool object
     */
    getCurrentTool() {
        return this.currentTool;
    }
    
    /**
     * Get the configuration for a specific tool
     * @param {string} toolName - The name of the tool
     * @returns {Object|null} - The tool configuration or null if not found
     */
    getToolConfig(toolName) {
        if (!this.tools[toolName]) {
            return null;
        }
        
        return {
            name: toolName,
            icon: this.tools[toolName].config.icon,
            cursor: this.tools[toolName].config.cursor,
            description: this.tools[toolName].config.description,
            active: this.tools[toolName] === this.currentTool
        };
    }
    
    /**
     * Get the configuration for the current tool
     * @returns {Object|null} - The current tool configuration or null if no tool is selected
     */
    getCurrentToolConfig() {
        const currentTool = this.getCurrentTool();
        if (!currentTool) {
            return null;
        }
        
        // Find the name of the current tool
        let currentToolName = null;
        for (const [name, tool] of Object.entries(this.tools)) {
            if (tool === currentTool) {
                currentToolName = name;
                break;
            }
        }
        
        if (!currentToolName) {
            return null;
        }
        
        return this.getToolConfig(currentToolName);
    }
    
    /**
     * Get the configurations for all available tools
     * @returns {Array} - Array of tool configurations
     */
    getAvailableTools() {
        return Object.keys(this.tools).map(toolName => this.getToolConfig(toolName));
    }
    
    /**
     * Handle mouse down event
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {Event} event - The original event
     */
    onMouseDown(x, y, event) {
        if (this.currentTool) {
            this.currentTool.onMouseDown(x, y, event);
        }
    }
    
    /**
     * Handle mouse move event
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {Event} event - The original event
     */
    onMouseMove(x, y, event) {
        if (this.currentTool) {
            this.currentTool.onMouseMove(x, y, event);
        }
    }
    
    /**
     * Handle mouse up event
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {Event} event - The original event
     */
    onMouseUp(x, y, event) {
        if (this.currentTool) {
            this.currentTool.onMouseUp(x, y, event);
        }
    }
    
    /**
     * Handle key down event
     * @param {KeyboardEvent} event - The keyboard event
     */
    onKeyDown(event) {
        // Pass event to current tool
        if (this.currentTool) {
            this.currentTool.onKeyDown(event);
        }
        
        // Handle keyboard shortcuts for tool selection
        if (event.ctrlKey || event.metaKey) {
            let toolName = null;
            
            switch (event.key.toLowerCase()) {
                case 'v':
                    toolName = 'selection';
                    break;
                case 'h':
                    // Disable hand tool
                    // toolName = 'hand';
                    break;
                case 'p':
                    // Disable drawing tool
                    // toolName = 'drawing';
                    break;
                case 't':
                    toolName = 'text';
                    break;
                case 'n':
                    toolName = 'sticky';
                    break;
                case 'i':
                    toolName = 'image';
                    break;
                case 'e':
                    // Enable eraser tool
                    toolName = 'eraser';
                    break;
                case 'c':
                    toolName = 'camera';
                    break;
            }
            
            if (toolName && this.tools[toolName]) {
                this.setTool(toolName);
                event.preventDefault();
            }
        }
    }
    
    /**
     * Handle key up event
     * @param {KeyboardEvent} event - The keyboard event
     */
    onKeyUp(event) {
        if (this.currentTool) {
            this.currentTool.onKeyUp(event);
        }
    }
    
    /**
     * Add an event listener
     * @param {string} event - The event name
     * @param {Function} callback - The callback function
     */
    addEventListener(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        
        this.eventListeners[event].push(callback);
    }
    
    /**
     * Remove an event listener
     * @param {string} event - The event name
     * @param {Function} callback - The callback function
     */
    removeEventListener(event, callback) {
        if (!this.eventListeners[event]) {
            return;
        }
        
        this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
    }
    
    /**
     * Trigger an event
     * @param {string} event - The event name
     * @param {Object} data - The event data
     */
    triggerEvent(event, data) {
        if (!this.eventListeners[event]) {
            return;
        }
        
        for (const callback of this.eventListeners[event]) {
            callback(data);
        }
    }
    
    /**
     * Clean up resources when the tool manager is no longer needed
     */
    dispose() {
        // Deactivate current tool
        if (this.currentTool) {
            this.currentTool.deactivate();
        }
        
        // Clean up tools
        for (const tool of Object.values(this.tools)) {
            if (typeof tool.dispose === 'function') {
                tool.dispose();
            }
        }
        
        // Clear event listeners
        this.eventListeners = {};
    }
    
    /**
     * Handle touch start event
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {TouchEvent} event - The original event
     */
    onTouchStart(x, y, event) {
        if (this.currentTool && typeof this.currentTool.onTouchStart === 'function') {
            this.currentTool.onTouchStart(x, y, event);
        }
    }
    
    /**
     * Handle touch move event
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {TouchEvent} event - The original event
     */
    onTouchMove(x, y, event) {
        if (this.currentTool && typeof this.currentTool.onTouchMove === 'function') {
            this.currentTool.onTouchMove(x, y, event);
        }
    }
    
    /**
     * Handle touch end event
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {TouchEvent} event - The original event
     */
    onTouchEnd(x, y, event) {
        if (this.currentTool && typeof this.currentTool.onTouchEnd === 'function') {
            this.currentTool.onTouchEnd(x, y, event);
        }
    }
} 