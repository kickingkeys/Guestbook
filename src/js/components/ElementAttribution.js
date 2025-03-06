import { DateUtils } from '../utils/DateUtils.js';

/**
 * ElementAttribution class
 * Displays attribution information for canvas elements
 */
export class ElementAttribution {
    /**
     * Constructor
     * @param {FirebaseManager} firebaseManager - The Firebase manager
     */
    constructor(firebaseManager) {
        this.firebaseManager = firebaseManager;
        this.tooltip = null;
        this.userCache = new Map(); // Cache user info to avoid repeated lookups
    }
    
    /**
     * Initialize the tooltip
     */
    initialize() {
        // Create tooltip element if it doesn't exist
        if (!this.tooltip) {
            this.tooltip = document.createElement('div');
            this.tooltip.className = 'element-attribution-tooltip';
            document.body.appendChild(this.tooltip);
        }
    }
    
    /**
     * Show attribution for an element
     * @param {CanvasElement} element - The element to show attribution for
     * @param {number} x - The x position for the tooltip
     * @param {number} y - The y position for the tooltip
     */
    async showAttribution(element, x, y) {
        if (!this.tooltip || !element) return;
        
        // Get creator and updater information
        const creatorInfo = await this.getUserInfo(element.createdBy);
        const updaterInfo = element.updatedBy !== element.createdBy ? 
            await this.getUserInfo(element.updatedBy) : null;
        
        // Format timestamps
        const createdTime = DateUtils.formatTimestamp(element.createdAt, true);
        const createdRelative = DateUtils.getRelativeTimeString(element.createdAt);
        const updatedTime = DateUtils.formatTimestamp(element.updatedAt, true);
        const updatedRelative = DateUtils.getRelativeTimeString(element.updatedAt);
        
        // Build tooltip content
        let content = `
            <div class="attribution-header">
                <span class="attribution-type">${this.getElementTypeName(element.type)}</span>
            </div>
            <div class="attribution-creator">
                <div class="attribution-user">
                    <span class="user-dot" style="background-color: ${creatorInfo.color}"></span>
                    <span class="user-name">${creatorInfo.displayName}</span>
                </div>
                <div class="attribution-time" title="${createdTime}">
                    Created ${createdRelative}
                </div>
            </div>
        `;
        
        // Add updater info if different from creator
        if (updaterInfo && element.updatedBy !== element.createdBy) {
            content += `
                <div class="attribution-updater">
                    <div class="attribution-user">
                        <span class="user-dot" style="background-color: ${updaterInfo.color}"></span>
                        <span class="user-name">${updaterInfo.displayName}</span>
                    </div>
                    <div class="attribution-time" title="${updatedTime}">
                        Modified ${updatedRelative}
                    </div>
                </div>
            `;
        }
        
        // Set tooltip content
        this.tooltip.innerHTML = content;
        
        // Position tooltip
        this.positionTooltip(x, y);
        
        // Show tooltip
        this.tooltip.classList.add('visible');
    }
    
    /**
     * Hide attribution tooltip
     */
    hideAttribution() {
        if (this.tooltip) {
            this.tooltip.classList.remove('visible');
        }
    }
    
    /**
     * Position the tooltip
     * @param {number} x - The x position
     * @param {number} y - The y position
     */
    positionTooltip(x, y) {
        if (!this.tooltip) return;
        
        // Get viewport dimensions
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Get tooltip dimensions
        const tooltipWidth = this.tooltip.offsetWidth;
        const tooltipHeight = this.tooltip.offsetHeight;
        
        // Calculate position (default is below and to the right)
        let posX = x + 10;
        let posY = y + 10;
        
        // Adjust if tooltip would go off screen
        if (posX + tooltipWidth > viewportWidth) {
            posX = x - tooltipWidth - 10;
        }
        
        if (posY + tooltipHeight > viewportHeight) {
            posY = y - tooltipHeight - 10;
        }
        
        // Set position
        this.tooltip.style.left = `${posX}px`;
        this.tooltip.style.top = `${posY}px`;
    }
    
    /**
     * Get user information
     * @param {string} userId - The user ID
     * @returns {Promise<Object>} - User information
     */
    async getUserInfo(userId) {
        // Return from cache if available
        if (this.userCache.has(userId)) {
            return this.userCache.get(userId);
        }
        
        // Get user info from Firebase
        const userInfo = await this.firebaseManager.getUserInfo(userId);
        
        // Cache the result
        this.userCache.set(userId, userInfo);
        
        return userInfo;
    }
    
    /**
     * Get a friendly name for an element type
     * @param {string} type - The element type
     * @returns {string} - A friendly name
     */
    getElementTypeName(type) {
        switch (type) {
            case 'drawing':
                return 'Drawing';
            case 'text':
                return 'Text';
            case 'sticky-note':
                return 'Sticky Note';
            case 'image':
                return 'Image';
            default:
                return 'Element';
        }
    }
} 