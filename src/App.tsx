import { Container, CssBaseline, ThemeProvider, createTheme, Typography, Box } from '@mui/material';
import { AppProvider } from './context/AppContext';
import ImageUploader from './components/ImageUploader';
import { VideoGenerator } from './components/VideoGenerator';

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

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppProvider>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Bar Mitzvah Time-Lapse Video Generator
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Upload your images, arrange them in order, and generate a time-lapse video
            </Typography>
          </Box>
          <ImageUploader />
          <VideoGenerator />
        </Container>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App; 