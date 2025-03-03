import { Tool } from './Tool.js';
import { StickyNoteElement } from '../elements/StickyNoteElement.js';

/**
 * StickyNoteTool class
 * Handles creating and editing sticky notes
 */
export class StickyNoteTool extends Tool {
    /**
     * Constructor
     * @param {CanvasManager} canvasManager - The canvas manager instance
     */
    constructor(canvasManager) {
        super('sticky-note', {
            icon: 'sticky-note',
            cursor: 'pointer',
            description: 'Create and edit sticky notes'
        });
        
        this.canvasManager = canvasManager;
        this.defaultColor = '#ED682B';
        this.defaultWidth = 200;
        this.defaultHeight = 150;
        
        // Track the currently active sticky note
        this.activeElement = null;
        
        // Track double click for editing
        this.lastClickTime = 0;
        this.doubleClickDelay = 300; // ms
    }
    
    /**
     * Activate the tool
     */
    activate() {
        super.activate();
        // Set cursor to pointer
        if (this.canvasManager && this.canvasManager.canvas) {
            this.canvasManager.canvas.style.cursor = this.config.cursor;
        }
    }
    
    /**
     * Deactivate the tool
     */
    deactivate() {
        super.deactivate();
        // End any active editing
        this.endEditing();
    }
    
    /**
     * Handle mouse down event
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {Event} event - The original event
     */
    onMouseDown(x, y, event) {
        if (!this.active) return;
        
        // Convert screen coordinates to canvas coordinates
        const canvasPoint = this.canvasManager.viewport.screenToCanvas(x, y);
        
        // Check if we clicked on an existing sticky note
        const elements = this.canvasManager.getElements();
        const clickedElement = elements.find(element => 
            element.type === 'sticky-note' && element.containsPoint(canvasPoint.x, canvasPoint.y)
        );
        
        if (clickedElement) {
            // Select the element
            this.canvasManager.selectElement(clickedElement);
            this.activeElement = clickedElement;
            
            // Start dragging the element
            clickedElement.startDrag(canvasPoint.x, canvasPoint.y);
            
            // Check for double click to edit
            const now = Date.now();
            if (now - this.lastClickTime < this.doubleClickDelay) {
                this.startEditing(clickedElement);
            }
            this.lastClickTime = now;
        } else {
            // Deselect any selected elements
            this.canvasManager.deselectAllElements();
            this.activeElement = null;
            
            // End any active editing
            this.endEditing();
        }
    }
    
    /**
     * Handle mouse move event
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {Event} event - The original event
     */
    onMouseMove(x, y, event) {
        if (!this.active || !this.activeElement || !this.activeElement.isDragging()) return;
        
        // Convert screen coordinates to canvas coordinates
        const canvasPoint = this.canvasManager.viewport.screenToCanvas(x, y);
        
        // Drag the active element
        this.activeElement.drag(canvasPoint.x, canvasPoint.y);
    }
    
    /**
     * Handle mouse up event
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {Event} event - The original event
     */
    onMouseUp(x, y, event) {
        if (!this.active) return;
        
        // Convert screen coordinates to canvas coordinates
        const canvasPoint = this.canvasManager.viewport.screenToCanvas(x, y);
        
        // If we have an active element that's being dragged, stop dragging
        if (this.activeElement && this.activeElement.isDragging()) {
            this.activeElement.stopDrag();
        } 
        // If no active element and not editing, create a new sticky note
        else if (!this.activeElement && !this.isEditing()) {
            this.createStickyNote(canvasPoint.x, canvasPoint.y);
        }
    }
    
    /**
     * Create a new sticky note
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     */
    createStickyNote(x, y) {
        // Create a new sticky note element
        const stickyNote = new StickyNoteElement({
            x: x - this.defaultWidth / 2, // Center the note on the click position
            y: y - this.defaultHeight / 2,
            width: this.defaultWidth,
            height: this.defaultHeight,
            color: this.defaultColor,
            text: 'New Sticky Note'
        });
        
        // Add the sticky note to the canvas
        this.canvasManager.addElement(stickyNote);
        
        // Select the new sticky note
        this.canvasManager.selectElement(stickyNote);
        this.activeElement = stickyNote;
        
        // Start editing the new sticky note
        this.startEditing(stickyNote);
        
        return stickyNote;
    }
    
