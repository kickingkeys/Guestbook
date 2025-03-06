/**
 * ImageUtils class
 * Utility functions for image processing and manipulation
 */
export class ImageUtils {
    /**
     * Convert a data URL to a Blob
     * @param {string} dataUrl - The data URL to convert
     * @returns {Promise<Blob>} - A promise that resolves with the Blob
     */
    static async dataUrlToBlob(dataUrl) {
        return new Promise((resolve, reject) => {
            try {
                // Extract the base64 data from the data URL
                const parts = dataUrl.split(';base64,');
                if (parts.length !== 2) {
                    reject(new Error('Invalid data URL format'));
                    return;
                }
                
                // Get the content type from the data URL
                const contentType = parts[0].split(':')[1];
                
                // Convert base64 to binary
                const base64 = parts[1];
                const byteCharacters = atob(base64);
                
                // Create an array buffer from the binary data
                const byteArrays = [];
                const sliceSize = 512;
                
                for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
                    const slice = byteCharacters.slice(offset, offset + sliceSize);
                    
                    const byteNumbers = new Array(slice.length);
                    for (let i = 0; i < slice.length; i++) {
                        byteNumbers[i] = slice.charCodeAt(i);
                    }
                    
                    const byteArray = new Uint8Array(byteNumbers);
                    byteArrays.push(byteArray);
                }
                
                // Create a Blob from the array buffer
                const blob = new Blob(byteArrays, { type: contentType });
                resolve(blob);
            } catch (error) {
                console.error('Error converting data URL to Blob:', error);
                reject(error);
            }
        });
    }
    
    /**
     * Get the file extension from a content type
     * @param {string} contentType - The content type (e.g., 'image/jpeg')
     * @returns {string} - The file extension (e.g., 'jpg')
     */
    static getExtensionFromContentType(contentType) {
        const extensions = {
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/png': 'png',
            'image/gif': 'gif',
            'image/webp': 'webp',
            'image/svg+xml': 'svg'
        };
        
        return extensions[contentType] || 'jpg';
    }
} 