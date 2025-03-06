/**
 * FirebaseManager Class
 * Centralizes all Firebase operations for the application
 */
import { initializeFirebase, getFirestore, getAuth, getStorage, getAnalytics } from './FirebaseConfig.js';
import { ThrottleUtils } from '../utils/ThrottleUtils.js';

/**
 * Batch size for Firestore operations
 * @type {number}
 */
const BATCH_SIZE = 20;

/**
 * Throttle delay for frequent updates (in milliseconds)
 * @type {number}
 */
const THROTTLE_DELAY = 500;

export class FirebaseManager {
    /**
     * Constructor
     */
    constructor() {
        this.app = null;
        this.db = null;
        this.auth = null;
        this.storage = null;
        this.analytics = null;
        this.user = null;
        this.isInitialized = false;
        this.listeners = {};
    }
    
    /**
     * Initialize the Firebase manager
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            // Initialize Firebase app
            this.app = await initializeFirebase();
            
            // Get Firebase services
            this.auth = await getAuth();
            this.db = await getFirestore();
            this.storage = await getStorage();
            
            // Initialize throttled functions
            this.initializeThrottledFunctions();
            
            // Set up auth state listener
            this.setupAuthStateListener();
            
            // Sign in anonymously if not already signed in
            if (!this.auth.currentUser) {
                await this.signInAnonymously();
            } else {
                this.user = this.auth.currentUser;
                console.log('User is already signed in:', this.user.uid);
            }
            
            // Wait for authentication to complete
            if (!this.user) {
                console.warn('Waiting for authentication to complete...');
                await new Promise((resolve) => {
                    const unsubscribe = this.auth.onAuthStateChanged((user) => {
                        if (user) {
                            this.user = user;
                            unsubscribe();
                            resolve();
                        }
                    });
                    
                    // Timeout after 5 seconds to prevent hanging
                    setTimeout(() => {
                        unsubscribe();
                        console.warn('Authentication timed out, continuing without user');
                        resolve();
                    }, 5000);
                });
            }
            
            console.log('FirebaseManager initialized successfully');
            return this;
        } catch (error) {
            console.error('Error initializing FirebaseManager:', error);
            throw error;
        }
    }
    
    /**
     * Set up authentication state listener
     */
    setupAuthStateListener() {
        const setupListener = async () => {
            const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js');
            
            onAuthStateChanged(this.auth, (user) => {
                if (user) {
                    // User is signed in
                    this.user = user;
                    console.log('User is signed in:', user.uid);
                } else {
                    // User is signed out
                    this.user = null;
                    console.log('User is signed out');
                    
                    // Sign in anonymously if no user
                    this.signInAnonymously();
                }
            });
        };
        
        setupListener();
    }
    
    /**
     * Sign in anonymously
     * @returns {Promise<Object>} - User object
     */
    async signInAnonymously() {
        try {
            const { signInAnonymously } = await import('https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js');
            const userCredential = await signInAnonymously(this.auth);
            this.user = userCredential.user;
            console.log('Signed in anonymously:', this.user.uid);
            return this.user;
        } catch (error) {
            console.error('Error signing in anonymously:', error);
            throw error;
        }
    }
    
    /**
     * Get the current user
     * @returns {Object|null} - Current user or null if not signed in
     */
    getCurrentUser() {
        return this.user;
    }
    
    /**
     * Check if a user is signed in
     * @returns {boolean} - True if a user is signed in, false otherwise
     */
    isUserSignedIn() {
        return !!this.user;
    }
    
