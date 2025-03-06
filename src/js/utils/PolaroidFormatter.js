/**
 * PolaroidFormatter class
 * Utility for applying a Polaroid-style effect to images
 */
export class PolaroidFormatter {
    /**
     * Apply a Polaroid-style frame to an image
     * @param {string} imageDataUrl - The image data URL
     * @param {Object} options - Formatting options
     * @param {number} options.borderWidth - Width of the Polaroid border (default: 20)
     * @param {number} options.bottomBorderWidthRatio - Ratio of bottom border to image height (default: 0.25)
     * @param {string} options.borderColor - Color of the border (default: white)
     * @param {boolean} options.addShadow - Whether to add a shadow effect (default: true)
     * @param {string} options.caption - Optional caption text to add to the bottom border
     * @param {FirebaseManager} options.firebaseManager - Optional Firebase manager for uploading
     * @param {boolean} options.uploadToFirebase - Whether to upload the result to Firebase (default: false)
     * @returns {Promise<string>} - Data URL or Firebase Storage URL of the formatted image
     */
    static async format(imageDataUrl, options = {}) {
        try {
            console.log('PolaroidFormatter: Starting image formatting', {
                hasImageData: !!imageDataUrl,
                uploadToFirebase: !!options.uploadToFirebase,
                hasFirebaseManager: !!options.firebaseManager
            });
            
            // Format the image
            const formattedDataUrl = await this._formatImage(imageDataUrl, options);
            console.log('PolaroidFormatter: Image formatted successfully', {
                formattedDataUrlLength: formattedDataUrl.length
            });
            
            // Upload to Firebase if requested
            if (options.uploadToFirebase && options.firebaseManager) {
                try {
                    console.log('PolaroidFormatter: Starting upload to Firebase Storage');
                    
                    // Set a timeout for the upload
                    const uploadPromise = options.firebaseManager.uploadImageFromDataUrl(formattedDataUrl, 'polaroids');
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('Upload timeout')), 10000); // 10 second timeout
                    });
                    
                    // Race the upload against the timeout
                    let storageUrl;
                    try {
                        storageUrl = await Promise.race([uploadPromise, timeoutPromise]);
                    } catch (timeoutError) {
                        console.error('PolaroidFormatter: Upload timeout reached:', timeoutError);
                        console.log('PolaroidFormatter: Falling back to data URL due to timeout');
                        return formattedDataUrl;
                    }
                    
                    if (!storageUrl) {
                        console.error('PolaroidFormatter: No storage URL returned');
                        return formattedDataUrl;
                    }
                    
