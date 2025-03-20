import axios from 'axios';

interface VideoGenerationParams {
  images: string[];
  apiKey: string;
  prompt?: string;
  negativePrompt?: string;
  duration?: number;
  aspectRatio?: string;
}

export interface VideoResponse {
  url: string;
}

interface GenerateVideoOptions {
  testMode?: boolean;
  retryOnFailure?: boolean;
  prompt?: string;
  negativePrompt?: string;
  duration?: number;
  aspectRatio?: string;
}

// FAL.ai API service
const MAX_RETRIES = 2;
const RETRY_DELAY = 3000; // 3 seconds

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Get the base URL from window.location in production
const PROXY_BASE_URL = process.env.NODE_ENV === 'production' 
  ? window.location.origin 
  : 'http://localhost:3000';

const CLAUDE_API_ENDPOINT = `${PROXY_BASE_URL}/api/claude`;
const FAL_API_ENDPOINT = `${PROXY_BASE_URL}/api/fal`;

interface ClaudeMessage {
  model: string;
  max_tokens: number;
  messages: {
    role: string;
    content: {
      type: string;
      text?: string;
      source?: {
        type: string;
        media_type: string;
        data: string;
      };
    }[];
  }[];
}

interface FalRequest {
  image1: string;
  image2: string;
  prompt: string;
  model: string;
  duration: number;
  aspect_ratio: string;
}

interface ImageData {
  data: string;
  type: string;
}

interface ApiError {
  message: string;
  status?: number;
}

const formatErrorMessage = (error: any): string => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const message = error.response?.data?.error?.message || error.message;
    
    switch (status) {
      case 401:
        return 'Invalid API key';
      case 429:
        return 'Rate limit exceeded. Please try again later.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return `API Error: ${message}`;
    }
  }
  
  return error.message || 'An unexpected error occurred';
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result as string;
      resolve(base64String);
    };
    reader.onerror = error => reject(error);
  });
};

export async function generatePrompt(
  image1: string,
  image2: string,
  apiKey: string
): Promise<string> {
  if (!image1 || !image2 || !apiKey) {
    throw new Error('Missing required parameters');
  }

  try {
    const response = await axios.post('/api/claude', {
      image1: image1.replace(/^data:image\/\w+;base64,/, ''),
      image2: image2.replace(/^data:image\/\w+;base64,/, ''),
      apiKey
    });

    return response.data.prompt;
  } catch (error: any) {
    throw new Error(formatErrorMessage(error));
  }
}

export async function generateVideo(
  prompt: string,
  image1: string,
  image2: string,
  apiKey: string
): Promise<VideoResponse> {
  if (!prompt || !image1 || !image2 || !apiKey) {
    throw new Error('Missing required parameters');
  }

  try {
    const response = await axios.post('/api/fal', {
      prompt,
      image1: image1.replace(/^data:image\/\w+;base64,/, ''),
      image2: image2.replace(/^data:image\/\w+;base64,/, ''),
      apiKey
    });

    return { url: response.data.url };
  } catch (error: any) {
    throw new Error(formatErrorMessage(error));
  }
}

export default {
  generateVideo,
  generatePrompt,
};