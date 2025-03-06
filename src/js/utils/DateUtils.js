/**
 * DateUtils class
 * Utility functions for date and time formatting
 */
export class DateUtils {
    /**
     * Format a timestamp into a human-readable date and time
     * @param {number|Date} timestamp - The timestamp to format
     * @param {boolean} includeTime - Whether to include the time
     * @returns {string} - Formatted date string
     */
    static formatTimestamp(timestamp, includeTime = true) {
        if (!timestamp) return 'Unknown';
        
        // Convert to Date object if it's a number
        const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
        
        // Check if the date is valid
        if (isNaN(date.getTime())) return 'Invalid date';
        
        // Format options
        const options = {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        };
        
        // Add time options if requested
        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
        }
        
        return date.toLocaleDateString('en-US', options);
    }
    
    /**
     * Get a relative time string (e.g., "2 hours ago")
     * @param {number|Date} timestamp - The timestamp to format
     * @returns {string} - Relative time string
     */
    static getRelativeTimeString(timestamp) {
        if (!timestamp) return 'Unknown';
        
        // Convert to Date object if it's a number
        const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
        
        // Check if the date is valid
        if (isNaN(date.getTime())) return 'Invalid date';
        
        const now = new Date();
        const diffMs = now - date;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);
        
        if (diffSec < 60) {
            return 'Just now';
        } else if (diffMin < 60) {
            return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
        } else if (diffHour < 24) {
            return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;
        } else if (diffDay < 30) {
            return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
        } else {
            return this.formatTimestamp(timestamp, false);
        }
    }
} 