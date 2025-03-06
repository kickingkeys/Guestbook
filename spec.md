# Guestbook Application Specification

## Project Overview
Guestbook is a collaborative, canvas-based web application that allows multiple users to draw, add text, and upload photos to a shared space. The application features a dotted grid background and focuses on simplicity and cross-browser compatibility, using vanilla JavaScript and Firebase for real-time collaboration.

## Core Features
- Limited canvas size with pan/zoom navigation
- Dotted grid background
- Tool palette for interaction
- Polaroid-style camera capture (highest priority)
- Drawing pen tool (highest priority)
- Basic text tool
- Selection and move tools
- Eraser tool
- Anonymous usage with optional username display
- Real-time updates across all users
- Cross-browser compatibility
- Mobile responsiveness

## Technical Stack
- Vanilla JavaScript (no frameworks)
- HTML5 Canvas API
- Firebase Realtime Database for collaboration
- Firebase Storage for image hosting
- Firebase Anonymous Authentication (optional)

## Visual Style
- Background: Light beige (#FAF8F4) with dotted grid pattern
- Primary Color: Orange (#ED682B)
- Tool Palette: Vertical on desktop, horizontal on mobile
- Canvas: Fixed size with navigation controls
- Polaroid Style: White border with optional date stamp

## Data Model

### Canvas Elements
```
{
  id: string,            // Unique identifier
  type: string,          // "drawing", "text", "image"
  createdBy: string,     // Username or "anonymous"
  createdAt: timestamp,  // Creation time
  updatedAt: timestamp,  // Last update time
  position: {            // Position on canvas
    x: number,
    y: number
  },
  data: {                // Type-specific data
    // For drawings
    points: Array,       // Array of {x, y} coordinates
    color: string,       // Drawing color (default: #ED682B)
    width: number,       // Line width
    
    // For text
    content: string,     // Text content
    fontSize: number,    // Font size
    
    // For images
    url: string,         // Firebase Storage URL
    width: number,       // Display width
    height: number       // Display height
  }
}
```

## Implementation Phases

### Phase 1: Project Setup and Canvas Initialization
**Objective**: Set up project structure and create the basic canvas with grid background.

**Tasks**:
1. Initialize project structure (HTML, CSS, JS files)
2. Create canvas element with fixed dimensions
3. Implement dotted grid background pattern
4. Add basic zoom indicators and pan controls
5. Set up responsive layout foundation
6. Test canvas rendering across browsers

**Deliverable**: A visually complete canvas with dotted grid that renders properly on desktop and mobile browsers.

### Phase 2: Canvas Navigation and Tool UI
**Objective**: Implement pan/zoom functionality and create the tool palette UI.

**Tasks**:
1. Implement canvas pan functionality (drag to move)
2. Add zoom functionality (scroll wheel, pinch gesture)
3. Create tool palette UI (vertical on desktop, horizontal on mobile)
4. Add tool selection logic and visual feedback
5. Implement responsive UI behavior for different screen sizes
6. Add username input field (optional for users)
7. Add simple canvas info/instructions overlay

**Deliverable**: A navigable canvas with a complete tool UI that adapts to device size.

### Phase 3: Drawing Tool Implementation
**Objective**: Implement the pen drawing tool, one of the two highest priority features.

**Tasks**:
1. Create drawing manager class to handle canvas drawing
2. Implement path capturing and rendering
3. Set up drawing style (color, width)
4. Handle mouse and touch events for drawing
5. Implement drawing persistence on the canvas
6. Ensure proper drawing behavior during pan/zoom operations
7. Test drawing functionality across devices and browsers

**Deliverable**: Functional drawing tool that works on both desktop and mobile devices.

### Phase 4: Polaroid Camera Tool
**Objective**: Implement the Polaroid camera feature, the other highest priority tool.

**Tasks**:
1. Create camera access interface
2. Implement device camera access using WebRTC
3. Add photo capture functionality
4. Create Polaroid frame effect with date stamp
5. Implement image placement on canvas
6. Add gallery access option for uploaded images
7. Set up image compression/optimization
8. Handle browser permissions and fallbacks
9. Test camera functionality across devices

**Deliverable**: Fully functional camera tool that captures photos, applies Polaroid effect, and places them on the canvas.

### Phase 5: Text, Selection, and Eraser Tools
**Objective**: Implement the remaining canvas interaction tools.

**Tasks**:
1. Implement basic text tool for adding text to canvas
2. Create selection tool for selecting elements
3. Add move functionality for selected elements
4. Implement eraser tool for removing elements
5. Ensure all tools work properly with canvas navigation
6. Test all tools across devices and browsers

**Deliverable**: Complete set of canvas interaction tools working across all target devices.

### Phase 6: Firebase Integration
**Objective**: Set up Firebase for real-time collaboration and persistence.

**Tasks**:
1. **Firebase Project Setup** (requires user input):
   - Ask user to create a Firebase project in the Firebase console
   - Request Firebase configuration object (apiKey, authDomain, projectId, etc.)
   - Guide user through enabling necessary Firebase services (Firestore, Storage, Authentication)

2. **Firestore Database Implementation**:
   - Set up Firestore database structure according to the data model
   - Implement functions to save and retrieve canvas elements
   - Create real-time listeners for canvas updates

3. **Firebase Storage Integration**:
   - Set up image upload functionality to Firebase Storage
   - Implement image retrieval and caching
   - Add image optimization before upload

4. **Authentication Setup** (requires user input):
   - Ask user to enable Anonymous Authentication in Firebase console
   - Implement simple authentication flow
   - Add username persistence

5. **Offline Support**:
   - Enable Firestore offline persistence
   - Implement offline detection and user feedback
   - Create synchronization logic for reconnection

6. **Firebase Security Rules** (requires user input):
   - Provide template security rules for Firestore and Storage
   - Ask user to deploy rules in Firebase console
   - Guide user through testing security rules

**Note to Agent**: During this phase, prompt the user for Firebase credentials and configuration details. Wait for user input before implementing Firebase-specific code. Guide the user through the Firebase console steps that cannot be completed programmatically.

**Deliverable**: Functioning real-time collaboration system with data persistence.

### Phase 7: Performance Optimization
**Objective**: Optimize performance and ensure cross-browser compatibility.

**Tasks**:
1. Implement canvas rendering optimizations
2. Optimize image loading and processing
3. Add lazy loading for off-screen elements
4. Implement proper error handling and user feedback
5. Address any performance issues or bugs

**Deliverable**: Optimized application that performs well across devices and browsers.

## Responsive Design Approach

### Desktop Layout:
- Canvas: Center of screen with visible boundaries
- Tool Palette: Vertical orientation on left side
- Zoom Controls: Bottom left corner
- Username/Info: Top right corner

### Mobile Layout:
- Canvas: Full screen with pan/zoom
- Tool Palette: Horizontal orientation at bottom
- Zoom Controls: Top right corner
- Username/Info: Top left corner, collapsible

## Event Handling Strategy
- Use pointer events for unified mouse/touch handling where supported
- Fall back to separate mouse and touch events for older browsers
- Implement proper event delegation for better performance
- Handle multi-touch gestures for mobile devices

## Offline Support Strategy
- Cache essential application assets using service workers
- Store unsynchronized changes in IndexedDB
- Implement automatic synchronization when connection is restored
- Use Firebase offline capabilities for seamless experience

## Error Handling and Edge Cases
- Camera permissions denied: Provide clear instructions to enable
- Offline mode: Visual indicator and auto-sync when online
- Unsupported browsers: Graceful degradation and warning message
- Failed image uploads: Retry mechanism with user feedback
- Canvas limit reached: Notification with pan suggestion

## Deployment Approach
- **Firebase Hosting Setup** (requires user input):
  - Guide user through installing Firebase CLI
  - Help configure hosting settings in firebase.json
  - Set up build and deployment scripts
  - Assist with deployment commands
- Proper caching headers for static assets
- Firebase Storage CORS configuration
- Secure Firebase rules for database and storage

**Note to Agent**: When reaching deployment, prompt the user for Firebase CLI installation and provide step-by-step guidance for deploying to Firebase Hosting.

This specification provides a comprehensive guide for implementing the Guestbook application in phases, focusing on the core functionality while maintaining a clear path forward.