# Bar Mitzvah Time-Lapse Video Generator

Upload your images, arrange them in order, and generate a time-lapse video using FAL.ai's video transition API.

## Features

- Upload and preview multiple images
- Drag and drop to reorder images
- Numbered images to ensure correct ordering
- Generate smooth video transitions between images
- Download the generated video

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- A FAL.ai API key (get one at [fal.ai](https://fal.ai))

### Installation

1. Clone the repository or download the files
2. Install dependencies:

```bash
npm install
```

### Running the Application

The application requires both the Express server (for API proxy) and the Vite development server to run.

**Option 1: Run both servers with one command**

```bash
npm run start
```

This starts both the Express API server and the Vite development server concurrently.

**Option 2: Run servers separately**

In one terminal:

```bash
npm run server
```

In another terminal:

```bash
npm run dev
```

**Option 3: Use the provided batch file (Windows only)**

```bash
.\start.bat
```

This will open both servers in separate command windows.

### Building for Production

To build the application for production:

```bash
npm run build
```

Then start the production server:

```bash
npm run server
```

Visit `http://localhost:4000` to view the application.

## Troubleshooting

### API Connection Issues

If you encounter errors like "Cannot connect to FAL.ai API" or "DNS resolution failed":

1. Make sure both servers are running (Express server on port 4000)
2. Check your internet connection
3. Try using a VPN - some networks block access to the FAL.ai domain
4. If using a corporate or school network, try a different network or a mobile hotspot
5. Verify your FAL.ai API key is valid
6. If all else fails, try running the application on a different network

### Image Requirements

- Upload at least 2 images
- Images should be in common formats (JPEG, PNG)
- For best results, use images with similar subjects/compositions
- Very large images may take longer to process

## License

MIT
