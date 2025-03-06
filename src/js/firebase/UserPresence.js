/**
 * UserPresence Class
 * Handles user presence tracking in the application
 */
export class UserPresence {
    /**
     * Constructor
     * @param {FirebaseManager} firebaseManager - The Firebase manager instance
     */
    constructor(firebaseManager) {
        this.firebaseManager = firebaseManager;
        this.db = null;
        this.auth = null;
        this.userRef = null;
        this.userColor = this.generateRandomColor();
        this.userName = 'Anonymous User';
        this.isOnline = false;
        this.onlineUsers = [];
        this.onlineUsersListeners = [];
    }
    
    /**
     * Initialize user presence
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            // Wait for Firebase manager to be initialized
            if (!this.firebaseManager.isInitialized) {
                await this.firebaseManager.initialize();
            }
            
            // Get Firestore and Auth instances
            this.db = this.firebaseManager.db;
            this.auth = this.firebaseManager.auth;
            
            // Set up presence tracking
            await this.setupPresenceTracking();
            
            // Listen for online users
            this.listenForOnlineUsers();
            
            console.log('UserPresence initialized successfully');
        } catch (error) {
            console.error('Error initializing UserPresence:', error);
            throw error;
        }
    }
    
    /**
     * Set up presence tracking
     * @returns {Promise<void>}
     */
    async setupPresenceTracking() {
        try {
            const { doc, setDoc, serverTimestamp, updateDoc } = await import('https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js');
            
            // Get current user
            const user = this.firebaseManager.getCurrentUser();
            if (!user) {
                console.warn('No user signed in, cannot set up presence tracking');
                return;
            }
            
            // Create user reference
            this.userRef = doc(this.db, 'guestbook', 'main', 'presence', user.uid);
            
            // Set initial presence data
            await setDoc(this.userRef, {
                uid: user.uid,
                name: this.userName,
                color: this.userColor,
                lastActive: serverTimestamp(),
                isOnline: true,
                cursorPosition: { x: 0, y: 0 }
            });
            
            // Set up periodic updates for presence
            this.presenceInterval = setInterval(async () => {
                try {
                    await updateDoc(this.userRef, {
                        lastActive: serverTimestamp()
                    });
                } catch (error) {
                    console.warn('Error updating presence:', error);
                }
            }, 30000); // Update every 30 seconds
            
            // Set up beforeunload handler to mark user as offline when leaving
            window.addEventListener('beforeunload', async () => {
                try {
                    await updateDoc(this.userRef, {
                        isOnline: false,
                        lastActive: new Date().getTime() // Use client timestamp for immediate update
                    });
                    clearInterval(this.presenceInterval);
                } catch (error) {
                    console.warn('Error updating offline status:', error);
                }
            });
            
            // Set online flag
            this.isOnline = true;
            
            console.log('Presence tracking set up for user:', user.uid);
        } catch (error) {
            console.error('Error setting up presence tracking:', error);
            throw error;
        }
    }
    
    /**
     * Listen for online users
     * @returns {Promise<Function>} - Unsubscribe function
     */
    async listenForOnlineUsers() {
        try {
            const { collection, onSnapshot, query, where } = await import('https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js');
            
            // Create query for online users
            const onlineUsersQuery = query(
                collection(this.db, 'guestbook', 'main', 'presence'),
                where('isOnline', '==', true)
            );
            
            // Set up real-time listener
            const unsubscribe = onSnapshot(onlineUsersQuery, (snapshot) => {
                const users = [];
                
                snapshot.forEach((doc) => {
                    const userData = doc.data();
                    users.push({
                        uid: doc.id,
                        name: userData.name,
                        color: userData.color,
                        lastActive: userData.lastActive,
                        cursorPosition: userData.cursorPosition
                    });
                });
                
                // Update online users
                this.onlineUsers = users;
                
                // Notify listeners
                this.notifyOnlineUsersListeners();
                
                console.log('Online users updated:', users.length);
            });
            
            return unsubscribe;
        } catch (error) {
            console.error('Error listening for online users:', error);
            throw error;
        }
    }
    
