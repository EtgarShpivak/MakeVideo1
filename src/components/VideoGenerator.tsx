import React, { useState } from 'react';
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

export const VideoGenerator: React.FC = () => {
  const { images } = useApp();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claudeApiKey, setClaudeApiKey] = useState('');
  const [falApiKey, setFalApiKey] = useState('');
  const [testMode, setTestMode] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticInfo, setDiagnosticInfo] = useState<any>(null);

  const handleGeneratePrompts = async () => {
    if (!claudeApiKey) {
      setError('Please enter your Claude API key');
      return;
    }

    if (images.length < 2) {
      setError('Please upload at least 2 images');
      return;
    }

    setLoading(true);
    setError(null);
    setDiagnosticInfo(null);

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
      console.error('Error generating prompts:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate prompts');
      if (showDiagnostics) {
        setDiagnosticInfo({
          error: err,
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined
        });
      }
    } finally {
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

    setLoading(true);
    setError(null);
    setDiagnosticInfo(null);

    try {
      const newVideos: string[] = [];
      for (let i = 0; i < images.length - 1; i++) {
        const prompt = prompts.find(p => p.fromImage === i + 1 && p.toImage === i + 2)?.text;
        if (!prompt) continue;

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
      console.error('Error generating videos:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate videos');
      if (showDiagnostics) {
        setDiagnosticInfo({
          error: err,
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (url: string, index: number) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `video-${index + 1}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

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
            />
          </Grid>
        </Grid>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            onClick={handleGeneratePrompts}
            disabled={loading || images.length < 2}
            startIcon={loading ? <CircularProgress size={20} /> : <Refresh />}
          >
            Generate Prompts
          </Button>

          <Button
            variant="contained"
            onClick={handleGenerateVideos}
            disabled={loading || prompts.length === 0}
            startIcon={loading ? <CircularProgress size={20} /> : <Refresh />}
          >
            Generate Videos
          </Button>

          <Button
            variant="outlined"
            onClick={() => setTestMode(!testMode)}
            color={testMode ? 'success' : 'primary'}
          >
            {testMode ? 'Test Mode: ON' : 'Test Mode: OFF'}
          </Button>

          <Button
            variant="outlined"
            onClick={() => setShowDiagnostics(!showDiagnostics)}
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
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Diagnostic Information
            </Typography>
            <pre style={{ overflow: 'auto', maxHeight: '200px' }}>
              {JSON.stringify(diagnosticInfo, null, 2)}
            </pre>
          </Box>
        )}
      </Paper>
    </Box>
  );
}; 