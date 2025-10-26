# AI Coding Agent Instructions

## Overview
This project is a React-based web application bootstrapped with Create React App. It includes custom components, Firebase integration, and CSS modules for styling. The application is structured into `public` and `src` directories, with the main logic and components residing in the `src` folder.

## Key Files and Directories
- **`src/`**: Contains the main application logic and components.
  - `App.js`: Entry point for the React application.
  - `firebase.js`: Handles Firebase configuration and initialization.
  - `Cumplimiento.js`: A key component for compliance-related functionality.
  - `FillableTable.js`: Implements a dynamic, fillable table.
  - `Login.js`: Manages user authentication UI.
- **`public/`**: Contains static assets like `index.html` and `manifest.json`.
- **`package.json`**: Defines project dependencies and scripts.

## Developer Workflows
### Running the Application
Use the following command to start the development server:
npm start
The application will be available at [http://localhost:3000](http://localhost:3000).

### Running Tests
To execute tests in watch mode:
npm test

### Building for Production
To create an optimized production build:
npm run build
The build artifacts will be located in the `build/` directory.

## Project-Specific Conventions
- **Styling**: CSS modules are used for component-specific styles (e.g., `Login.css`, `Cumplimiento.css`).
- **Firebase**: The `firebase.js` file centralizes Firebase configuration. Ensure Firebase services are initialized before use.
- **Component Structure**: Components are organized by functionality, with each component having its own `.js` and `.css` files.

## External Dependencies
- **Firebase**: Used for backend services like authentication and database.
- **React**: Core library for building the user interface.

## Testing
- Tests are located alongside their respective components (e.g., `App.test.js`).
- The project uses Jest as the test runner.

## Integration Points
- **Firebase**: Ensure the Firebase configuration in `firebase.js` is correct for the target environment.
- **API Endpoints**: If external APIs are used, document their usage and endpoints in the respective components.

## Example Patterns
### Firebase Initialization
import firebase from 'firebase/app';
import 'firebase/auth';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
export default firebase;

### Component Structure
Each component typically includes:
- A `.js` file for logic and rendering.
- A `.css` file for styles.

Example: `Login.js` and `Login.css` manage the login page UI and styles.