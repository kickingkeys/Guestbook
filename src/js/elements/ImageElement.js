import { CanvasElement } from './CanvasElement.js';

/**
 * ImageElement class
 * Represents an image on the canvas
 */
export class ImageElement extends CanvasElement {
    /**
     * Constructor
     * @param {Object} options - Element options
     * @param {string} options.src - Image source URL
     * @param {number} options.x - X position
     * @param {number} options.y - Y position
     * @param {number} options.width - Image width
     * @param {number} options.height - Image height
     */
    constructor(options = {}) {
        super(options);
        
        // Set element type
        this.type = 'image';
        
        // Image properties
        this.src = options.src || '';
        this.width = options.width || 200;
        this.height = options.height || 200;
        this.isStorageUrl = options.isStorageUrl || this._isFirebaseStorageUrl(this.src);
        this.opacity = options.opacity !== undefined ? options.opacity : 1;
        
        // Original dimensions (for aspect ratio)
        this.originalWidth = options.originalWidth || this.width;
        this.originalHeight = options.originalHeight || this.height;
        
        // Create and load the image
        this.image = new Image();
        
        // Image loaded state
        this.isLoaded = false;
        
        // Set up image load event
        this.image.onload = () => {
            this.isLoaded = true;
            
            // If no width/height was provided, use the image's natural dimensions
            if (!options.width || !options.height) {
                this.width = this.image.naturalWidth;
                this.height = this.image.naturalHeight;
                
                // Store original dimensions
                this.originalWidth = this.width;
                this.originalHeight = this.height;
                
                // Scale down if too large
                this._scaleDownIfTooLarge();
            }
            
            console.log('[IMAGE] Image loaded successfully:', {
                src: this.src ? (this.src.substring(0, 30) + '...') : 'undefined',
                naturalWidth: this.image.naturalWidth,
                naturalHeight: this.image.naturalHeight,
                width: this.width,
                height: this.height
            });
        };
        
        // Set up error handler
        this.image.onerror = () => {
            console.error('Failed to load image:', this.src ? (this.src.substring(0, 30) + '...') : 'undefined');
            this.isLoaded = false;
            
            // Check if this is a truncated image and attempt recovery
            if (this.src === 'data:image/png;base64,TRUNCATED_FOR_FIRESTORE') {
                console.log('[IMAGE] Detected truncated image, attempting to recover...');
                this._attemptTruncatedImageRecovery();
            } else if (this.isStorageUrl) {
                // For Firebase Storage URLs, try to reload the image with cache-busting
                console.log('[IMAGE] Firebase Storage URL failed to load, trying with cache-busting...');
                const cacheBustUrl = this.src.includes('?') 
                    ? `${this.src}&cacheBust=${Date.now()}` 
                    : `${this.src}?cacheBust=${Date.now()}`;
                
                // Create a new image element to test the URL
                const testImg = new Image();
                testImg.onload = () => {
                    console.log('[IMAGE] Cache-busting URL loaded successfully, updating source');
                    this.image.src = cacheBustUrl;
                };
                testImg.onerror = () => {
                    console.error('[IMAGE] Cache-busting failed, image might be corrupted or deleted');
                    // Show a placeholder or error image
                    this._showErrorPlaceholder();
                };
                testImg.src = cacheBustUrl;
            } else {
                // For data URLs or other sources, show an error placeholder
                this._showErrorPlaceholder();
            }
        };
        
        // Start loading the image if source is provided and not empty
        if (this.src && this.src.trim() !== '') {
            this.image.src = this.src;
        } else {
            console.warn('[IMAGE] Empty source provided, image will not load');
        }
        
        // Debug log for constructor
        console.log('[IMAGE] ImageElement created:', {
            type: this.type,
            src: this.src ? (this.src.substring(0, 30) + '...') : 'undefined',
            isStorageUrl: this.isStorageUrl,
            width: this.width,
            height: this.height,
            opacity: this.opacity
        });
    }
    
