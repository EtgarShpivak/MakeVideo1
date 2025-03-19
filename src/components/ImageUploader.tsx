import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Paper,
  Typography,
  Grid,
  IconButton,
  Card,
  CardMedia,
  CardContent,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useApp } from '../context/AppContext';

const ImageUploader: React.FC = () => {
  const { images, addImage, removeImage, reorderImages } = useApp();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newImages = acceptedFiles.map((file, index) => ({
      file,
      preview: URL.createObjectURL(file),
      order: images.length + index,
    }));
    newImages.forEach(addImage);
  }, [images.length, addImage]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png']
    },
    maxFiles: 50,
  });

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (dragIndex !== dropIndex) {
      reorderImages(dragIndex, dropIndex);
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Upload Images
      </Typography>
      <Box
        {...getRootProps()}
        sx={{
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.300',
          borderRadius: 1,
          p: 3,
          textAlign: 'center',
          cursor: 'pointer',
          mb: 3,
          '&:hover': {
            borderColor: 'primary.main',
          },
        }}
      >
        <input {...getInputProps()} />
        <Typography>
          {isDragActive
            ? 'Drop the images here...'
            : 'Drag and drop images here, or click to select files'}
        </Typography>
      </Box>

      {images.length > 0 && (
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            Selected Images ({images.length})
          </Typography>
          <Grid container spacing={2}>
            {images.map((image, index) => (
              <Grid item xs={12} sm={6} md={4} key={image.preview}>
                <Card
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  sx={{
                    cursor: 'move',
                    '&:hover': {
                      boxShadow: 3,
                    },
                    position: 'relative',
                  }}
                >
                  <CardMedia
                    component="img"
                    height="200"
                    image={image.preview}
                    alt={`Image ${index + 1}`}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 10,
                      left: 10,
                      bgcolor: 'primary.main',
                      color: 'white',
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      zIndex: 1,
                    }}
                  >
                    {index + 1}
                  </Box>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        {image.file.name}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => removeImage(index)}
                        sx={{ color: 'error.main' }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Paper>
  );
};

export default ImageUploader; 