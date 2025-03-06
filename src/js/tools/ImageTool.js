import { Tool } from './Tool.js';
import { ImageElement } from '../elements/ImageElement.js';

/**
 * ImageTool class
 * Handles uploading and placing images on the canvas
 */
export class ImageTool extends Tool {
    /**
     * Constructor
     * @param {CanvasManager} canvasManager - The canvas manager instance
     */
    constructor(canvasManager) {
        super('image', {
            icon: 'image',
            cursor: 'pointer',
            description: 'Upload and place images'
        });
        
        this.canvasManager = canvasManager;
        this.fileInput = null;
        this.createFileInput();
        
        // Track the current image being placed
        this.currentImage = null;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
    }
    
    /**
     * Create a hidden file input element for image uploads
     */
    createFileInput() {
        // Create a file input element
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.accept = 'image/*';
        this.fileInput.style.display = 'none';
        document.body.appendChild(this.fileInput);
        
        // Add event listener for file selection
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
    }
    
    /**
     * Handle file selection
     * @param {Event} event - The change event
     */
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Check if the file is an image
        if (!file.type.startsWith('image/')) {
            console.error('Selected file is not an image.');
            return;
        }
        
        // Read the file as a data URL
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageUrl = e.target.result;
            
            // Get canvas center in canvas coordinates
            const canvasCenter = this.getCanvasCenter();
            
            // Create a new image element
            this.createImageElement(imageUrl, canvasCenter.x, canvasCenter.y);
        };
        reader.readAsDataURL(file);
        
        // Reset the file input
        this.fileInput.value = '';
    }
    
    /**
     * Get the center of the canvas in canvas coordinates
     * @returns {Object} - The center coordinates {x, y}
     */
    getCanvasCenter() {
        if (!this.canvasManager || !this.canvasManager.canvas) {
            return { x: 0, y: 0 };
        }
        
        const canvas = this.canvasManager.canvas;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Convert to canvas coordinates if viewport exists
        if (this.canvasManager.viewport) {
            return this.canvasManager.viewport.screenToCanvas(centerX, centerY);
        }
        
        return { x: centerX, y: centerY };
    }
    
    /**
     * Create a new image element and add it to the canvas
     * @param {string} src - The image source URL
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     */
    createImageElement(src, x, y) {
        // Create a new image element
        const imageElement = new ImageElement({
            src: src,
            x: x,
            y: y,
            zIndex: this.getNextZIndex()
        });
        
        console.log('[IMAGE TOOL] Creating new image element:', {
            id: imageElement.id,
            src: src.substring(0, 30) + '...',
            x: x,
            y: y,
            hasFirebaseManager: !!this.canvasManager.firebaseManager,
            isSyncing: this.canvasManager.isSyncing
        });
        
        // Add the image to the canvas
        this.canvasManager.addElement(imageElement);
        
        // Ensure the image is saved to Firebase
        if (this.canvasManager.firebaseManager && !imageElement.isSynced) {
            console.log('[IMAGE TOOL] Explicitly saving image to Firebase');
            // Force syncing flag to true temporarily if needed
            const wasSyncing = this.canvasManager.isSyncing;
            if (!wasSyncing) {
                this.canvasManager.isSyncing = true;
            }
            
            // Save the element
            this.canvasManager.saveElementToFirebase(imageElement);
            
            // Restore original syncing state
            if (!wasSyncing) {
                this.canvasManager.isSyncing = wasSyncing;
            }
        }
        
        // Select the image for immediate manipulation
        this.canvasManager.selectElement(imageElement);
        
        // Store as current image
        this.currentImage = imageElement;
    }
    
    /**
     * Get the next z-index for a new element
     * @returns {number} - The next z-index
     */
    getNextZIndex() {
        const elements = this.canvasManager.getElements();
        if (elements.length === 0) return 1;
        
        // Find the highest z-index
        const maxZIndex = Math.max(...elements.map(element => element.zIndex));
        return maxZIndex + 1;
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
        // Reset current image
        this.currentImage = null;
        this.isDragging = false;
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
        const canvasPoint = this.canvasManager.viewport 
            ? this.canvasManager.viewport.screenToCanvas(x, y) 
            : { x, y };
        
        // Check if we're clicking on an existing image
        const element = this.canvasManager.getElementAtPosition(x, y);
        if (element && element.type === 'image') {
            // Select the image
            this.canvasManager.selectElement(element);
            this.currentImage = element;
            
            // Start dragging
            this.isDragging = true;
            this.dragStartX = canvasPoint.x;
            this.dragStartY = canvasPoint.y;
        } else {
            // Trigger file selection dialog
            this.fileInput.click();
        }
    }
    
    /**
     * Handle mouse move event
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {Event} event - The original event
     */
    onMouseMove(x, y, event) {
        if (!this.active || !this.isDragging || !this.currentImage) return;
        
        // Convert screen coordinates to canvas coordinates
        const canvasPoint = this.canvasManager.viewport 
            ? this.canvasManager.viewport.screenToCanvas(x, y) 
            : { x, y };
        
        // Calculate the movement delta
        const deltaX = canvasPoint.x - this.dragStartX;
        const deltaY = canvasPoint.y - this.dragStartY;
        
        // Update image position
        this.currentImage.update({
            x: this.currentImage.x + deltaX,
            y: this.currentImage.y + deltaY
        });
        
        // Update drag start position
        this.dragStartX = canvasPoint.x;
        this.dragStartY = canvasPoint.y;
        
        // Request a render
        this.canvasManager.requestRender();
    }
    
    /**
     * Handle mouse up event
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {Event} event - The original event
     */
    onMouseUp(x, y, event) {
        if (!this.active) return;
        
        // End dragging
        this.isDragging = false;
    }
    
    /**
     * Clean up resources when the tool is no longer needed
     */
    dispose() {
        // Remove the file input element
        if (this.fileInput) {
            document.body.removeChild(this.fileInput);
            this.fileInput = null;
        }
    }
} 