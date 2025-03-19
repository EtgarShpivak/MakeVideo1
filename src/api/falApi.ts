import axios from 'axios';

const FAL_API_KEY = '06c24966-e2f5-4fee-a140-dc85fef70ee9:63d503f533b05d8d5a0c341cbbd7b7f6';
const FAL_API_URL = 'https://fal.ai/models/fal-ai/vidu/start-end-to-video';

interface VideoGenerationParams {
  startImage: string;
  finalImage: string;
  prompt?: string;
}

interface VideoGenerationResponse {
  videoUrl: string;
  status: string;
}

export const generateVideo = async (params: VideoGenerationParams): Promise<VideoGenerationResponse> => {
  try {
    const response = await axios.post(
      FAL_API_URL,
      {
        start_image: params.startImage,
        final_image: params.finalImage,
        prompt: params.prompt || 'Show a natural transition between two images with smooth morphing and subtle changes',
        video_length: 5,
      },
      {
        headers: {
          'Authorization': `Key ${FAL_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      videoUrl: response.data.video_url,
      status: response.data.status,
    };
  } catch (error) {
    console.error('Error generating video:', error);
    throw new Error('Failed to generate video');
  }
};

export const generatePrompt = (startImage: string, finalImage: string): string => {
  // TODO: Implement AI-based prompt generation
  // For now, return a generic prompt
  return 'Show a natural transition between two images with smooth morphing and subtle changes';
};

export {}; 