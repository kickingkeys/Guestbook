# Interactive Canvas Application

A modern web-based canvas application that allows users to create, edit, and collaborate on digital whiteboards.

## Features

- **Multiple Tools**: Drawing, Text, Sticky Notes, Images, Camera, Eraser, and Hand (pan) tools
- **Responsive Design**: Works on both desktop and mobile devices
- **Keyboard Shortcuts**: Quick access to tools and functions
- **Canvas Navigation**: Pan and zoom functionality
- **Modern UI**: Clean, intuitive interface with tooltips and visual feedback
- **Camera Capture**: Take photos with your device camera and add them as Polaroid-style images

## Project Structure

The application follows a modular architecture:

├── index.html              # Main HTML file
├── src/
│   ├── css/
│   │   └── styles.css      # Application styles
│   └── js/
│       ├── app.js          # Main application logic
│       ├── canvas/
│       │   ├── CanvasManager.js  # Canvas rendering and management
│       │   └── Viewport.js       # Pan and zoom functionality
│       ├── tools/
│       │   ├── Tool.js           # Base Tool class
│       │   ├── ToolManager.js    # Tool management
│       │   ├── DrawingTool.js    # Freehand drawing
│       │   ├── EraserTool.js     # Erasing elements
│       │   ├── HandTool.js       # Canvas panning
│       │   ├── ImageTool.js      # Image upload and placement
│       │   ├── CameraTool.js     # Camera capture and photo placement
│       │   ├── SelectionTool.js  # Element selection and manipulation
│       │   ├── StickyNoteTool.js # Sticky note creation
│       │   └── TextTool.js       # Text creation and editing
│       └── utils/
│           ├── ModeManager.js    # Application mode management
│           ├── CameraManager.js  # Camera access and management
│           └── PolaroidFormatter.js # Photo styling utilities

## Development Phases

The project is being developed in phases:

1. **Phase 1**: Basic canvas setup and rendering ✓
2. **Phase 2**: Navigation features (pan and zoom) ✓
3. **Phase 3**: Tool management and toolbar UI ✓
4. **Phase 4**: Drawing and text tools ✓
5. **Phase 5**: Sticky notes and selection ✓
6. **Phase 6**: Eraser and additional tools ✓
7. **Phase 7**: Image upload functionality ✓
8. **Phase 8**: Camera capture & Polaroid effect (Current Phase)
9. **Phase 9**: Performance optimization and saving functionality

## Keyboard Shortcuts

- **Ctrl+V**: Selection Tool
- **Ctrl+H**: Hand Tool (Pan)
- **Ctrl+P**: Drawing Tool
- **Ctrl+T**: Text Tool
- **Ctrl+N**: Sticky Note Tool
- **Ctrl+I**: Image Tool
- **Ctrl+C**: Camera Tool
- **Ctrl+E**: Eraser Tool
- **Space**: Temporarily activate Hand Tool while pressed

## Camera Feature

The camera tool allows you to:
- Capture photos using your device's camera
- Automatically apply a Polaroid-style frame to photos
- Place the captured photos directly on the canvas
- Resize and position photos just like regular images
- Works on both desktop and mobile devices

## Browser Compatibility

The application is designed to work in modern browsers that support ES6+ JavaScript, modern CSS features, and the MediaDevices API for camera access. For optimal camera functionality, the application should be served over HTTPS.

## License

This project is for educational purposes.

