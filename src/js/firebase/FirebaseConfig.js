/**
 * Firebase Configuration Module
 * Handles Firebase initialization and configuration
 */

// Firebase configuration object
const firebaseConfig = {
    apiKey: "AIzaSyAg0pI5rJa30F_UX-RP0I_S7S-eUtrV7mI",
    authDomain: "guestbook-d0424.firebaseapp.com",
    projectId: "guestbook-d0424",
    storageBucket: "guestbook-d0424.firebasestorage.app",
    messagingSenderId: "118579010473",
    appId: "1:118579010473:web:98ac33dc54dd24e42182b8",
    measurementId: "G-Z6XLJ5K0FG"
};

/**
 * Initialize Firebase
 * @returns {Object} - Firebase app instance
 */
export async function initializeFirebase() {
    // Dynamically import Firebase modules
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js');
    
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    console.log('Firebase initialized successfully');
    
    return app;
}

/**
 * Get Firestore instance
 * @returns {Object} - Firestore instance
 */
export async function getFirestore() {
    const { getFirestore, enableIndexedDbPersistence, CACHE_SIZE_UNLIMITED, initializeFirestore, persistentLocalCache, persistentSingleTabManager } = await import('https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js');
    
    // Try the newer approach first (more reliable)
    try {
        // Get the app instance first
        const { getApp } = await import('https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js');
        const app = getApp();
        
        const db = initializeFirestore(app, {
            cache: persistentLocalCache({
                tabManager: persistentSingleTabManager(),
                cacheSizeBytes: CACHE_SIZE_UNLIMITED
            })
        });
        console.log('Firestore initialized with persistent cache');
        return db;
    } catch (error) {
        console.warn('Using fallback Firestore initialization:', error.message);
        
        // Fallback to the older approach
        const db = getFirestore();
        
        // Enable offline persistence with unlimited cache size
        try {
            await enableIndexedDbPersistence(db, {
                cacheSizeBytes: CACHE_SIZE_UNLIMITED
            });
            console.log('Firestore offline persistence enabled');
        } catch (error) {
            if (error.code === 'failed-precondition') {
                // Multiple tabs open, persistence can only be enabled in one tab at a time
                console.warn('Firestore persistence failed: Multiple tabs open');
            } else if (error.code === 'unimplemented') {
                // The current browser does not support all of the features required for persistence
                console.warn('Firestore persistence not supported in this browser');
            } else {
                console.error('Error enabling Firestore persistence:', error);
            }
            // Continue anyway - the application can still work without persistence
        }
        
        return db;
    }
}

/**
 * Get Firebase Auth instance
 * @returns {Object} - Firebase Auth instance
 */
export async function getAuth() {
    const { getAuth } = await import('https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js');
    return getAuth();
}

/**
 * Get Firebase Storage instance
 * @returns {Object} - Firebase Storage instance
 */
export async function getStorage() {
    const { getStorage } = await import('https://www.gstatic.com/firebasejs/11.4.0/firebase-storage.js');
    return getStorage();
}

/**
 * Get Firebase Analytics instance
 * @returns {Object} - Firebase Analytics instance
 */
export async function getAnalytics() {
    const { getAnalytics } = await import('https://www.gstatic.com/firebasejs/11.4.0/firebase-analytics.js');
    return getAnalytics();
} 