# Interactive Canvas Implementation Specification

## Project Overview
An interactive canvas web application with a dotted grid background where users can create, manipulate, and share content in real-time. The application allows adding sticky notes, drawing with different tools, capturing and adding Polaroid-style photos, and arranging images. The application will evolve from a single-user experience to a collaborative guestbook that persists and synchronizes content across all visitors.

## Color Scheme
- **Background Color**: #FAF8F4 (light beige)
- **Primary Accent Color**: #ED682B (orange)
- **Text on Sticky Notes**: White (#FFFFFF)
- **Polaroid Frame**: White (#FFFFFF) with subtle shadow
- **User Cursor Colors**: Various colors to distinguish different users (for collaborative phase)

## Completed Phases (Single-User Version)

### Phase 1: Canvas Setup & Grid Pattern
**Goal**: Create the basic structure and render the canvas with a dotted grid pattern.

**Implementation Steps**:
1. Set up the HTML structure with a canvas element
2. Create CSS for basic layout and styling
3. Initialize the canvas in JavaScript
4. Implement the dotted grid background pattern
5. Add window resize handling to maintain proper dimensions
6. Test canvas rendering across different screen sizes

**Deliverable**: A responsive canvas with a dotted grid background that properly resizes with the window.

### Phase 2: Navigation System
**Goal**: Implement pan and zoom functionality for canvas navigation.

**Implementation Steps**:
1. Create a viewport class to manage transformations
2. Implement pan functionality (spacebar + click/drag for desktop, two-finger drag for mobile)
3. Add zoom functionality (mouse wheel for desktop, pinch gesture for mobile)
4. Provide visual feedback for navigation (cursor changes)
5. Test navigation on both desktop and mobile devices

**Deliverable**: A navigable canvas where users can pan and zoom to explore the space.

### Phase 3: Toolbar & Tool Selection
**Goal**: Create a functional toolbar for selecting different tools.

**Implementation Steps**:
1. Build the toolbar UI with CSS
2. Create a tool manager class to handle tool selection
3. Implement tool selection logic
4. Add visual feedback for the selected tool
5. Test toolbar functionality and responsiveness

**Deliverable**: A responsive toolbar that allows users to select different tools with visual feedback.

### Phase 4: Drawing Tool Implementation
**Goal**: Enable freehand drawing on the canvas.

**Implementation Steps**:
1. Create a drawing tool class
2. Implement path capture for freehand drawing
3. Add basic stroke options (color, width)
4. Implement path storage for redrawing
5. Test drawing functionality across devices

**Deliverable**: A functional drawing tool that allows users to create freehand drawings on the canvas.

### Phase 5: Sticky Note Implementation
**Goal**: Allow creating and editing sticky notes on the canvas.

**Implementation Steps**:
1. Create a sticky note class
2. Implement sticky note creation when the tool is selected
3. Add text editing capabilities
4. Implement dragging and positioning
5. Test sticky note functionality

**Deliverable**: Functional sticky notes that users can create, edit, and position on the canvas.

### Phase 6: Selection & Transformation
**Goal**: Allow selecting and manipulating canvas elements.

**Implementation Steps**:
1. Create a selection manager class
2. Implement hit testing for element selection
3. Add visual indication of selected elements
4. Implement movement of selected objects
5. Add delete functionality
6. Test selection and transformation across devices

**Deliverable**: A selection tool that allows users to select, move, and delete canvas elements.

### Phase 7: Image Upload & Handling
**Goal**: Allow users to upload and manipulate images on the canvas.

**Implementation Steps**:
1. Create file input handling for uploads
2. Implement image class for canvas rendering
3. Add image positioning and resizing
4. Test image upload and manipulation

**Deliverable**: Functional image upload and manipulation capabilities.

### Phase 8: Camera Capture & Polaroid Effect
**Goal**: Add the ability to capture photos from the device camera and add them to the canvas with a Polaroid-style effect.

**Implementation Steps**:
1. Create a camera tool class that extends the base Tool class
2. Implement camera access using the MediaDevices API
3. Design and implement a camera interface with capture button
4. Create a polaroid formatter utility to apply the frame effect
5. Handle camera permissions and provide fallbacks
6. Implement mobile-specific camera handling (device orientation, aspect ratios)
7. Add a new toolbar button for the camera tool
8. Implement keyboard shortcut (Ctrl+C)
9. Test camera functionality across desktop and mobile devices

**Deliverable**: A functional camera tool that allows users to capture photos, automatically applies a Polaroid-style effect, and adds them to the canvas.

## New Collaborative Features Implementation Plan

### Phase 9: Firebase Setup & Integration
**Goal**: Set up Firebase backend and integrate it with the application.

**Implementation Steps**:
1. Create a Firebase project with Firestore database, Storage, and Authentication
2. Install Firebase SDK and create a configuration module
3. Implement basic anonymous authentication
4. Design and create the Firestore data model for the guestbook and elements
5. Create a FirebaseManager class for centralizing all Firebase operations
6. Add security rules for Firestore and Storage

**Deliverable**: A functioning Firebase backend with the application able to authenticate users anonymously.

### Phase 10: Element Synchronization
**Goal**: Modify the existing element classes to support synchronization with Firebase.

**Implementation Steps**:
1. Update the CanvasElement base class to add:
   - Firebase ID field
   - User attribution fields
   - Serialization/deserialization methods
2. Modify all element subclasses (DrawingElement, TextElement, etc.) for Firebase compatibility
3. Update CanvasManager to:
   - Save new elements to Firestore
   - Update changed elements in Firestore
   - Delete elements from Firestore
4. Implement real-time listeners for element changes
5. Add conflict resolution for concurrent edits
6. Test with multiple browser sessions

**Deliverable**: Application capable of saving elements to Firebase and syncing changes in real-time.

### Phase 11: Image & Media Storage
**Goal**: Move from data URLs to Firebase Storage for images and camera captures.

**Implementation Steps**:
1. Create utility functions for uploading images to Firebase Storage
2. Modify ImageElement to:
   - Upload images to Storage instead of storing data URLs
   - Load images from Storage URLs
3. Update CameraTool and PolaroidFormatter to:
   - Upload captured photos to Storage after formatting
   - Store and display image references from Storage
4. Add progress indicators during image uploads
5. Implement client-side image compression to improve performance
6. Test image synchronization across multiple devices

**Deliverable**: Working image and camera tools that store media in Firebase Storage and sync across all users.

### Phase 12: User Presence & Collaboration Features
**Goal**: Implement real-time user presence and basic collaborative features.

**Implementation Steps**:
1. Create a user presence system using Firestore
2. Add a UI component showing which users are currently viewing the guestbook
3. Implement optional temporary usernames for visitors
4. Add timestamp display for when elements were created
5. Implement basic cursor position sharing (show where other users are)
6. Add visual attribution for who created each element (optional display on hover)
7. Test with multiple concurrent users

**Deliverable**: A guestbook application that shows who is currently viewing and what each person has contributed.

### Phase 13: Performance & Reliability Enhancements
**Goal**: Ensure the application performs well with many elements and users.

**Implementation Steps**:
1. Implement throttling for frequent updates (like drawing paths)
2. Add pagination or viewport-based loading for displaying large guestbooks
3. Implement offline support using Firestore offline capabilities
4. Add graceful reconnection handling
5. Create a loading state for initial guestbook rendering
6. Optimize rendering performance for canvases with many elements
7. Test with simulated slow connections and many concurrent users

**Deliverable**: A reliable application that performs well under various network conditions and with many elements.

### Phase 14: Moderation & Administration
**Goal**: Add basic moderation capabilities for inappropriate content.

**Implementation Steps**:
1. Create a simple admin interface (could be password-protected)
2. Implement the ability to delete any element (admin only)
3. Add a "clear canvas" function for complete resets (admin only)
4. Create a system for reporting inappropriate content
5. Add IP-based rate limiting to prevent spam (optional)
6. Test moderation tools and admin features

**Deliverable**: A guestbook with basic moderation capabilities to keep content appropriate.

### Phase 15: Polish & User Experience
**Goal**: Finalize the user experience to make the guestbook intuitive and engaging.

**Implementation Steps**:
1. Add a welcome overlay explaining the guestbook concept
2. Create visual feedback for saving/loading states
3. Implement error messages when operations fail
4. Add "object owner" highlighting (elements light up when their creator views the page)
5. Improve mobile experience specifically for collaborative features
6. Create animated transitions for new elements
7. Comprehensive testing on various devices and browsers

**Deliverable**: A polished, user-friendly collaborative guestbook ready for public use.

## Technical Architecture

### Core Components

#### Current Components (Single-User Version)
- **App**: Central controller that initializes and coordinates all components
- **CanvasManager**: Manages canvas rendering, elements, and grid pattern
- **Viewport**: Handles pan and zoom transformations
- **ModeManager**: Manages the current interaction mode of the application
- **ToolManager**: Manages the available tools and the currently selected tool
- **SelectionManager**: Manages selection, movement, and deletion of canvas elements
- **Tools**: Various tool implementations for different interactions
  - SelectionTool, HandTool, DrawingTool, TextTool, StickyNoteTool, ImageTool, CameraTool, EraserTool
- **Elements**: Various element types that can be added to the canvas
  - DrawingElement, TextElement, StickyNoteElement, ImageElement
- **Utils**: Utility classes for specific features
  - CameraManager, PolaroidFormatter

#### New Components (Collaborative Version)
- **FirebaseManager**: Centralized management of all Firebase operations
  - Authentication handling
  - Firestore document operations
  - Storage uploads and downloads
  - Real-time listeners and presence management
- **CollaborationManager**: Coordinates real-time updates between users
  - Synchronizes element changes
  - Manages user presence data
  - Handles conflict resolution
- **UserPresenceSystem**: Tracks and displays active users
  - Shows who is currently viewing the guestbook
  - Updates presence status in real-time
  - Manages cursor position sharing
- **AdminInterface**: Provides moderation capabilities
  - Element deletion for inappropriate content
  - Canvas clearing functionality
  - User management (optional)

### Data Model Changes

#### Firestore Structure
```
- guestbook/
  |- main/              # Single document with metadata
  |   |- name
  |   |- createdAt
  |   |- lastModified
  |
  |- elements/          # Collection of all elements
  |   |- [element_id]/
  |       |- type
  |       |- createdAt
  |       |- createdBy
  |       |- lastModified
  |       |- properties  # Element-specific data
  |
  |- presence/          # Collection for active users
      |- [user_id]/
          |- name
          |- color
          |- lastActive
          |- cursorPosition
```

#### Firebase Storage Structure
```
- guestbook-images/
  |- uploads/           # Uploaded images
  |   |- [timestamp]-[random_id].jpg
  |
  |- camera-captures/   # Photos from camera
      |- [timestamp]-[random_id].jpg
```

### Element Changes
- **Updated CanvasElement Base Class**:
  - Add Firebase ID field
  - Add user attribution fields (createdBy, updatedBy)
  - Add timestamp fields (createdAt, updatedAt)
  - Add serialize/deserialize methods for Firebase
- **Updated Element Subclasses**:
  - Add specialized serialization based on element type
  - Handle remote updates and conflict resolution
  - Support for Firebase Storage references

### Implementation Guidelines

#### Element Serialization
- Each element type needs:
  - A `serialize()` method to convert to Firebase format
  - A static `deserialize()` method to convert from Firebase format
  - Handling for remote IDs vs. local temporary IDs

#### Real-time Updates
- Use Firestore's `onSnapshot` listeners for real-time updates
- Implement throttling for high-frequency events
- Use batched writes for efficiency when possible

#### Conflict Resolution
- Use timestamps to determine the most recent version
- Implement optimistic updates with fallback
- For drawing operations, use small batched updates

#### Image Handling
- Replace all data URLs with Firebase Storage references
- Add client-side compression before upload
- Implement upload progress indicators
- Keep image dimensions in metadata for faster loading

#### Offline Support
- Enable Firestore offline persistence
- Add visual indicators for offline status
- Implement retry logic for failed operations

## Security Considerations

### Firestore Rules
- Anyone can read elements
- Only authenticated users (even anonymous) can write
- Only admins can delete other users' elements
- Rate limiting to prevent abuse

### Storage Rules
- Size limits on uploaded images
- Type restrictions to prevent malicious files
- Permission checks to ensure proper access

### General Security
- Input sanitization for text elements
- Throttling to prevent DoS attacks
- Optional bad word filtering for text content

## Testing Strategy

### Firebase Integration Testing
- Verify authentication flow works correctly
- Ensure elements save and load properly
- Test real-time updates with multiple sessions

### Concurrent Edit Testing
- Test multiple users editing the same area
- Verify conflict resolution works as expected
- Test with simulated network delays

### Performance Testing
- Test with many elements (100+)
- Test with multiple concurrent users
- Verify image loading performs well

### Mobile & Cross-browser Testing
- Test on iOS and Android devices
- Verify functionality in major browsers
- Test with touch and mouse interactions

## Deployment Considerations

### Firebase Configuration
- Set up proper production project
- Configure security rules for production
- Set up monitoring and logging

### Hosting
- Configure proper hosting (Firebase Hosting recommended)
- Set up custom domain if needed
- Configure proper caching headers

### Performance Monitoring
- Add Firebase Performance Monitoring
- Set up alerts for errors or performance issues
- Monitor storage and database usage