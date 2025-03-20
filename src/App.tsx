import React, { useState, useCallback } from 'react';
import { Container, CssBaseline, ThemeProvider, createTheme, Typography, Box, Paper } from '@mui/material';
import { AppProvider } from './context/AppContext';
import ImageUploader from './components/ImageUploader';
import VideoGenerator from './components/VideoGenerator';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

export default function App() {
  const [image1, setImage1] = useState<string | null>(null);
  const [image2, setImage2] = useState<string | null>(null);

  const handleImageUpload = useCallback((file: File, index: number) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        if (index === 0) {
          setImage1(reader.result);
        } else {
          setImage2(reader.result);
        }
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleReset = useCallback(() => {
    setImage1(null);
    setImage2(null);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppProvider>
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Childhood Transition Video Generator
          </Typography>

          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Upload Images
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <ImageUploader
                onUpload={(file) => handleImageUpload(file, 0)}
                preview={image1}
                label="First Image"
              />
              <ImageUploader
                onUpload={(file) => handleImageUpload(file, 1)}
                preview={image2}
                label="Second Image"
              />
            </Box>
          </Paper>

          {image1 && image2 && (
            <VideoGenerator
              image1={image1}
              image2={image2}
              onReset={handleReset}
            />
          )}
        </Container>
      </AppProvider>
    </ThemeProvider>
  );
} 