    /**
     * Save an element to Firestore with batching for drawing paths
     * @param {Object} element - The element to save
     * @returns {Promise<string>} - The document ID
     */
    async saveElement(element) {
        try {
            const { collection, addDoc, serverTimestamp, writeBatch, doc } = await import('https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js');
            
            // Set creator information if not already set
            if (!element.createdBy) {
                element.createdBy = this.user ? this.user.uid : 'anonymous';
                element.createdAt = Date.now();
            }
            
            // Set updater information
            element.updatedBy = this.user ? this.user.uid : 'anonymous';
            element.updatedAt = Date.now();
            
            // Special handling for drawing elements with many points
            if (element.type === 'drawing' && element.points && element.points.length > BATCH_SIZE) {
                // Create the initial element with a subset of points
                const initialPoints = element.points.slice(0, BATCH_SIZE);
                const initialElement = { ...element, points: initialPoints };
                
                // Prepare element data
                const elementData = {
                    type: element.type,
                    createdAt: serverTimestamp(),
                    createdBy: element.createdBy,
                    lastModified: serverTimestamp(),
                    updatedBy: element.updatedBy,
                    properties: this.serializeElement(initialElement)
                };
                
                // Add document to Firestore
                const docRef = await addDoc(collection(this.db, 'guestbook', 'main', 'elements'), elementData);
                const elementId = docRef.id;
                
                // Process remaining points in batches
                const remainingPoints = element.points.slice(BATCH_SIZE);
                const batches = [];
                
                for (let i = 0; i < remainingPoints.length; i += BATCH_SIZE) {
                    const batchPoints = remainingPoints.slice(i, i + BATCH_SIZE);
                    batches.push(batchPoints);
                }
                
                // Update the element with each batch of points
                for (let i = 0; i < batches.length; i++) {
                    const batch = writeBatch(this.db);
                    const batchPoints = [...initialPoints, ...remainingPoints.slice(0, (i + 1) * BATCH_SIZE)];
                    const batchElement = { ...element, points: batchPoints };
                    
                    batch.update(doc(this.db, 'guestbook', 'main', 'elements', elementId), {
                        lastModified: serverTimestamp(),
                        properties: this.serializeElement(batchElement)
                    });
                    
                    await batch.commit();
                }
                
                console.log('Drawing element saved with batched points:', elementId);
                return elementId;
            } else {
                // Standard element saving for non-drawing elements or small drawings
                const elementData = {
                    type: element.type,
                    createdAt: serverTimestamp(),
                    createdBy: element.createdBy,
                    lastModified: serverTimestamp(),
                    updatedBy: element.updatedBy,
                    properties: this.serializeElement(element)
                };
                
                // Add document to Firestore
                const docRef = await addDoc(collection(this.db, 'guestbook', 'main', 'elements'), elementData);
                console.log('Element saved with ID:', docRef.id);
                
                return docRef.id;
            }
        } catch (error) {
            console.error('Error saving element:', error);
            throw error;
        }
    }
    
