import axios from 'axios';

interface VideoGenerationParams {
  images: string[];
  apiKey: string;
}

interface VideoResponse {
  videoUrl: string;
  status: string;
}

// Use our express server proxy to avoid DNS resolution issues
export const generateVideo = async ({ images, apiKey }: VideoGenerationParams): Promise<VideoResponse> => {
  try {
    console.log('Sending request to proxy with', images.length, 'images');
    
    // Our express server endpoint - make sure to use the port where Express is running
    const proxyEndpoint = 'http://localhost:4000/api/fal';
    
    // Make the API request through our proxy with a longer timeout
    const response = await axios.post(proxyEndpoint, { 
      images, 
      apiKey 
    }, {
      timeout: 180000 // 3 minute timeout
    });
    
    console.log('Response received from proxy');
    
    if (response.data && response.data.output && response.data.output.video) {
      return {
        videoUrl: response.data.output.video,
        status: 'success'
      };
    } else {
      throw new Error('Invalid response from FAL.ai API');
    }
  } catch (error: any) {
    console.error('Error generating video:', error);
    
    // Network connection error
    if (error.message === 'Network Error') {
      throw new Error('Network error: Make sure the Express server is running at http://localhost:4000. If it is running, your network might be blocking access to FAL.ai API - try using a VPN.');
    }
    
    // DNS resolution error
    if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN' || 
        (error.message && (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')))) {
      throw new Error('DNS resolution failed: Cannot connect to FAL.ai API. Try using a VPN or a different network connection.');
    }
    
    // API errors
    if (error.response) {
      if (error.response.status === 401) {
        throw new Error('Invalid API key. Please check your FAL.ai API key.');
      } else if (error.response.status === 403) {
        throw new Error('Access forbidden. Your API key might not have permission to use this service.');
      } else if (error.response.data && error.response.data.message) {
        throw new Error(`API Error: ${error.response.data.message}`);
      }
    }
    
    // Other errors
    throw error;
  }
}; 