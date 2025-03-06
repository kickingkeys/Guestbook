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
        
        console.log('CameraTool: Initializing constructor');
        
        this.canvasManager = canvasManager;
        console.log('CameraTool: Canvas manager available:', !!this.canvasManager);
        
        // Initialize camera manager
        try {
            this.cameraManager = new CameraManager();
            console.log('CameraTool: Camera manager created successfully');
        } catch (error) {
            console.error('CameraTool: Error creating camera manager:', error);
        }
        
        // Camera UI elements
        this.cameraInterface = null;
        this.videoElement = null;
        this.captureButton = null;
        this.switchButton = null;
        this.closeButton = null;
        this.errorMessage = null;
        this.fallbackMessage = null;
        this.loadingIndicator = null;
        this.fileUploadFallback = null;
        
        // State tracking
        this.isCapturing = false;
        this.capturePosition = { x: 0, y: 0 };
        this.isMobile = this._checkIfMobile();
        console.log('CameraTool: Is mobile device:', this.isMobile);
        
        // Check if camera is supported
        this.isCameraSupported = CameraManager.isSupported();
        console.log('CameraTool: Camera supported:', this.isCameraSupported);
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
    }
    
    /**
     * Deactivate the tool
     */
    deactivate() {
        super.deactivate();
        
        // Hide camera interface if visible
        this.hideCameraInterface();
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
        
        // Create spinner element
        const spinner = document.createElement('div');
        spinner.className = 'spinner';
        this.loadingIndicator.appendChild(spinner);
        
        // Create loading text element
        const loadingText = document.createElement('div');
        loadingText.className = 'loading-text';
        loadingText.textContent = 'Initializing camera...';
        this.loadingIndicator.appendChild(loadingText);
        
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
            <p>Your browser doesn't support camera access or permission was denied.</p>
            <p>Try using a modern browser like Chrome, Firefox, Safari, or Edge.</p>
            <p>Make sure you're using HTTPS and have granted camera permissions.</p>
            <button class="fallback-close-button">Close</button>
        `;
        
        // Add event listener to the fallback close button
        const fallbackCloseButton = this.fallbackMessage.querySelector('.fallback-close-button');
        if (fallbackCloseButton) {
            fallbackCloseButton.addEventListener('click', () => this.hideCameraInterface());
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
     * Show the camera interface at the specified position
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     */
    showCameraInterface(x, y) {
        console.log('CameraTool: showCameraInterface called', { x, y });
        
        // Store the capture position
        this.capturePosition = { x, y };
        
        // Create the interface if it doesn't exist
        if (!this.cameraInterface) {
            console.log('CameraTool: Camera interface does not exist, creating it');
            this.createCameraInterface();
        } else {
            console.log('CameraTool: Camera interface already exists');
        }
        
        // Show the interface
        this.cameraInterface.style.display = 'flex';
        console.log('CameraTool: Camera interface display set to flex');
        
        // If camera is supported, initialize it
        if (this.isCameraSupported) {
            console.log('CameraTool: Camera is supported, initializing camera');
            this.initializeCamera();
        } else {
            console.log('CameraTool: Camera is not supported, showing fallback message');
            this.showFallbackMessage();
        }
    }
    
    /**
     * Initialize the camera
     */
    async initializeCamera() {
        console.log('CameraTool: Starting camera initialization');
        this.showLoadingIndicator('Initializing camera...'); // Make sure loading indicator is visible with default message
        
        try {
            // Check if camera manager exists
            if (!this.cameraManager) {
                console.error('CameraTool: Camera manager is not initialized');
                this.showError('Camera initialization failed - manager not found');
                return;
            }
            
            console.log('CameraTool: Calling cameraManager.initialize()');
            // Initialize the camera
            const initSuccess = await this.cameraManager.initialize();
            console.log('CameraTool: Camera initialization result:', initSuccess);
            
            if (!initSuccess) {
                console.error('CameraTool: Camera initialization returned false');
                this.showError('Failed to initialize camera');
                return;
            }
            
            // Set the video source
            if (this.videoElement) {
                console.log('CameraTool: Setting video source from camera stream');
                this.videoElement.srcObject = this.cameraManager.stream;
                
                // Add a timeout to hide the loading indicator in case the events don't fire
                const videoReadyTimeout = setTimeout(() => {
                    console.log('CameraTool: Video ready timeout reached, hiding loading indicator');
                    this.hideLoadingIndicator();
                }, 3000); // 3 second timeout
                
                // Hide loading indicator once video starts playing
                this.videoElement.onloadedmetadata = () => {
                    console.log('CameraTool: Video metadata loaded');
                    // Don't hide yet, wait for playback to start
                };
                
                this.videoElement.oncanplay = () => {
                    console.log('CameraTool: Video can play');
                    clearTimeout(videoReadyTimeout);
                    this.hideLoadingIndicator();
                };
                
                this.videoElement.onplay = () => {
                    console.log('CameraTool: Video started playing');
                    clearTimeout(videoReadyTimeout);
                    this.hideLoadingIndicator();
                };
                
                // Handle errors
                this.videoElement.onerror = (error) => {
                    console.error('CameraTool: Video element error:', error);
                    clearTimeout(videoReadyTimeout);
                    this.showError('Camera video error');
                };
            } else {
                console.error('CameraTool: Video element not found');
                this.showError('Camera interface error');
                return;
            }
            
            // Request fullscreen on mobile for better experience
            if (this.isMobile && this.cameraInterface && this.cameraInterface.requestFullscreen) {
                try {
                    console.log('CameraTool: Requesting fullscreen');
                    await this.cameraInterface.requestFullscreen();
                    console.log('CameraTool: Fullscreen request successful');
                } catch (error) {
                    // Fullscreen request failed, but we can continue without it
                    console.warn('CameraTool: Fullscreen request failed:', error);
                }
            }
            
            console.log('CameraTool: Camera initialization completed successfully');
        } catch (error) {
            console.error('CameraTool: Failed to initialize camera', error);
            this.showError('Failed to access camera');
        }
    }
    
    /**
     * Show loading indicator
     * @param {string} message - Optional custom message to display
     */
    showLoadingIndicator(message = null) {
        console.log('CameraTool: Showing loading indicator', { customMessage: message });
        if (this.loadingIndicator) {
            // Update message text if provided
            if (message) {
                const loadingText = this.loadingIndicator.querySelector('.loading-text');
                if (loadingText) {
                    loadingText.textContent = message;
                }
            }
            
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
        console.log('CameraTool: Hiding loading indicator');
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
            this.hideFileUploadFallback();
            this.hideLoadingIndicator();
        }
    }
    
    /**
     * Show the fallback message for unsupported browsers
     */
    showFallbackMessage() {
        if (this.fallbackMessage) {
            this.fallbackMessage.style.display = 'flex';
            
            // Update fallback message content
            this.fallbackMessage.innerHTML = `
                <div class="fallback-icon">📷</div>
                <h3>Camera Not Supported</h3>
                <p>Your browser doesn't support camera access or permission was denied.</p>
                <p>Try using a modern browser like Chrome, Firefox, Safari, or Edge.</p>
                <p>Make sure you're using HTTPS and have granted camera permissions.</p>
                <button class="fallback-close-button">Close</button>
            `;
            
            // Add event listener to the fallback close button
            const fallbackCloseButton = this.fallbackMessage.querySelector('.fallback-close-button');
            if (fallbackCloseButton) {
                fallbackCloseButton.addEventListener('click', () => this.hideCameraInterface());
                fallbackCloseButton.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    this.hideCameraInterface();
                });
            }
            
            // Hide other UI elements
            if (this.videoElement) this.videoElement.style.display = 'none';
            if (this.captureButton) this.captureButton.style.display = 'none';
            if (this.switchButton) this.switchButton.style.display = 'none';
        }
    }
    
    /**
     * Hide the fallback message
     */
    hideFallbackMessage() {
        console.log('CameraTool: Hiding fallback message');
        
        if (this.fallbackMessage) {
            this.fallbackMessage.style.display = 'none';
            
            // Show other UI elements if camera is supported
            if (this.isCameraSupported) {
                if (this.videoElement) this.videoElement.style.display = 'block';
                if (this.captureButton) this.captureButton.style.display = 'flex';
                if (this.switchButton) this.switchButton.style.display = 'flex';
            }
        }
    }
    
    /**
     * Show file upload fallback when camera is not available
     */
    showFileUploadFallback() {
        // Create file upload fallback if it doesn't exist
        if (!this.fileUploadFallback) {
            this.fileUploadFallback = document.createElement('div');
            this.fileUploadFallback.className = 'camera-file-upload-fallback';
            this.fileUploadFallback.innerHTML = `
                <p>You can upload an image instead:</p>
                <input type="file" accept="image/*" class="file-upload-input">
                <button class="file-upload-button">Upload Image</button>
            `;
            
            // Add to camera interface
            this.cameraInterface.appendChild(this.fileUploadFallback);
            
            // Add event listeners
            const fileInput = this.fileUploadFallback.querySelector('.file-upload-input');
            const uploadButton = this.fileUploadFallback.querySelector('.file-upload-button');
            
            uploadButton.addEventListener('click', () => {
                fileInput.click();
            });
            
            fileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    const reader = new FileReader();
                    
                    reader.onload = (event) => {
                        this.processUploadedImage(event.target.result);
                    };
                    
                    reader.readAsDataURL(file);
                }
            });
        }
        
        // Show the file upload fallback
        this.fileUploadFallback.style.display = 'flex';
    }
    
    /**
     * Hide file upload fallback
     */
    hideFileUploadFallback() {
        if (this.fileUploadFallback) {
            this.fileUploadFallback.style.display = 'none';
        }
    }
    
    /**
     * Process an uploaded image
     * @param {string} dataUrl - The data URL of the uploaded image
     */
    processUploadedImage(dataUrl) {
        console.log('CameraTool: Processing uploaded image');
        
        // Create an image element to get dimensions
        const img = new Image();
        img.onload = () => {
            // Create a canvas to process the image
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set canvas dimensions
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Draw the image
            ctx.drawImage(img, 0, 0);
            
            // Get the processed data URL
            const processedDataUrl = canvas.toDataURL('image/jpeg');
            
            // Add the image to the canvas
            this.addImageToCanvas(processedDataUrl);
            
            // Hide the camera interface
            this.hideCameraInterface();
        };
        
        img.src = dataUrl;
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
        console.log('CameraTool: capturePhoto called');
        
        if (!this.cameraManager) {
            console.error('CameraTool: Cannot capture photo - camera manager not found');
            this.showError('Camera is not available');
            return;
        }
        
        if (!this.cameraManager.isActive()) {
            console.error('CameraTool: Cannot capture photo - camera not active');
            console.log('CameraTool: Camera state:', {
                isInitialized: this.cameraManager.isInitialized,
                hasStream: !!this.cameraManager.stream,
                hasVideoElement: !!this.cameraManager.videoElement
            });
            
            // Try to reinitialize the camera
            console.log('CameraTool: Attempting to reinitialize camera');
            try {
                await this.cameraManager.initialize();
                // If initialization succeeds, continue with capture
                if (!this.cameraManager.isActive()) {
                    console.error('CameraTool: Reinitialization failed - camera still not active');
                    this.showError('Camera is not active');
                    return;
                }
            } catch (error) {
                console.error('CameraTool: Reinitialization failed with error:', error);
                this.showError('Camera is not active');
                return;
            }
        }
        
        try {
            // Show visual feedback for capture
            if (this.videoElement) {
                this.videoElement.classList.add('flash');
                setTimeout(() => {
                    this.videoElement.classList.remove('flash');
                }, 300);
            }
            
            console.log('CameraTool: Attempting to capture frame from camera');
            // Capture frame from video - pass false to disable orientation correction
            let imageDataUrl = this.cameraManager.captureFrame(false);
            
            // If capture fails, try a fallback method
            if (!imageDataUrl && this.videoElement) {
                console.log('CameraTool: Primary capture failed, trying fallback method');
                try {
                    // Create a canvas and capture directly from the video element
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    
                    // Set canvas dimensions to match video
                    canvas.width = this.videoElement.videoWidth || 640;
                    canvas.height = this.videoElement.videoHeight || 480;
                    
                    // Draw the current video frame to the canvas
                    context.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);
                    
                    // Convert to data URL
                    imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
                    console.log('CameraTool: Fallback capture successful, data URL length:', imageDataUrl.length);
                } catch (fallbackError) {
                    console.error('CameraTool: Fallback capture also failed:', fallbackError);
                }
            }
            
            if (!imageDataUrl) {
                console.error('CameraTool: Failed to capture frame');
                this.showError('Failed to capture photo');
                return;
            }
            
            console.log('CameraTool: Frame captured successfully, data URL length:', imageDataUrl.length);
            
            // Show loading indicator with custom message for polaroid creation
            this.showLoadingIndicator("Creating polaroid this may take a second >.<");
            
            // Store the original image data URL as a fallback
            const originalImageDataUrl = imageDataUrl;
            let finalImageUrl = null;
            let isStorageUrl = false;
            
            try {
                // Get Firebase manager from canvas manager
                const firebaseManager = this.canvasManager ? this.canvasManager.firebaseManager : null;
                console.log('CameraTool: Firebase manager available:', !!firebaseManager);
                
                console.log('CameraTool: Starting Polaroid formatting');
                // Apply Polaroid effect and upload to Firebase in one step
                const timestamp = PolaroidFormatter.getTimestampCaption();
                
                // Set a timeout for the entire process
                const processingTimeout = setTimeout(() => {
                    console.error('CameraTool: Processing timeout reached, using fallback');
                    if (!finalImageUrl) {
                        // Use the original image data URL as a fallback
                        this.addImageToCanvas(originalImageDataUrl, false);
                        this.hideLoadingIndicator();
                        this.hideCameraInterface();
                    }
                }, 15000); // 15 second timeout
                
                try {
                    const imageUrl = await PolaroidFormatter.format(imageDataUrl, {
                        caption: timestamp,
                        firebaseManager: firebaseManager,
                        uploadToFirebase: !!firebaseManager
                    });
                    
                    console.log('CameraTool: Polaroid formatting complete, URL type:', 
                        imageUrl.startsWith('data:') ? 'data URL' : 'Firebase URL');
                    
                    // Clear the timeout since we got a result
                    clearTimeout(processingTimeout);
                    
                    // Store the result
                    finalImageUrl = imageUrl;
                    isStorageUrl = !imageUrl.startsWith('data:');
                    
                    // Add the image to the canvas
                    console.log('CameraTool: Adding image to canvas');
                    this.addImageToCanvas(finalImageUrl, isStorageUrl);
                    console.log('CameraTool: Image added to canvas');
                } catch (processingError) {
                    console.error('CameraTool: Error in Polaroid formatting or upload:', processingError);
                    
                    // Clear the timeout since we're handling the error
                    clearTimeout(processingTimeout);
                    
                    // Use the original image data URL as a fallback
                    console.log('CameraTool: Using original image as fallback');
                    finalImageUrl = originalImageDataUrl;
                    isStorageUrl = false;
                    
                    // Add the image to the canvas
                    this.addImageToCanvas(finalImageUrl, isStorageUrl);
                }
            } catch (error) {
                console.error('CameraTool: Error processing photo:', error);
                
                // Try to add the raw image to the canvas as a fallback
                try {
                    console.log('CameraTool: Attempting to add raw image as fallback');
                    this.addImageToCanvas(originalImageDataUrl, false);
                } catch (fallbackError) {
                    console.error('CameraTool: Fallback image addition also failed:', fallbackError);
                    this.showError('Failed to process photo');
                }
            } finally {
                this.hideLoadingIndicator();
                
                // Hide camera interface after capture
                this.hideCameraInterface();
            }
        } catch (error) {
            console.error('CameraTool: Error capturing photo:', error);
            this.hideLoadingIndicator();
            this.showError('Failed to process photo');
            
            // Hide camera interface after error
            this.hideCameraInterface();
        }
    }
    
    /**
     * Add the captured image to the canvas
     * @param {string} imageUrl - The image data URL or Firebase Storage URL
     * @param {boolean} isStorageUrl - Whether the URL is a Firebase Storage URL
     */
    addImageToCanvas(imageUrl, isStorageUrl = false) {
        console.log('CameraTool: addImageToCanvas called', {
            isStorageUrl: isStorageUrl,
            urlType: imageUrl.startsWith('data:') ? 'data URL' : 'remote URL',
            urlLength: imageUrl.length
        });
        
        // Create a temporary image to get dimensions
        const tempImage = new Image();
        
        tempImage.onload = () => {
            console.log('CameraTool: Temporary image loaded successfully', {
                width: tempImage.width,
                height: tempImage.height
            });
            
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
            
            console.log('CameraTool: Calculated dimensions for canvas', {
                width: width,
                height: height,
                maxSize: maxSize
            });
            
            // Remove random rotation - set to 0 instead of using PolaroidFormatter.getRandomRotation
            const rotation = 0;
            
            // Create the image element
            console.log('CameraTool: Creating ImageElement');
            const imageElement = new ImageElement({
                src: imageUrl,
                x: this.capturePosition.x - (width / 2),
                y: this.capturePosition.y - (height / 2),
                width: width,
                height: height,
                rotation: rotation,
                isStorageUrl: isStorageUrl
            });
            
            // Add to canvas
            console.log('CameraTool: Adding ImageElement to canvas');
            this.canvasManager.addElement(imageElement);
            console.log('CameraTool: ImageElement added to canvas successfully');
        };
        
        tempImage.onerror = (error) => {
            console.error('CameraTool: Error loading image:', error);
            console.error('CameraTool: Image URL type:', imageUrl.substring(0, 30) + '...');
            this.showError('Failed to process the captured image');
        };
        
        console.log('CameraTool: Setting temporary image source');
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