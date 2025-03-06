/**
 * CameraManager class
 * Handles camera access and management
 */
export class CameraManager {
    /**
     * Constructor
     */
    constructor() {
        this.stream = null;
        this.videoElement = null;
        this.facingMode = 'user'; // Default to front camera
        this.isInitialized = false;
        this.onErrorCallback = null;
        this.currentOrientation = window.orientation || 0;
        this.orientationChangeHandler = null;
        
        console.log('CameraManager: Initialized');
    }

    /**
     * Initialize the camera
     * @param {HTMLVideoElement} videoElement - The video element to display the camera feed
     * @param {Function} onError - Error callback function
     * @returns {Promise<boolean>} - Whether initialization was successful
     */
    async initialize(videoElement, onError = null) {
        this.videoElement = videoElement;
        this.onErrorCallback = onError;

        console.log('CameraManager: Attempting to initialize camera with facing mode:', this.facingMode);
        console.log('CameraManager: Current device orientation:', this.currentOrientation);

        try {
            // Check if the MediaDevices API is supported
            if (!navigator.mediaDevices) {
                console.error('CameraManager: MediaDevices API is not supported in this browser');
                throw new Error('Camera API is not supported in this browser');
            }
            
            if (!navigator.mediaDevices.getUserMedia) {
                console.error('CameraManager: getUserMedia is not supported in this browser');
                throw new Error('Camera API is not supported in this browser');
            }

            // Check if we're in a secure context (HTTPS)
            if (!window.isSecureContext) {
                console.error('CameraManager: Not in a secure context (HTTPS), camera access may be restricted');
                // We'll still try to access the camera, but log the warning
            }

            console.log('CameraManager: Requesting camera permissions...');
            
            try {
                // Get camera stream with appropriate constraints for the device
                this.stream = await this._getStreamWithOrientationConstraints();
            } catch (streamError) {
                console.warn('CameraManager: Failed with initial constraints, trying fallback constraints', streamError);
                
                // Try with minimal constraints as fallback
                const fallbackConstraints = {
                    video: true,
                    audio: false
                };
                
                console.log('CameraManager: Using fallback constraints:', JSON.stringify(fallbackConstraints));
                this.stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
            }

            console.log('CameraManager: Camera permissions granted');
            console.log('CameraManager: Stream tracks:', this.stream.getVideoTracks().map(track => ({
                label: track.label,
                id: track.id,
                enabled: track.enabled,
                muted: track.muted
            })));

            // Set the stream as the video source
            this.videoElement.srcObject = this.stream;
            
            // Wait for the video to be ready
            await new Promise(resolve => {
                this.videoElement.onloadedmetadata = () => {
                    console.log('CameraManager: Video metadata loaded, dimensions:', {
                        videoWidth: this.videoElement.videoWidth,
                        videoHeight: this.videoElement.videoHeight
                    });
                    this.videoElement.play().catch(playError => {
                        console.warn('CameraManager: Error playing video:', playError);
                        // Continue anyway, as we might still be able to capture frames
                    });
                    resolve();
                };
                
                // Add timeout in case metadata never loads
                setTimeout(() => {
                    console.warn('CameraManager: Video metadata load timeout');
                    resolve();
                }, 3000);
            });

            // Set up orientation change listener
            this._setupOrientationChangeListener();

            this.isInitialized = true;
            console.log('CameraManager: Camera successfully initialized');
            return true;
        } catch (error) {
            // Log detailed error information
            console.error('CameraManager: Initialization error:', error);
            console.error('CameraManager: Error name:', error.name);
            console.error('CameraManager: Error message:', error.message);
            
            let errorMessage = 'Failed to access camera';
            
            // Provide more specific error messages based on error type
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                errorMessage = 'Camera access denied. Please allow camera permissions in your browser settings.';
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                errorMessage = 'No camera found on this device.';
            } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
                errorMessage = 'Camera is already in use by another application.';
            } else if (error.name === 'OverconstrainedError') {
                errorMessage = 'Camera constraints cannot be satisfied.';
            } else if (error.name === 'TypeError' || error.message.includes('API')) {
                errorMessage = 'Camera API is not supported in this browser.';
            } else if (!window.isSecureContext) {
                errorMessage = 'Camera access requires a secure connection (HTTPS).';
            }
            
