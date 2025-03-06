/**
 * ThrottleUtils class
 * Provides utilities for throttling frequent operations
 */
export class ThrottleUtils {
    /**
     * Create a throttled function that only invokes the provided function at most once per specified interval
     * @param {Function} func - The function to throttle
     * @param {number} wait - The number of milliseconds to throttle invocations to
     * @param {Object} options - The options object
     * @param {boolean} options.leading - Specify invoking on the leading edge of the timeout
     * @param {boolean} options.trailing - Specify invoking on the trailing edge of the timeout
     * @returns {Function} - Returns the new throttled function
     */
    static throttle(func, wait, options = {}) {
        let timeout = null;
        let previous = 0;
        let result;
        const { leading = true, trailing = true } = options;
        
        return function(...args) {
            const now = Date.now();
            const context = this;
            
            if (!previous && leading === false) {
                previous = now;
            }
            
            const remaining = wait - (now - previous);
            
            if (remaining <= 0 || remaining > wait) {
                if (timeout) {
                    clearTimeout(timeout);
                    timeout = null;
                }
                
                previous = now;
                result = func.apply(context, args);
            } else if (!timeout && trailing) {
                timeout = setTimeout(() => {
                    previous = leading ? Date.now() : 0;
                    timeout = null;
                    result = func.apply(context, args);
                }, remaining);
            }
            
            return result;
        };
    }
    
    /**
     * Create a debounced function that delays invoking the provided function until after wait milliseconds
     * @param {Function} func - The function to debounce
     * @param {number} wait - The number of milliseconds to delay
     * @param {Object} options - The options object
     * @param {boolean} options.leading - Specify invoking on the leading edge of the timeout
     * @param {boolean} options.trailing - Specify invoking on the trailing edge of the timeout
     * @returns {Function} - Returns the new debounced function
     */
    static debounce(func, wait, options = {}) {
        let timeout;
        let result;
        const { leading = false, trailing = true } = options;
        
        return function(...args) {
            const context = this;
            const invokeLeading = leading && !timeout;
            
            clearTimeout(timeout);
            
            timeout = setTimeout(() => {
                timeout = null;
                if (trailing && !invokeLeading) {
                    result = func.apply(context, args);
                }
            }, wait);
            
            if (invokeLeading) {
                result = func.apply(context, args);
            }
            
            return result;
        };
    }
    
    /**
     * Create a batched function that collects calls over a period and then executes once
     * @param {Function} func - The function to batch
     * @param {number} wait - The number of milliseconds to collect calls
     * @param {Function} batchProcessor - Function to process the batch of arguments
     * @returns {Function} - Returns the new batched function
     */
    static batch(func, wait, batchProcessor = null) {
        let timeout;
        let batch = [];
        
        return function(...args) {
            const context = this;
            
            // Add to batch
            batch.push(args);
            
            // Clear existing timeout
            clearTimeout(timeout);
            
            // Set new timeout
            timeout = setTimeout(() => {
                const currentBatch = [...batch];
                batch = [];
                
                // Process batch if processor provided
                if (typeof batchProcessor === 'function') {
                    const processedArgs = batchProcessor(currentBatch);
                    func.apply(context, [processedArgs]);
                } else {
                    // Otherwise, call with the batch array
                    func.apply(context, [currentBatch]);
                }
            }, wait);
        };
    }
} 