import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Paper, 
  Typography, 
  TextField, 
  CircularProgress,
  Alert,
  Snackbar,
  Link
} from '@mui/material';
import MovieIcon from '@mui/icons-material/Movie';
import { useApp } from '../context/AppContext';
import { generateVideo } from '../api/falService';

const VideoGenerator: React.FC = () => {
  const { images } = useApp();
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const handleGenerateVideo = async () => {
    if (images.length < 2) {
      setError('Please upload at least 2 images');
      return;
    }

    if (!apiKey) {
      setError('Please enter your FAL.ai API key');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('Starting video generation process with', images.length, 'images');
      
      // Convert images to base64 strings
      const imagePromises = images.map(image => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') {
              resolve(reader.result);
            } else {
              reject(new Error('Failed to convert image to base64'));
            }
          };
          reader.onerror = () => {
            reject(new Error('Failed to read image'));
          };
          reader.readAsDataURL(image.file);
        });
      });

      const base64Images = await Promise.all(imagePromises);
      
      console.log('Images converted to base64, sending to API...');
      
      // Generate video
      const result = await generateVideo({
        images: base64Images,
        apiKey
      });
      
      setVideoUrl(result.videoUrl);
      setSuccess(true);
    } catch (err: any) {
      console.error('Error generating video:', err);
      let errorMessage = 'Failed to generate video';
      
      if (err.message === 'Network Error') {
        errorMessage = 'Network error: Make sure both servers are running. If they are, your network might be blocking access to FAL.ai API. Try using a VPN or a different network.';
      } else if (err.message && err.message.includes('DNS')) {
        errorMessage = 'DNS resolution failed: Your network is blocking access to FAL.ai. Try using a VPN or connect to a different network.';
      } else if (err.response && err.response.status === 401) {
        errorMessage = 'API Key is invalid or expired. Please check your FAL.ai API key.';
      } else if (err.response && err.response.data && err.response.data.message) {
        errorMessage = `API Error: ${err.response.data.message}`;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setError(null);
    setSuccess(false);
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Generate Video
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <TextField
          label="FAL.ai API Key"
          fullWidth
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Enter your FAL.ai API key"
          type="password"
          sx={{ mb: 2 }}
          helperText={
            <span>
              Get your API key from{' '}
              <Link href="https://fal.ai" target="_blank" rel="noopener noreferrer">
                FAL.ai
              </Link>
            </span>
          }
        />
        
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <MovieIcon />}
          onClick={handleGenerateVideo}
          disabled={loading || images.length === 0}
          fullWidth
        >
          {loading ? 'Generating...' : 'Generate Video'}
        </Button>
      </Box>
      
      {videoUrl && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Generated Video
          </Typography>
          <Box sx={{ width: '100%', position: 'relative', paddingTop: '56.25%' }}>
            <video
              src={videoUrl}
              controls
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
              }}
            />
          </Box>
          <Button
            variant="outlined"
            fullWidth
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ mt: 1 }}
          >
            Download Video
          </Button>
        </Box>
      )}
      
      <Snackbar open={!!error} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
      
      <Snackbar open={success} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          Video generated successfully!
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default VideoGenerator; 