            if (this.onErrorCallback) {
                this.onErrorCallback(errorMessage);
            }
            return false;
        }
    }

    /**
     * Get camera stream with appropriate constraints based on device orientation
     * @returns {MediaStream} - The camera stream
     * @private
     */
    async _getStreamWithOrientationConstraints() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isPortrait = window.matchMedia("(orientation: portrait)").matches;
        
        console.log('CameraManager: Device detection - Mobile:', isMobile, 'Portrait:', isPortrait);
        
        // Base constraints
        const constraints = {
            video: {
                facingMode: this.facingMode
            },
            audio: false
        };
        
        // Add ideal dimensions based on orientation
        if (isMobile) {
            if (isPortrait) {
                // Portrait mode - taller than wide
                constraints.video.width = { ideal: 720 };
                constraints.video.height = { ideal: 1280 };
            } else {
                // Landscape mode - wider than tall
                constraints.video.width = { ideal: 1280 };
                constraints.video.height = { ideal: 720 };
            }
        } else {
            // Desktop - standard 16:9 aspect ratio
            constraints.video.width = { ideal: 1280 };
            constraints.video.height = { ideal: 720 };
        }
        
        console.log('CameraManager: Using constraints:', JSON.stringify(constraints));
        return navigator.mediaDevices.getUserMedia(constraints);
    }

    /**
     * Set up orientation change listener
     * @private
     */
    _setupOrientationChangeListener() {
        // Remove any existing listener
        this._removeOrientationChangeListener();
        
        // Create new listener
        this.orientationChangeHandler = async () => {
            const newOrientation = window.orientation || 0;
            console.log('CameraManager: Orientation changed from', this.currentOrientation, 'to', newOrientation);
            this.currentOrientation = newOrientation;
            
            // Only reinitialize if camera is already active
            if (this.isInitialized) {
                console.log('CameraManager: Reinitializing camera due to orientation change');
                
                // Stop current stream
                this.stop();
                
                // Short delay to allow camera to reset
                await new Promise(resolve => setTimeout(resolve, 300));
                
                // Reinitialize with same facing mode
                await this.initialize(this.videoElement, this.onErrorCallback);
            }
        };
        
        // Add the listener
        if (window.orientation !== undefined) {
            window.addEventListener('orientationchange', this.orientationChangeHandler);
            console.log('CameraManager: Orientation change listener added');
        } else {
            window.matchMedia("(orientation: portrait)").addEventListener('change', this.orientationChangeHandler);
            console.log('CameraManager: Orientation media query listener added');
        }
    }

    /**
     * Remove orientation change listener
     * @private
     */
    _removeOrientationChangeListener() {
        if (this.orientationChangeHandler) {
            if (window.orientation !== undefined) {
                window.removeEventListener('orientationchange', this.orientationChangeHandler);
            } else {
                window.matchMedia("(orientation: portrait)").removeEventListener('change', this.orientationChangeHandler);
            }
            this.orientationChangeHandler = null;
            console.log('CameraManager: Orientation change listener removed');
        }
    }

    /**
     * Switch between front and back cameras
     * @returns {Promise<boolean>} - Whether the switch was successful
     */
    async switchCamera() {
        console.log('CameraManager: Switching camera from', this.facingMode);
        
        // Stop current stream
        this.stop();

        // Toggle facing mode
        this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
        console.log('CameraManager: New facing mode:', this.facingMode);

        // Reinitialize with new facing mode
        return this.initialize(this.videoElement, this.onErrorCallback);
    }

    /**
     * Capture a frame from the video stream
     * @param {boolean} applyOrientationCorrection - Whether to apply orientation correction (default: false)
     * @returns {string|null} - Data URL of the captured image or null if failed
     */
    captureFrame(applyOrientationCorrection = false) {
        if (!this.isInitialized || !this.videoElement) {
            console.error('CameraManager: Cannot capture frame - camera not initialized');
            return null;
        }

        try {
            console.log('CameraManager: Capturing frame from video stream');
            
            // Create a canvas element to capture the frame
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            // Set canvas dimensions to match video
            canvas.width = this.videoElement.videoWidth;
            canvas.height = this.videoElement.videoHeight;
            
            console.log('CameraManager: Capture dimensions:', {
                width: canvas.width,
                height: canvas.height
            });
            
            // Check if we need to handle orientation for mobile devices
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            if (isMobile && applyOrientationCorrection) {
                // Apply transformations based on device orientation
                this._applyOrientationCorrection(context, canvas.width, canvas.height);
            }
            
            // Draw the current video frame to the canvas
            context.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);
            
            // Convert to data URL
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            console.log('CameraManager: Frame captured successfully');
            return dataUrl;
        } catch (error) {
            console.error('CameraManager: Error capturing frame:', error);
            return null;
        }
    }

    /**
     * Apply orientation correction to the canvas context
     * @param {CanvasRenderingContext2D} context - The canvas context
     * @param {number} width - The canvas width
     * @param {number} height - The canvas height
     * @private
     */
    _applyOrientationCorrection(context, width, height) {
        // Get current orientation
        const orientation = window.orientation || 0;
        console.log('CameraManager: Applying orientation correction for', orientation, 'degrees');
        
        // Apply transformations based on orientation
        context.save();
        
        // Translate and rotate based on orientation
        switch (orientation) {
            case -90: // Landscape right
                context.translate(0, height);
                context.rotate(-Math.PI/2);
                break;
            case 90: // Landscape left
                context.translate(width, 0);
                context.rotate(Math.PI/2);
                break;
            case 180: // Upside down
                context.translate(width, height);
                context.rotate(Math.PI);
                break;
            default: // Normal orientation (0)
                // No transformation needed
                break;
        }
        
        // iOS specific handling for front camera mirroring
        if (this.facingMode === 'user' && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            if (orientation === 0 || orientation === 180) {
                context.translate(width, 0);
                context.scale(-1, 1);
            } else {
                context.translate(0, height);
                context.scale(1, -1);
            }
        }
    }

    /**
     * Stop the camera stream
     */
    stop() {
        console.log('CameraManager: Stopping camera stream');
        
        if (this.stream) {
            // Stop all tracks in the stream
            this.stream.getTracks().forEach(track => {
                console.log('CameraManager: Stopping track:', track.label);
                track.stop();
            });
            this.stream = null;
        }
        
        if (this.videoElement) {
            this.videoElement.srcObject = null;
        }
        
        this.isInitialized = false;
        console.log('CameraManager: Camera stream stopped');
    }

    /**
     * Clean up resources when the camera manager is no longer needed
     */
    dispose() {
        this.stop();
        this._removeOrientationChangeListener();
        console.log('CameraManager: Resources disposed');
    }

    /**
     * Check if the camera is initialized
     * @returns {boolean} - Whether the camera is initialized
     */
    isActive() {
        return this.isInitialized;
    }

    /**
     * Get the current facing mode
     * @returns {string} - The current facing mode ('user' or 'environment')
     */
    getFacingMode() {
        return this.facingMode;
    }
    
    /**
     * Check if the browser supports the camera API
     * @returns {boolean} - Whether the camera API is supported
     */
    static isSupported() {
        // Check if the MediaDevices API and getUserMedia are available
        const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
        
        // Additional check for secure context (HTTPS) which is required for camera access
        const isSecureContext = window.isSecureContext;
        
        // Log detailed information about the environment
        console.log('CameraManager: Environment check:', {
            hasMediaDevices,
            isSecureContext,
            protocol: window.location.protocol,
            userAgent: navigator.userAgent
        });
        
        // Consider the camera supported if we have the necessary APIs and are in a secure context
        const isSupported = hasMediaDevices && isSecureContext;
        console.log('CameraManager: Camera API supported:', isSupported);
        
        return isSupported;
    }
} 