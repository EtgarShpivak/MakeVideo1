import axios from 'axios';

interface VideoGenerationParams {
  images: string[];
  apiKey: string;
}

interface VideoResponse {
  videoUrl: string;
  status: string;
}

// FAL.ai API service
const generateVideo = async (images: string[], apiKey: string): Promise<string> => {
  try {
    console.log(`Sending ${images.length} images for video generation`);
    
    // Always use the Vercel API route since we're deployed
    const endpoint = '/api/fal';
    
    console.log('Using production endpoint:', endpoint);
    
    // Check image format
    const firstImage = images[0];
    const imageFormat = firstImage.substring(0, 30);
    console.log('Image format check:', imageFormat);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ images, apiKey }),
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
        console.error('Error response data:', errorData);
      } catch (e) {
        console.error('Failed to parse error response', e);
        errorData = { message: 'Unknown error' };
      }
      
      // Handle specific error cases
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your FAL.ai API key.');
      } else if (response.status === 404) {
        throw new Error('API endpoint not found. Please check the server configuration.');
      } else if (errorData.message) {
        throw new Error(`API Error: ${errorData.message}`);
      } else {
        throw new Error(`API Error: ${response.statusText}`);
      }
    }
    
    const data = await response.json();
    console.log('Response data structure:', Object.keys(data).join(', '));
    
    if (data.output && data.output.video) {
      console.log('Successfully received video URL');
      return data.output.video;
    } else {
      console.error('Invalid response format:', data);
      throw new Error('Invalid response format from API');
    }
  } catch (error: any) {
    console.error('Error generating video:', error);
    throw error;
  }
};

export default {
  generateVideo,
};