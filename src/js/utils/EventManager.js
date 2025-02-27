/**
 * EventManager class
 * Utility class for managing event listeners
 */
export class EventManager {
    /**
     * Constructor
     */
    constructor() {
        // Map to store event listeners
        this.listeners = new Map();
    }
    
    /**
     * Add an event listener
     * @param {string} event - The event to listen for
     * @param {Function} callback - The callback function
     * @param {Object} context - The context to bind the callback to
     */
    on(event, callback, context = null) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        
        this.listeners.get(event).push({
            callback,
            context
        });
    }
    
    /**
     * Remove an event listener
     * @param {string} event - The event to remove the listener from
     * @param {Function} callback - The callback function to remove
     */
    off(event, callback) {
        if (!this.listeners.has(event)) {
            return;
        }
        
        const eventListeners = this.listeners.get(event);
        const filteredListeners = eventListeners.filter(
            listener => listener.callback !== callback
        );
        
        this.listeners.set(event, filteredListeners);
    }
    
    /**
     * Trigger an event
     * @param {string} event - The event to trigger
     * @param {Object} data - The data to pass to the event listeners
     */
    trigger(event, data = {}) {
        if (!this.listeners.has(event)) {
            return;
        }
        
        const eventListeners = this.listeners.get(event);
        
        eventListeners.forEach(listener => {
            if (listener.context) {
                listener.callback.call(listener.context, data);
            } else {
                listener.callback(data);
            }
        });
    }
    
    /**
     * Remove all event listeners
     */
    removeAllListeners() {
        this.listeners.clear();
    }
    
    /**
     * Remove all listeners for a specific event
     * @param {string} event - The event to remove all listeners for
     */
    removeAllListenersForEvent(event) {
        if (this.listeners.has(event)) {
            this.listeners.delete(event);
        }
    }
} 