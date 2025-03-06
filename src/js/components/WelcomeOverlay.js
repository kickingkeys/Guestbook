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
        header.textContent = 'Welcome to My Guest Book';
        contentContainer.appendChild(header);
        
        // Add description
        const description = document.createElement('div');
        description.className = 'welcome-description';
        description.innerHTML = `
            <p>Hey!</p>
            <p>This is an application I built for my class at ITP called "Handheld: Creative Tools for Handheld Devices", which is taught by Max Bittker. Everything you leave here will be visible to others that are visiting this guestbook.</p>
            <p>It's got lots of bugs and issues, but I wanted it to have a permanent home, so I have it here on my website.</p>
            <p>If you've stumbled upon it, leave a message, an image, or a Polaroid, or Just take a look around at what others have left. Be nice. Thank you!</p>
            <h3>Quick Tips:</h3>
            <ul>
                <li><strong>Selection Tool (Ctrl+V):</strong> Select, move, and resize elements</li>
                <li><strong>Text Tool (Ctrl+T):</strong> Add and edit text</li>
                <li><strong>Sticky Note Tool (Ctrl+N):</strong> Create colorful sticky notes</li>
                <li><strong>Image Tool (Ctrl+I):</strong> Upload images from your device</li>
                <li><strong>Polaroid Tool (Ctrl+C):</strong> Take instant photos with your camera</li>
                <li><strong>Zoom:</strong> Use mouse wheel or pinch gestures on mobile</li>
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