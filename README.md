# Interactive Canvas Guestbook

An interactive canvas web application with a dotted grid background where users can create, manipulate, and share content in real-time. The application allows adding sticky notes, drawing with different tools, capturing and adding Polaroid-style photos, and arranging images.

## Features

- Canvas with dotted grid background
- Pan and zoom navigation
- Drawing tools
- Sticky notes
- Text elements
- Image upload and manipulation
- Camera capture with Polaroid effect
- Real-time collaboration with Firebase
- User presence tracking

## Prerequisites

- Node.js (v14 or higher) - only needed for running the development server
- Modern web browser with JavaScript enabled

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd guestbook
   ```

2. Install development dependencies (for local server):
   ```
   npm install
   ```

## Firebase Setup

1. Create a Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Enable Firestore, Storage, and Authentication services
3. Set up Firestore security rules
4. Update the Firebase configuration in `src/js/firebase/FirebaseConfig.js` with your project's configuration

## Running the Application

Start the development server:
```
npm start
```

Then open your browser and navigate to `http://localhost:8080`.

## Project Structure

- `index.html`: Main HTML file
- `src/css/styles.css`: CSS styles
- `src/js/app.js`: Main application file
- `src/js/canvas/`: Canvas-related classes
- `src/js/elements/`: Canvas element classes
- `src/js/tools/`: Tool implementations
- `src/js/utils/`: Utility classes
- `src/js/firebase/`: Firebase integration (using CDN)

## Implementation Phases

1. ✅ Canvas Setup & Grid Pattern
2. ✅ Navigation System
3. ✅ Toolbar & Tool Selection
4. ✅ Drawing Tool Implementation
5. ✅ Sticky Note Implementation
6. ✅ Selection & Transformation
7. ✅ Image Upload & Handling
8. ✅ Camera Capture & Polaroid Effect
9. ✅ Firebase Setup & Integration
10. ⬜ Element Synchronization
11. ⬜ Image & Media Storage
12. ⬜ User Presence & Collaboration Features
13. ⬜ Performance & Reliability Enhancements
14. ⬜ Moderation & Administration
15. ⬜ Polish & User Experience

## License

MIT 