import { Tool } from './Tool.js';
import { ImageElement } from '../elements/ImageElement.js';
import { CameraManager } from '../utils/CameraManager.js';
import { PolaroidFormatter } from '../utils/PolaroidFormatter.js';

/**
 * CameraTool class
 * Allows capturing photos from the device camera and adding them to the canvas
 */
export class CameraTool extends Tool {
    /**
     * Constructor
     * @param {CanvasManager} canvasManager - The canvas manager instance
     */
    constructor(canvasManager) {
        super('camera', {
            icon: 'camera',
            cursor: 'crosshair',
            description: 'Camera Tool - Capture photos and add them to the canvas'
        });
        
        this.canvasManager = canvasManager;
        this.cameraManager = new CameraManager();
        
        // Camera UI elements
        this.cameraInterface = null;
        this.videoElement = null;
        this.captureButton = null;
        this.switchButton = null;
        this.closeButton = null;
        this.errorMessage = null;
        this.fallbackMessage = null;
        this.loadingIndicator = null;
        
        // State tracking
        this.isCapturing = false;
        this.capturePosition = { x: 0, y: 0 };
        this.isMobile = this._checkIfMobile();
        
        // Check if camera is supported
        this.isCameraSupported = CameraManager.isSupported();
        console.log('CameraTool: Camera API supported:', this.isCameraSupported);
        console.log('CameraTool: Mobile device detected:', this.isMobile);
    }
    
    /**
     * Check if the current device is mobile
     * @returns {boolean} - Whether the device is mobile
     * @private
     */
    _checkIfMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    /**
     * Activate the tool
     */
    activate() {
        super.activate();
        document.body.style.cursor = this.config.cursor;
        console.log('CameraTool: Activated');
        
        // Create camera interface if it doesn't exist
        if (!this.cameraInterface) {
            this.createCameraInterface();
        }
    }
    
    /**
     * Deactivate the tool
     */
    deactivate() {
        super.deactivate();
        document.body.style.cursor = 'default';
        console.log('CameraTool: Deactivated');
        
        // Hide and stop the camera
        this.hideCameraInterface();
        this.cameraManager.stop();
    }
    
