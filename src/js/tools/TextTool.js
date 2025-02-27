import { Tool } from './Tool.js';
import { TextElement } from '../elements/TextElement.js';

/**
 * TextTool class
 * Handles creating and editing text elements on the canvas
 */
export class TextTool extends Tool {
    /**
     * Constructor
     * @param {CanvasManager} canvasManager - The canvas manager instance
     */
    constructor(canvasManager) {
        super('text', {
            icon: 'text',
            cursor: 'text',
            description: 'Add and edit text'
        });
        
        this.canvasManager = canvasManager;
        this.activeTextElement = null;
        this.defaultFontSize = 16;
        this.defaultFontFamily = 'Arial, sans-serif';
        this.defaultTextColor = '#000000';
        this.defaultAlign = 'left';
        this.defaultBold = false;
        this.defaultItalic = false;
        this.defaultUnderline = false;
    }
    
    /**
     * Activate the tool
     */
    activate() {
        super.activate();
        // Set cursor to text
        if (this.canvasManager && this.canvasManager.canvas) {
            this.canvasManager.canvas.style.cursor = this.config.cursor;
        }
    }
    
    /**
     * Deactivate the tool
     */
    deactivate() {
        super.deactivate();
        this.finishEditing();
    }
    
    /**
     * Finish editing the current text element
     */
    finishEditing() {
        if (this.activeTextElement) {
            // If the text is empty, remove the element
            if (!this.activeTextElement.text.trim()) {
                this.canvasManager.removeElement(this.activeTextElement);
                console.log('Empty text element removed');
            } else {
                // Set editing mode to false
                this.activeTextElement.setEditing(false);
                console.log('Finished editing text element');
            }
            
            // Request a render update
            this.canvasManager.requestRender();
            
            // Clear the active text element
            this.activeTextElement = null;
        }
    }
    
    /**
     * Create a new text element
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @returns {TextElement} - The created text element
     */
    createTextElement(x, y) {
        // Create a new text element
        const textElement = new TextElement({
            x: x,
            y: y,
            text: '',
            fontSize: this.defaultFontSize,
            fontFamily: this.defaultFontFamily,
            color: this.defaultTextColor,
            align: this.defaultAlign,
            bold: this.defaultBold,
            italic: this.defaultItalic,
            underline: this.defaultUnderline
        });
        
        // Set editing mode
        textElement.setEditing(true);
        
        // Add the element to the canvas manager
        this.canvasManager.addElement(textElement);
        
        console.log('Created text element at:', x, y);
        
        // Set as active text element
        this.activeTextElement = textElement;
        
        // Create and show the text editor
        this.showTextEditor(textElement);
        
        return textElement;
    }
    
    /**
     * Start editing a text element
     * @param {TextElement} textElement - The text element to edit
     */
    startEditing(textElement) {
        this.finishEditing();
        
        // Set the text element as active
        this.activeTextElement = textElement;
        
        // Set editing mode
        textElement.setEditing(true);
        
        // Show the text editor
        this.showTextEditor(textElement);
        
        // Request a render update
        this.canvasManager.requestRender();
        
        console.log('Started editing text element:', textElement);
    }
    
