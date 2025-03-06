/**
 * CameraManager class
 * Handles camera access and management
 */
export class CameraManager {
    /**
     * Constructor
     */
    constructor() {
        // Camera state
        this.stream = null;
        this.videoElement = null;
        this.isInitialized = false;
        this.facingMode = 'environment'; // Default to back camera
        
        // Track orientation for mobile devices
        this.currentOrientation = window.orientation || 0;
        this.orientationChangeListener = null;
        this.orientationMediaQueryListener = null;
    }

    /**
     * Initialize the camera
     * @returns {Promise<boolean>} - Promise resolving to true if initialization was successful
     */
    async initialize() {
        try {
            console.log('CameraManager: Starting initialization');
            
            // Check if camera API is supported
            if (!this.constructor.isSupported()) {
                console.error('CameraManager: MediaDevices API is not supported in this browser');
                throw new Error('Camera API not supported');
            }
            
            // Check if we're in a secure context (HTTPS)
            if (!window.isSecureContext) {
                console.error('CameraManager: Not in a secure context (HTTPS), camera access may be restricted');
            }
            
            // Request camera permissions
            const constraints = this._getVideoConstraints();
            console.log('CameraManager: Using video constraints:', constraints);
            
            try {
                console.log('CameraManager: Requesting camera access with constraints');
                this.stream = await navigator.mediaDevices.getUserMedia({ 
                    video: constraints,
                    audio: false 
                });
                console.log('CameraManager: Camera access granted successfully');
            } catch (error) {
                console.error('CameraManager: Error with initial constraints:', error);
                
                // If the constraints fail, try with basic constraints
                if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
                    console.log('CameraManager: Falling back to basic constraints');
                    const fallbackConstraints = { facingMode: this.facingMode };
                    console.log('CameraManager: Using fallback constraints:', fallbackConstraints);
                    
                    try {
                        this.stream = await navigator.mediaDevices.getUserMedia({ 
                            video: fallbackConstraints,
                            audio: false 
                        });
                        console.log('CameraManager: Camera access granted with fallback constraints');
                    } catch (fallbackError) {
                        console.error('CameraManager: Fallback constraints also failed:', fallbackError);
                        throw fallbackError;
                    }
                } else {
                    throw error;
                }
            }
            
            // Create a video element if not provided
            if (!this.videoElement) {
                console.log('CameraManager: Creating new video element');
                this.videoElement = document.createElement('video');
                this.videoElement.autoplay = true;
                this.videoElement.playsInline = true; // Important for iOS
                this.videoElement.muted = true;
            } else {
                console.log('CameraManager: Using existing video element');
            }
            
            // Set the stream as the video source
            console.log('CameraManager: Setting stream as video source');
            this.videoElement.srcObject = this.stream;
            
            // Wait for video metadata to load
            console.log('CameraManager: Waiting for video metadata to load');
            await new Promise((resolve) => {
                if (this.videoElement.readyState >= 2) {
                    console.log('CameraManager: Video metadata already loaded');
                    resolve();
                } else {
                    console.log('CameraManager: Setting onloadedmetadata handler');
                    this.videoElement.onloadedmetadata = () => {
                        console.log('CameraManager: Video metadata loaded');
                        resolve();
                    };
                }
            });
            
            // Start playing the video
            console.log('CameraManager: Starting video playback');
            try {
                await this.videoElement.play();
                console.log('CameraManager: Video playback started successfully');
            } catch (playError) {
                console.error('CameraManager: Error starting video playback:', playError);
                throw playError;
            }
            
            // Set up orientation change listener for mobile devices
            this._setupOrientationChangeListener();
            
            // Mark as initialized
            this.isInitialized = true;
            console.log('CameraManager: Initialization completed successfully');
            
            return true;
        } catch (error) {
            console.error('CameraManager: Initialization error:', error);
            console.error('CameraManager: Error name:', error.name);
            console.error('CameraManager: Error message:', error.message);
            this.isInitialized = false;
            return false;
        }
    }

    /**
     * Get video constraints based on device type and orientation
     * @returns {Object} - Video constraints
     * @private
     */
    _getVideoConstraints() {
        // Check if on mobile device
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Check if in portrait or landscape orientation
        const isPortrait = window.matchMedia("(orientation: portrait)").matches;
        
        // Basic constraints with facing mode
        const constraints = {
            facingMode: this.facingMode,
            width: { ideal: isPortrait ? 720 : 1280 },
            height: { ideal: isPortrait ? 1280 : 720 }
        };
        
        return constraints;
    }

    /**
     * Set up orientation change listener for mobile devices
     * @private
     */
    _setupOrientationChangeListener() {
        // Remove any existing listeners
        this._removeOrientationChangeListener();
        
        // Listen for orientation changes
        this.orientationChangeListener = () => {
            const newOrientation = window.orientation || 0;
            
            // Only reinitialize if orientation actually changed
            if (newOrientation !== this.currentOrientation) {
                this.currentOrientation = newOrientation;
                
                // Reinitialize camera with new orientation
                setTimeout(() => {
                    this.stop();
                    this.initialize();
                }, 500); // Delay to allow for orientation change to complete
            }
        };
        
        // Add orientation change listener
        window.addEventListener('orientationchange', this.orientationChangeListener);
        
        // Also listen for orientation changes via media query for devices that don't support window.orientation
        const mediaQuery = window.matchMedia("(orientation: portrait)");
        this.orientationMediaQueryListener = (e) => {
            // Reinitialize camera when orientation changes
            setTimeout(() => {
                this.stop();
                this.initialize();
            }, 500);
        };
        
        // Add media query listener
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', this.orientationMediaQueryListener);
        } else {
            // Fallback for older browsers
            mediaQuery.addListener(this.orientationMediaQueryListener);
        }
    }

    /**
     * Remove orientation change listeners
     * @private
     */
    _removeOrientationChangeListener() {
        if (this.orientationChangeListener) {
            window.removeEventListener('orientationchange', this.orientationChangeListener);
            this.orientationChangeListener = null;
        }
        
        if (this.orientationMediaQueryListener) {
            const mediaQuery = window.matchMedia("(orientation: portrait)");
            if (mediaQuery.removeEventListener) {
                mediaQuery.removeEventListener('change', this.orientationMediaQueryListener);
            } else {
                // Fallback for older browsers
                mediaQuery.removeListener(this.orientationMediaQueryListener);
            }
            this.orientationMediaQueryListener = null;
        }
    }

    /**
     * Switch between front and back cameras
     * @returns {Promise<boolean>} - Promise resolving to true if switch was successful
     */
    async switchCamera() {
        // Toggle facing mode
        this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
        
        // Stop current stream
        this.stop();
        
        // Reinitialize with new facing mode
        try {
            const success = await this.initialize();
            return success;
        } catch (error) {
            console.error('CameraManager: Error switching camera:', error);
            return false;
        }
    }

    /**
     * Capture a frame from the video stream
     * @param {boolean} applyOrientationCorrection - Whether to apply orientation correction (default: false)
     * @returns {string|null} - Data URL of the captured image or null if failed
     */
    captureFrame(applyOrientationCorrection = false) {
        console.log('CameraManager: captureFrame called', {
            isInitialized: this.isInitialized,
            hasVideoElement: !!this.videoElement,
            applyOrientationCorrection: applyOrientationCorrection
        });
        
        if (!this.isInitialized || !this.videoElement) {
            console.error('CameraManager: Cannot capture frame - camera not initialized');
            return null;
        }

        try {
            // Check if video is ready
            if (this.videoElement.readyState < 2) {
                console.error('CameraManager: Video element not ready for capture', {
                    readyState: this.videoElement.readyState,
                    videoWidth: this.videoElement.videoWidth,
                    videoHeight: this.videoElement.videoHeight
                });
                return null;
            }
            
            // Check if video has dimensions
            if (!this.videoElement.videoWidth || !this.videoElement.videoHeight) {
                console.error('CameraManager: Video dimensions not available', {
                    videoWidth: this.videoElement.videoWidth,
                    videoHeight: this.videoElement.videoHeight
                });
                return null;
            }
            
            console.log('CameraManager: Creating canvas for frame capture', {
                videoWidth: this.videoElement.videoWidth,
                videoHeight: this.videoElement.videoHeight
            });
            
            // Create a canvas element to capture the frame
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            // Set canvas dimensions to match video
            canvas.width = this.videoElement.videoWidth;
            canvas.height = this.videoElement.videoHeight;
            
            // Check if we need to handle orientation for mobile devices
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            if (isMobile && applyOrientationCorrection) {
                console.log('CameraManager: Applying orientation correction for mobile device');
                // Apply transformations based on device orientation
                this._applyOrientationCorrection(context, canvas.width, canvas.height);
            }
            
            // Draw the current video frame to the canvas
            console.log('CameraManager: Drawing video frame to canvas');
            context.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);
            
            // Convert to data URL
            console.log('CameraManager: Converting canvas to data URL');
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            
            console.log('CameraManager: Frame captured successfully', {
                dataUrlLength: dataUrl.length
            });
            
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
        if (this.stream) {
            // Stop all tracks
            const tracks = this.stream.getTracks();
            tracks.forEach(track => {
                track.stop();
            });
            
            this.stream = null;
        }
        
        // Clear video source
        if (this.videoElement) {
            this.videoElement.srcObject = null;
        }
        
        // Remove orientation change listener
        this._removeOrientationChangeListener();
        
        // Reset state
        this.isInitialized = false;
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.stop();
        this.videoElement = null;
    }

    /**
     * Check if the camera is active
     * @returns {boolean} - True if the camera is initialized and active
     */
    isActive() {
        return this.isInitialized && this.stream !== null;
    }

    /**
     * Check if the camera API is supported in this browser
     * @returns {boolean} - True if the camera API is supported
     * @static
     */
    static isSupported() {
        // Check if navigator.mediaDevices exists
        const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
        
        // Check if getUserMedia exists (for older browsers)
        const hasGetUserMedia = !!(navigator.getUserMedia || navigator.webkitGetUserMedia || 
                                 navigator.mozGetUserMedia || navigator.msGetUserMedia);
        
        // Check if we're in a secure context (HTTPS)
        const isSecureContext = window.isSecureContext;
        
        return (hasMediaDevices || hasGetUserMedia) && isSecureContext;
    }
} 