    /**
     * Create the camera interface
     */
    createCameraInterface() {
        console.log('CameraTool: Creating camera interface');
        
        // Create container
        this.cameraInterface = document.createElement('div');
        this.cameraInterface.className = 'camera-interface';
        
        // Add mobile class if on mobile device
        if (this.isMobile) {
            this.cameraInterface.classList.add('mobile');
        }
        
        // Create video element
        this.videoElement = document.createElement('video');
        this.videoElement.className = 'camera-preview';
        this.videoElement.autoplay = true;
        this.videoElement.playsInline = true; // Important for iOS
        this.cameraInterface.appendChild(this.videoElement);
        
        // Create loading indicator
        this.loadingIndicator = document.createElement('div');
        this.loadingIndicator.className = 'camera-loading';
        this.loadingIndicator.innerHTML = '<div class="spinner"></div><div class="loading-text">Initializing camera...</div>';
        this.cameraInterface.appendChild(this.loadingIndicator);
        
        // Create capture button
        this.captureButton = document.createElement('button');
        this.captureButton.className = 'camera-capture-button';
        this.captureButton.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="white"/></svg>';
        this.captureButton.addEventListener('click', () => this.capturePhoto());
        // Add touch event for better mobile response
        this.captureButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.capturePhoto();
        });
        this.cameraInterface.appendChild(this.captureButton);
        
        // Create switch camera button
        this.switchButton = document.createElement('button');
        this.switchButton.className = 'camera-switch-button';
        this.switchButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 12c0 1.66 1.34 3 3 3s3-1.34 3-3-1.34-3-3-3-3 1.34-3 3zm8-1h-2V9c0-.55-.45-1-1-1H10c-.55 0-1 .45-1 1v2H7c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h10c.55 0 1-.45 1-1v-6c0-.55-.45-1-1-1zm-1 6H8v-5h2v1h4v-1h2v5z" fill="white"/><path d="M7 4h4.59l1.7-1.7c.19-.19.44-.3.71-.3h2c.55 0 1 .45 1 1v1h2c1.1 0 2 .9 2 2v3h-2V7h-1V4h-3l-1.7 1.7c-.19.19-.44.3-.71.3H7c-1.1 0-2 .9-2 2v9c0 1.1.9 2 2 2h3v2H7c-2.21 0-4-1.79-4-4V8c0-2.21 1.79-4 4-4z" fill="white"/></svg>';
        this.switchButton.addEventListener('click', () => this.switchCamera());
        // Add touch event for better mobile response
        this.switchButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.switchCamera();
        });
        this.cameraInterface.appendChild(this.switchButton);
        
        // Create close button
        this.closeButton = document.createElement('button');
        this.closeButton.className = 'camera-close-button';
        this.closeButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" fill="white"/></svg>';
        this.closeButton.addEventListener('click', () => this.hideCameraInterface());
        // Add touch event for better mobile response
        this.closeButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.hideCameraInterface();
        });
        this.cameraInterface.appendChild(this.closeButton);
        
        // Create error message element
        this.errorMessage = document.createElement('div');
        this.errorMessage.className = 'camera-error-message';
        this.cameraInterface.appendChild(this.errorMessage);
        
        // Create fallback message for unsupported browsers
        this.fallbackMessage = document.createElement('div');
        this.fallbackMessage.className = 'camera-fallback-message';
        this.fallbackMessage.innerHTML = `
            <div class="fallback-icon">📷</div>
            <h3>Camera Not Supported</h3>
            <p>Your browser doesn't support camera access.</p>
            <p>Try using a modern browser like Chrome, Firefox, Safari, or Edge.</p>
            <button class="fallback-close-button">Close</button>
        `;
        
        // Add event listener to the fallback close button
        const fallbackCloseButton = this.fallbackMessage.querySelector('.fallback-close-button');
        if (fallbackCloseButton) {
            fallbackCloseButton.addEventListener('click', () => this.hideCameraInterface());
            // Add touch event for better mobile response
            fallbackCloseButton.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.hideCameraInterface();
            });
        }
        
        this.cameraInterface.appendChild(this.fallbackMessage);
        
        // Add to document
        document.body.appendChild(this.cameraInterface);
        
        console.log('CameraTool: Camera interface created');
    }
    
    /**
     * Show the camera interface and initialize the camera
     * @param {number} x - The x coordinate where the camera was activated
     * @param {number} y - The y coordinate where the camera was activated
     */
    async showCameraInterface(x, y) {
        console.log('CameraTool: Showing camera interface at position:', { x, y });
        
        // Store position for later placement of the captured image
        this.capturePosition = { x, y };
        
        // Show the interface
        if (this.cameraInterface) {
            this.cameraInterface.style.display = 'flex';
            
            // Check if camera is supported
            if (!this.isCameraSupported) {
                console.log('CameraTool: Camera not supported, showing fallback message');
                this.showFallbackMessage();
                return;
            }
            
            // Hide fallback message if it was previously shown
            this.hideFallbackMessage();
            
            // Show loading indicator
            this.showLoadingIndicator();
            
            // Initialize camera
            console.log('CameraTool: Initializing camera');
            const success = await this.cameraManager.initialize(
                this.videoElement,
                (errorMessage) => this.showError(errorMessage)
            );
            
            // Hide loading indicator
            this.hideLoadingIndicator();
            
            if (!success) {
                console.error('CameraTool: Failed to initialize camera');
                this.showError('Failed to initialize camera. Please check permissions.');
            } else {
                console.log('CameraTool: Camera initialized successfully');
                
                // Apply fullscreen on mobile if supported
                if (this.isMobile && this.cameraInterface.requestFullscreen) {
                    try {
                        await this.cameraInterface.requestFullscreen();
                        console.log('CameraTool: Entered fullscreen mode');
                    } catch (error) {
                        console.warn('CameraTool: Could not enter fullscreen mode:', error);
                    }
                }
            }
        }
    }
    
    /**
     * Show loading indicator
     */
    showLoadingIndicator() {
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = 'flex';
            
            // Hide other UI elements while loading
            if (this.videoElement) this.videoElement.style.opacity = '0.3';
            if (this.captureButton) this.captureButton.style.display = 'none';
            if (this.switchButton) this.switchButton.style.display = 'none';
        }
    }
    
    /**
     * Hide loading indicator
     */
    hideLoadingIndicator() {
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = 'none';
            
            // Show other UI elements after loading
            if (this.videoElement) this.videoElement.style.opacity = '1';
            if (this.captureButton) this.captureButton.style.display = 'flex';
            if (this.switchButton) this.switchButton.style.display = 'flex';
        }
    }
    
    /**
     * Hide the camera interface
     */
    hideCameraInterface() {
        console.log('CameraTool: Hiding camera interface');
        
        if (this.cameraInterface) {
            // Exit fullscreen if we're in it
            if (document.fullscreenElement === this.cameraInterface) {
                document.exitFullscreen().catch(err => {
                    console.warn('CameraTool: Error exiting fullscreen:', err);
                });
            }
            
            this.cameraInterface.style.display = 'none';
            this.cameraManager.stop();
            this.hideError();
            this.hideFallbackMessage();
            this.hideLoadingIndicator();
        }
    }
    
    /**
     * Show the fallback message for unsupported browsers
     */
    showFallbackMessage() {
        console.log('CameraTool: Showing fallback message');
        
        if (this.fallbackMessage) {
            // Hide other UI elements
            if (this.videoElement) this.videoElement.style.display = 'none';
            if (this.captureButton) this.captureButton.style.display = 'none';
            if (this.switchButton) this.switchButton.style.display = 'none';
            if (this.loadingIndicator) this.loadingIndicator.style.display = 'none';
            
            // Show fallback message
            this.fallbackMessage.style.display = 'flex';
        }
    }
    
    /**
     * Hide the fallback message
     */
    hideFallbackMessage() {
        console.log('CameraTool: Hiding fallback message');
        
        if (this.fallbackMessage) {
            this.fallbackMessage.style.display = 'none';
            
            // Show other UI elements
            if (this.videoElement) this.videoElement.style.display = 'block';
            if (this.captureButton) this.captureButton.style.display = 'flex';
            if (this.switchButton) this.switchButton.style.display = 'flex';
        }
    }
    
    /**
     * Switch between front and back cameras
     */
    async switchCamera() {
        console.log('CameraTool: Switching camera');
        
        // Show loading indicator
        this.showLoadingIndicator();
        
        const success = await this.cameraManager.switchCamera();
        
        // Hide loading indicator
        this.hideLoadingIndicator();
        
        if (!success) {
            console.error('CameraTool: Failed to switch camera');
            this.showError('Failed to switch camera. Your device may only have one camera.');
        } else {
            console.log('CameraTool: Camera switched successfully');
        }
    }
    
    /**
     * Show an error message
     * @param {string} message - The error message to display
     */
    showError(message) {
        console.error('CameraTool: Error:', message);
        
        if (this.errorMessage) {
            this.errorMessage.textContent = message;
            this.errorMessage.style.display = 'block';
        }
    }
    
    /**
     * Hide the error message
     */
    hideError() {
        if (this.errorMessage) {
            this.errorMessage.style.display = 'none';
        }
    }
    
    /**
     * Capture a photo from the camera
     */
    async capturePhoto() {
        console.log('CameraTool: Capturing photo');
        
        if (!this.cameraManager.isActive()) {
            console.error('CameraTool: Cannot capture photo - camera not active');
            this.showError('Camera is not active');
            return;
        }
        
        try {
            // Show visual feedback for capture
            if (this.videoElement) {
                this.videoElement.classList.add('flash');
                setTimeout(() => {
                    this.videoElement.classList.remove('flash');
                }, 300);
            }
            
            // Capture frame from video
            console.log('CameraTool: Capturing frame from video');
            const imageDataUrl = this.cameraManager.captureFrame();
            if (!imageDataUrl) {
                console.error('CameraTool: Failed to capture frame');
                this.showError('Failed to capture photo');
                return;
            }
            
            // Apply Polaroid effect - no need to specify bottomBorderWidthRatio as it's handled in PolaroidFormatter
            console.log('CameraTool: Applying Polaroid effect');
            const timestamp = PolaroidFormatter.getTimestampCaption();
            const formattedImageUrl = await PolaroidFormatter.format(imageDataUrl, {
                caption: timestamp
                // PolaroidFormatter now automatically adjusts for mobile
            });
            
            // Create a new image element
            console.log('CameraTool: Adding image to canvas');
            this.addImageToCanvas(formattedImageUrl);
            
            // Hide camera interface after capture
            this.hideCameraInterface();
        } catch (error) {
            console.error('CameraTool: Error capturing photo:', error);
            this.showError('Failed to process photo');
        }
    }
    
    /**
     * Add the captured image to the canvas
     * @param {string} imageUrl - The image data URL
     */
    addImageToCanvas(imageUrl) {
        console.log('CameraTool: Processing captured image for canvas');
        
        // Create a temporary image to get dimensions
        const tempImage = new Image();
        tempImage.onload = () => {
            // Calculate size (maintain aspect ratio, but limit max size)
            // Adjust max size based on device and orientation
            let maxSize;
            if (this.isMobile) {
                // Check if in portrait or landscape orientation
                const isPortrait = window.matchMedia("(orientation: portrait)").matches;
                maxSize = isPortrait ? 250 : 300; // Smaller in portrait mode on mobile
            } else {
                maxSize = 350; // Larger on desktop
            }
            
            let width = tempImage.width;
            let height = tempImage.height;
            
            if (width > height && width > maxSize) {
                height = (height / width) * maxSize;
                width = maxSize;
            } else if (height > width && height > maxSize) {
                width = (width / height) * maxSize;
                height = maxSize;
            }
            
            console.log('CameraTool: Image dimensions:', {
                original: { width: tempImage.width, height: tempImage.height },
                resized: { width, height }
            });
            
            // Apply a slight random rotation for a more natural look
            // Use a smaller rotation angle on mobile for better fit
            const maxRotationAngle = this.isMobile ? 2 : 3;
            const rotation = PolaroidFormatter.getRandomRotation(maxRotationAngle);
            console.log('CameraTool: Applied rotation:', rotation);
            
            // Create the image element
            const imageElement = new ImageElement({
                src: imageUrl,
                x: this.capturePosition.x - (width / 2),
                y: this.capturePosition.y - (height / 2),
                width: width,
                height: height,
                rotation: rotation
            });
            
            // Add to canvas
            this.canvasManager.addElement(imageElement);
            console.log('CameraTool: Image added to canvas successfully');
        };
        
        tempImage.onerror = (error) => {
            console.error('CameraTool: Error loading image:', error);
            this.showError('Failed to process the captured image');
        };
        
        tempImage.src = imageUrl;
    }
    
    /**
     * Handle mouse down event
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {Event} event - The original event
     */
    onMouseDown(x, y, event) {
        if (this.active) {
            console.log('CameraTool: Mouse down at position:', { x, y });
            // Show camera interface at the clicked position
            this.showCameraInterface(x, y);
        }
    }
    
    /**
     * Handle touch start event (for mobile devices)
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {TouchEvent} event - The original event
     */
    onTouchStart(x, y, event) {
        if (this.active) {
            console.log('CameraTool: Touch start at position:', { x, y });
            // Prevent default to avoid unwanted scrolling
            event.preventDefault();
            // Show camera interface at the touched position
            this.showCameraInterface(x, y);
        }
    }
    
    /**
     * Handle key down event
     * @param {KeyboardEvent} event - The keyboard event
     */
    onKeyDown(event) {
        // Handle Escape key to close camera interface
        if (event.key === 'Escape' && this.cameraInterface && this.cameraInterface.style.display !== 'none') {
            console.log('CameraTool: Escape key pressed, closing camera interface');
            this.hideCameraInterface();
            event.preventDefault();
        }
        
        // Handle Space key to capture photo when camera is active
        if (event.key === ' ' && this.cameraInterface && this.cameraInterface.style.display !== 'none' && this.cameraManager.isActive()) {
            console.log('CameraTool: Space key pressed, capturing photo');
            this.capturePhoto();
            event.preventDefault();
        }
    }
    
    /**
     * Clean up resources when the tool is no longer needed
     */
    dispose() {
        if (this.cameraManager) {
            this.cameraManager.dispose();
        }
        
        // Remove camera interface from DOM if it exists
        if (this.cameraInterface && this.cameraInterface.parentNode) {
            this.cameraInterface.parentNode.removeChild(this.cameraInterface);
        }
        
        console.log('CameraTool: Resources disposed');
    }
} 