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
        this.defaultFontSize = 24;
        this.defaultFontFamily = 'Arial, sans-serif';
        this.defaultTextColor = '#000000';
        this.defaultAlign = 'left';
        this.defaultBold = false;
        this.defaultItalic = false;
        this.defaultUnderline = false;
        
        // Mobile indicator properties
        this.showMobileIndicator = false;
        this.indicatorX = 0;
        this.indicatorY = 0;
        this.indicatorTimeout = null;
        
        // Bind event handlers
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyPress = this.handleKeyPress.bind(this);
        
        // Create hidden input field for mobile keyboard
        this.createHiddenInputField();
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
        
        // Ensure the input field is ready
        if (this.inputField) {
            // Reset the input field
            this.inputField.value = '';
            
            // Make the input field visible
            this.inputField.style.display = 'block';
            
            // On mobile, show a hint about the input field
            if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                // Show a brief message
                this.showKeyboardMessage();
                
                // Hide the message after a few seconds
                setTimeout(() => {
                    this.hideKeyboardMessage();
                }, 3000);
            }
        }
    }
    
    /**
     * Deactivate the tool
     */
    deactivate() {
        super.deactivate();
        this.finishEditing();
        this.hideMobileIndicator();
        
        // Hide and blur the input field
        if (this.inputField) {
            this.inputField.blur();
            this.inputField.style.display = 'none';
            this.hideKeyboardMessage();
        }
    }
    
    /**
     * Finish editing the current text element
     */
    finishEditing() {
        if (this.activeTextElement) {
            // If the text is empty, remove the element
            if (!this.activeTextElement.text.trim()) {
                console.log(`📝 TEXT: Removing empty text element with ID: ${this.activeTextElement.id}`);
                this.canvasManager.removeElement(this.activeTextElement);
            } else {
                // Set editing mode to false
                this.activeTextElement.setEditing(false);
                
                console.log(`📝 TEXT: Finished editing text element - ID: ${this.activeTextElement.id}`);
                console.log(`📝 TEXT: Content: "${this.activeTextElement.text}"`);
                console.log(`📝 TEXT: Font: ${this.activeTextElement.fontSize}px ${this.activeTextElement.fontFamily}`);
                
                // Save the element to Firebase
                console.log(`📝 TEXT: Saving text element to Firebase...`);
                this.canvasManager.saveElementToFirebase(this.activeTextElement)
                    .then(firebaseId => {
                        console.log(`✅ TEXT: Text element saved to Firebase with ID: ${firebaseId}`);
                    })
                    .catch(error => {
                        console.error(`❌ TEXT: Error saving text element to Firebase:`, error);
                    });
            }
            
            // Remove event listeners
            document.removeEventListener('keydown', this.handleKeyDown);
            document.removeEventListener('keypress', this.handleKeyPress);
            
            // Blur the input field to hide the mobile keyboard
            if (this.inputField) {
                this.inputField.blur();
                this.inputField.value = '';
            }
            
            // Clear active text element
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
        console.log(`📝 TEXT: Creating new text element at position (${x.toFixed(2)}, ${y.toFixed(2)})`);
        
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
        
        console.log(`📝 TEXT: Text element created with ID: ${textElement.id}`);
        
        // Set as active text element
        this.activeTextElement = textElement;
        
        // Add event listeners for keyboard input
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keypress', this.handleKeyPress);
        
        // Focus the hidden input field to trigger mobile keyboard
        if (this.inputField) {
            // Use a timeout to ensure the focus happens after the touch event is processed
            setTimeout(() => {
                this.inputField.focus();
                
                // On iOS, we may need an additional focus attempt
                if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) {
                    setTimeout(() => {
                        this.inputField.focus();
                        this.inputField.click(); // Additional click can help on iOS
                    }, 300);
                }
            }, 100);
        }
        
        // Request a render update
        this.canvasManager.requestRender();
        
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
        
        // Add event listeners for keyboard input
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keypress', this.handleKeyPress);
        
        // Focus the hidden input field to trigger mobile keyboard
        if (this.inputField) {
            // Use a timeout to ensure the focus happens after the touch event is processed
            setTimeout(() => {
                this.inputField.focus();
                
                // On iOS, we may need an additional focus attempt
                if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) {
                    setTimeout(() => {
                        this.inputField.focus();
                        this.inputField.click(); // Additional click can help on iOS
                    }, 300);
                }
            }, 100);
        }
        
        // Request a render update
        this.canvasManager.requestRender();
        
        console.log('Started editing text element:', textElement);
    }
    
    /**
     * Handle key down events
     * @param {KeyboardEvent} event - The keyboard event
     */
    handleKeyDown(event) {
        if (!this.activeTextElement) return;
        
        // Handle special keys
        switch (event.key) {
            case 'Escape':
                // Cancel editing
                event.preventDefault();
                this.finishEditing();
                break;
                
            case 'Enter':
                if (!event.shiftKey) {
                    // Finish editing on Enter without shift
                    event.preventDefault();
                    this.finishEditing();
                } else {
                    // Add a newline with Shift+Enter
                    event.preventDefault();
                    this.activeTextElement.update({ 
                        text: this.activeTextElement.text + '\n' 
                    });
                    this.canvasManager.requestRender();
                    
                    // Clear the input field to prevent duplicate input
                    if (this.inputField) {
                        this.inputField.value = '';
                    }
                }
                break;
                
            case 'Backspace':
                // Delete the last character
                event.preventDefault();
                if (this.activeTextElement.text.length > 0) {
                    this.activeTextElement.update({ 
                        text: this.activeTextElement.text.slice(0, -1) 
                    });
                    this.canvasManager.requestRender();
                    
                    // Clear the input field to prevent issues
                    if (this.inputField) {
                        this.inputField.value = '';
                    }
                }
                break;
        }
    }
    
    /**
     * Handle key press events
     * @param {KeyboardEvent} event - The keyboard event
     */
    handleKeyPress(event) {
        if (!this.activeTextElement) return;
        
        // Ignore special keys that are handled in keydown
        if (event.key === 'Enter' || event.key === 'Escape') {
            return;
        }
        
        // Add the character to the text
        event.preventDefault();
        
        // Log the key press
        if (event.key.length === 1) {  // Only log printable characters
            console.log(`📝 TEXT: Adding character "${event.key}" to text element ID: ${this.activeTextElement.id}`);
        }
        
        this.activeTextElement.update({ 
            text: this.activeTextElement.text + event.key 
        });
        this.canvasManager.requestRender();
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
     * Handle touch start event (for mobile devices)
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {TouchEvent} event - The original event
     */
    onTouchStart(x, y, event) {
        if (!this.active) return;
        
        // Prevent default to avoid unwanted scrolling
        event.preventDefault();
        
        console.log('TextTool.onTouchStart - Tool active:', this.active);
    }
    
    /**
     * Handle touch move event (for mobile devices)
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {TouchEvent} event - The original event
     */
    onTouchMove(x, y, event) {
        if (!this.active) return;
        
        // Prevent default to avoid unwanted scrolling
        event.preventDefault();
    }
    
    /**
     * Handle touch end event (for mobile devices)
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {TouchEvent} event - The original event
     */
    onTouchEnd(x, y, event) {
        if (!this.active) return;
        
        // Prevent default to avoid unwanted scrolling
        event.preventDefault();
        
        console.log('TextTool.onTouchEnd - Processing touch at:', x, y);
        
        // Convert screen coordinates to canvas coordinates
        const canvasPoint = this.canvasManager.viewport.screenToCanvas(x, y);
        console.log('TextTool.onTouchEnd - Canvas point:', canvasPoint.x, canvasPoint.y);
        
        // Check if there's a text element at the touched position
        const element = this.canvasManager.getElementAtPosition(canvasPoint.x, canvasPoint.y);
        
        if (element && element.type === 'text') {
            // Edit existing text element
            this.startEditing(element);
            
            // Show mobile indicator at touch position
            this.showMobileTextIndicator(canvasPoint.x, canvasPoint.y);
        } else {
            // Show mobile indicator at touch position
            this.showMobileTextIndicator(canvasPoint.x, canvasPoint.y);
            
            // Create a new text element
            this.createTextElement(canvasPoint.x, canvasPoint.y);
        }
        
        // Ensure the input field is focused after a short delay
        // This helps ensure the keyboard appears on various mobile devices
        if (this.inputField) {
            // Clear any existing value
            this.inputField.value = '';
            
            // Make the input field more visible temporarily to help trigger keyboard
            const originalOpacity = this.inputField.style.opacity;
            this.inputField.style.opacity = '0.8';
            this.inputField.style.backgroundColor = 'rgba(247, 247, 247, 0.9)';
            this.inputField.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.2)';
            
            // Show a message to the user
            this.showKeyboardMessage();
            
            // Use multiple focus attempts with increasing delays
            // This helps ensure the keyboard appears on various mobile devices
            const focusAttempts = [50, 200, 500, 1000];
            
            focusAttempts.forEach(delay => {
                setTimeout(() => {
                    console.log(`TextTool: Attempting to focus input field after ${delay}ms`);
                    this.inputField.focus();
                    
                    // On iOS, a click can help trigger the keyboard
                    if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) {
                        this.inputField.click();
                    }
                    
                    // If this is the last attempt, restore original opacity
                    if (delay === focusAttempts[focusAttempts.length - 1]) {
                        setTimeout(() => {
                            this.inputField.style.opacity = originalOpacity;
                            this.inputField.style.backgroundColor = 'rgba(0,0,0,0.05)';
                            this.inputField.style.boxShadow = 'none';
                            this.hideKeyboardMessage();
                        }, 2000);
                    }
                }, delay);
            });
        }
    }
    
    /**
     * Show a visual indicator for mobile users that they can start typing
     * @param {number} x - The x coordinate in canvas space
     * @param {number} y - The y coordinate in canvas space
     */
    showMobileTextIndicator(x, y) {
        console.log('TextTool.showMobileTextIndicator - Showing indicator at:', x, y);
        
        // Store indicator position
        this.indicatorX = x;
        this.indicatorY = y;
        this.showMobileIndicator = true;
        
        // Clear any existing timeout
        if (this.indicatorTimeout) {
            clearTimeout(this.indicatorTimeout);
        }
        
        // Set timeout to hide the indicator after 3 seconds
        this.indicatorTimeout = setTimeout(() => {
            this.hideMobileIndicator();
        }, 3000);
        
        // Request a render to show the indicator
        this.canvasManager.requestRender();
    }
    
    /**
     * Hide the mobile text indicator
     */
    hideMobileIndicator() {
        if (this.showMobileIndicator) {
            this.showMobileIndicator = false;
            this.canvasManager.requestRender();
        }
    }
    
    /**
     * Render the mobile text indicator
     * @param {CanvasRenderingContext2D} ctx - The canvas context
     */
    renderMobileIndicator(ctx) {
        if (!this.showMobileIndicator) return;
        
        // Save context state
        ctx.save();
        
        // Apply viewport transformations
        const viewport = this.canvasManager.viewport;
        ctx.translate(viewport.offsetX, viewport.offsetY);
        ctx.scale(viewport.scale, viewport.scale);
        
        // Draw a blinking cursor and text box
        const blinkVisible = Math.floor(Date.now() / 500) % 2 === 0;
        
        // Draw text box background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        const boxWidth = 100;
        const boxHeight = 30;
        ctx.fillRect(
            this.indicatorX - 5,
            this.indicatorY - 5,
            boxWidth,
            boxHeight
        );
        
        // Draw text box border
        ctx.strokeStyle = '#F97316'; // Orange color
        ctx.lineWidth = 2 / viewport.scale; // Adjust for viewport scale
        ctx.strokeRect(
            this.indicatorX - 5,
            this.indicatorY - 5,
            boxWidth,
            boxHeight
        );
        
        // Draw placeholder text
        ctx.fillStyle = '#888888';
        ctx.font = `${this.defaultFontSize}px ${this.defaultFontFamily}`;
        ctx.textBaseline = 'top';
        ctx.fillText('Tap to type...', this.indicatorX, this.indicatorY);
        
        // Draw blinking cursor
        if (blinkVisible) {
            ctx.beginPath();
            ctx.moveTo(this.indicatorX, this.indicatorY);
            ctx.lineTo(this.indicatorX, this.indicatorY + this.defaultFontSize);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1 / viewport.scale; // Adjust for viewport scale
            ctx.stroke();
        }
        
        // Restore context state
        ctx.restore();
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
    
    /**
     * Create a hidden input field for triggering the mobile keyboard
     */
    createHiddenInputField() {
        // Check if the input already exists
        let inputField = document.getElementById('text-tool-input');
        
        if (!inputField) {
            // Create the input field
            inputField = document.createElement('input');
            inputField.id = 'text-tool-input';
            inputField.type = 'text';
            inputField.autocomplete = 'off';
            inputField.autocorrect = 'off';
            inputField.autocapitalize = 'off';
            inputField.spellcheck = false;
            
            // Style the input field to be visible but unobtrusive
            // Making it slightly visible helps ensure keyboard appears on mobile
            inputField.style.position = 'fixed';
            inputField.style.opacity = '0.1'; // Slightly visible to ensure keyboard appears
            inputField.style.backgroundColor = 'rgba(0,0,0,0.05)';
            inputField.style.border = '1px solid rgba(0,0,0,0.1)';
            inputField.style.borderRadius = '3px';
            inputField.style.padding = '4px';
            inputField.style.pointerEvents = 'auto'; // Allow interaction
            inputField.style.zIndex = '9999';
            inputField.style.width = '40px';
            inputField.style.height = '30px';
            inputField.style.bottom = '10px';
            inputField.style.left = '10px';
            inputField.style.fontSize = '16px'; // iOS requires 16px or larger to avoid zoom
            
            // Add input event listener
            inputField.addEventListener('input', (e) => {
                if (this.activeTextElement && e.data) {
                    // Add the input text to the active text element
                    this.activeTextElement.update({ 
                        text: this.activeTextElement.text + e.data 
                    });
                    // Clear the input field
                    inputField.value = '';
                    // Request a render update
                    this.canvasManager.requestRender();
                }
            });
            
            // Add focus event listener to ensure we're in editing mode
            inputField.addEventListener('focus', () => {
                console.log('TextTool: Input field focused');
                if (this.activeTextElement) {
                    // Ensure the element is in editing mode
                    this.activeTextElement.setEditing(true);
                    this.canvasManager.requestRender();
                }
            });
            
            // Add the input field to the document
            document.body.appendChild(inputField);
        }
        
        this.inputField = inputField;
    }
    
    /**
     * Show a message to help users understand they need to tap the input field
     */
    showKeyboardMessage() {
        // Remove any existing message
        this.hideKeyboardMessage();
        
        // Create message element
        const message = document.createElement('div');
        message.id = 'keyboard-message';
        message.textContent = 'Tap here to type';
        message.style.position = 'fixed';
        message.style.bottom = '45px';
        message.style.left = '10px';
        message.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        message.style.color = 'white';
        message.style.padding = '5px 10px';
        message.style.borderRadius = '5px';
        message.style.fontSize = '14px';
        message.style.zIndex = '10000';
        message.style.pointerEvents = 'none';
        
        // Add arrow pointing to input
        const arrow = document.createElement('div');
        arrow.style.position = 'absolute';
        arrow.style.bottom = '-5px';
        arrow.style.left = '15px';
        arrow.style.width = '0';
        arrow.style.height = '0';
        arrow.style.borderLeft = '5px solid transparent';
        arrow.style.borderRight = '5px solid transparent';
        arrow.style.borderTop = '5px solid rgba(0, 0, 0, 0.7)';
        
        message.appendChild(arrow);
        document.body.appendChild(message);
    }
    
    /**
     * Hide the keyboard message
     */
    hideKeyboardMessage() {
        const message = document.getElementById('keyboard-message');
        if (message) {
            message.remove();
        }
    }
} 