    /**
     * Check if a URL is a Firebase Storage URL
     * @param {string} url - The URL to check
     * @returns {boolean} - True if the URL is a Firebase Storage URL
     * @private
     */
    _isFirebaseStorageUrl(url) {
        return url && (
            url.includes('firebasestorage.googleapis.com') || 
            url.includes('storage.googleapis.com')
        );
    }
    
    /**
     * Scale down the image if it's too large
     * @private
     */
    _scaleDownIfTooLarge() {
        // Scale down large images to a reasonable size
        const maxDimension = 500;
        if (this.width > maxDimension || this.height > maxDimension) {
            const aspectRatio = this.width / this.height;
            
            if (this.width > this.height) {
                this.width = maxDimension;
                this.height = maxDimension / aspectRatio;
            } else {
                this.height = maxDimension;
                this.width = maxDimension * aspectRatio;
            }
            
            // Update original dimensions
            this.originalWidth = this.width;
            this.originalHeight = this.height;
            
            console.log('[IMAGE] Image scaled down:', {
                width: this.width,
                height: this.height
            });
        }
    }
    
    /**
     * Upload the image to Firebase Storage if needed
     * @param {FirebaseManager} firebaseManager - The Firebase manager
     * @returns {Promise<boolean>} - Whether the upload was successful
     */
    async uploadToFirebaseIfNeeded(firebaseManager) {
        console.log('[IMAGE] uploadToFirebaseIfNeeded called with:', {
            elementType: this.type,
            elementId: this.id,
            isStorageUrl: this.isStorageUrl,
            hasFirebaseManager: !!firebaseManager,
            hasSrc: !!this.src,
            srcType: this.src ? (this.src.startsWith('data:') ? 'data URL' : 'URL') : 'none',
            srcLength: this.src ? this.src.length : 0
        });
        
        // Skip if already a storage URL or if no Firebase manager
        if (this.isStorageUrl || !firebaseManager || !this.src) {
            console.log('[IMAGE] Skipping upload to Firebase Storage', {
                isStorageUrl: this.isStorageUrl,
                hasFirebaseManager: !!firebaseManager,
                hasSrc: !!this.src
            });
            return false; // No upload needed
        }
        
        // Skip if not a data URL
        if (!this.src.startsWith('data:')) {
            console.log('[IMAGE] Skipping upload - not a data URL', {
                srcPrefix: this.src.substring(0, 30) + '...'
            });
            return false; // No upload needed
        }
        
        try {
            console.log('[IMAGE] Starting upload to Firebase Storage', {
                dataUrlLength: this.src.length,
                firebaseManagerInitialized: firebaseManager.isInitialized
            });
            
            // Save the original source for comparison
            const originalSrc = this.src;
            
            // Upload the image
            const storageUrl = await firebaseManager.uploadImageFromDataUrl(this.src, 'images');
            
            if (!storageUrl) {
                throw new Error('No storage URL returned from upload');
            }
            
            // Check if the URL changed (if it's the same as original, the upload failed but returned the original)
            const uploadSucceeded = storageUrl !== originalSrc;
            
            console.log('[IMAGE] Storage URL received:', {
                urlChanged: uploadSucceeded,
                isFirebaseUrl: this._isFirebaseStorageUrl(storageUrl),
                urlLength: storageUrl.length,
                urlPrefix: storageUrl.substring(0, 30) + '...'
            });
            
            // Update the source
            this.src = storageUrl;
            this.isStorageUrl = uploadSucceeded && this._isFirebaseStorageUrl(storageUrl);
            
            // Reload the image
            this.image.src = this.src;
            
            return uploadSucceeded; // Upload successful if URL changed
        } catch (error) {
            console.error('[IMAGE] Error uploading to Firebase Storage:', {
                errorMessage: error.message,
                errorName: error.name,
                elementId: this.id
            });
            return false; // Upload failed
        }
    }
    
