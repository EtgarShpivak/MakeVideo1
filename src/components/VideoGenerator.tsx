import React, { useState, useEffect } from 'react';
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
  LinearProgress,
  Divider
} from '@mui/material';
import MovieIcon from '@mui/icons-material/Movie';
import InfoIcon from '@mui/icons-material/Info';
import { useApp } from '../context/AppContext';
import falService from '../api/falService';

const VideoGenerator: React.FC = () => {
  const { images } = useApp();
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [diagnosticMode, setDiagnosticMode] = useState(false);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);

  // Clear console logs
  useEffect(() => {
    if (!loading) {
      setLogMessages([]);
    }
  }, [loading]);

  // Override console.log and console.error when in diagnostic mode
  useEffect(() => {
    if (diagnosticMode && loading) {
      const originalConsoleLog = console.log;
      const originalConsoleError = console.error;

      console.log = (...args) => {
        originalConsoleLog(...args);
        setLogMessages(prev => [...prev, `LOG: ${args.join(' ')}`]);
      };

      console.error = (...args) => {
        originalConsoleError(...args);
        setLogMessages(prev => [...prev, `ERROR: ${args.join(' ')}`]);
      };

      return () => {
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
      };
    }
  }, [diagnosticMode, loading]);

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
      setLoadingMessage('Generating video (this may take up to 1-3 minutes)...');
    }, 3000);
    
    // Stage 3-9: Processing
    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 5;
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
      setLogMessages([]);
      setAttemptCount(prev => prev + 1);
      const clearProgress = startProgressSimulation();
      
      const imageBase64Array = images.map(img => img.preview);
      
      // Set timeouts for user feedback
      const timeoutIds = [
        setTimeout(() => {
          setLoadingMessage('Still working... The server might be busy. Please be patient.');
        }, 30000), // 30 seconds
        setTimeout(() => {
          setLoadingMessage('This is taking longer than expected. The FAL.ai service might be experiencing high load.');
        }, 60000), // 1 minute
        setTimeout(() => {
          setLoadingMessage('Still trying... Video generation can take up to 3 minutes.');
        }, 120000), // 2 minutes
      ];
      
      try {
        const videoResult = await falService.generateVideo(imageBase64Array, apiKey);
        
        timeoutIds.forEach(clearTimeout);
        clearProgress();
        setLoadingProgress(100);
        setLoadingMessage('Video generated successfully!');
        
        setVideoUrl(videoResult);
        setSuccess(true);
      } catch (err: any) {
        timeoutIds.forEach(clearTimeout);
        clearProgress();
        throw err;
      }
    } catch (err: any) {
      console.error('Error generating video:', err);
      
      // Provide more helpful error messages
      let errorMessage = err.message || 'Failed to generate video';
      
      if (errorMessage.includes('No response received')) {
        errorMessage = 'No response received from FAL.ai API. The service might be down or experiencing issues. Please try again later.';
      } else if (errorMessage.includes('timed out')) {
        errorMessage = 'The request timed out. FAL.ai might be experiencing high load. Please try again later.';
      } else if (errorMessage.includes('API key')) {
        errorMessage = 'Invalid API key. Please check your FAL.ai API key and try again.';
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

  const toggleDiagnosticMode = () => {
    setDiagnosticMode(!diagnosticMode);
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
        
        <Button
          variant="text"
          startIcon={<InfoIcon />}
          onClick={toggleDiagnosticMode}
          size="small"
          sx={{ mt: 1 }}
        >
          {diagnosticMode ? 'Hide Diagnostic Info' : 'Show Diagnostic Info'}
        </Button>
        
        {loading && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" gutterBottom>
              {loadingMessage}
            </Typography>
            <LinearProgress variant="determinate" value={loadingProgress} sx={{ mt: 1 }} />
            
            {diagnosticMode && (
              <Box sx={{ mt: 2, p: 1, bgcolor: '#f5f5f5', borderRadius: 1, maxHeight: 200, overflow: 'auto' }}>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                  Attempt: {attemptCount}
                  {logMessages.map((msg, i) => (
                    <div key={i}>{msg}</div>
                  ))}
                </Typography>
              </Box>
            )}
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