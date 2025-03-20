import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

interface ImageUploaderProps {
  onUpload: (file: File) => void;
  preview: string | null;
  label: string;
}

export default function ImageUploader({ onUpload, preview, label }: ImageUploaderProps) {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: 200,
        border: '2px dashed #ccc',
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#f5f5f5'
      }}
    >
      {preview ? (
        <img
          src={preview}
          alt={label}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
      ) : (
        <>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer'
            }}
          />
          <CloudUploadIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
          <Typography variant="body1" color="text.secondary">
            {label}
          </Typography>
          <Button variant="text" sx={{ mt: 1 }}>
            Choose File
          </Button>
        </>
      )}
    </Box>
  );
} 