    /**
     * Update user cursor position
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @returns {Promise<void>}
     */
    async updateCursorPosition(x, y) {
        try {
            if (!this.userRef) {
                console.warn('No user reference, cannot update cursor position');
                return;
            }
            
            const { updateDoc } = await import('https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js');
            
            // Update cursor position
            await updateDoc(this.userRef, {
                cursorPosition: { x, y }
            });
        } catch (error) {
            console.error('Error updating cursor position:', error);
        }
    }
    
    /**
     * Update user name
     * @param {string} name - The new user name
     * @returns {Promise<void>}
     */
    async updateUserName(name) {
        try {
            if (!this.userRef) {
                console.warn('No user reference, cannot update user name');
                return;
            }
            
            const { updateDoc } = await import('https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js');
            
            // Update user name
            this.userName = name;
            await updateDoc(this.userRef, { name });
            
            console.log('User name updated:', name);
        } catch (error) {
            console.error('Error updating user name:', error);
        }
    }
    
    /**
     * Update user color
     * @param {string} color - The new user color
     * @returns {Promise<void>}
     */
    async updateUserColor(color) {
        try {
            if (!this.userRef) {
                console.warn('No user reference, cannot update user color');
                return;
            }
            
            const { updateDoc } = await import('https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js');
            
            // Update user color
            this.userColor = color;
            await updateDoc(this.userRef, { color });
            
            console.log('User color updated:', color);
        } catch (error) {
            console.error('Error updating user color:', error);
        }
    }
    
    /**
     * Add online users listener
     * @param {Function} listener - The listener function
     */
    addOnlineUsersListener(listener) {
        this.onlineUsersListeners.push(listener);
    }
    
    /**
     * Remove online users listener
     * @param {Function} listener - The listener function to remove
     */
    removeOnlineUsersListener(listener) {
        const index = this.onlineUsersListeners.indexOf(listener);
        if (index !== -1) {
            this.onlineUsersListeners.splice(index, 1);
        }
    }
    
    /**
     * Notify online users listeners
     */
    notifyOnlineUsersListeners() {
        this.onlineUsersListeners.forEach((listener) => {
            listener(this.onlineUsers);
        });
    }
    
    /**
     * Generate a random color
     * @returns {string} - A random color in hex format
     */
    generateRandomColor() {
        const colors = [
            '#FF5733', // Red-Orange
            '#33FF57', // Green
            '#3357FF', // Blue
            '#FF33F5', // Pink
            '#F5FF33', // Yellow
            '#33FFF5', // Cyan
            '#FF5733', // Orange
            '#8C33FF', // Purple
            '#FF338C', // Magenta
            '#33FF8C'  // Mint
        ];
        
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    /**
     * Get online users
     * @returns {Array} - Array of online users
     */
    getOnlineUsers() {
        return this.onlineUsers;
    }
    
    /**
     * Get current user color
     * @returns {string} - The current user's color
     */
    getUserColor() {
        return this.userColor;
    }
    
    /**
     * Get current user name
     * @returns {string} - The current user's name
     */
    getUserName() {
        return this.userName;
    }
    
    /**
     * Clean up resources
     */
    cleanup() {
        // Clear the presence interval
        if (this.presenceInterval) {
            clearInterval(this.presenceInterval);
            this.presenceInterval = null;
        }
        
        // Mark user as offline if possible
        if (this.userRef && this.isOnline) {
            const updateOfflineStatus = async () => {
                try {
                    const { updateDoc } = await import('https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js');
                    await updateDoc(this.userRef, {
                        isOnline: false,
                        lastActive: new Date().getTime()
                    });
                    console.log('User marked as offline during cleanup');
                } catch (error) {
                    console.warn('Error marking user as offline during cleanup:', error);
                }
            };
            
            updateOfflineStatus();
        }
        
        // Reset state
        this.isOnline = false;
        this.onlineUsers = [];
        this.onlineUsersListeners = [];
        
        console.log('UserPresence cleaned up');
    }
} 