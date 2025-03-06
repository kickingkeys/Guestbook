/**
 * NetworkStatus class
 * Monitors and displays network connectivity status
 */
export class NetworkStatus {
    /**
     * Constructor
     * @param {FirebaseManager} firebaseManager - The Firebase manager
     */
    constructor(firebaseManager) {
        this.firebaseManager = firebaseManager;
        this.isOnline = navigator.onLine;
        this.statusElement = null;
        this.listeners = [];
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = 5000; // 5 seconds
        this.reconnectTimeoutId = null;
    }
    
    /**
     * Initialize the network status component
     */
    initialize() {
        // Create status element if it doesn't exist
        if (!this.statusElement) {
            this.statusElement = document.createElement('div');
            this.statusElement.className = 'network-status';
            document.body.appendChild(this.statusElement);
        }
        
        // Set initial status
        this.updateStatus(navigator.onLine);
        
        // Add event listeners for online/offline events
        window.addEventListener('online', this.handleOnline.bind(this));
        window.addEventListener('offline', this.handleOffline.bind(this));
        
        // Add Firestore connection state listener
        if (this.firebaseManager && this.firebaseManager.isInitialized) {
            this.setupFirestoreConnectionListener();
        }
    }
    
    /**
     * Set up Firestore connection state listener
     */
    async setupFirestoreConnectionListener() {
        try {
            const { onSnapshot, doc } = await import('https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js');
            
            // Listen to Firestore connection state
            onSnapshot(
                doc(this.firebaseManager.db, '.info/connected'),
                (snapshot) => {
                    const isConnected = snapshot.data()?.isConnected || false;
                    this.updateFirestoreConnectionStatus(isConnected);
                },
                (error) => {
                    console.error('Error monitoring Firestore connection:', error);
                    this.updateFirestoreConnectionStatus(false);
                }
            );
        } catch (error) {
            console.error('Error setting up Firestore connection listener:', error);
        }
    }
    
    /**
     * Handle online event
     */
    handleOnline() {
        this.isOnline = true;
        this.updateStatus(true);
        this.notifyListeners('online');
        
        // Attempt to reconnect to Firestore
        this.reconnectAttempts = 0;
        this.attemptReconnect();
    }
    
    /**
     * Handle offline event
     */
    handleOffline() {
        this.isOnline = false;
        this.updateStatus(false);
        this.notifyListeners('offline');
        
        // Clear any pending reconnect attempts
        if (this.reconnectTimeoutId) {
            clearTimeout(this.reconnectTimeoutId);
            this.reconnectTimeoutId = null;
        }
    }
    
    /**
     * Update Firestore connection status
     * @param {boolean} isConnected - Whether Firestore is connected
     */
    updateFirestoreConnectionStatus(isConnected) {
        if (isConnected) {
            // Connected to Firestore
            this.reconnectAttempts = 0;
            this.updateStatus(true, 'connected');
            this.notifyListeners('connected');
        } else if (this.isOnline) {
            // Browser is online but Firestore is disconnected
            this.updateStatus(true, 'connecting');
            this.notifyListeners('connecting');
            
            // Attempt to reconnect if we're online but Firestore is disconnected
            this.attemptReconnect();
        }
    }
    
    /**
     * Attempt to reconnect to Firestore
     */
    attemptReconnect() {
        // Clear any existing reconnect timeout
        if (this.reconnectTimeoutId) {
            clearTimeout(this.reconnectTimeoutId);
        }
        
        // If we've reached the maximum number of attempts, stop trying
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.updateStatus(true, 'reconnect-failed');
            this.notifyListeners('reconnect-failed');
            return;
        }
        
        // Increment reconnect attempts
        this.reconnectAttempts++;
        
