import React, { useState, useCallback } from 'react';
import { Box, Button, TextField, Typography, Paper, CircularProgress, Grid, Alert } from '@mui/material';
import { Download } from '@mui/icons-material';
import { generateVideo, generatePrompt } from '../api/falService';

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

interface VideoGeneratorProps {
  image1: string | null;
  image2: string | null;
  onReset: () => void;
}

export default function VideoGenerator({ image1, image2, onReset }: VideoGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claudeApiKey, setClaudeApiKey] = useState('');
  const [falApiKey, setFalApiKey] = useState('');
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
    if (!prompt || !falApiKey || !image1 || !image2) {
      setError('Please generate a prompt and provide a FAL API key first');
      return;
    }

    setError('');
    setGeneratingVideos(true);
    try {
      const response = await generateVideo(prompt, image1, image2, falApiKey);
      setVideoUrl(response.url);
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
            onClick={handleGeneratePrompt}
            disabled={!image1 || !image2 || !claudeApiKey || generatingPrompts}
            startIcon={generatingPrompts ? <CircularProgress size={20} /> : null}
          >
            {generatingPrompts ? 'Generating Prompt...' : 'Generate Prompt'}
          </Button>
        </Box>

        {prompt && (
          <>
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6">Generated Prompt:</Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mt: 1, mb: 3 }}>
                {prompt}
              </Typography>

              <Button
                variant="contained"
                onClick={handleGenerateVideo}
                disabled={!prompt || !falApiKey || generatingVideos}
                startIcon={generatingVideos ? <CircularProgress size={20} /> : null}
              >
                {generatingVideos ? 'Generating Video...' : 'Generate Video'}
              </Button>
            </Box>
          </>
        )}

        {videoUrl && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6">Generated Video:</Typography>
            <video 
              controls 
              src={videoUrl} 
              style={{ width: '100%', maxWidth: '100%', marginTop: '16px' }} 
            />
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={() => {
                const a = document.createElement('a');
                a.href = videoUrl;
                a.download = 'generated-video.mp4';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }}
              sx={{ mt: 2 }}
            >
              Download Video
            </Button>
          </Box>
        )}

        {(prompt || videoUrl) && (
          <Button 
            variant="outlined" 
            onClick={handleReset}
            sx={{ mt: 3 }}
          >
            Start Over
          </Button>
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
      </Paper>
    </Box>
  );
} 