                    console.log('PolaroidFormatter: Image uploaded to Firebase Storage successfully', {
                        storageUrl: storageUrl
                    });
                    return storageUrl;
                } catch (error) {
                    console.error('PolaroidFormatter: Error uploading to Firebase Storage:', {
                        errorCode: error.code,
                        errorMessage: error.message,
                        errorName: error.name
                    });
                    // Fall back to data URL
                    console.log('PolaroidFormatter: Falling back to data URL due to upload error');
                    return formattedDataUrl;
                }
            }
            
            // Return the formatted data URL
            return formattedDataUrl;
        } catch (error) {
            console.error('PolaroidFormatter: Error formatting image:', {
                errorMessage: error.message,
                errorName: error.name
            });
            
            // If we have the original image data URL, return it as a fallback
            if (imageDataUrl) {
                console.log('PolaroidFormatter: Returning original image as fallback');
                return imageDataUrl;
            }
            
            throw error;
        }
    }
    
    /**
     * Internal method to format the image
     * @param {string} imageDataUrl - The image data URL
     * @param {Object} options - Formatting options
     * @returns {Promise<string>} - Data URL of the formatted image
     * @private
     */
    static _formatImage(imageDataUrl, options = {}) {
        return new Promise((resolve, reject) => {
            try {
                // Check if on mobile device
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                
                // Default options - adjust for mobile
                const settings = {
                    borderWidth: isMobile ? 12 : (options.borderWidth || 20),
                    bottomBorderWidthRatio: isMobile ? 0.18 : (options.bottomBorderWidthRatio || 0.25),
                    borderColor: options.borderColor || '#FFFFFF',
                    addShadow: options.addShadow !== false,
                    caption: options.caption || ''
                };

                // Create an image element to load the source image
                const sourceImage = new Image();
                sourceImage.crossOrigin = 'Anonymous';
                
                // Handle image load
                sourceImage.onload = () => {
                    // Create a canvas for the Polaroid effect
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Calculate dimensions
                    const imageWidth = sourceImage.width;
                    const imageHeight = sourceImage.height;
                    
                    // Calculate bottom border width based on image height
                    const bottomBorderWidth = Math.round(imageHeight * settings.bottomBorderWidthRatio);
                    
                    // Set canvas size to include the Polaroid frame
                    canvas.width = imageWidth + (settings.borderWidth * 2);
                    canvas.height = imageHeight + settings.borderWidth + bottomBorderWidth;
                    
                    // Draw the white Polaroid frame
                    ctx.fillStyle = settings.borderColor;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    
                    // Add shadow if enabled
                    if (settings.addShadow) {
                        ctx.save();
                        // Create a subtle shadow effect
                        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                        ctx.shadowBlur = isMobile ? 6 : 10;
                        ctx.shadowOffsetX = isMobile ? 2 : 3;
                        ctx.shadowOffsetY = isMobile ? 2 : 3;
                        
                        // Draw a rectangle for the shadow (slightly smaller than the frame)
                        ctx.fillStyle = settings.borderColor;
                        ctx.fillRect(2, 2, canvas.width - 4, canvas.height - 4);
                        ctx.restore();
                    }
                    
                    // Draw the image on top of the frame
                    ctx.drawImage(
                        sourceImage,
                        settings.borderWidth,
                        settings.borderWidth,
                        imageWidth,
                        imageHeight
                    );
                    
                    // Add caption if provided
                    if (settings.caption) {
                        // Calculate font size based on image size (between 16 and 28px on mobile, 20 and 32px on desktop)
                        const minFontSize = isMobile ? 16 : 20;
                        const maxFontSize = isMobile ? 28 : 32;
                        const fontSize = Math.max(minFontSize, Math.min(maxFontSize, Math.floor(imageWidth / 12)));
                        
                        // Set font with bold weight
                        ctx.font = `bold ${fontSize}px Caveat, cursive`;
                        ctx.fillStyle = '#ED682B'; // Orange color
                        ctx.textAlign = 'left'; // Left-aligned text
                        ctx.textBaseline = 'top'; // Align to top of text
                        
                        // Position text in the top-left of the bottom white space
                        // Add a small padding from the left edge and position just below the image
                        const textPaddingLeft = settings.borderWidth + (isMobile ? 6 : 10);
                        const textPaddingTop = isMobile ? 6 : 10; // Space between image bottom and text
                        
                        ctx.fillText(
                            settings.caption,
                            textPaddingLeft,
                            imageHeight + settings.borderWidth + textPaddingTop
                        );
                    }
                    
                    // Convert canvas to data URL
                    const formattedImageUrl = canvas.toDataURL('image/jpeg', 0.9);
                    resolve(formattedImageUrl);
                };
                
                // Handle image load error
                sourceImage.onerror = (error) => {
                    console.error('PolaroidFormatter: Error loading image for formatting:', error);
                    reject('Failed to load image for formatting');
                };
                
                // Set the source to start loading
                sourceImage.src = imageDataUrl;
            } catch (error) {
                console.error('PolaroidFormatter: Error formatting Polaroid image:', error);
                console.error('PolaroidFormatter: Error details:', {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                });
                reject('Failed to format image');
            }
        });
    }
    
    /**
     * Generate a random slight rotation angle for a more natural look
     * @param {number} maxAngle - Maximum rotation angle in degrees (default: 3)
     * @returns {number} - Random rotation angle in degrees
     */
    static getRandomRotation(maxAngle = 3) {
        // Make rotation more subtle and biased slightly toward positive values
        // for a more natural look (most people place photos with a slight clockwise tilt)
        const bias = 0.5; // Slight positive bias
        const rotation = ((Math.random() - 0.5) * 2 * maxAngle) + bias;
        return rotation;
    }
    
    /**
     * Generate a timestamp caption for the Polaroid
     * @param {boolean} includeTime - Whether to include the time (default: true)
     * @returns {string} - Formatted date string
     */
    static getTimestampCaption(includeTime = true) {
        const now = new Date();
        const dateOptions = { month: 'short', day: 'numeric', year: 'numeric' };
        
        if (includeTime) {
            dateOptions.hour = '2-digit';
            dateOptions.minute = '2-digit';
        }
        
        const caption = now.toLocaleDateString('en-US', dateOptions);
        return caption;
    }
} 