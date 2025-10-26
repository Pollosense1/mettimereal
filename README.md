# METTIME React Application

## Overview
METTIME is a React-based web application designed for managing compliance-related functionalities. It integrates with Firebase for authentication and Supabase for backend services. The application features a user-friendly interface with dynamic components for various operations.

## Project Structure
```
mettime-react-app
├── .github
│   └── copilot-instructions.md
├── public
│   ├── index.html
│   ├── manifest.json
│   └── robots.txt
├── src
│   ├── App.js
│   ├── App.css
│   ├── index.js
│   ├── index.css
│   ├── reportWebVitals.js
│   ├── setupTests.js
│   ├── firebase.js
│   ├── supabaseClient.js
│   ├── Login.js
│   ├── Login.css
│   ├── FillableTable.js
│   ├── FillableTable.css
│   ├── Cumplimiento.js
│   ├── Cumplimiento.css
│   ├── FCumplimiento.js
│   ├── FCumplimiento.css
│   ├── History.js
│   ├── History.css
│   ├── Evidencias.js
│   └── Evidencias.css
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── LICENSE
```

## Getting Started

### Prerequisites
- Node.js (version 14 or higher)
- npm (Node package manager)

### Installation
1. Clone the repository:
   ```
   git clone https://github.com/yourusername/mettime-react-app.git
   ```
2. Navigate to the project directory:
   ```
   cd mettime-react-app
   ```
3. Install the dependencies:
   ```
   npm install
   ```

### Running the Application
To start the development server, run:
```
npm start
```
The application will be available at [http://localhost:3000](http://localhost:3000).

### Running Tests
To execute tests in watch mode, use:
```
npm test
```

### Building for Production
To create an optimized production build, run:
```
npm run build
```
The build artifacts will be located in the `build/` directory.

## Features
- User authentication with Firebase
- Dynamic fillable tables
- Compliance-related forms and functionalities
- History management for authorized users
- Evidence management

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.