        // Schedule next reconnect attempt
        this.reconnectTimeoutId = setTimeout(() => {
            if (this.isOnline) {
                // Try to reconnect by pinging Firestore
                this.pingFirestore();
            }
        }, this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1)); // Exponential backoff
    }
    
    /**
     * Ping Firestore to check connection
     */
    async pingFirestore() {
        try {
            if (!this.firebaseManager || !this.firebaseManager.db) return;
            
            const { getDocs, collection, query, limit } = await import('https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js');
            
            // Try to get a single document to test connection
            await getDocs(query(collection(this.firebaseManager.db, 'guestbook'), limit(1)));
            
            // If we get here, we're connected
            this.updateStatus(true, 'connected');
            this.notifyListeners('connected');
            this.reconnectAttempts = 0;
        } catch (error) {
            console.error('Error pinging Firestore:', error);
            
            // Update status and try again
            this.updateStatus(true, 'connecting');
            this.notifyListeners('connecting');
            this.attemptReconnect();
        }
    }
    
    /**
     * Update the status display
     * @param {boolean} isOnline - Whether the browser is online
     * @param {string} firestoreStatus - Firestore connection status
     */
    updateStatus(isOnline, firestoreStatus = null) {
        if (!this.statusElement) return;
        
        // Remove all status classes
        this.statusElement.classList.remove('online', 'offline', 'connected', 'connecting', 'reconnect-failed');
        
        // Add appropriate class based on status
        if (!isOnline) {
            // Browser is offline
            this.statusElement.classList.add('offline');
            this.statusElement.innerHTML = `
                <div class="status-icon offline-icon"></div>
                <div class="status-text">You are offline. Changes will be saved when you reconnect.</div>
            `;
        } else if (firestoreStatus === 'connecting') {
            // Browser is online but Firestore is connecting
            this.statusElement.classList.add('connecting');
            this.statusElement.innerHTML = `
                <div class="status-icon connecting-icon"></div>
                <div class="status-text">Reconnecting to server...</div>
            `;
        } else if (firestoreStatus === 'reconnect-failed') {
            // Failed to reconnect to Firestore
            this.statusElement.classList.add('reconnect-failed');
            this.statusElement.innerHTML = `
                <div class="status-icon error-icon"></div>
                <div class="status-text">Connection error. <button class="retry-button">Retry</button></div>
            `;
            
            // Add event listener to retry button
            const retryButton = this.statusElement.querySelector('.retry-button');
            if (retryButton) {
                retryButton.addEventListener('click', () => {
                    this.reconnectAttempts = 0;
                    this.attemptReconnect();
                });
            }
        } else {
            // Browser is online and Firestore is connected (or status unknown)
            this.statusElement.classList.add('online');
            
            if (firestoreStatus === 'connected') {
                // Show connected status briefly, then fade out
                this.statusElement.innerHTML = `
                    <div class="status-icon online-icon"></div>
                    <div class="status-text">Connected</div>
                `;
                
                // Fade out after 3 seconds
                setTimeout(() => {
                    this.statusElement.classList.add('fade-out');
                }, 3000);
            } else {
                // Default online state
                this.statusElement.innerHTML = `
                    <div class="status-icon online-icon"></div>
                    <div class="status-text">Online</div>
                `;
            }
        }
    }
    
    /**
     * Add a listener for network status changes
     * @param {Function} callback - The callback function
     */
    addListener(callback) {
        if (typeof callback === 'function' && !this.listeners.includes(callback)) {
            this.listeners.push(callback);
        }
    }
    
    /**
     * Remove a listener
     * @param {Function} callback - The callback function to remove
     */
    removeListener(callback) {
        const index = this.listeners.indexOf(callback);
        if (index !== -1) {
            this.listeners.splice(index, 1);
        }
    }
    
    /**
     * Notify all listeners of a status change
     * @param {string} status - The new status
     */
    notifyListeners(status) {
        this.listeners.forEach(callback => {
            try {
                callback(status);
            } catch (error) {
                console.error('Error in network status listener:', error);
            }
        });
    }
} 