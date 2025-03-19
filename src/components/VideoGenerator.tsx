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
  Link,
  LinearProgress
} from '@mui/material';
import MovieIcon from '@mui/icons-material/Movie';
import { useApp } from '../context/AppContext';
import falService from '../api/falService';

const VideoGenerator: React.FC = () => {
  const { images } = useApp();
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // Function to simulate progress for better UX
  const startProgressSimulation = () => {
    setLoadingProgress(0);
    setLoadingMessage('Preparing images...');
    
    // Stage 1: Preparing
    setTimeout(() => {
      setLoadingProgress(10);
      setLoadingMessage('Sending request to FAL.ai...');
    }, 1000);
    
    // Stage 2: Sending
    setTimeout(() => {
      setLoadingProgress(20);
      setLoadingMessage('Generating video (this may take up to 30-60 seconds)...');
    }, 3000);
    
    // Stage 3-9: Processing
    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 10;
      });
    }, 5000);
    
    return () => clearInterval(interval);
  };

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
      const clearProgress = startProgressSimulation();
      
      const imageBase64Array = images.map(img => img.preview);
      
      // Set a timeout to handle long-running requests
      const timeoutId = setTimeout(() => {
        if (loading) {
          setLoadingMessage('Still working... The server might be busy. Please be patient.');
        }
      }, 30000); // 30 seconds
      
      try {
        const videoResult = await falService.generateVideo(imageBase64Array, apiKey);
        
        clearTimeout(timeoutId);
        clearProgress();
        setLoadingProgress(100);
        setLoadingMessage('Video generated successfully!');
        
        setVideoUrl(videoResult);
        setSuccess(true);
      } catch (err: any) {
        clearTimeout(timeoutId);
        clearProgress();
        throw err;
      }
    } catch (err: any) {
      console.error('Error generating video:', err);
      setError(err.message || 'Failed to generate video');
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
        
        {loading && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" gutterBottom>
              {loadingMessage}
            </Typography>
            <LinearProgress variant="determinate" value={loadingProgress} sx={{ mt: 1 }} />
          </Box>
        )}
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