import axios from 'axios';

interface VideoGenerationParams {
  images: string[];
  apiKey: string;
}

interface VideoResponse {
  videoUrl: string;
  status: string;
}

export const generateVideo = async ({ images, apiKey }: VideoGenerationParams): Promise<VideoResponse> => {
  try {
    console.log('Sending request to Vercel proxy with', images.length, 'images');
    
    // Use the relative path to the API endpoint
    const proxyEndpoint = '/api/fal';
    
    // Make the API request through our proxy
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
    
    if (error.response && error.response.status === 401) {
      throw new Error('Invalid API key. Please check your FAL.ai API key.');
    } else if (error.response && error.response.data && error.response.data.message) {
      throw new Error(`API Error: ${error.response.data.message}`);
    } else if (error.message) {
      throw new Error(error.message);
    } else {
      throw new Error('Unknown error generating video');
    }
  }
};