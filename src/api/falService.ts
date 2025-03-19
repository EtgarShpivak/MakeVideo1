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
    
    console.log('Using production endpoint');
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ images, apiKey }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      
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
    
    if (!data.output || !data.output.video) {
      throw new Error('Invalid response format from API');
    }
    
    return data.output.video;
  } catch (error: any) {
    console.error('Error generating video:', error);
    throw error;
  }
};

export default {
  generateVideo,
};