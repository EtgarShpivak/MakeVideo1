# Bar Mitzvah Time-Lapse Video Generator

A web application that uses AI to generate dynamic videos from photos, perfect for creating time-lapse effects for Bar/Bat Mitzvah celebrations or any other event where you want to show growth or progression over time.

## Features

- Upload and organize your photos
- Generate videos from a single image using AI
- Customize videos with descriptive prompts
- Simple and intuitive interface
- Secure API integration with FAL.ai

## How It Works

This application uses the FAL.ai Kling 1.6 Image-to-Video model to transform a single photo into a dynamic video. The AI applies creative motion and effects based on your descriptive prompt.

1. **Upload a photo**: Select or drag & drop an image you want to transform
2. **Enter your prompt**: Describe how you want the video to look (e.g., "A cinematic time-lapse of a child growing up")
3. **Generate video**: With your FAL.ai API key, create a unique video from your image
4. **Download and share**: Save the generated video to use in your celebration

## Getting Started

To use this application:

1. Get an API key from [FAL.ai](https://fal.ai)
2. Upload at least one image
3. Enter a descriptive prompt for the video
4. Click "Generate Video"

The video generation process takes approximately 3-6 minutes as the Kling model creates high-quality videos.

## Technical Details

- Built with React and Material UI
- Uses serverless functions for API integration
- Fully responsive design for all devices
- Secure client-side handling of API keys

## Test Mode

The application includes a test mode for trying the interface without requiring an API key. This allows you to explore the application's features before obtaining your FAL.ai API key.

## Troubleshooting

If you experience issues:

- Ensure your FAL.ai API key is valid
- Check your internet connection
- Try using a different image (high-quality photos work best)
- Use the diagnostic mode to see detailed logs

## Deployment

This application can be deployed on Vercel, Netlify, or any other static site hosting service. The API integration is handled through serverless functions to maintain security.

## License

MIT
