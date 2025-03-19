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
const MAX_RETRIES = 2;
const RETRY_DELAY = 3000; // 3 seconds

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const generateVideo = async (images: string[], apiKey: string): Promise<string> => {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Attempt ${attempt + 1}/${MAX_RETRIES + 1} to generate video with ${images.length} images`);
      
      // Always use the Vercel API route since we're deployed
      const endpoint = '/api/fal';
      
      console.log('Using production endpoint:', endpoint);
      
      // Check image format
      const firstImage = images[0];
      const imageFormat = firstImage.substring(0, 30);
      console.log('Image format check:', imageFormat);
      
      // Add a unique cache-busting parameter to avoid any caching issues
      const cacheBuster = `?t=${Date.now()}`;
      const requestUrl = `${endpoint}${cacheBuster}`;
      
      console.log(`Sending request to ${requestUrl}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minute timeout
      
      try {
        const response = await fetch(requestUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ images, apiKey }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
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
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          console.error('Request timed out');
          throw new Error('Request timed out. The server took too long to respond.');
        } else {
          throw fetchError;
        }
      }
    } catch (error: any) {
      lastError = error;
      console.error(`Attempt ${attempt + 1} failed:`, error.message);
      
      // If network-related error and we have retries left, wait and retry
      if (attempt < MAX_RETRIES && 
         (error.message.includes('No response received') || 
          error.message.includes('timed out') ||
          error.message.includes('Failed to fetch'))) {
        console.log(`Retrying in ${RETRY_DELAY / 1000} seconds...`);
        await sleep(RETRY_DELAY);
        continue;
      }
      
      // No more retries or non-retriable error
      throw error;
    }
  }
  
  // If we reach here, all retries failed
  throw lastError || new Error('Failed to generate video after multiple attempts');
};

export default {
  generateVideo,
};