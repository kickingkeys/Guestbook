/**
 * WelcomeOverlay Component
 * Displays a welcome message explaining the guestbook concept to new users
 */

export class WelcomeOverlay {
    /**
     * Create a new WelcomeOverlay
     */
    constructor() {
        this.overlayElement = null;
        this.isVisible = false;
        this.hasBeenShown = false;
        this.localStorageKey = 'guestbook_welcome_shown';
    }

    /**
     * Initialize the welcome overlay
     */
    initialize() {
        // Create overlay element if it doesn't exist
        if (!this.overlayElement) {
            this.createOverlayElement();
        }

        // Check if we've shown the welcome message before
        this.hasBeenShown = localStorage.getItem(this.localStorageKey) === 'true';
        
        // If not shown before, show it now
        if (!this.hasBeenShown) {
            this.show();
        }
    }

    /**
     * Create the overlay DOM element
     */
    createOverlayElement() {
        // Create main overlay container
        this.overlayElement = document.createElement('div');
        this.overlayElement.className = 'welcome-overlay';
        
        // Create content container
        const contentContainer = document.createElement('div');
        contentContainer.className = 'welcome-content';
        
        // Add header
        const header = document.createElement('h2');
        header.textContent = 'Welcome to the Collaborative Guestbook!';
        contentContainer.appendChild(header);
        
        // Add description
        const description = document.createElement('div');
        description.className = 'welcome-description';
        description.innerHTML = `
            <p>This is a collaborative canvas where you can draw, add notes, upload images, and capture photos together with others in real-time.</p>
            <p>Everything you create will be visible to everyone else visiting this guestbook.</p>
            <h3>Quick Tips:</h3>
            <ul>
                <li><strong>Navigate:</strong> Use the Hand tool or hold Space + drag to pan around</li>
                <li><strong>Zoom:</strong> Use the mouse wheel or pinch gestures on mobile</li>
                <li><strong>Create:</strong> Select a tool from the toolbar to start adding content</li>
                <li><strong>Collaborate:</strong> See who else is online in the users panel</li>
                <li><strong>Offline:</strong> You can still use the guestbook when offline - changes will sync when you reconnect</li>
            </ul>
        `;
        contentContainer.appendChild(description);
        
        // Add get started button
        const getStartedButton = document.createElement('button');
        getStartedButton.className = 'welcome-button';
        getStartedButton.textContent = 'Get Started';
        getStartedButton.addEventListener('click', () => this.hide());
        contentContainer.appendChild(getStartedButton);
        
        // Add "don't show again" checkbox
        const checkboxContainer = document.createElement('div');
        checkboxContainer.className = 'welcome-checkbox-container';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'dont-show-again';
        
        const label = document.createElement('label');
        label.htmlFor = 'dont-show-again';
        label.textContent = "Don't show this again";
        
        checkboxContainer.appendChild(checkbox);
        checkboxContainer.appendChild(label);
        contentContainer.appendChild(checkboxContainer);
        
        // Add content to overlay
        this.overlayElement.appendChild(contentContainer);
        
        // Add to document
        document.body.appendChild(this.overlayElement);
    }

    /**
     * Show the welcome overlay
     */
    show() {
        if (!this.overlayElement) {
            this.createOverlayElement();
        }
        
        this.overlayElement.classList.add('visible');
        this.isVisible = true;
        
        // Add body class to prevent scrolling
        document.body.classList.add('welcome-active');
    }

    /**
     * Hide the welcome overlay
     */
    hide() {
        if (!this.overlayElement) return;
        
        this.overlayElement.classList.remove('visible');
        this.isVisible = false;
        
        // Remove body class
        document.body.classList.remove('welcome-active');
        
        // Check if "don't show again" is checked
        const checkbox = document.getElementById('dont-show-again');
        if (checkbox && checkbox.checked) {
            localStorage.setItem(this.localStorageKey, 'true');
            this.hasBeenShown = true;
        }
    }

    /**
     * Reset the welcome overlay (will show again on next visit)
     */
    reset() {
        localStorage.removeItem(this.localStorageKey);
        this.hasBeenShown = false;
    }
} 