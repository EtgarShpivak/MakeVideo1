import React, { useState, useCallback } from 'react';
import { Box, Button, TextField, Typography, Paper, CircularProgress, Grid, Alert, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton } from '@mui/material';
import { Download, Refresh } from '@mui/icons-material';
import { generateVideo, generatePrompt } from '../api/falService';
import { useApp } from '../context/AppContext';

interface Prompt {
  fromImage: number;
  toImage: number;
  text: string;
}

interface ImageData {
  data: string;
  type: string;
}

interface DiagnosticError {
  name?: string;
  message: string;
  stack?: string;
  details?: any;
}

const formatDiagnosticInfo = (error: unknown): DiagnosticError => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === 'object' && error !== null) {
    const errorObj = error as any;
    return {
      name: errorObj.name || 'UnknownError',
      message: errorObj.message || JSON.stringify(error),
      details: error,
    };
  }

  return {
    name: 'UnknownError',
    message: String(error),
  };
};

const fileToImageData = async (file: File): Promise<ImageData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve({
          data: reader.result,
          type: file.type || 'image/jpeg'
        });
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = error => reject(error);
  });
};

interface VideoGeneratorProps {
  image1: string | null;
  image2: string | null;
  onReset: () => void;
}

export default function VideoGenerator({ image1, image2, onReset }: VideoGeneratorProps) {
  const { images } = useApp();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claudeApiKey, setClaudeApiKey] = useState('');
  const [falApiKey, setFalApiKey] = useState('');
  const [testMode, setTestMode] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticInfo, setDiagnosticInfo] = useState<DiagnosticError | null>(null);
  const [generatingPrompts, setGeneratingPrompts] = useState(false);
  const [generatingVideos, setGeneratingVideos] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  const handleError = useCallback((err: unknown, context: string) => {
    console.error(`Error ${context}:`, err);
    const formattedError = formatDiagnosticInfo(err);
    setError(formattedError.message);
    if (showDiagnostics) {
      setDiagnosticInfo(formattedError);
    }
  }, [showDiagnostics]);

  const handleGeneratePrompts = async () => {
    if (!claudeApiKey) {
      setError('Please enter your Claude API key');
      return;
    }

    if (images.length < 2) {
      setError('Please upload at least 2 images');
      return;
    }

    setGeneratingPrompts(true);
    setLoading(true);
    setError(null);
    setDiagnosticInfo(null);
    setPrompts([]);  // Clear existing prompts

    try {
      const newPrompts: Prompt[] = [];
      for (let i = 0; i < images.length - 1; i++) {
        const image1Data = await fileToImageData(images[i].file);
        const image2Data = await fileToImageData(images[i + 1].file);
        
        if (testMode) {
          newPrompts.push({
            fromImage: i + 1,
            toImage: i + 2,
            text: "Test prompt for video generation"
          });
          continue;
        }
        
        const prompt = await generatePrompt(image1Data, image2Data, claudeApiKey);
        newPrompts.push({
          fromImage: i + 1,
          toImage: i + 2,
          text: prompt
        });
      }
      setPrompts(newPrompts);
    } catch (err) {
      handleError(err, 'generating prompts');
    } finally {
      setGeneratingPrompts(false);
      setLoading(false);
    }
  };

  const handleGenerateVideos = async () => {
    if (!falApiKey) {
      setError('Please enter your FAL.ai API key');
      return;
    }

    if (images.length < 2) {
      setError('Please upload at least 2 images');
      return;
    }

    if (prompts.length === 0) {
      setError('Please generate prompts first');
      return;
    }

    setGeneratingVideos(true);
    setLoading(true);
    setError(null);
    setDiagnosticInfo(null);
    setVideos([]);  // Clear existing videos

    try {
      const newVideos: string[] = [];
      for (let i = 0; i < images.length - 1; i++) {
        const prompt = prompts.find(p => p.fromImage === i + 1 && p.toImage === i + 2)?.text;
        if (!prompt) {
          throw new Error(`No prompt found for images ${i + 1} → ${i + 2}`);
        }

        const image1Data = await fileToImageData(images[i].file);
        const image2Data = await fileToImageData(images[i + 1].file);

        if (testMode) {
          newVideos.push(`https://example.com/test-video-${i + 1}.mp4`);
          continue;
        }

        const videoUrl = await generateVideo(
          prompt,
          image1Data,
          image2Data,
          falApiKey
        );
        newVideos.push(videoUrl);
      }
      setVideos(newVideos);
    } catch (err) {
      handleError(err, 'generating videos');
    } finally {
      setGeneratingVideos(false);
      setLoading(false);
    }
  };

  const handleDownload = useCallback((url: string, index: number) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `video-${index + 1}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  const isGeneratePromptsDisabled = loading || images.length < 2 || generatingPrompts;
  const isGenerateVideosDisabled = loading || prompts.length === 0 || generatingVideos || generatingPrompts;

  const handleGeneratePrompt = useCallback(async () => {
    if (!image1 || !image2 || !claudeApiKey) {
      setError('Please provide both images and a Claude API key');
      return;
    }

    setError('');
    setGeneratingPrompts(true);
    try {
      const generatedPrompt = await generatePrompt(image1, image2, claudeApiKey);
      setPrompt(generatedPrompt);
    } catch (err: any) {
      setError(err.message || 'Failed to generate prompt');
    } finally {
      setGeneratingPrompts(false);
    }
  }, [image1, image2, claudeApiKey]);

  const handleGenerateVideo = useCallback(async () => {
    if (!prompt || !falApiKey) {
      setError('Please generate a prompt and provide a FAL API key first');
      return;
    }

    setError('');
    setGeneratingVideos(true);
    try {
      const video = await generateVideo(prompt, image1!, image2!, falApiKey);
      setVideoUrl(video.url);
    } catch (err: any) {
      setError(err.message || 'Failed to generate video');
    } finally {
      setGeneratingVideos(false);
    }
  }, [prompt, image1, image2, falApiKey]);

  const handleReset = useCallback(() => {
    setPrompt('');
    setVideoUrl('');
    setError('');
    onReset();
  }, [onReset]);

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Claude API Key"
              type="password"
              value={claudeApiKey}
              onChange={(e) => setClaudeApiKey(e.target.value)}
              margin="normal"
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="FAL.ai API Key"
              type="password"
              value={falApiKey}
              onChange={(e) => setFalApiKey(e.target.value)}
              margin="normal"
              disabled={loading}
            />
          </Grid>
        </Grid>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            onClick={handleGeneratePrompts}
            disabled={isGeneratePromptsDisabled}
            startIcon={generatingPrompts ? <CircularProgress size={20} /> : <Refresh />}
          >
            {generatingPrompts ? 'Generating Prompts...' : 'Generate Prompts'}
          </Button>

          <Button
            variant="contained"
            onClick={handleGenerateVideos}
            disabled={isGenerateVideosDisabled}
            startIcon={generatingVideos ? <CircularProgress size={20} /> : <Refresh />}
          >
            {generatingVideos ? 'Generating Videos...' : 'Generate Videos'}
          </Button>

          <Button
            variant="outlined"
            onClick={() => setTestMode(!testMode)}
            color={testMode ? 'success' : 'primary'}
            disabled={loading}
          >
            {testMode ? 'Test Mode: ON' : 'Test Mode: OFF'}
          </Button>

          <Button
            variant="outlined"
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            disabled={loading}
          >
            {showDiagnostics ? 'Hide Diagnostics' : 'Show Diagnostics'}
          </Button>
        </Box>

        {prompts.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Generated Prompts
            </Typography>
            <List>
              {prompts.map((prompt, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={`Images ${prompt.fromImage} → ${prompt.toImage}`}
                    secondary={prompt.text}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {videos.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Generated Videos
            </Typography>
            <List>
              {videos.map((url, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={`Video ${index + 1}`}
                    secondary={url}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => handleDownload(url, index)}
                      disabled={loading}
                    >
                      <Download />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {showDiagnostics && diagnosticInfo && (
          <Paper sx={{ mt: 3, p: 2, backgroundColor: '#f5f5f5' }}>
            <Typography variant="h6" gutterBottom>
              Diagnostic Information
            </Typography>
            <pre style={{ 
              whiteSpace: 'pre-wrap', 
              wordWrap: 'break-word',
              fontSize: '0.875rem',
              fontFamily: 'monospace'
            }}>
              {JSON.stringify(diagnosticInfo, null, 2)}
            </pre>
          </Paper>
        )}

        {prompt && (
          <>
            <Typography variant="h6">Generated Prompt:</Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{prompt}</Typography>
            
            <TextField
              label="FAL API Key"
              value={falApiKey}
              onChange={(e) => setFalApiKey(e.target.value)}
              type="password"
              fullWidth
            />

            <Button
              variant="contained"
              onClick={handleGenerateVideo}
              disabled={!prompt || !falApiKey || generatingVideos}
              startIcon={generatingVideos ? <CircularProgress size={20} /> : null}
            >
              {generatingVideos ? 'Generating Video...' : 'Generate Video'}
            </Button>
          </>
        )}

        {videoUrl && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6">Generated Video:</Typography>
            <video controls src={videoUrl} style={{ width: '100%', maxWidth: '100%' }} />
          </Box>
        )}

        {(prompt || videoUrl) && (
          <Button variant="outlined" onClick={handleReset}>
            Start Over
          </Button>
        )}
      </Paper>
    </Box>
  );
} 