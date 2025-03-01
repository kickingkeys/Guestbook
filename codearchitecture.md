# Guestbook Application Architecture

## Overview

The Guestbook application is an interactive canvas-based drawing and annotation tool that works on both desktop and mobile devices. It allows users to create, edit, and manipulate various elements on a canvas, including drawings, text, sticky notes, images, and camera captures. The application is built with vanilla JavaScript using a modular, object-oriented approach.

## Core Architecture

The application follows a component-based architecture with clear separation of concerns:

├── App (Main Controller)
│   ├── CanvasManager (Canvas Rendering)
│   │   └── Viewport (View Transformation)
│   ├── ToolManager (Tool Management)
│   │   ├── SelectionTool
│   │   ├── HandTool
│   │   ├── DrawingTool
│   │   ├── TextTool
│   │   ├── StickyNoteTool
│   │   ├── ImageTool
│   │   ├── CameraTool
│   │   └── EraserTool
│   ├── ModeManager (Application Mode)
│   └── SelectionManager (Element Selection)

## Key Components

### App (src/js/App.js)

The central controller that initializes and coordinates all other components. It:
- Sets up event listeners for user interactions
- Manages the application state
- Handles tool selection
- Coordinates pan and zoom operations
- Manages the render loop
- Provides UI updates based on the current state

### CanvasManager (src/js/canvas/CanvasManager.js)

Responsible for canvas initialization, rendering, and element management:
- Initializes the canvas element
- Manages the list of elements on the canvas
- Renders elements with proper z-index ordering
- Provides methods to add, remove, and find elements
- Draws the grid pattern and selection indicators
- Handles canvas resizing

### Viewport (src/js/canvas/Viewport.js)

Manages the view transformation (pan and zoom):
- Tracks the current scale and offset
- Provides methods for panning and zooming
- Converts between screen and canvas coordinates
- Applies transformations to the canvas context

### ToolManager (src/js/tools/ToolManager.js)

Manages the available tools and the currently selected tool:
- Maintains a registry of all available tools
- Handles tool activation and deactivation
- Routes events to the active tool
- Provides tool configuration information
- Manages keyboard shortcuts for tool selection

### ModeManager (src/js/utils/ModeManager.js)

Manages the application mode (navigation, drawing, selection, creation):
- Tracks the current mode
- Provides methods to change modes
- Notifies listeners of mode changes

### SelectionManager (src/js/utils/SelectionManager.js)

Manages the selection, movement, and deletion of canvas elements:
- Tracks selected elements
- Handles element dragging and resizing
- Provides methods to select, deselect, and delete elements
- Manages selection indicators

## Tools

Each tool is implemented as a class that extends the base `Tool` class:

### Tool (src/js/tools/Tool.js)

Base class for all tools with common functionality:
- Activation/deactivation methods
- Event handling stubs
- Configuration properties

### SelectionTool (src/js/tools/SelectionTool.js)

Handles selecting, moving, and resizing elements:
- Selects elements on click/tap
- Manages element dragging
- Updates cursor based on hover state
- Handles multi-selection with Shift key

### HandTool (src/js/tools/HandTool.js)

Enables canvas panning:
- Handles pan gestures
- Updates cursor during panning

### DrawingTool (src/js/tools/DrawingTool.js)

Handles freehand drawing on the canvas:
- Creates and manages drawing paths
- Sets stroke color (default: orange) and width
- Handles drawing cancellation

### TextTool (src/js/tools/TextTool.js)

Handles creating and editing text elements:
- Creates text elements on click/tap
- Manages text editing state
- Handles keyboard input for text editing
- Provides mobile text indicator for better UX

### StickyNoteTool (src/js/tools/StickyNoteTool.js)

Creates sticky note elements:
- Generates sticky notes with random colors
- Handles note creation and editing

### ImageTool (src/js/tools/ImageTool.js)

Handles image upload and placement:
- Manages file selection dialog
- Handles image loading and placement
- Provides image resizing functionality

### CameraTool (src/js/tools/CameraTool.js)

Captures photos from the device camera and adds them to the canvas:
- Requests camera access using WebRTC
- Creates a live camera preview interface
- Captures still frames from the video stream
- Processes the image with a Polaroid-style frame effect
- Places the captured and formatted photo on the canvas
- Provides appropriate fallbacks for unsupported browsers
- Handles both desktop and mobile camera orientations

### EraserTool (src/js/tools/EraserTool.js)

Precisely erases parts of drawings:
- Handles eraser size adjustment
- Provides visual feedback during erasing
- Implements precise segment-based erasing for drawings

## Elements

The application supports various element types, each implemented as a class:

### Element (src/js/elements/Element.js)

Base class for all canvas elements with common properties:
- Position (x, y)
- Visibility state
- Selection state
- Z-index for layering
- Bounding box calculation
- Point containment testing

### DrawingElement (src/js/elements/DrawingElement.js)

Represents a freehand drawing:
- Stores path points, color, and width
- Renders the path on the canvas
- Provides methods to add points
- Implements hit testing for selection

### TextElement (src/js/elements/TextElement.js)

