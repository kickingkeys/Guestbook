/**
 * FirebaseManager Class
 * Centralizes all Firebase operations for the application
 */
import { initializeFirebase, initializeFirestore, getAuth, getStorage, getAnalytics } from './FirebaseConfig.js';
import { ThrottleUtils } from '../utils/ThrottleUtils.js';

/**
 * Batch size for Firestore operations
 * @type {number}
 */
const BATCH_SIZE = 20;

/**
 * Throttle delay for throttling Firebase updates
 * @type {number}
 */
const THROTTLE_DELAY = 100; // Reduced from 500ms to 100ms for faster updates

/**
 * Collection names
 * @type {string}
 */
const COLLECTION_NAME = 'guestbook';
const DOCUMENT_NAME = 'main';
const ELEMENTS_COLLECTION = 'elements';
const USERS_COLLECTION = 'users';

/**
 * Deboce delay for debouncing
 * @type {number}
 */
const DEBOUNCE_DELAY = 200;

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
            console.log('[FIREBASE] Starting FirebaseManager initialization...');
            
            // Initialize Firebase app
            this.app = await initializeFirebase();
            console.log('[FIREBASE] Firebase app initialized:', this.app.name);
            
            // Get Firebase services
            console.log('[FIREBASE] Initializing Firebase services...');
            this.auth = await getAuth();
            console.log('[FIREBASE] Auth service initialized');
            
            this.db = await initializeFirestore();
            console.log('[FIREBASE] Firestore service initialized');
            
            console.log('[FIREBASE] Initializing Storage service...');
            this.storage = await getStorage();
            console.log('[FIREBASE] Storage service initialized:', {
                storageExists: !!this.storage,
                storageBucket: this.storage?.bucket || 'No bucket'
            });
            
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
            
            this.isInitialized = true;
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
     * Save an element to Firestore
     * @param {Object} element - The element to save
     * @returns {Promise<string>} - The document ID
     */
    async saveElement(element) {
        try {
            if (!element) {
                console.error('❌ FIREBASE: Cannot save undefined element');
                return null;
            }
            
            if (!element.type) {
                console.error('❌ FIREBASE: Cannot save element without type', element);
                return null;
            }
            
            console.log(`🔥 FIREBASE: Saving element - Type: ${element.type}, ID: ${element.id}`);
            
            const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js');
            
            // Set creator information
            element.createdBy = this.user ? this.user.uid : 'anonymous';
            element.updatedBy = element.createdBy;
            element.createdAt = Date.now();
            element.updatedAt = element.createdAt;
            
            // Serialize the element - now async
            const serializedElement = await this.serializeElement(element);
            
            // Prepare document data
            const docData = {
                createdAt: serverTimestamp(),
                lastModified: serverTimestamp(),
                createdBy: element.createdBy,
                updatedBy: element.updatedBy,
                type: element.type,
                properties: serializedElement
            };
            
            // Add document to Firestore
            const docRef = await addDoc(collection(this.db, 'guestbook', 'main', 'elements'), docData);
            console.log(`✅ FIREBASE: Element saved successfully - ID: ${docRef.id}`);
            
            // Return the document ID
            return docRef.id;
        } catch (error) {
            console.error('❌ FIREBASE: Error saving element:', error);
            return null;
        }
    }
    
    /**
     * Validate Firestore data to ensure it doesn't contain undefined values
     * @param {Object} data - The data to validate
     * @private
     */
    _validateFirestoreData(data) {
        // Check for undefined values at the top level
        for (const key in data) {
            if (data[key] === undefined) {
                console.warn(`[SAVE] Found undefined value for ${key}, replacing with null`);
                data[key] = null;
            }
        }
        
        // Check properties object if it exists
        if (data.properties) {
            for (const key in data.properties) {
                if (data.properties[key] === undefined) {
                    console.warn(`[SAVE] Found undefined value for properties.${key}, replacing with null`);
                    data.properties[key] = null;
                }
            }
        }
    }
    
    /**
     * Update an element in Firestore
     * @param {string} elementId - The element ID
     * @param {Object} element - The element to update
     * @param {boolean} positionUpdateOnly - Whether this is just a position update
     * @returns {Promise<boolean>} - True if the update was successful
     */
    async updateElement(elementId, element, positionUpdateOnly = false) {
        try {
            const { doc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js');
            
            if (!elementId) {
                console.error('❌ FIREBASE: Cannot update element without an ID');
                return false;
            }
            
            if (!element) {
                console.error(`❌ FIREBASE: Cannot update null or undefined element - ID: ${elementId}`);
                return false;
            }
            
            if (!element.type) {
                console.error(`❌ FIREBASE: Cannot update element - Missing element type for ID: ${elementId}`, element);
                return false;
            }
            
            console.log(`🔥 FIREBASE: Starting update for element - Type: ${element.type}, ID: ${elementId}, Position update only: ${positionUpdateOnly}`);
            
            // If this is a throttled update, use the throttled function
            if (element.type === 'drawing' && this._throttledUpdateElement) {
                console.log(`🔥 FIREBASE: Using throttled update for drawing element - ID: ${elementId}`);
                return this._throttledUpdateElement(elementId, element, positionUpdateOnly);
            }
            
            // Special validation for text elements
            if (element.type === 'text') {
                console.log(`📝 TEXT FIREBASE: Validating text element before update - ID: ${elementId}`);
                
                // Ensure text content exists
                if (element.text === undefined || element.text === null) {
                    console.warn(`⚠️ TEXT FIREBASE: Text element missing text content - ID: ${elementId}`);
                    
                    // Try to find the element in the window.canvasManager to get its text content
                    if (window.canvasManager) {
                        const existingElement = window.canvasManager.getElementById(element.id);
                        if (existingElement && existingElement.type === 'text' && existingElement.text !== undefined) {
                            element.text = existingElement.text;
                            console.log(`📝 TEXT FIREBASE: Using existing text content - ID: ${elementId}, Text: "${element.text}"`);
                        } else {
                            // Set to empty string as fallback
                            element.text = '';
                            console.warn(`⚠️ TEXT FIREBASE: Setting empty text content as fallback - ID: ${elementId}`);
                        }
                    } else {
                        // Set to empty string as fallback
                        element.text = '';
                    }
                }
                
                // Force positionUpdateOnly to false for text elements to ensure all properties are included
                if (positionUpdateOnly) {
                    console.log(`📝 TEXT FIREBASE: Overriding positionUpdateOnly to include text content - ID: ${elementId}`);
                    positionUpdateOnly = false;
                }
                
                // Log text properties
                console.log(`📝 TEXT FIREBASE: Text properties - ID: ${elementId}, Text: "${element.text}", Font: ${element.fontSize}px ${element.fontFamily}`);
            }
            
            // Set updater information
            element.updatedBy = this.user ? this.user.uid : 'anonymous';
            element.updatedAt = Date.now();
            
            // Serialize the element - now async
            const serializedElement = await this.serializeElement(element, positionUpdateOnly);
            
            // Prepare update data
            const updateData = {
                lastModified: serverTimestamp(),
                updatedBy: element.updatedBy,
                properties: serializedElement
            };
            
            console.log(`🔥 FIREBASE: Serialized element data prepared - Size: ${JSON.stringify(updateData).length} bytes`);
            
            // Update document in Firestore
            await updateDoc(doc(this.db, 'guestbook', 'main', 'elements', elementId), updateData);
            console.log(`✅ FIREBASE: Element successfully updated in Firestore - ID: ${elementId}`);
            
            return true;
        } catch (error) {
            console.error(`❌ FIREBASE: Error updating element in Firestore:`, error);
            return false;
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
     * Listen for changes to all elements
     * @param {Function} callback - Callback function to handle changes
     * @returns {Promise<Function>} - Promise that resolves to an unsubscribe function
     */
    async listenForElementChanges(callback) {
        console.log('[FIREBASE] Setting up listener for all elements');
        
        try {
            console.log('[FIREBASE] Importing Firestore modules...');
            
            const { collection, onSnapshot, query, orderBy } = await import('https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js');
            
            console.log('[FIREBASE] Creating query for elements collection...');
            
            // Create query for elements collection
            const elementsQuery = query(
                collection(this.db, 'guestbook', 'main', 'elements'),
                orderBy('createdAt', 'asc')
            );
            
            console.log('[FIREBASE] Element listener query created, setting up snapshot listener...');
            
            // Set up real-time listener
            const unsubscribeFunction = onSnapshot(elementsQuery, (snapshot) => {
                const elements = [];
                const changes = { added: [], modified: [], removed: [] };
                
                console.log(`[FIREBASE] Received snapshot with ${snapshot.docChanges().length} changes`);
                
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
                
                console.log(`[FIREBASE] Processing changes - Added: ${changes.added.length}, Modified: ${changes.modified.length}, Removed: ${changes.removed.length}`);
                
                // Call callback with elements and changes
                callback(elements, changes);
            }, (error) => {
                console.error('[FIREBASE] Error in element listener:', error);
            });
            
            console.log('[FIREBASE] Snapshot listener set up successfully, returning unsubscribe function:', typeof unsubscribeFunction);
            
            // Ensure we're returning a function, not a Promise
            if (typeof unsubscribeFunction !== 'function') {
                console.error('[FIREBASE] onSnapshot did not return a function as expected:', unsubscribeFunction);
                return () => {
                    console.log('[FIREBASE] Called fallback unsubscribe function');
                };
            }
            
            return unsubscribeFunction;
        } catch (error) {
            console.error('[FIREBASE] Failed to set up element listener:', error);
            console.log('[FIREBASE] Returning empty unsubscribe function');
            return () => {
                console.log('[FIREBASE] Called empty unsubscribe function');
            }; // Return empty unsubscribe function
        }
    }
    
    /**
     * Upload an image to Firebase Storage
     * @param {Blob} imageBlob - The image blob to upload
     * @param {string} path - The storage path
     * @param {number} retryCount - The current retry count
     * @returns {Promise<string>} - The download URL
     */
    async uploadImage(imageBlob, path = 'uploads', retryCount = 0) {
        const MAX_RETRIES = 3;
        const RETRY_DELAY = 2000; // 2 seconds
        const UPLOAD_TIMEOUT = 120000; // 120 seconds (increased from 60)
        
        try {
            console.log(`[UPLOAD] Starting image upload to path: ${path}`, {
                blobSize: imageBlob.size,
                blobType: imageBlob.type,
                storageInitialized: !!this.storage,
                retryAttempt: retryCount
            });
            
            // Check if storage is initialized
            if (!this.storage) {
                console.error('[UPLOAD ERROR] Firebase Storage not initialized');
                
                // Try to initialize storage
                console.log('[UPLOAD] Attempting to initialize storage...');
                try {
                    const { getStorage } = await import('https://www.gstatic.com/firebasejs/11.4.0/firebase-storage.js');
                    this.storage = getStorage();
                    console.log('[UPLOAD] Storage initialized successfully');
                } catch (storageError) {
                    console.error('[UPLOAD ERROR] Failed to initialize storage:', storageError);
                    throw new Error('Firebase Storage not initialized');
                }
            }
            
            const { ref, uploadBytes, getDownloadURL } = await import('https://www.gstatic.com/firebasejs/11.4.0/firebase-storage.js');
            
            // Generate a unique filename
            const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.jpg`;
            const fullPath = `${path}/${filename}`;
            console.log(`[UPLOAD] Generated path: ${fullPath}`);
            
            // Create storage reference
            const storageRef = ref(this.storage, fullPath);
            console.log(`[UPLOAD] Created storage reference`, {
                fullPath: storageRef.fullPath,
                bucket: storageRef.bucket
            });
            
            // Upload image with timeout promise
            console.log(`[UPLOAD] Starting uploadBytes operation...`);
            
            // Create a timeout promise
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Upload timeout')), UPLOAD_TIMEOUT);
            });
            
            // Race the upload against the timeout
            let snapshot;
            try {
                console.log('[UPLOAD] Executing uploadBytes...');
                snapshot = await Promise.race([
                    uploadBytes(storageRef, imageBlob),
                    timeoutPromise
                ]);
                console.log('[UPLOAD] uploadBytes completed successfully');
            } catch (uploadError) {
                console.error('[UPLOAD ERROR] Error during uploadBytes operation:', uploadError);
                
                // Check if we should retry
                if (retryCount < MAX_RETRIES) {
                    console.log(`[UPLOAD] Will retry upload after delay (attempt ${retryCount + 1}/${MAX_RETRIES})`);
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                    return this.uploadImage(imageBlob, path, retryCount + 1);
                }
                
                // If we've exhausted retries, return a data URL as fallback
                console.warn('[UPLOAD] Upload failed after all retries, using data URL as fallback');
                return this._createDataURLFromBlob(imageBlob);
            }
            
            console.log('[UPLOAD] Image uploaded successfully:', {
                fullPath: snapshot.metadata.fullPath,
                size: snapshot.metadata.size,
                contentType: snapshot.metadata.contentType,
                generation: snapshot.metadata.generation
            });
            
            // Get download URL with timeout
            console.log(`[UPLOAD] Getting download URL...`);
            let downloadURL;
            try {
                downloadURL = await Promise.race([
                    getDownloadURL(storageRef),
                    timeoutPromise
                ]);
                console.log('[UPLOAD] Download URL obtained successfully');
            } catch (downloadError) {
                console.error('[UPLOAD ERROR] Error getting download URL:', downloadError);
                
                // Check if we should retry
                if (retryCount < MAX_RETRIES) {
                    console.log(`[UPLOAD] Will retry getting download URL after delay (attempt ${retryCount + 1}/${MAX_RETRIES})`);
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                    return this.uploadImage(imageBlob, path, retryCount + 1);
                }
                
                // If we've exhausted retries, return a data URL as fallback
                console.warn('[UPLOAD] Failed to get download URL after all retries, using data URL as fallback');
                return this._createDataURLFromBlob(imageBlob);
            }
            
            return downloadURL;
        } catch (error) {
            console.error('[UPLOAD ERROR] Unexpected error during image upload:', error);
            
            // Check if we should retry
            if (retryCount < MAX_RETRIES) {
                console.log(`[UPLOAD] Will retry upload after delay (attempt ${retryCount + 1}/${MAX_RETRIES})`);
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                return this.uploadImage(imageBlob, path, retryCount + 1);
            }
            
            // If we've exhausted retries, return a data URL as fallback
            console.warn('[UPLOAD] Upload failed after all retries, using data URL as fallback');
            return this._createDataURLFromBlob(imageBlob);
        }
    }
    
    /**
     * Create a data URL from a blob (fallback for failed uploads)
     * @param {Blob} blob - The blob to convert
     * @returns {Promise<string>} - The data URL
     * @private
     */
    _createDataURLFromBlob(blob) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    }
    
    /**
     * Upload an image from a data URL to Firebase Storage
     * @param {string} dataUrl - The image data URL
     * @param {string} path - The storage path
     * @returns {Promise<string>} - The download URL
     */
    async uploadImageFromDataUrl(dataUrl, path = 'uploads') {
        try {
            console.log(`[UPLOAD] Starting data URL conversion for path: ${path}`, {
                dataUrlLength: dataUrl ? dataUrl.length : 0,
                dataUrlPrefix: dataUrl ? dataUrl.substring(0, 30) + '...' : 'null'
            });
            
            if (!dataUrl) {
                throw new Error('No data URL provided');
            }
            
            if (!dataUrl.startsWith('data:')) {
                console.warn('[UPLOAD] Invalid data URL format, returning original URL');
                return dataUrl; // Return the original URL if it's not a data URL
            }
            
            // Import the ImageUtils class
            const { ImageUtils } = await import('../utils/ImageUtils.js');
            
            // Convert data URL to Blob
            console.log(`[UPLOAD] Converting data URL to blob...`);
            const blob = await ImageUtils.dataUrlToBlob(dataUrl);
            
            if (!blob || blob.size === 0) {
                console.error('[UPLOAD ERROR] Failed to convert data URL to blob or blob is empty');
                return dataUrl; // Return the original data URL as fallback
            }
            
            console.log(`[UPLOAD] Data URL converted to blob successfully`, {
                blobSize: blob.size,
                blobType: blob.type
            });
            
            // Upload the blob
            const downloadURL = await this.uploadImage(blob, path);
            
            if (!downloadURL) {
                console.error('[UPLOAD ERROR] No download URL returned from uploadImage');
                return dataUrl; // Return the original data URL as fallback
            }
            
            return downloadURL;
        } catch (error) {
            console.error('[UPLOAD ERROR] Error uploading image from data URL:', {
                errorCode: error.code,
                errorMessage: error.message,
                errorName: error.name,
                path: path,
                dataUrlProvided: !!dataUrl,
                dataUrlLength: dataUrl ? dataUrl.length : 0
            });
            
            // Return the original data URL as fallback
            console.log('[UPLOAD] Falling back to original data URL due to upload error');
            return dataUrl;
        }
    }
    
    /**
     * Serialize an element for Firestore
     * @param {Object} element - The element to serialize
     * @param {boolean} positionUpdateOnly - Whether this is just a position update
     * @returns {Object} - Serialized element data
     */
    async serializeElement(element, positionUpdateOnly = false) {
        try {
            // Validate element
            if (!element) {
                console.error('❌ SERIALIZE: Cannot serialize undefined element');
                return { error: 'Element is undefined' };
            }
            
            if (!element.type) {
                console.error('❌ SERIALIZE: Element missing type property', element);
                return { 
                    id: element.id || 'unknown',
                    type: 'unknown',
                    error: 'Element missing type property'
                };
            }
            
            // For position updates, only include necessary properties
            if (positionUpdateOnly) {
                // For image elements, always include the source to prevent it from being lost
                if (element.type === 'image') {
                    console.log(`🖼️ IMAGE SERIALIZE: Including source in position update - ID: ${element.id}`);
                    return {
                        id: element.id,
                        type: element.type,
                        x: element.x,
                        y: element.y,
                        rotation: element.rotation,
                        scaleX: element.scaleX,
                        scaleY: element.scaleY,
                        // Include these critical image properties even for position updates
                        src: element.src,
                        width: element.width,
                        height: element.height,
                        originalWidth: element.originalWidth,
                        originalHeight: element.originalHeight,
                        aspectRatio: element.originalWidth / element.originalHeight,
                        opacity: element.opacity,
                        isStorageUrl: element.isStorageUrl,
                        updatedAt: element.updatedAt,
                        updatedBy: element.updatedBy
                    };
                }
                // For text elements, always include the text content to prevent it from being lost
                else if (element.type === 'text') {
                    // Log detailed information about the text element being serialized
                    console.log(`📝 TEXT SERIALIZE: Including text content in position update - ID: ${element.id}, Text: "${element.text || ''}"`);
                    
                    // Validate text content before serializing
                    if (element.text === undefined || element.text === null) {
                        console.warn(`⚠️ TEXT SERIALIZE: Text element has undefined text content - ID: ${element.id}`);
                        
                        // Try to find the element in the window.canvasManager to get its text content
                        if (window.canvasManager) {
                            const existingElement = window.canvasManager.getElementById(element.id);
                            if (existingElement && existingElement.type === 'text' && existingElement.text !== undefined) {
                                element.text = existingElement.text;
                                console.log(`📝 TEXT SERIALIZE: Using existing text content - ID: ${element.id}, Text: "${element.text}"`);
                            } else {
                                // Set to empty string as fallback
                                element.text = '';
                                console.warn(`⚠️ TEXT SERIALIZE: Setting empty text content as fallback - ID: ${element.id}`);
                            }
                        } else {
                            // Set to empty string as fallback
                            element.text = '';
                        }
                    }
                    
                    return {
                        id: element.id,
                        type: element.type,
                        x: element.x,
                        y: element.y,
                        rotation: element.rotation,
                        scaleX: element.scaleX,
                        scaleY: element.scaleY,
                        // Include these critical text properties even for position updates
                        text: element.text,
                        fontSize: element.fontSize,
                        fontFamily: element.fontFamily,
                        color: element.color,
                        align: element.align,
                        bold: element.bold,
                        italic: element.italic,
                        underline: element.underline,
                        opacity: element.opacity,
                        updatedAt: element.updatedAt,
                        updatedBy: element.updatedBy
                    };
                }
                
                // For other element types, just include position properties
                return {
                    id: element.id,
                    type: element.type,
                    x: element.x,
                    y: element.y,
                    rotation: element.rotation,
                    scaleX: element.scaleX,
                    scaleY: element.scaleY,
                    updatedAt: element.updatedAt,
                    updatedBy: element.updatedBy
                };
            }
            
            // Check if the element has a serialize method
            if (typeof element.serialize === 'function') {
                const serialized = element.serialize();
                
                if (element.type === 'drawing') {
                    console.log(`✏️ DRAWING SERIALIZE: Element serialized - ID: ${element.id}, Points: ${element.points?.length || 0}`);
                }
                
                // Special handling for image elements with data URLs
                if (element.type === 'image' && serialized.src && serialized.src.startsWith('data:')) {
                    console.log('[SERIALIZE] Image element with data URL detected', {
                        elementId: element.id,
                        srcLength: serialized.src.length,
                        isStorageUrl: element.isStorageUrl
                    });
                    
                    // If the data URL is too large, upload it to Firebase Storage
                    // Firestore has a 1MB document size limit
                    const MAX_DATA_URL_LENGTH = 500000; // ~500KB to be safe
                    
                    if (serialized.src.length > MAX_DATA_URL_LENGTH) {
                        console.log('[SERIALIZE] Data URL too large for Firestore, uploading to Firebase Storage', {
                            originalLength: serialized.src.length,
                            maxLength: MAX_DATA_URL_LENGTH
                        });
                        
                        try {
                            // Upload the image to Firebase Storage
                            const storageUrl = await this.uploadImageFromDataUrl(
                                serialized.src, 
                                `images/${element.id}`
                            );
                            
                            if (storageUrl && storageUrl !== serialized.src) {
                                console.log('[SERIALIZE] Image uploaded to Firebase Storage successfully', {
                                    elementId: element.id,
                                    storageUrl: storageUrl.substring(0, 50) + '...'
                                });
                                
                                // Update the serialized data with the storage URL
                                serialized.src = storageUrl;
                                serialized.isStorageUrl = true;
                                
                                // Also update the original element
                                element.src = storageUrl;
                                element.isStorageUrl = true;
                                
                                // Reload the image
                                if (element.image) {
                                    element.image.src = storageUrl;
                                }
                            } else {
                                console.error('[SERIALIZE] Failed to upload image to Firebase Storage', {
                                    elementId: element.id
                                });
                                
                                // Store a placeholder instead
                                serialized.src = 'data:image/png;base64,TRUNCATED_FOR_FIRESTORE';
                                serialized.originalDataUrl = true; // Flag to indicate this was truncated
                            }
                        } catch (uploadError) {
                            console.error('[SERIALIZE] Error uploading image to Firebase Storage', {
                                elementId: element.id,
                                error: uploadError.message
                            });
                            
                            // Store a placeholder instead
                            serialized.src = 'data:image/png;base64,TRUNCATED_FOR_FIRESTORE';
                            serialized.originalDataUrl = true; // Flag to indicate this was truncated
                        }
                    }
                }
                
                // Ensure all required fields have valid values
                this._validateAndFixSerializedData(serialized, element.type);
                
                // Add properties field if not present
                if (!serialized.properties) {
                    serialized.properties = { ...serialized };
                    console.log(`[SERIALIZE] Added properties field to serialized ${element.type} element - ID: ${element.id}`);
                }
                
                return serialized;
            }
            
            // Fallback to manual serialization for backward compatibility
            // Base properties that all elements have
            const serialized = {
                id: element.id || `element_${Date.now()}`,
                type: element.type,
                x: element.x || 0,
                y: element.y || 0,
                rotation: element.rotation || 0,
                scaleX: element.scaleX || 1,
                scaleY: element.scaleY || 1,
                zIndex: element.zIndex || 0,
                visible: element.visible !== undefined ? element.visible : true,
                createdAt: element.createdAt || Date.now(),
                updatedAt: element.updatedAt || Date.now(),
                createdBy: element.createdBy || (this.user ? this.user.uid : 'anonymous'),
                updatedBy: element.updatedBy || (this.user ? this.user.uid : 'anonymous')
            };
            
            // Type-specific properties
            if (element.type === 'drawing') {
                serialized.points = element.points || [];
                serialized.color = element.color || '#000000';
                serialized.width = element.width || 2;
                serialized.opacity = element.opacity !== undefined ? element.opacity : 1;
            } else if (element.type === 'text') {
                serialized.text = element.text || '';
                serialized.fontFamily = element.fontFamily || 'Arial';
                serialized.fontSize = element.fontSize || 16;
                serialized.color = element.color || '#000000';
                serialized.align = element.align || 'left';
                serialized.bold = element.bold || false;
                serialized.italic = element.italic || false;
                serialized.underline = element.underline || false;
            }
            
            // Ensure all required fields have valid values
            this._validateAndFixSerializedData(serialized, element.type);
            
            return serialized;
        } catch (error) {
            console.error('❌ SERIALIZE: Error serializing element:', error, element);
            
            // Return a minimal valid object to prevent further errors
            return {
                id: element?.id || `element_${Date.now()}`,
                type: element?.type || 'unknown',
                x: 0,
                y: 0,
                error: 'Serialization failed'
            };
        }
    }
    
    /**
     * Validate and fix serialized data to ensure it's compatible with Firestore
     * @param {Object} data - The serialized data
     * @param {string} type - The element type
     * @private
     */
    _validateAndFixSerializedData(data, type) {
        // Ensure basic properties exist
        data.id = data.id || 'unknown';
        data.type = data.type || type || 'unknown';
        data.x = data.x !== undefined ? data.x : 0;
        data.y = data.y !== undefined ? data.y : 0;
        data.rotation = data.rotation !== undefined ? data.rotation : 0;
        data.scaleX = data.scaleX !== undefined ? data.scaleX : 1;
        data.scaleY = data.scaleY !== undefined ? data.scaleY : 1;
        data.zIndex = data.zIndex !== undefined ? data.zIndex : 1;
        data.visible = data.visible !== undefined ? data.visible : true;
        data.createdAt = data.createdAt || Date.now();
        data.updatedAt = data.updatedAt || Date.now();
        data.createdBy = data.createdBy || (this.user ? this.user.uid : 'anonymous');
        data.updatedBy = data.updatedBy || (this.user ? this.user.uid : 'anonymous');
        
        // Add type-specific properties
        switch (type) {
            case 'drawing':
                data.points = data.points || [];
                data.color = data.color || '#000000';
                data.width = data.width !== undefined ? data.width : 2;
                data.opacity = data.opacity !== undefined ? data.opacity : 1;
                break;
                
            case 'text':
                data.text = data.text || '';
                data.fontFamily = data.fontFamily || 'Arial';
                data.fontSize = data.fontSize !== undefined ? data.fontSize : 16;
                data.color = data.color || '#000000';
                data.align = data.align || 'left';
                data.bold = data.bold !== undefined ? data.bold : false;
                data.italic = data.italic !== undefined ? data.italic : false;
                data.underline = data.underline !== undefined ? data.underline : false;
                data.opacity = data.opacity !== undefined ? data.opacity : 1;
                break;
                
            case 'sticky-note':
                data.text = data.text || '';
                data.color = data.color || '#FFFF88';
                data.width = data.width !== undefined ? data.width : 200;
                data.height = data.height || 200;
                data.fontSize = data.fontSize !== undefined ? data.fontSize : 16;
                data.fontFamily = data.fontFamily || 'Arial';
                data.textColor = data.textColor || '#000000';
                data.opacity = data.opacity !== undefined ? data.opacity : 1;
                break;
                
            case 'image':
                data.src = data.src || '';
                data.width = data.width !== undefined ? data.width : 200;
                data.height = data.height !== undefined ? data.height : 200;
                data.originalWidth = data.originalWidth !== undefined ? data.originalWidth : data.width || 200;
                data.originalHeight = data.originalHeight !== undefined ? data.originalHeight : data.height || 200;
                data.opacity = data.opacity !== undefined ? data.opacity : 1;
                data.isStorageUrl = data.isStorageUrl !== undefined ? data.isStorageUrl : false;
                break;
                
            default:
                console.warn(`[SERIALIZE] Unknown element type for validation: ${type}`);
        }
        
        // Check for any undefined values and replace them
        for (const key in data) {
            if (data[key] === undefined) {
                console.warn(`[SERIALIZE] Found undefined value for ${key} in ${type} element, replacing with default`);
                
                // Set default values based on property type
                if (typeof data[key] === 'number') {
                    data[key] = 0;
                } else if (typeof data[key] === 'boolean') {
                    data[key] = false;
                } else if (Array.isArray(data[key])) {
                    data[key] = [];
                } else {
                    data[key] = '';
                }
            }
        }
        
        // Add properties field if it doesn't exist
        if (!data.properties) {
            data.properties = { ...data };
            console.log(`[SERIALIZE] Added properties field to validated ${type} element - ID: ${data.id}`);
        }
    }
    
    /**
     * Deserialize element data from Firestore
     * @param {Object} data - The element data from Firestore
     * @param {string} type - The element type
     * @returns {Promise<Object|null>} - Deserialized element or null if deserialization failed
     */
    async deserializeElement(data, type) {
        try {
            console.log('[DESERIALIZE] Starting element deserialization:', {
                elementId: data.id,
                elementType: type,
                hasProperties: !!data.properties
            });
            
            // Special logging for drawing elements
            if (type === 'drawing') {
                const pointCount = data.properties?.points?.length || 0;
                console.log(`✏️ DRAWING DESERIALIZE: Starting deserialization - ID: ${data.id}, Points: ${pointCount}`);
            }
            
            // Handle case where properties field is missing
            let properties = data.properties;
            
            // If properties is missing, try to use the data itself as properties
            if (!properties) {
                console.warn('[DESERIALIZE] Missing properties field, attempting to use data as properties:', {
                    dataId: data.id,
                    dataType: type
                });
                
                // Create a properties object from the data
                properties = {
                    id: data.id,
                    firebaseId: data.id, // Use the document ID as the firebaseId
                    type: type,
                    createdAt: data.createdAt ? data.createdAt.toMillis() : Date.now(),
                    updatedAt: data.lastModified ? data.lastModified.toMillis() : Date.now(),
                    createdBy: data.createdBy || 'anonymous',
                    updatedBy: data.updatedBy || 'anonymous',
                    x: data.x || 0,
                    y: data.y || 0,
                    rotation: data.rotation || 0,
                    scaleX: data.scaleX || 1,
                    scaleY: data.scaleY || 1,
                    zIndex: data.zIndex || 1,
                    visible: data.visible !== undefined ? data.visible : true
                };
                
                // Add type-specific default properties
                if (type === 'image') {
                    properties.src = data.src || '';
                    properties.width = data.width || 200;
                    properties.height = data.height || 200;
                    properties.opacity = data.opacity !== undefined ? data.opacity : 1;
                    properties.isStorageUrl = !!data.isStorageUrl;
                } else if (type === 'drawing') {
                    properties.points = data.points || [];
                    properties.color = data.color || '#000000';
                    properties.width = data.width || 2;
                    properties.opacity = data.opacity !== undefined ? data.opacity : 1;
                    
                    console.log(`✏️ DRAWING DESERIALIZE: Properties set - ID: ${data.id}, Points: ${properties.points.length}, Color: ${properties.color}, Width: ${properties.width}`);
                } else if (type === 'text') {
                    properties.text = data.text || '';
                    properties.fontFamily = data.fontFamily || 'Arial';
                    properties.fontSize = data.fontSize || 16;
                    properties.color = data.color || '#000000';
                    properties.align = data.align || 'left';
                    properties.bold = data.bold !== undefined ? data.bold : false;
                    properties.italic = data.italic !== undefined ? data.italic : false;
                    properties.underline = data.underline !== undefined ? data.underline : false;
                    properties.opacity = data.opacity !== undefined ? data.opacity : 1;
                    
                    // Log text element properties for debugging
                    console.log(`📝 TEXT DESERIALIZE: Properties set - ID: ${data.id}, Text: "${properties.text}", Position: (${properties.x}, ${properties.y})`);
                    
                    // If text is empty but we have an existing element with this ID, try to get its text
                    if (!properties.text && window.canvasManager) {
                        const existingElement = window.canvasManager.getElementById(data.id);
                        if (existingElement && existingElement.type === 'text' && existingElement.text) {
                            properties.text = existingElement.text;
                            console.log(`📝 TEXT DESERIALIZE: Using existing text content for element ID: ${data.id}, Text: "${properties.text}"`);
                        }
                    }
                    
                    // If text is still empty, add a warning
                    if (!properties.text) {
                        console.warn(`⚠️ TEXT DESERIALIZE: Text element has empty text content - ID: ${data.id}`);
                    }
                } else if (type === 'sticky-note') {
                    properties.text = data.text || '';
                    properties.color = data.color || '#FFFF88';
                    properties.width = data.width || 200;
                    properties.height = data.height || 200;
                    properties.fontSize = data.fontSize || 16;
                    properties.fontFamily = data.fontFamily || 'Arial';
                    properties.textColor = data.textColor || '#000000';
                    properties.opacity = data.opacity !== undefined ? data.opacity : 1;
                }
                
                // Try to update the document with the properties field
                this.migrateElementData(data.id, properties, type);
            }
            
            // Import necessary element classes
            const DrawingElementModule = await import('../elements/DrawingElement.js');
            const TextElementModule = await import('../elements/TextElement.js');
            const StickyNoteModule = await import('../elements/StickyNoteElement.js');
            const ImageElementModule = await import('../elements/ImageElement.js');
            
            // Create the appropriate element type
            let element;
            
            // Ensure properties has all required fields
            properties.id = properties.id || data.id || `element_${Math.random().toString(36).substring(2, 11)}`;
            properties.firebaseId = data.id;
            properties.createdAt = properties.createdAt || (data.createdAt ? data.createdAt.toMillis() : Date.now());
            properties.updatedAt = properties.updatedAt || (data.lastModified ? data.lastModified.toMillis() : Date.now());
            properties.createdBy = properties.createdBy || data.createdBy || 'anonymous';
            properties.updatedBy = properties.updatedBy || data.updatedBy || properties.createdBy || 'anonymous';
            
            // Create the element based on type
            switch (type) {
                case 'drawing':
                    element = DrawingElementModule.DrawingElement.deserialize(properties);
                    break;
                    
                case 'text':
                    element = TextElementModule.TextElement.deserialize(properties);
                    break;
                    
                case 'sticky-note':
                    element = StickyNoteModule.StickyNoteElement.deserialize(properties);
                    break;
                    
                case 'image':
                    element = ImageElementModule.ImageElement.deserialize(properties);
                    break;
                    
                default:
                    console.error('[DESERIALIZE] Unknown element type:', type);
                    return null;
            }
            
            if (!element) {
                console.error('[DESERIALIZE] Failed to create element from properties:', {
                    type: type,
                    properties: properties
                });
                return null;
            }
            
            console.log('[DESERIALIZE] Element deserialized successfully:', {
                type: element.type,
                id: element.id,
                firebaseId: element.firebaseId
            });
            
            return element;
        } catch (error) {
            console.error('[DESERIALIZE] Error deserializing element:', {
                errorMessage: error.message,
                errorName: error.name,
                type: type,
                dataId: data?.id
            });
            return null;
        }
    }
    
    /**
     * Migrate element data to include properties field
     * @param {string} elementId - The element ID
     * @param {Object} properties - The properties object
     * @param {string} type - The element type
     */
    async migrateElementData(elementId, properties, type) {
        try {
            console.log('[MIGRATE] Attempting to migrate element data to include properties field:', {
                elementId: elementId,
                type: type
            });
            
            const { doc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js');
            
            // Update the document with the properties field
            const docRef = doc(this.db, 'guestbook', 'main', 'elements', elementId);
            
            await updateDoc(docRef, {
                properties: properties,
                lastModified: serverTimestamp()
            });
            
            console.log('[MIGRATE] Element data migrated successfully:', elementId);
        } catch (error) {
            console.error('[MIGRATE] Error migrating element data:', {
                errorMessage: error.message,
                errorName: error.name,
                elementId: elementId,
                type: type
            });
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
            async (elementId, element, positionUpdateOnly) => {
                try {
                    const { doc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js');
                    
                    // Set updater information
                    element.updatedBy = this.user ? this.user.uid : 'anonymous';
                    element.updatedAt = Date.now();
                    
                    // Prepare update data
                    const updateData = {
                        lastModified: serverTimestamp(),
                        updatedBy: element.updatedBy,
                        properties: await this.serializeElement(element, positionUpdateOnly)
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
     * @param {Object} bounds - The viewport bounds
     * @param {Function} callback - Callback function to handle changes
     * @returns {Promise<Function>} - Promise that resolves to an unsubscribe function
     */
    async listenForElementsInViewport(bounds, callback) {
        console.log('[FIREBASE] Setting up listener for elements in viewport:', bounds);
        
        try {
            console.log('[FIREBASE] Importing Firestore modules for viewport query...');
            
            const { collection, onSnapshot, query, orderBy } = await import('https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js');
            
            console.log('[FIREBASE] Creating query for elements in viewport...');
            
            // Create query for elements in the viewport
            // Note: This is a simplified approach. For more complex spatial queries,
            // consider using Firestore's GeoPoint or a more sophisticated spatial indexing solution.
            const elementsQuery = query(
                collection(this.db, 'guestbook', 'main', 'elements'),
                orderBy('createdAt', 'asc')
                // We're not using where clauses here because Firestore has limitations with
                // compound queries. Instead, we'll filter the results client-side.
            );
            
            console.log('[FIREBASE] Viewport query created, setting up snapshot listener...');
            
            // Set up real-time listener
            const unsubscribeFunction = onSnapshot(elementsQuery, (snapshot) => {
                const elements = [];
                const changes = { added: [], modified: [], removed: [] };
                
                snapshot.docChanges().forEach((change) => {
                    const element = {
                        id: change.doc.id,
                        ...change.doc.data()
                    };
                    
                    // Filter elements based on viewport bounds
                    if (this.isElementInViewport(element.properties, bounds)) {
                        // Process based on change type
                        if (change.type === 'added') {
                            changes.added.push(element);
                        } else if (change.type === 'modified') {
                            changes.modified.push(element);
                        } else if (change.type === 'removed') {
                            changes.removed.push(element);
                        }
                        
                        // Add to elements array if not removed
                        if (change.type !== 'removed') {
                            elements.push(element);
                        }
                    }
                });
                
                // Call the callback with the filtered elements and changes
                callback(elements, changes);
            }, (error) => {
                console.error('[FIREBASE] Error in viewport element listener:', error);
            });
            
            console.log('[FIREBASE] Viewport snapshot listener set up successfully, returning unsubscribe function:', typeof unsubscribeFunction);
            
            // Ensure we're returning a function, not a Promise
            if (typeof unsubscribeFunction !== 'function') {
                console.error('[FIREBASE] onSnapshot did not return a function as expected for viewport listener:', unsubscribeFunction);
                return () => {
                    console.log('[FIREBASE] Called fallback unsubscribe function for viewport listener');
                };
            }
            
            return unsubscribeFunction;
        } catch (error) {
            console.error('[FIREBASE] Failed to set up viewport element listener:', error);
            console.log('[FIREBASE] Returning empty unsubscribe function for viewport listener');
            return () => {
                console.log('[FIREBASE] Called empty unsubscribe function for viewport listener');
            }; // Return empty unsubscribe function
        }
    }

    /**
     * Check if an element is in the viewport
     * @param {Object} properties - The element properties
     * @param {Object} bounds - The viewport bounds
     * @returns {boolean} - True if the element is in the viewport
     */
    isElementInViewport(properties, bounds) {
        // Validate inputs
        if (!properties || !bounds) {
            console.warn('[VIEWPORT] Invalid properties or bounds for viewport check');
            return false;
        }
        
        // Handle case where properties might be nested
        const props = properties.properties || properties;
        
        // Get element position
        const x = props.x !== undefined ? props.x : 0;
        const y = props.y !== undefined ? props.y : 0;
        
        // For elements with width and height (images, sticky notes)
        const width = props.width !== undefined ? props.width : 0;
        const height = props.height !== undefined ? props.height : 0;
        
        // For drawing elements with points
        const points = props.points || [];
        
        // Add padding to ensure elements near the edge are included
        const padding = 100;
        const paddedBounds = {
            minX: bounds.minX - padding,
            minY: bounds.minY - padding,
            maxX: bounds.maxX + padding,
            maxY: bounds.maxY + padding
        };
        
        // Check if element is in viewport
        if (width > 0 && height > 0) {
            // Check if rectangle overlaps viewport
            return !(
                x + width < paddedBounds.minX ||
                x > paddedBounds.maxX ||
                y + height < paddedBounds.minY ||
                y > paddedBounds.maxY
            );
        } else if (points.length > 0) {
            // For drawings, check if any point is in viewport
            return points.some(point => {
                const pointX = point.x !== undefined ? point.x : 0;
                const pointY = point.y !== undefined ? point.y : 0;
                return (
                    pointX >= paddedBounds.minX &&
                    pointX <= paddedBounds.maxX &&
                    pointY >= paddedBounds.minY &&
                    pointY <= paddedBounds.maxY
                );
            });
        } else {
            // For point elements, check if point is in viewport
            return (
                x >= paddedBounds.minX &&
                x <= paddedBounds.maxX &&
                y >= paddedBounds.minY &&
                y <= paddedBounds.maxY
            );
        }
    }

    /**
     * Update multiple elements in a batch for better performance
     * @param {Array} elements - Array of elements to update
     * @param {boolean} positionUpdateOnly - Whether this is just a position update
     * @returns {Promise<void>}
     */
    async batchUpdateElements(elements, positionUpdateOnly = true) {
        if (!elements || !Array.isArray(elements) || elements.length === 0) {
            console.log('No elements to batch update');
            return;
        }
        
        try {
            console.log(`🔥 FIREBASE: Starting batch update for ${elements.length} elements (position update only: ${positionUpdateOnly})`);
            
            const { doc, writeBatch, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js');
            
            // Create a batch
            const batch = writeBatch(this.db);
            
            // Add each element to the batch
            for (const element of elements) {
                if (!element.firebaseId) {
                    console.warn(`⚠️ FIREBASE: Element has no Firebase ID, skipping batch update:`, element);
                    continue;
                }
                
                // Set updater information
                element.updatedBy = this.user ? this.user.uid : 'anonymous';
                element.updatedAt = Date.now();
                
                // Serialize the element - now async
                const serializedElement = await this.serializeElement(element, positionUpdateOnly);
                
                // Prepare update data
                const updateData = {
                    lastModified: serverTimestamp(),
                    updatedBy: element.updatedBy,
                    properties: serializedElement
                };
                
                // Add to batch
                const docRef = doc(this.db, 'guestbook', 'main', 'elements', element.firebaseId);
                batch.update(docRef, updateData);
            }
            
            // Commit the batch
            await batch.commit();
            console.log(`✅ FIREBASE: Batch update successful for ${elements.length} elements`);
        } catch (error) {
            console.error(`❌ FIREBASE: Error in batch update:`, error);
            throw error; // Re-throw to allow caller to handle
        }
    }

    /**
     * Recover a truncated image by uploading it to Firebase Storage
     * @param {Object} element - The image element with a truncated data URL
     * @returns {Promise<boolean>} - True if recovery was successful
     */
    async recoverTruncatedImage(element) {
        if (!element || element.type !== 'image') {
            console.error('[RECOVER] Cannot recover non-image element:', element);
            return false;
        }
        
        if (!element.src || element.src !== 'data:image/png;base64,TRUNCATED_FOR_FIRESTORE') {
            console.log('[RECOVER] Element does not have a truncated image:', element);
            return false;
        }
        
        console.log('[RECOVER] Attempting to recover truncated image:', element.id);
        
        try {
            // Ask the user to re-upload the image
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            
            // Create a promise that resolves when the file is selected
            const filePromise = new Promise((resolve) => {
                input.onchange = (event) => {
                    const file = event.target.files[0];
                    if (file) {
                        resolve(file);
                    } else {
                        resolve(null);
                    }
                };
            });
            
            // Trigger the file selection dialog
            input.click();
            
            // Wait for the user to select a file
            const file = await filePromise;
            if (!file) {
                console.log('[RECOVER] No file selected for recovery');
                return false;
            }
            
            // Convert the file to a blob
            const blob = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(new Blob([e.target.result], { type: file.type }));
                reader.readAsArrayBuffer(file);
            });
            
            // Upload the blob to Firebase Storage
            const downloadURL = await this.uploadImage(blob, `images/${element.id}`);
            
            if (!downloadURL) {
                console.error('[RECOVER] Failed to upload image to Firebase Storage');
                return false;
            }
            
            // Update the element with the new URL
            element.src = downloadURL;
            element.isStorageUrl = true;
            
            // Reload the image
            if (element.image) {
                element.image.src = downloadURL;
            }
            
            // Update the element in Firebase
            if (element.firebaseId) {
                await this.updateElement(element.firebaseId, element);
            }
            
            console.log('[RECOVER] Successfully recovered truncated image:', element.id);
            return true;
        } catch (error) {
            console.error('[RECOVER] Error recovering truncated image:', error);
            return false;
        }
    }
} 