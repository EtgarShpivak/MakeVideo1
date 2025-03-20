import axios from 'axios';

interface VideoGenerationParams {
  images: string[];
  apiKey: string;
  prompt?: string;
  negativePrompt?: string;
  duration?: number;
  aspectRatio?: string;
}

interface VideoResponse {
  videoUrl: string;
  status: string;
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
  error?: string | { message?: string };
  message?: string;
  status?: number;
  response?: {
    data?: any;
    status?: number;
  };
}

const formatErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError;
    
    // Handle structured error objects
    if (apiError?.error && typeof apiError.error === 'object') {
      return apiError.error.message || 'Unknown API error';
    }
    
    // Handle string error messages
    if (apiError?.error && typeof apiError.error === 'string') {
      return apiError.error;
    }
    
    // Handle direct message property
    if (apiError?.message) {
      return apiError.message;
    }

    // Handle HTTP status codes
    if (error.response?.status) {
      switch (error.response.status) {
        case 400: return 'Invalid request parameters';
        case 401: return 'Invalid API key';
        case 403: return 'API key does not have required permissions';
        case 429: return 'Too many requests. Please try again later.';
        case 500: return 'Internal server error';
        case 502: return 'API server is temporarily unavailable';
        case 504: return 'Request timeout';
        default: return `Server error (${error.response.status})`;
      }
    }

    if (error.code === 'ECONNABORTED') {
      return 'Request timed out. Please try again.';
    }

    return error.message || 'Failed to connect to server';
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null) {
    try {
      return JSON.stringify(error);
    } catch {
      return 'An error occurred while processing the request';
    }
  }

  return String(error || 'An unknown error occurred');
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

export const generatePrompt = async (
  image1: ImageData,
  image2: ImageData,
  apiKey: string
): Promise<string> => {
  try {
    if (!image1?.data || !image2?.data) {
      throw new Error('Invalid image data');
    }

    if (!apiKey) {
      throw new Error('API key is required');
    }

    if (!apiKey.startsWith('sk-')) {
      throw new Error('Invalid Claude API key format');
    }

    const response = await axios.post(
      CLAUDE_API_ENDPOINT,
      { image1, image2, apiKey },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
        validateStatus: (status) => status === 200,
      }
    );

    if (!response.data?.prompt) {
      throw new Error('Invalid response from Claude API');
    }

    return response.data.prompt;
  } catch (error) {
    console.error('Error generating prompt:', error);
    throw new Error(formatErrorMessage(error));
  }
};

export const generateVideo = async (
  prompt: string,
  image1: ImageData,
  image2: ImageData,
  apiKey: string
): Promise<string> => {
  try {
    if (!prompt) {
      throw new Error('Prompt is required');
    }

    if (!image1?.data || !image2?.data) {
      throw new Error('Invalid image data');
    }

    if (!apiKey) {
      throw new Error('API key is required');
    }

    const response = await axios.post(
      FAL_API_ENDPOINT,
      { 
        prompt, 
        image1, 
        image2, 
        apiKey,
        model: 'kling-1.6',
        duration: 4,
        aspect_ratio: '16:9'
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
        validateStatus: (status) => status === 200,
      }
    );

    if (!response.data?.videoUrl) {
      throw new Error('Invalid response from FAL API');
    }

    return response.data.videoUrl;
  } catch (error) {
    console.error('Error generating video:', error);
    throw new Error(formatErrorMessage(error));
  }
};

export default {
  generateVideo,
};