Represents a text element:
- Stores text content, font properties, and styling
- Manages editing state
- Renders text with proper styling
- Handles text wrapping and measurement

### StickyNoteElement (src/js/elements/StickyNoteElement.js)

Represents a sticky note:
- Stores note content, color, and size
- Renders the note with proper styling
- Manages editing state

### ImageElement (src/js/elements/ImageElement.js)

Represents an image:
- Stores image data, size, and position
- Handles image loading
- Renders the image on the canvas
- Provides resizing functionality
- Used for both uploaded images and camera captures

## Event Handling

The application uses a comprehensive event handling system:
- Mouse events (mousedown, mousemove, mouseup) for desktop interaction
- Touch events (touchstart, touchmove, touchend) for mobile interaction
- Keyboard events for shortcuts and text input
- Wheel events for zooming
- Custom events for tool and mode changes
- Media events for camera handling

## Mobile Support

The application is designed to work well on mobile devices:
- Touch event handling for all interactions
- Pinch-to-zoom gesture support
- Mobile-specific UI adjustments
- Visual indicators for touch interactions
- Responsive layout adaptation
- Mobile camera support with orientation handling

## Camera Feature Implementation

The camera functionality is implemented using the following components:

### CameraManager (src/js/utils/CameraManager.js)

Helper class for managing camera interactions:
- Requests and manages camera permissions
- Handles video stream initialization and cleanup
- Provides methods to switch between front and back cameras
- Manages camera orientation and aspect ratio

### PolaroidFormatter (src/js/utils/PolaroidFormatter.js)

Utility class for applying the Polaroid-style effect:
- Takes a captured image as input
- Creates a new canvas for composition
- Draws the white frame border
- Applies subtle shadow effects
- Returns a formatted image data URL

## Rendering Pipeline

1. The render loop is managed by `App.startRenderLoop()`
2. Each frame, the canvas is cleared
3. The grid pattern is drawn based on the current viewport
4. Elements are sorted by z-index and rendered
5. Selection indicators are drawn for selected elements
6. Tool-specific visual indicators are rendered
7. The next frame is requested using `requestAnimationFrame`

## User Interface

The UI is implemented with HTML and CSS:
- Toolbar with tool buttons
- Zoom indicator
- Shortcut indicator
- Help button with instructions
- Eraser size indicator
- Camera interface with capture button
- Mobile-responsive layout

## Help System

The application includes a help system that provides instructions:
- Accessible via the Help button
- Provides different instructions for desktop and mobile
- Explains available tools and interactions
- Lists keyboard shortcuts

## Extending the Application

To add new features to the application:

### Adding a New Tool

1. Create a new tool class that extends `Tool`
2. Implement required methods (onMouseDown, onMouseMove, onMouseUp, etc.)
3. Add the tool to the `ToolManager` in its constructor
4. Add a button to the toolbar in the HTML
5. Add any tool-specific UI elements

### Adding a New Element Type

1. Create a new element class that extends `Element`
2. Implement required methods (render, containsPoint, getBoundingBox, etc.)
3. Create a corresponding tool to create and manipulate the element
4. Update the `CanvasManager` to handle the new element type if needed

### Modifying Existing Functionality

1. Identify the component responsible for the functionality
2. Make changes to the component while maintaining its interface
3. Update any dependent components if necessary
4. Test the changes on both desktop and mobile

## File Structure
├── index.html              # Main HTML file
├── src/
│   ├── css/
│   │   └── styles.css      # Application styles
│   └── js/
│       ├── App.js          # Main application controller
│       ├── canvas/
│       │   ├── CanvasManager.js  # Canvas rendering and management
│       │   └── Viewport.js       # View transformation
│       ├── elements/
│       │   ├── DrawingElement.js # Drawing element implementation
│       │   ├── Element.js        # Base element class
│       │   ├── ImageElement.js   # Image element implementation
│       │   ├── StickyNoteElement.js # Sticky note implementation
│       │   └── TextElement.js    # Text element implementation
│       ├── tools/
│       │   ├── CameraTool.js     # Camera tool implementation
│       │   ├── DrawingTool.js    # Drawing tool implementation
│       │   ├── EraserTool.js     # Eraser tool implementation
│       │   ├── HandTool.js       # Hand (pan) tool implementation
│       │   ├── ImageTool.js      # Image tool implementation
│       │   ├── SelectionTool.js  # Selection tool implementation
│       │   ├── StickyNoteTool.js # Sticky note tool implementation
│       │   ├── TextTool.js       # Text tool implementation
│       │   ├── Tool.js           # Base tool class
│       │   └── ToolManager.js    # Tool management
│       └── utils/
│           ├── CameraManager.js  # Camera access and management
│           ├── ModeManager.js    # Application mode management
│           ├── PolaroidFormatter.js # Image formatting utilities
│           └── SelectionManager.js # Element selection management

## Conclusion

The Guestbook application is built with a modular, object-oriented architecture that separates concerns and makes it easy to extend. The core components work together to provide a seamless drawing and annotation experience on both desktop and mobile devices, now enhanced with the ability to capture and add Polaroid-style photos directly from the device camera.