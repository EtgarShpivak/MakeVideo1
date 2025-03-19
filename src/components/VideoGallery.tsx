import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  CircularProgress,
  Card,
  CardMedia,
  CardActions,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { useApp } from '../context/AppContext';
import { generateVideo, generatePrompt } from '../api/falApi';
import JSZip from 'jszip';

const VideoGallery: React.FC = () => {
  const { images, videos, addVideo, updateVideo } = useApp();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleGenerateVideos = async () => {
    if (images.length < 2) {
      alert('Please upload at least 2 images to generate videos.');
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    try {
      for (let i = 0; i < images.length - 1; i++) {
        const startImage = images[i].preview;
        const finalImage = images[i + 1].preview;
        const prompt = generatePrompt(startImage, finalImage);

        const videoId = videos.length + i;
        addVideo({
          id: videoId,
          url: '',
          status: 'processing',
        });

        try {
          const response = await generateVideo({
            startImage,
            finalImage,
            prompt,
          });

          updateVideo(videoId, {
            url: response.videoUrl,
            status: 'completed',
          });
        } catch (error) {
          console.error(`Error generating video ${i + 1}:`, error);
          updateVideo(videoId, {
            status: 'error',
          });
        }

        setProgress(((i + 1) / (images.length - 1)) * 100);
      }
    } catch (error) {
      console.error('Error in video generation process:', error);
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const handleDownloadVideo = async (videoId: number) => {
    const video = videos.find(v => v.id === videoId);
    if (!video || video.status !== 'completed') return;

    try {
      const response = await fetch(video.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `video_${videoId}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading video:', error);
      alert('Failed to download video. Please try again.');
    }
  };

  const handleDownloadAll = async () => {
    if (videos.length === 0) return;

    try {
      const zip = new JSZip();
      const completedVideos = videos.filter(v => v.status === 'completed');

      for (const video of completedVideos) {
        const response = await fetch(video.url);
        const blob = await response.blob();
        zip.file(`video_${video.id}.mp4`, blob);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'all_videos.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error creating ZIP file:', error);
      alert('Failed to create ZIP file. Please try again.');
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Generated Videos
      </Typography>

      {!isGenerating && videos.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="text.secondary" gutterBottom>
            No videos generated yet. Upload images and click generate to create your time-lapse videos.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={handleGenerateVideos}
            disabled={images.length < 2}
          >
            Generate Videos
          </Button>
        </Box>
      )}

      {isGenerating && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress variant="determinate" value={progress} />
          <Typography sx={{ mt: 2 }}>
            Generating videos... {Math.round(progress)}%
          </Typography>
        </Box>
      )}

      {videos.length > 0 && (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {videos.map((video) => (
              <Grid item xs={12} sm={6} md={4} key={video.id}>
                <Card>
                  <CardMedia
                    component="video"
                    height="200"
                    image={video.url}
                    controls
                    sx={{ bgcolor: 'black' }}
                  />
                  <CardActions>
                    <Button
                      startIcon={<DownloadIcon />}
                      onClick={() => handleDownloadVideo(video.id)}
                      disabled={video.status !== 'completed'}
                    >
                      {video.status === 'completed' ? 'Download' : 'Processing...'}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
          <Box sx={{ textAlign: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadAll}
              disabled={!videos.some(v => v.status === 'completed')}
            >
              Download All as ZIP
            </Button>
          </Box>
        </>
      )}
    </Paper>
  );
};

export default VideoGallery; 