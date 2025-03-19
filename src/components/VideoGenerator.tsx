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
  Divider,
  FormControlLabel,
  Checkbox,
  Tooltip,
  Card,
  CardContent,
  MenuItem,
  Select,
  SelectChangeEvent,
  InputLabel,
  FormControl,
  Grid
} from '@mui/material';
import MovieIcon from '@mui/icons-material/Movie';
import InfoIcon from '@mui/icons-material/Info';
import BugReportIcon from '@mui/icons-material/BugReport';
import { useApp } from '../context/AppContext';
import falService from '../api/falService';

// Helper function to convert a blob URL to a base64 string
const blobUrlToBase64 = async (blobUrl: string): Promise<string> => {
  try {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting blob URL to base64:', error);
    throw new Error('Failed to convert image format');
  }
};

// Available durations and aspect ratios
const DURATION_OPTIONS = [3, 4, 5, 6, 7, 8, 9, 10];
const ASPECT_RATIO_OPTIONS = ["16:9", "1:1", "9:16", "4:3", "3:4"];

const VideoGenerator: React.FC = () => {
  const { images } = useApp();
  const [apiKey, setApiKey] = useState('');
  const [prompt, setPrompt] = useState('A cinematic time-lapse showing progression');
  const [negativePrompt, setNegativePrompt] = useState('blur, distort, and low quality');
  const [duration, setDuration] = useState<number>(5);
  const [aspectRatio, setAspectRatio] = useState<string>("16:9");
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [diagnosticMode, setDiagnosticMode] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [apiCheckStatus, setApiCheckStatus] = useState<'unknown' | 'checking' | 'available' | 'unavailable'>('unknown');

  // Clear console logs
  useEffect(() => {
    if (!loading) {
      setLogMessages([]);
    }
  }, [loading]);

  // Check API availability when component mounts
  useEffect(() => {
    checkApiAvailability();
  }, []);

  // Check if our API endpoint is available
  const checkApiAvailability = async () => {
    setApiCheckStatus('checking');
    try {
      // Add cache-busting parameter
      const response = await fetch(`/api/fal?t=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        setApiCheckStatus('available');
        console.log('API endpoint is available');
      } else {
        setApiCheckStatus('unavailable');
        console.error('API endpoint returned error:', response.status);
      }
    } catch (error) {
      setApiCheckStatus('unavailable');
      console.error('Error checking API availability:', error);
    }
  };

  // Handle duration change
  const handleDurationChange = (event: SelectChangeEvent<number>) => {
    setDuration(event.target.value as number);
  };

  // Handle aspect ratio change
  const handleAspectRatioChange = (event: SelectChangeEvent) => {
    setAspectRatio(event.target.value);
  };

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
      setLoadingMessage('Converting images to base64...');
    }, 1000);
    
    // Stage 2: Sending
    setTimeout(() => {
      setLoadingProgress(20);
      setLoadingMessage('Sending request to FAL.ai...');
    }, 3000);
    
    // Stage 3: Processing - Kling takes longer
    setTimeout(() => {
      setLoadingProgress(30);
      setLoadingMessage('Generating video (this may take up to 3-6 minutes)...');
    }, 5000);
    
    // Stage 4-9: Processing
    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 5;
      });
    }, 8000); // Slower progress for Kling model
    
    return () => clearInterval(interval);
  };

  const handleGenerateVideo = async () => {
    if (images.length < 1) {
      setError('Please upload at least 1 image');
      return;
    }

    if (!apiKey && !testMode) {
      setError('Please enter your FAL.ai API key');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setLogMessages([]);
      setAttemptCount(prev => prev + 1);
      const clearProgress = startProgressSimulation();
      
      // Convert blob URLs to base64 strings
      setLoadingMessage('Converting images to proper format...');
      
      try {
        console.log('Original image previews:', images.map(img => img.preview.substring(0, 30)));
        
        // Convert blob URLs to base64
        const imagePromises = images.map(img => {
          if (img.preview.startsWith('blob:')) {
            return blobUrlToBase64(img.preview);
          }
          return img.preview;
        });
        
        const imageBase64Array = await Promise.all(imagePromises);
        console.log('Converted images to base64 format');
        
        // Set timeouts for user feedback - Kling needs longer timeouts
        const timeoutIds = [
          setTimeout(() => {
            setLoadingMessage('Still working... The Kling model takes longer to generate high-quality videos. Please be patient.');
          }, 30000), // 30 seconds
          setTimeout(() => {
            setLoadingMessage('This is taking longer than expected. The Kling model typically takes 3-6 minutes.');
          }, 90000), // 1.5 minutes
          setTimeout(() => {
            setLoadingMessage('Still working... The Kling model is creating your video (can take up to 6 minutes).');
          }, 180000), // 3 minutes
          setTimeout(() => {
            setLoadingMessage('Almost there... The video is being finalized.');
          }, 300000), // 5 minutes
        ];
        
        try {
          // Add test mode parameter if enabled
          const options = {
            testMode: testMode,
            prompt: prompt,
            negativePrompt: negativePrompt,
            duration: duration,
            aspectRatio: aspectRatio
          };
          const videoResult = await falService.generateVideo(imageBase64Array, apiKey, options);
          
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
        clearProgress();
        throw new Error(`Error processing images: ${err.message}`);
      }
    } catch (err: any) {
      console.error('Error generating video:', err);
      
      // Provide more helpful error messages
      let errorMessage = err.message || 'Failed to generate video';
      
      if (errorMessage.includes('No response received')) {
        errorMessage = 'No response received from FAL.ai API. The service might be down or experiencing issues. Please try again later.';
      } else if (errorMessage.includes('timed out')) {
        errorMessage = 'The request timed out. The Kling model can take up to 6 minutes to generate a video. Please try again.';
      } else if (errorMessage.includes('API key')) {
        errorMessage = 'Invalid API key. Please check your FAL.ai API key and try again.';
      } else if (errorMessage.includes('converting') || errorMessage.includes('processing')) {
        errorMessage = 'Error processing your images. Please try uploading them again or use different images.';
      } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        errorMessage = 'Network error. Could not connect to the server. Please check your internet connection and try again.';
        
        // Check API availability
        checkApiAvailability();
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
      
      <Card variant="outlined" sx={{ mb: 3, bgcolor: '#f9f9f9' }}>
        <CardContent>
          <Typography variant="subtitle2" color="primary" gutterBottom>
            How It Works
          </Typography>
          <Typography variant="body2">
            This generator uses the Kling 1.6 Image-to-Video model from FAL.ai. It transforms either a single image or a pair of images (start and tail) into a dynamic video based on your prompt.
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            • Upload 1 image for standard video or 2 images for a transition effect<br />
            • Enter a descriptive prompt (e.g., "A cinematic time-lapse of a child growing up")<br />
            • Customize duration, aspect ratio, and negative prompt<br />
            • The model will create a stylized video from your image(s)
          </Typography>
        </CardContent>
      </Card>
      
      {apiCheckStatus === 'unavailable' && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Could not connect to the API server. The server might be down or your internet connection might be unstable.
          <Button size="small" onClick={checkApiAvailability} sx={{ ml: 1 }}>
            Retry Connection
          </Button>
        </Alert>
      )}
      
      <Box sx={{ mb: 3 }}>
        <TextField
          label="FAL.ai API Key"
          fullWidth
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Enter your FAL.ai API key"
          type="password"
          sx={{ mb: 2 }}
          disabled={testMode}
          helperText={
            <span>
              Get your API key from{' '}
              <Link href="https://fal.ai" target="_blank" rel="noopener noreferrer">
                FAL.ai
              </Link>
            </span>
          }
        />
        
        <TextField
          label="Video Generation Prompt"
          fullWidth
          multiline
          rows={2}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe how you want the video to look"
          sx={{ mb: 2 }}
          helperText="Be descriptive about the style and motion you want in the video"
        />
        
        <TextField
          label="Negative Prompt (what to avoid)"
          fullWidth
          multiline
          rows={1}
          value={negativePrompt}
          onChange={(e) => setNegativePrompt(e.target.value)}
          placeholder="Describe unwanted elements (e.g., blur, distortion, low quality)"
          sx={{ mb: 2 }}
          helperText="Elements to avoid in the video generation"
        />
        
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6}>
            <FormControl fullWidth>
              <InputLabel id="duration-select-label">Duration (seconds)</InputLabel>
              <Select
                labelId="duration-select-label"
                id="duration-select"
                value={duration}
                label="Duration (seconds)"
                onChange={handleDurationChange}
              >
                {DURATION_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option} seconds
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth>
              <InputLabel id="aspect-ratio-select-label">Aspect Ratio</InputLabel>
              <Select
                labelId="aspect-ratio-select-label"
                id="aspect-ratio-select"
                value={aspectRatio}
                label="Aspect Ratio"
                onChange={handleAspectRatioChange}
              >
                {ASPECT_RATIO_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Tooltip title="Test mode uses a mock API response and doesn't require a real API key">
            <FormControlLabel
              control={
                <Checkbox
                  checked={testMode}
                  onChange={(e) => setTestMode(e.target.checked)}
                  color="primary"
                />
              }
              label="Test Mode (no API key needed)"
            />
          </Tooltip>
          
          <Button
            variant="text"
            startIcon={<InfoIcon />}
            onClick={toggleDiagnosticMode}
            size="small"
          >
            {diagnosticMode ? 'Hide Diagnostic Info' : 'Show Diagnostic Info'}
          </Button>
        </Box>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>
            <strong>Selected Images:</strong> {images.length === 0 ? 'None' : 
              images.length === 1 ? '1 image (single-image mode)' : 
              `2 images (transition mode - from first to second)`
            }
          </Typography>
          
          {images.length === 2 && (
            <Typography variant="body2" color="primary">
              Using transition mode: The video will transition from the first image to the second
            </Typography>
          )}
        </Box>
        
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <MovieIcon />}
          onClick={handleGenerateVideo}
          disabled={loading || images.length < 1 || (apiCheckStatus === 'unavailable' && !testMode)}
          fullWidth
        >
          {loading ? 'Generating...' : 'Generate Video'}
        </Button>
        
        {diagnosticMode && (
          <Button
            variant="outlined"
            startIcon={<BugReportIcon />}
            onClick={checkApiAvailability}
            size="small"
            sx={{ mt: 1 }}
            fullWidth
          >
            Check API Availability
          </Button>
        )}
        
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