    /**
     * Update an element in Firestore with throttling for frequent updates
     * @param {string} elementId - The element ID
     * @param {Object} element - The updated element
     * @returns {Promise<void>}
     */
    async updateElement(elementId, element) {
        try {
            // If this is a throttled update, use the throttled function
            if (element.type === 'drawing' && this._throttledUpdateElement) {
                return this._throttledUpdateElement(elementId, element);
            }
            
            const { doc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js');
            
            // Set updater information
            element.updatedBy = this.user ? this.user.uid : 'anonymous';
            element.updatedAt = Date.now();
            
            // Prepare update data
            const updateData = {
                lastModified: serverTimestamp(),
                updatedBy: element.updatedBy,
                properties: this.serializeElement(element)
            };
            
            // Update document in Firestore
            await updateDoc(doc(this.db, 'guestbook', 'main', 'elements', elementId), updateData);
            console.log('Element updated:', elementId);
        } catch (error) {
            console.error('Error updating element:', error);
            throw error;
        }
    }
    
    /**
     * Delete an element from Firestore
     * @param {string} elementId - The element ID
     * @returns {Promise<void>}
     */
    async deleteElement(elementId) {
        try {
            const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js');
            
            // Delete document from Firestore
            await deleteDoc(doc(this.db, 'guestbook', 'main', 'elements', elementId));
            console.log('Element deleted:', elementId);
        } catch (error) {
            console.error('Error deleting element:', error);
            throw error;
        }
    }
    
    /**
     * Listen for element changes
     * @param {Function} callback - The callback function to call when elements change
     * @returns {Function} - Unsubscribe function
     */
    listenForElementChanges(callback) {
        const setupListener = async () => {
            const { collection, onSnapshot, query, orderBy } = await import('https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js');
            
            // Create query for elements collection
            const elementsQuery = query(
                collection(this.db, 'guestbook', 'main', 'elements'),
                orderBy('createdAt', 'asc')
            );
            
            // Set up real-time listener
            return onSnapshot(elementsQuery, (snapshot) => {
                const elements = [];
                const changes = { added: [], modified: [], removed: [] };
                
                snapshot.docChanges().forEach((change) => {
                    const element = {
                        id: change.doc.id,
                        ...change.doc.data()
                    };
                    
                    if (change.type === 'added') {
                        elements.push(element);
                        changes.added.push(element);
                    } else if (change.type === 'modified') {
                        elements.push(element);
                        changes.modified.push(element);
                    } else if (change.type === 'removed') {
                        changes.removed.push(element);
                    }
                });
                
                // Call callback with elements and changes
                callback(elements, changes);
            });
        };
        
        // Set up listener and store unsubscribe function
        return setupListener();
    }
    
    /**
     * Upload an image to Firebase Storage
     * @param {Blob} imageBlob - The image blob to upload
     * @param {string} path - The storage path
     * @returns {Promise<string>} - The download URL
     */
    async uploadImage(imageBlob, path = 'uploads') {
        try {
            const { ref, uploadBytes, getDownloadURL } = await import('https://www.gstatic.com/firebasejs/11.4.0/firebase-storage.js');
            
            // Generate a unique filename
            const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.jpg`;
            const fullPath = `guestbook-images/${path}/${filename}`;
            
            // Create storage reference
            const storageRef = ref(this.storage, fullPath);
            
            // Upload image
            const snapshot = await uploadBytes(storageRef, imageBlob);
            console.log('Image uploaded:', snapshot.metadata.fullPath);
            
            // Get download URL
            const downloadURL = await getDownloadURL(storageRef);
            console.log('Image download URL:', downloadURL);
            
            return downloadURL;
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    }
    
    /**
     * Upload an image from a data URL to Firebase Storage
     * @param {string} dataUrl - The image data URL
     * @param {string} path - The storage path
     * @returns {Promise<string>} - The download URL
     */
    async uploadImageFromDataUrl(dataUrl, path = 'uploads') {
        try {
            // Import the ImageUtils class
            const { ImageUtils } = await import('../utils/ImageUtils.js');
            
            // Convert data URL to Blob
            const blob = await ImageUtils.dataUrlToBlob(dataUrl);
            
            // Upload the blob
            return await this.uploadImage(blob, path);
        } catch (error) {
            console.error('Error uploading image from data URL:', error);
            throw error;
        }
    }
    
    /**
     * Serialize an element for Firestore
     * @param {Object} element - The element to serialize
     * @returns {Object} - Serialized element data
     */
    serializeElement(element) {
        // Use the element's serialize method if available
        if (typeof element.serialize === 'function') {
            return element.serialize();
        }
        
        // Fallback to manual serialization for backward compatibility
        // Base properties that all elements have
        const serialized = {
            id: element.id,
            x: element.x,
            y: element.y,
            rotation: element.rotation,
            scaleX: element.scaleX,
            scaleY: element.scaleY,
            zIndex: element.zIndex,
            visible: element.visible,
            createdAt: element.createdAt,
            updatedAt: element.updatedAt,
            createdBy: element.createdBy,
            updatedBy: element.updatedBy
        };
        
        // Add type-specific properties
        switch (element.type) {
            case 'drawing':
                serialized.points = element.points;
                serialized.color = element.color;
                serialized.width = element.width;
                serialized.opacity = element.opacity;
                break;
                
            case 'text':
                serialized.text = element.text;
                serialized.fontFamily = element.fontFamily;
                serialized.fontSize = element.fontSize;
                serialized.color = element.color;
                serialized.align = element.align;
                serialized.bold = element.bold;
                serialized.italic = element.italic;
                serialized.underline = element.underline;
                serialized.opacity = element.opacity;
                break;
                
            case 'sticky-note':
                serialized.text = element.text;
                serialized.color = element.color;
                serialized.width = element.width;
                serialized.height = element.height;
                serialized.fontSize = element.fontSize;
                serialized.fontFamily = element.fontFamily;
                serialized.textColor = element.textColor;
                serialized.opacity = element.opacity;
                break;
                
            case 'image':
                serialized.src = element.src;
                serialized.width = element.width;
                serialized.height = element.height;
                serialized.originalWidth = element.originalWidth;
                serialized.originalHeight = element.originalHeight;
                serialized.opacity = element.opacity;
                break;
                
            default:
                console.warn('Unknown element type for serialization:', element.type);
        }
        
        return serialized;
    }
    
    /**
     * Deserialize element data from Firestore
     * @param {Object} data - The element data from Firestore
     * @param {string} type - The element type
     * @returns {Promise<Object|null>} - Deserialized element or null if deserialization failed
     */
    async deserializeElement(data, type) {
        try {
            // Import necessary element classes
            const DrawingElementModule = await import('../elements/DrawingElement.js');
            const TextElementModule = await import('../elements/TextElement.js');
            const StickyNoteElementModule = await import('../elements/StickyNoteElement.js');
            const ImageElementModule = await import('../elements/ImageElement.js');
            
            // Create element based on type
            let element = null;
            
            switch (type) {
                case 'drawing':
                    element = DrawingElementModule.DrawingElement.deserialize(data);
                    break;
                    
                case 'text':
                    element = TextElementModule.TextElement.deserialize(data);
                    break;
                    
                case 'sticky-note':
                    element = StickyNoteElementModule.StickyNoteElement.deserialize(data);
                    break;
                    
                case 'image':
                    element = ImageElementModule.ImageElement.deserialize(data);
                    break;
                    
                default:
                    console.warn('Unknown element type for deserialization:', type);
                    return null;
            }
            
            return element;
        } catch (error) {
            console.error('Error deserializing element:', error);
            return null;
        }
    }
    
    /**
     * Get user information by user ID
     * @param {string} userId - The user ID
     * @returns {Promise<Object|null>} - User information or null if not found
     */
    async getUserInfo(userId) {
        try {
            if (!userId || userId === 'anonymous') {
                return {
                    id: 'anonymous',
                    displayName: 'Anonymous User',
                    color: '#808080', // Gray color for anonymous users
                    isAnonymous: true
                };
            }
            
            const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js');
            
            // Check if it's the current user
            if (this.user && this.user.uid === userId) {
                return {
                    id: this.user.uid,
                    displayName: this.user.displayName || `User ${this.user.uid.substring(0, 4)}`,
                    color: this.getUserColor(this.user.uid),
                    isAnonymous: this.user.isAnonymous
                };
            }
            
            // Try to get user from Firestore
            const userDoc = await getDoc(doc(this.db, 'users', userId));
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                return {
                    id: userId,
                    displayName: userData.displayName || `User ${userId.substring(0, 4)}`,
                    color: userData.color || this.getUserColor(userId),
                    isAnonymous: userData.isAnonymous || false
                };
            }
            
            // If user not found in Firestore, generate a default user
            return {
                id: userId,
                displayName: `User ${userId.substring(0, 4)}`,
                color: this.getUserColor(userId),
                isAnonymous: true
            };
        } catch (error) {
            console.error('Error getting user info:', error);
            
            // Return a default user object
            return {
                id: userId,
                displayName: `User ${userId.substring(0, 4)}`,
                color: this.getUserColor(userId),
                isAnonymous: true
            };
        }
    }
    
    /**
     * Get a consistent color for a user based on their ID
     * @param {string} userId - The user ID
     * @returns {string} - A hex color code
     */
    getUserColor(userId) {
        // Generate a consistent color based on the user ID
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            hash = userId.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        // Use a predefined palette of nice colors
        const colors = [
            '#4285F4', // Google Blue
            '#EA4335', // Google Red
            '#FBBC05', // Google Yellow
            '#34A853', // Google Green
            '#673AB7', // Deep Purple
            '#3F51B5', // Indigo
            '#2196F3', // Blue
            '#03A9F4', // Light Blue
            '#00BCD4', // Cyan
            '#009688', // Teal
            '#4CAF50', // Green
            '#8BC34A', // Light Green
            '#CDDC39', // Lime
            '#FFC107', // Amber
            '#FF9800', // Orange
            '#FF5722'  // Deep Orange
        ];
        
        // Use the hash to select a color from the palette
        const index = Math.abs(hash) % colors.length;
        return colors[index];
    }
    
    /**
     * Initialize throttled functions
     */
    initializeThrottledFunctions() {
        // Create throttled update function for drawing elements
        this._throttledUpdateElement = ThrottleUtils.throttle(
            async (elementId, element) => {
                try {
                    const { doc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js');
                    
                    // Set updater information
                    element.updatedBy = this.user ? this.user.uid : 'anonymous';
                    element.updatedAt = Date.now();
                    
                    // Prepare update data
                    const updateData = {
                        lastModified: serverTimestamp(),
                        updatedBy: element.updatedBy,
                        properties: this.serializeElement(element)
                    };
                    
                    // Update document in Firestore
                    await updateDoc(doc(this.db, 'guestbook', 'main', 'elements', elementId), updateData);
                    console.log('Element updated (throttled):', elementId);
                } catch (error) {
                    console.error('Error updating element (throttled):', error);
                }
            },
            THROTTLE_DELAY,
            { leading: true, trailing: true }
        );
    }

    /**
     * Listen for elements in the viewport
     * @param {Object} bounds - The viewport bounds {minX, minY, maxX, maxY}
     * @param {Function} callback - The callback function to call when elements change
     * @returns {Function} - Unsubscribe function
     */
    listenForElementsInViewport(bounds, callback) {
        const setupListener = async () => {
            const { collection, onSnapshot, query, where, orderBy, or } = await import('https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js');
            
            // Create query for elements in the viewport
            // Note: This is a simplified approach. For more complex spatial queries,
            // consider using Firestore's GeoPoint or a more sophisticated spatial indexing solution.
            const elementsQuery = query(
                collection(this.db, 'guestbook', 'main', 'elements'),
                orderBy('createdAt', 'asc')
                // We're not using where clauses here because Firestore has limitations with
                // compound queries. Instead, we'll filter the results client-side.
            );
            
            // Set up real-time listener
            return onSnapshot(elementsQuery, (snapshot) => {
                const elements = [];
                const changes = { added: [], modified: [], removed: [] };
                
                snapshot.docChanges().forEach((change) => {
                    const element = {
                        id: change.doc.id,
                        ...change.doc.data()
                    };
                    
                    // Filter elements based on viewport bounds
                    const props = element.properties || {};
                    const isInViewport = this.isElementInViewport(props, bounds);
                    
                    if (isInViewport) {
                        if (change.type === 'added') {
                            elements.push(element);
                            changes.added.push(element);
                        } else if (change.type === 'modified') {
                            elements.push(element);
                            changes.modified.push(element);
                        } else if (change.type === 'removed') {
                            changes.removed.push(element);
                        }
                    }
                });
                
                // Call callback with elements and changes
                callback(elements, changes);
            });
        };
        
        // Set up listener and store unsubscribe function
        return setupListener();
    }

    /**
     * Check if an element is in the viewport
     * @param {Object} properties - The element properties
     * @param {Object} bounds - The viewport bounds
     * @returns {boolean} - True if the element is in the viewport
     */
    isElementInViewport(properties, bounds) {
        if (!properties || !bounds) return false;
        
        // Get element position
        const x = properties.x || 0;
        const y = properties.y || 0;
        
        // For elements with width and height (images, sticky notes)
        const width = properties.width || 0;
        const height = properties.height || 0;
        
        // For drawing elements with points
        const points = properties.points || [];
        
        // Check if element is in viewport
        if (width > 0 && height > 0) {
            // Check if rectangle overlaps viewport
            return !(
                x + width < bounds.minX ||
                x > bounds.maxX ||
                y + height < bounds.minY ||
                y > bounds.maxY
            );
        } else if (points.length > 0) {
            // For drawings, check if any point is in viewport
            return points.some(point => {
                const pointX = point.x || 0;
                const pointY = point.y || 0;
                return (
                    pointX >= bounds.minX &&
                    pointX <= bounds.maxX &&
                    pointY >= bounds.minY &&
                    pointY <= bounds.maxY
                );
            });
        } else {
            // For point elements, check if point is in viewport
            return (
                x >= bounds.minX &&
                x <= bounds.maxX &&
                y >= bounds.minY &&
                y <= bounds.maxY
            );
        }
    }
} 