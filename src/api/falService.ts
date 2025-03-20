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
  error?: string;
  message?: string;
}

const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError;
    return apiError?.error || apiError?.message || error.message || 'API request failed';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
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
    const response = await axios.post(
      CLAUDE_API_ENDPOINT,
      { image1, image2, apiKey },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.data?.prompt) {
      throw new Error('Invalid response from Claude API');
    }

    return response.data.prompt;
  } catch (error) {
    console.error('Error generating prompt:', error);
    throw new Error(handleApiError(error));
  }
};

export const generateVideo = async (
  prompt: string,
  image1: ImageData,
  image2: ImageData,
  apiKey: string
): Promise<string> => {
  try {
    const response = await axios.post(
      FAL_API_ENDPOINT,
      { prompt, image1, image2, apiKey },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.data?.videoUrl) {
      throw new Error('Invalid response from FAL API');
    }

    return response.data.videoUrl;
  } catch (error) {
    console.error('Error generating video:', error);
    throw new Error(handleApiError(error));
  }
};

export default {
  generateVideo,
};