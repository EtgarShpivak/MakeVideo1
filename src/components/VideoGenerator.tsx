import React, { useState, useCallback } from 'react';
import { Box, Button, TextField, Typography, Paper, CircularProgress, Grid, Alert, IconButton, List, ListItem, ListItemText, ListItemSecondaryAction } from '@mui/material';
import { CloudUpload, Delete, Download, Refresh } from '@mui/icons-material';
import { generateVideo, generatePrompt } from '../api/falService';

interface Prompt {
  fromImage: number;
  toImage: number;
  text: string;
}

interface ButtonProps {
  component: React.ElementType;
}

export const VideoGenerator: React.FC = () => {
  const [images, setImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claudeApiKey, setClaudeApiKey] = useState('');
  const [falApiKey, setFalApiKey] = useState('');
  const [testMode, setTestMode] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticInfo, setDiagnosticInfo] = useState<any>(null);

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 50) {
      setError('Maximum 50 images allowed');
      return;
    }
    setImages(files);
    setImageUrls(files.map(file => URL.createObjectURL(file)));
    setError(null);
  }, []);

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImageUrls(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

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
        const prompt = await generatePrompt(images[i], images[i + 1], claudeApiKey);
        newPrompts.push({
          fromImage: i + 1,
          toImage: i + 2,
          text: prompt
        });
      }
      setPrompts(newPrompts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate prompts');
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

        const videoUrl = await generateVideo(
          images[i],
          images[i + 1],
          prompt,
          falApiKey,
          testMode
        );
        newVideos.push(videoUrl);
      }
      setVideos(newVideos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate videos');
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
      <Typography variant="h4" gutterBottom>
        Video Generator
      </Typography>

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

        <Box sx={{ mt: 2 }}>
          <input
            accept="image/*"
            style={{ display: 'none' }}
            id="image-upload"
            multiple
            type="file"
            onChange={handleImageUpload}
          />
          <label htmlFor="image-upload">
            <Button
              variant="contained"
              component="span"
              startIcon={<CloudUpload />}
            >
              Upload Images (2-50)
            </Button>
          </label>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {imageUrls.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Uploaded Images ({imageUrls.length})
            </Typography>
            <Grid container spacing={2}>
              {imageUrls.map((url, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Paper sx={{ p: 1, position: 'relative' }}>
                    <img
                      src={url}
                      alt={`Upload ${index + 1}`}
                      style={{ width: '100%', height: 'auto' }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => removeImage(index)}
                      sx={{ position: 'absolute', top: 4, right: 4 }}
                    >
                      <Delete />
                    </IconButton>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            onClick={handleGeneratePrompts}
            disabled={loading || images.length < 2}
            startIcon={loading ? <CircularProgress size={20} /> : <Refresh />}
          >
            Make Prompts
          </Button>

          <Button
            variant="contained"
            onClick={handleGenerateVideos}
            disabled={loading || prompts.length === 0}
            startIcon={loading ? <CircularProgress size={20} /> : <Refresh />}
          >
            Make Videos
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
          <Box sx={{ mt: 2 }}>
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
          <Box sx={{ mt: 2 }}>
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
          <Box sx={{ mt: 2 }}>
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