    /**
     * Start editing a sticky note
     * @param {StickyNoteElement} stickyNote - The sticky note to edit
     */
    startEditing(stickyNote) {
        if (!stickyNote || stickyNote.isEditing()) return;
        
        // End any active editing
        this.endEditing();
        
        // Set the sticky note to editing mode
        stickyNote.setEditing(true);
        
        // Create a text input for editing
        const input = document.createElement('textarea');
        input.value = stickyNote.text;
        input.style.position = 'absolute';
        input.style.fontFamily = stickyNote.fontFamily;
        input.style.fontSize = `${stickyNote.fontSize}px`;
        input.style.color = stickyNote.textColor;
        input.style.backgroundColor = stickyNote.color;
        input.style.border = 'none';
        input.style.outline = 'none';
        input.style.resize = 'none';
        input.style.overflow = 'auto';
        input.style.padding = '10px';
        input.style.borderRadius = '8px';
        input.style.boxSizing = 'border-box';
        
        // Position the input over the sticky note
        const bbox = stickyNote.getBoundingBox();
        const viewportPoint = this.canvasManager.viewport.canvasToScreen(bbox.x, bbox.y);
        
        input.style.left = `${viewportPoint.x}px`;
        input.style.top = `${viewportPoint.y}px`;
        input.style.width = `${bbox.width * this.canvasManager.viewport.scale}px`;
        input.style.height = `${bbox.height * this.canvasManager.viewport.scale}px`;
        
        // Add the input to the document
        document.body.appendChild(input);
        
        // Focus the input
        input.focus();
        
        // Store the input element
        this.editingInput = input;
        this.editingElement = stickyNote;
        
        // Add event listeners
        input.addEventListener('blur', this.handleInputBlur.bind(this));
        input.addEventListener('keydown', this.handleInputKeyDown.bind(this));
    }
    
    /**
     * Handle input blur event
     * @param {Event} event - The blur event
     */
    handleInputBlur(event) {
        this.endEditing();
    }
    
    /**
     * Handle input keydown event
     * @param {KeyboardEvent} event - The keydown event
     */
    handleInputKeyDown(event) {
        // End editing on Escape
        if (event.key === 'Escape') {
            this.endEditing();
            event.preventDefault();
        }
        
        // End editing on Enter without shift
        if (event.key === 'Enter' && !event.shiftKey) {
            this.endEditing();
            event.preventDefault();
        }
    }
    
    /**
     * End editing
     */
    endEditing() {
        if (!this.editingInput || !this.editingElement) return;
        
        // Update the sticky note text
        this.editingElement.update({
            text: this.editingInput.value
        });
        
        // Set the sticky note to non-editing mode
        this.editingElement.setEditing(false);
        
        // Remove the input element if it's still in the DOM
        try {
            if (this.editingInput.parentNode === document.body) {
                document.body.removeChild(this.editingInput);
            }
        } catch (error) {
            console.warn('Failed to remove editing input:', error);
        }
        
        // Clear editing state
        this.editingInput = null;
        this.editingElement = null;
    }
    
    /**
     * Check if any sticky note is being edited
     * @returns {boolean} - True if a sticky note is being edited, false otherwise
     */
    isEditing() {
        return !!this.editingInput;
    }
    
    /**
     * Set the default color for new sticky notes
     * @param {string} color - The color to set
     */
    setDefaultColor(color) {
        this.defaultColor = color;
    }
    
    /**
     * Set the default size for new sticky notes
     * @param {number} width - The width to set
     * @param {number} height - The height to set
     */
    setDefaultSize(width, height) {
        this.defaultWidth = width;
        this.defaultHeight = height;
    }
} 