    /**
     * Show the text editor for a text element
     * @param {TextElement} textElement - The text element to edit
     */
    showTextEditor(textElement) {
        // Create a text input element
        const input = document.createElement('textarea');
        input.value = textElement.text;
        input.style.position = 'absolute';
        input.style.fontFamily = textElement.fontFamily;
        input.style.fontSize = textElement.fontSize + 'px';
        input.style.color = textElement.color;
        input.style.border = '2px solid #3B82F6';
        input.style.padding = '4px';
        input.style.margin = '0';
        input.style.overflow = 'hidden';
        input.style.background = 'rgba(255, 255, 255, 0.9)';
        input.style.resize = 'none';
        input.style.outline = 'none';
        input.style.zIndex = '1000';
        
        // Set text style
        if (textElement.bold) input.style.fontWeight = 'bold';
        if (textElement.italic) input.style.fontStyle = 'italic';
        if (textElement.underline) input.style.textDecoration = 'underline';
        
        // Position the input
        const canvasRect = this.canvasManager.canvas.getBoundingClientRect();
        const screenPos = this.canvasManager.viewport.canvasToScreen(textElement.x, textElement.y);
        
        input.style.left = (canvasRect.left + screenPos.x) + 'px';
        input.style.top = (canvasRect.top + screenPos.y) + 'px';
        input.style.minWidth = '100px';
        input.style.minHeight = '30px';
        
        // Add the input to the document
        document.body.appendChild(input);
        
        // Focus the input
        input.focus();
        
        // Handle input changes
        input.addEventListener('input', () => {
            textElement.update({ text: input.value });
            this.canvasManager.requestRender();
            
            // Adjust input size
            input.style.width = Math.max(100, input.scrollWidth) + 'px';
            input.style.height = Math.max(30, input.scrollHeight) + 'px';
        });
        
        // Handle blur event (finish editing)
        input.addEventListener('blur', () => {
            // Update the text element
            textElement.update({ text: input.value });
            
            // Remove the input
            document.body.removeChild(input);
            
            // Finish editing
            this.finishEditing();
        });
        
        // Handle key events
        input.addEventListener('keydown', (e) => {
            // Enter key without shift finishes editing
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                input.blur();
            }
            
            // Escape key cancels editing
            if (e.key === 'Escape') {
                e.preventDefault();
                input.blur();
            }
        });
        
        // Adjust input size
        input.style.width = Math.max(100, input.scrollWidth) + 'px';
        input.style.height = Math.max(30, input.scrollHeight) + 'px';
    }
    
    /**
     * Handle mouse down event
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {Event} event - The original event
     */
    onMouseDown(x, y, event) {
        // Text creation is handled on mouse up
    }
    
    /**
     * Handle mouse move event
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {Event} event - The original event
     */
    onMouseMove(x, y, event) {
        // No action needed for mouse move
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
        
        // Check if there's a text element at the clicked position
        const element = this.canvasManager.getElementAtPosition(canvasPoint.x, canvasPoint.y);
        
        if (element && element.type === 'text') {
            // Edit existing text element
            this.startEditing(element);
        } else {
            // Create a new text element
            this.createTextElement(canvasPoint.x, canvasPoint.y);
        }
    }
    
    /**
     * Set the default font size
     * @param {number} size - The font size in pixels
     */
    setFontSize(size) {
        this.defaultFontSize = size;
    }
    
    /**
     * Set the default font family
     * @param {string} fontFamily - The font family
     */
    setFontFamily(fontFamily) {
        this.defaultFontFamily = fontFamily;
    }
    
    /**
     * Set the default text color
     * @param {string} color - The text color
     */
    setTextColor(color) {
        this.defaultTextColor = color;
    }
    
    /**
     * Set the default text alignment
     * @param {string} align - The text alignment ('left', 'center', 'right')
     */
    setTextAlign(align) {
        this.defaultAlign = align;
    }
    
    /**
     * Set the default bold state
     * @param {boolean} bold - Whether the text should be bold
     */
    setBold(bold) {
        this.defaultBold = bold;
    }
    
    /**
     * Set the default italic state
     * @param {boolean} italic - Whether the text should be italic
     */
    setItalic(italic) {
        this.defaultItalic = italic;
    }
    
    /**
     * Set the default underline state
     * @param {boolean} underline - Whether the text should be underlined
     */
    setUnderline(underline) {
        this.defaultUnderline = underline;
    }
    
    /**
     * Get the current configuration
     * @returns {Object} - The current configuration
     */
    getCurrentConfig() {
        return {
            fontSize: this.defaultFontSize,
            fontFamily: this.defaultFontFamily,
            color: this.defaultTextColor,
            align: this.defaultAlign,
            bold: this.defaultBold,
            italic: this.defaultItalic,
            underline: this.defaultUnderline
        };
    }
} 