    /**
     * Render the image element
     * @param {CanvasRenderingContext2D} ctx - The canvas context
     */
    render(ctx) {
        if (!this.visible) return;
        
        // Save context state
        ctx.save();
        
        // Apply transformations
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.scale(this.scaleX, this.scaleY);
        
        // Apply opacity
        ctx.globalAlpha = this.opacity !== undefined ? this.opacity : 1;
        
        if (this.isLoaded && this.image && this.image.complete && this.image.naturalWidth !== 0) {
            // Draw the image if it's properly loaded
            ctx.drawImage(this.image, -this.width / 2, -this.height / 2, this.width, this.height);
        } else {
            // Draw a placeholder if the image isn't loaded
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
            
            // Draw border
            ctx.strokeStyle = '#cccccc';
            ctx.lineWidth = 2;
            ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);
            
            // Draw loading indicator
            ctx.fillStyle = '#999999';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Loading...', 0, 0);
            
            // Try to load the image if it's not already loading
            if (this.image && !this.image.src && this.src) {
                console.log('[IMAGE] Attempting to reload image:', this.src);
                this.image.src = this.src;
            }
        }
        
        // Restore context state
        ctx.restore();
    }
    
    /**
     * Check if a point is inside the image
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {boolean} - True if the point is inside the image, false otherwise
     */
    containsPoint(x, y) {
        // Calculate the transformed point
        const dx = x - this.x;
        const dy = y - this.y;
        
        // Rotate the point
        const cos = Math.cos(-this.rotation);
        const sin = Math.sin(-this.rotation);
        const rx = dx * cos - dy * sin;
        const ry = dx * sin + dy * cos;
        
        // Scale the point
        const sx = rx / this.scaleX;
        const sy = ry / this.scaleY;
        
        // Add a hit tolerance that scales inversely with zoom level
        // This makes it easier to select elements when zoomed out
        let hitTolerance = 15; // Base tolerance in pixels
        
        // If we can access the viewport scale through the canvas manager
        if (window.canvasManager && window.canvasManager.viewport) {
            // Scale the tolerance inversely with the zoom level
            hitTolerance = hitTolerance / window.canvasManager.viewport.scale;
        }
        
        // Check if the point is inside the image with added tolerance
        return (
            sx >= -this.width / 2 - hitTolerance &&
            sx <= this.width / 2 + hitTolerance &&
            sy >= -this.height / 2 - hitTolerance &&
            sy <= this.height / 2 + hitTolerance
        );
    }
    
    /**
     * Get the image's bounding box
     * @returns {Object} - The bounding box {x, y, width, height}
     */
    getBoundingBox() {
        const halfWidth = (this.width * this.scaleX) / 2;
        const halfHeight = (this.height * this.scaleY) / 2;
        
        // If there's no rotation, return the simple bounding box
        if (this.rotation === 0 || Math.abs(this.rotation) < 0.001) {
            return {
                x: this.x - halfWidth,
                y: this.y - halfHeight,
                width: this.width * this.scaleX,
                height: this.height * this.scaleY
            };
        }
        
        // For rotated images, calculate the corners of the rotated rectangle
        const cos = Math.cos(this.rotation);
        const sin = Math.sin(this.rotation);
        
        // Calculate the four corners of the rotated rectangle
        const corners = [
            { // Top-left
                x: this.x + (-halfWidth * cos - -halfHeight * sin),
                y: this.y + (-halfWidth * sin + -halfHeight * cos)
            },
            { // Top-right
                x: this.x + (halfWidth * cos - -halfHeight * sin),
                y: this.y + (halfWidth * sin + -halfHeight * cos)
            },
            { // Bottom-right
                x: this.x + (halfWidth * cos - halfHeight * sin),
                y: this.y + (halfWidth * sin + halfHeight * cos)
            },
            { // Bottom-left
                x: this.x + (-halfWidth * cos - halfHeight * sin),
                y: this.y + (-halfWidth * sin + halfHeight * cos)
            }
        ];
        
        // Find the min and max coordinates to create the bounding box
        let minX = corners[0].x;
        let minY = corners[0].y;
        let maxX = corners[0].x;
        let maxY = corners[0].y;
        
        for (let i = 1; i < corners.length; i++) {
            minX = Math.min(minX, corners[i].x);
            minY = Math.min(minY, corners[i].y);
            maxX = Math.max(maxX, corners[i].x);
            maxY = Math.max(maxY, corners[i].y);
        }
        
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }
    
    /**
     * Update the image
     * @param {Object} options - The options to update
     */
    update(options = {}) {
        super.update(options);
        
        // Track if we need to preserve aspect ratio
        let preserveAspectRatio = false;
        const oldWidth = this.width;
        const oldHeight = this.height;
        
        // Update image properties
        if (options.src !== undefined) {
            const oldSrc = this.src;
            
            // Don't update to empty source unless explicitly allowed
            if (options.src === '' && !options.allowEmptySource) {
                console.warn('[IMAGE] Attempted to set empty source, ignoring update');
            } else {
                this.src = options.src;
                this.isStorageUrl = options.isStorageUrl !== undefined ? 
                    options.isStorageUrl : this._isFirebaseStorageUrl(this.src);
                
                // Only update the image source if it's actually different and not empty
                if (this.src !== oldSrc && this.src !== '') {
                    console.log('[IMAGE] Updating image source:', {
                        oldSrc: oldSrc ? (oldSrc.substring(0, 30) + '...') : 'undefined',
                        newSrc: this.src ? (this.src.substring(0, 30) + '...') : 'undefined',
                        isStorageUrl: this.isStorageUrl
                    });
                    
                    // Keep a reference to the old image until the new one loads
                    const oldImage = this.image;
                    const newImage = new Image();
                    
                    // Set up load handler for the new image
                    newImage.onload = () => {
                        console.log('[IMAGE] New image loaded successfully');
                        this.image = newImage;
                        this.isLoaded = true;
                        
                        // If dimensions weren't explicitly set, use natural dimensions
                        if (!options.width && !options.height) {
                            this.width = newImage.naturalWidth;
                            this.height = newImage.naturalHeight;
                            this.originalWidth = this.width;
                            this.originalHeight = this.height;
                            this._scaleDownIfTooLarge();
                        }
                    };
                    
                    // Set up error handler for the new image
                    newImage.onerror = () => {
                        console.error('[IMAGE] Failed to load new image:', this.src ? (this.src.substring(0, 30) + '...') : 'undefined');
                        
                        // Revert to old image if possible
                        if (oldImage && oldImage.src !== this.src && oldImage.complete && oldImage.naturalWidth > 0) {
                            console.log('[IMAGE] Reverting to previous image');
                            this.image = oldImage;
                            this.src = oldSrc;
                            this.isLoaded = true;
                        } else {
                            // Handle the error
                            this.isLoaded = false;
                            if (this.src === 'data:image/png;base64,TRUNCATED_FOR_FIRESTORE') {
                                this._attemptTruncatedImageRecovery();
                            } else {
                                this._showErrorPlaceholder();
                            }
                        }
                    };
                    
                    // Start loading the new image
                    if (this.src && this.src.trim() !== '') {
                        newImage.src = this.src;
                    } else {
                        console.error('[IMAGE] Cannot load image with empty source');
                        newImage.onerror();
                    }
                } else if (this.src === '') {
                    console.warn('[IMAGE] Empty source set, showing error placeholder');
                    this.isLoaded = false;
                    this._showErrorPlaceholder();
                }
            }
        }
        
        // Handle width and height updates with aspect ratio preservation
        if (options.width !== undefined && options.height === undefined) {
            // Only width was provided, maintain aspect ratio
            const aspectRatio = this.originalHeight / this.originalWidth;
            this.width = options.width;
            this.height = this.width * aspectRatio;
            preserveAspectRatio = true;
        } else if (options.height !== undefined && options.width === undefined) {
            // Only height was provided, maintain aspect ratio
            const aspectRatio = this.originalWidth / this.originalHeight;
            this.height = options.height;
            this.width = this.height * aspectRatio;
            preserveAspectRatio = true;
        } else {
            // Both or neither were provided
            if (options.width !== undefined) this.width = options.width;
            if (options.height !== undefined) this.height = options.height;
        }
        
        // Log if aspect ratio was preserved
        if (preserveAspectRatio) {
            console.log('[IMAGE] Preserved aspect ratio during update:', {
                oldWidth,
                oldHeight,
                newWidth: this.width,
                newHeight: this.height,
                aspectRatio: this.originalWidth / this.originalHeight
            });
        }
        
        if (options.isStorageUrl !== undefined && options.src === undefined) {
            // Only update isStorageUrl separately if src wasn't updated
            this.isStorageUrl = options.isStorageUrl;
        }
        if (options.opacity !== undefined) this.opacity = options.opacity;
        
        // Update original dimensions if they were provided
        if (options.originalWidth !== undefined) this.originalWidth = options.originalWidth;
        if (options.originalHeight !== undefined) this.originalHeight = options.originalHeight;
        
        // Ensure original dimensions are never zero or undefined
        if (!this.originalWidth || this.originalWidth <= 0) this.originalWidth = this.width || 200;
        if (!this.originalHeight || this.originalHeight <= 0) this.originalHeight = this.height || 200;
    }
    
    /**
     * Clone the image
     * @returns {ImageElement} - A clone of the image
     */
    clone() {
        return new ImageElement({
            x: this.x,
            y: this.y,
            rotation: this.rotation,
            scaleX: this.scaleX,
            scaleY: this.scaleY,
            zIndex: this.zIndex,
            src: this.src,
            width: this.width,
            height: this.height
        });
    }
    
    /**
     * Serialize the image element for Firebase
     * @returns {Object} - Serialized image element data
     */
    serialize() {
        const baseData = super.serialize();
        
        // Ensure we have valid original dimensions
        const originalWidth = this.originalWidth || this.width || 200;
        const originalHeight = this.originalHeight || this.height || 200;
        
        // Calculate aspect ratio to ensure it's preserved
        const aspectRatio = originalWidth / originalHeight;
        
        // Log serialization for debugging
        console.log('[IMAGE] Serializing image element:', {
            id: this.id,
            src: this.src ? (this.src.substring(0, 30) + '...') : 'undefined',
            width: this.width,
            height: this.height,
            originalWidth: originalWidth,
            originalHeight: originalHeight,
            aspectRatio: aspectRatio
        });
        
        return {
            ...baseData,
            src: this.src || '',
            width: this.width || 200,
            height: this.height || 200,
            originalWidth: originalWidth,
            originalHeight: originalHeight,
            aspectRatio: aspectRatio,
            opacity: this.opacity !== undefined ? this.opacity : 1,
            isStorageUrl: this.isStorageUrl !== undefined ? this.isStorageUrl : false
        };
    }
    
    /**
     * Deserialize image element data from Firebase
     * @param {Object} data - The image element data from Firebase
     * @returns {ImageElement} - Deserialized image element
     */
    static deserialize(data) {
        // Ensure data object exists
        if (!data) {
            console.error('[IMAGE] Cannot deserialize null or undefined data');
            data = {};
        }
        
        // Log the data we're deserializing for debugging
        console.log('[IMAGE] Deserializing image data:', {
            id: data.id,
            src: data.src ? (data.src.substring(0, 30) + '...') : 'undefined',
            width: data.width,
            height: data.height,
            originalWidth: data.originalWidth,
            originalHeight: data.originalHeight,
            aspectRatio: data.aspectRatio
        });
        
        // Ensure we have valid dimensions with strong defaults
        const width = data.width !== undefined && data.width !== null && !isNaN(data.width) ? 
            Number(data.width) : 200;
        const height = data.height !== undefined && data.height !== null && !isNaN(data.height) ? 
            Number(data.height) : 200;
            
        // Ensure we have valid original dimensions
        const originalWidth = data.originalWidth !== undefined && data.originalWidth !== null && !isNaN(data.originalWidth) ? 
            Number(data.originalWidth) : width;
        const originalHeight = data.originalHeight !== undefined && data.originalHeight !== null && !isNaN(data.originalHeight) ? 
            Number(data.originalHeight) : height;
        
        // Ensure we have a valid source
        let src = data.src || '';
        
        // If source is empty, check if we're deserializing from a position update
        // In this case, we should try to preserve the existing source if possible
        if (!src || src === '') {
            console.warn('[IMAGE] Empty source in deserialized data, this may cause issues');
            
            // Try to find an existing element with the same ID to get its source
            if (data.id && window.canvasManager) {
                const existingElement = window.canvasManager.getElementById(data.id);
                if (existingElement && existingElement.type === 'image' && existingElement.src) {
                    console.log('[IMAGE] Found existing element with same ID, using its source');
                    src = existingElement.src;
                }
            }
            
            // If we still don't have a source, use a placeholder
            if (!src || src === '') {
                console.warn('[IMAGE] Could not find existing source, using placeholder');
                // Create a simple placeholder image
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.fillStyle = '#f0f0f0';
                        ctx.fillRect(0, 0, width, height);
                        ctx.strokeStyle = '#cccccc';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(0, 0, width, height);
                        ctx.fillStyle = '#999999';
                        ctx.font = '14px Arial';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('Image Source Lost', width / 2, height / 2);
                        src = canvas.toDataURL('image/png');
                    }
                } catch (error) {
                    console.error('[IMAGE] Error creating placeholder:', error);
                }
            }
        }
        
        // Calculate aspect ratio if not provided
        const aspectRatio = data.aspectRatio || (originalWidth / originalHeight);
        
        // Check if we need to fix dimensions based on aspect ratio
        let finalWidth = width;
        let finalHeight = height;
        
        // If aspect ratio is significantly off, fix it
        if (aspectRatio && Math.abs((width / height) - aspectRatio) > 0.01) {
            console.log('[IMAGE] Fixing aspect ratio during deserialization:', {
                currentRatio: width / height,
                targetRatio: aspectRatio,
                width: width,
                height: height
            });
            
            // Adjust height based on width to maintain aspect ratio
            finalHeight = finalWidth / aspectRatio;
        }
        
        // Create the image element with validated data
        return new ImageElement({
            id: data.id || null,
            x: data.x !== undefined ? data.x : 0,
            y: data.y !== undefined ? data.y : 0,
            rotation: data.rotation !== undefined ? data.rotation : 0,
            scaleX: data.scaleX !== undefined ? data.scaleX : 1,
            scaleY: data.scaleY !== undefined ? data.scaleY : 1,
            src: src,
            width: finalWidth,
            height: finalHeight,
            originalWidth: originalWidth,
            originalHeight: originalHeight,
            opacity: data.opacity !== undefined ? data.opacity : 1,
            isStorageUrl: data.isStorageUrl !== undefined ? data.isStorageUrl : false,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            createdBy: data.createdBy,
            updatedBy: data.updatedBy
        });
    }
    
    /**
     * Attempt to recover a truncated image
     * @private
     */
    async _attemptTruncatedImageRecovery() {
        // Find the FirebaseManager instance
        let firebaseManager = null;
        
        // Check if we're in a canvas context
        if (window.canvasManager && window.canvasManager.firebaseManager) {
            firebaseManager = window.canvasManager.firebaseManager;
        } else if (window.app && window.app.firebaseManager) {
            firebaseManager = window.app.firebaseManager;
        }
        
        if (!firebaseManager) {
            console.error('[IMAGE] Cannot recover truncated image - FirebaseManager not found');
            return;
        }
        
        // Show a message to the user
        const message = document.createElement('div');
        message.style.position = 'fixed';
        message.style.top = '50%';
        message.style.left = '50%';
        message.style.transform = 'translate(-50%, -50%)';
        message.style.padding = '20px';
        message.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        message.style.color = 'white';
        message.style.borderRadius = '10px';
        message.style.zIndex = '9999';
        message.style.maxWidth = '400px';
        message.style.textAlign = 'center';
        message.innerHTML = `
            <h3>Image Recovery Needed</h3>
            <p>An image failed to load because it was too large for Firestore.</p>
            <p>Click "Recover" to re-upload the image.</p>
            <button id="recover-image" style="padding: 8px 16px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">Recover</button>
            <button id="cancel-recovery" style="padding: 8px 16px; background-color: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
        `;
        
        document.body.appendChild(message);
        
        // Handle recover button click
        document.getElementById('recover-image').addEventListener('click', async () => {
            document.body.removeChild(message);
            const success = await firebaseManager.recoverTruncatedImage(this);
            if (!success) {
                console.error('[IMAGE] Failed to recover truncated image');
            }
        });
        
        // Handle cancel button click
        document.getElementById('cancel-recovery').addEventListener('click', () => {
            document.body.removeChild(message);
        });
    }
    
    /**
     * Display an error placeholder when an image fails to load
     * @private
     */
    _showErrorPlaceholder() {
        try {
            // Create a simple placeholder image
            const canvas = document.createElement('canvas');
            canvas.width = this.width || 200;
            canvas.height = this.height || 200;
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
                console.error('[IMAGE] Failed to get canvas context for error placeholder');
                return;
            }
            
            // Draw error placeholder
            ctx.fillStyle = '#f8f8f8';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw border
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.strokeRect(0, 0, canvas.width, canvas.height);
            
            // Draw X
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(canvas.width, canvas.height);
            ctx.moveTo(canvas.width, 0);
            ctx.lineTo(0, canvas.height);
            ctx.stroke();
            
            // Add text
            ctx.fillStyle = '#ff0000';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Image Error', canvas.width / 2, canvas.height / 2);
            
            // Use this as the image source
            const dataUrl = canvas.toDataURL('image/png');
            
            // Create a new image with the placeholder
            const placeholderImage = new Image();
            placeholderImage.onload = () => {
                this.image = placeholderImage;
                this.isLoaded = true;
                console.log('[IMAGE] Error placeholder loaded successfully');
            };
            placeholderImage.onerror = () => {
                console.error('[IMAGE] Failed to load error placeholder');
                // Last resort - create a new empty image
                this.image = new Image();
                this.isLoaded = false;
            };
            placeholderImage.src = dataUrl;
            
            // Show a notification to the user
            this._notifyImageError();
        } catch (error) {
            console.error('[IMAGE] Error creating placeholder:', error);
            // Last resort - create a new empty image
            this.image = new Image();
            this.isLoaded = false;
        }
    }
    
    /**
     * Show a notification about the image error
     * @private
     */
    _notifyImageError() {
        // Create notification element if it doesn't exist
        if (!document.getElementById('image-error-notification')) {
            const notification = document.createElement('div');
            notification.id = 'image-error-notification';
            notification.style.position = 'fixed';
            notification.style.bottom = '20px';
            notification.style.right = '20px';
            notification.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
            notification.style.color = 'white';
            notification.style.padding = '10px 20px';
            notification.style.borderRadius = '5px';
            notification.style.zIndex = '9999';
            notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
            notification.innerHTML = 'An image failed to load. Try refreshing the page or re-uploading the image.';
            
            // Add close button
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '×';
            closeBtn.style.marginLeft = '10px';
            closeBtn.style.background = 'none';
            closeBtn.style.border = 'none';
            closeBtn.style.color = 'white';
            closeBtn.style.fontSize = '20px';
            closeBtn.style.cursor = 'pointer';
            closeBtn.onclick = () => document.body.removeChild(notification);
            notification.appendChild(closeBtn);
            
            document.body.appendChild(notification);
            
            // Auto-remove after 10 seconds
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 10000);
        }
    }
} 