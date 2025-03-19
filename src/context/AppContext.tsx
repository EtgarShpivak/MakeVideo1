import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Image {
  file: File;
  preview: string;
  order: number;
}

interface Video {
  id: number;
  url: string;
  status: 'processing' | 'completed' | 'error';
}

interface AppContextType {
  images: Image[];
  videos: Video[];
  setImages: (images: Image[]) => void;
  setVideos: (videos: Video[]) => void;
  addImage: (image: Image) => void;
  removeImage: (index: number) => void;
  reorderImages: (dragIndex: number, dropIndex: number) => void;
  addVideo: (video: Video) => void;
  updateVideo: (id: number, updates: Partial<Video>) => void;
  removeVideo: (id: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [images, setImages] = useState<Image[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);

  const addImage = (image: Image) => {
    setImages(prev => [...prev, image]);
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      const newImages = [...prev];
      newImages.splice(index, 1);
      return newImages.map((img, i) => ({ ...img, order: i }));
    });
  };

  const reorderImages = (dragIndex: number, dropIndex: number) => {
    setImages(prev => {
      const newImages = [...prev];
      const [draggedImage] = newImages.splice(dragIndex, 1);
      newImages.splice(dropIndex, 0, draggedImage);
      return newImages.map((img, i) => ({ ...img, order: i }));
    });
  };

  const addVideo = (video: Video) => {
    setVideos(prev => [...prev, video]);
  };

  const updateVideo = (id: number, updates: Partial<Video>) => {
    setVideos(prev =>
      prev.map(video =>
        video.id === id ? { ...video, ...updates } : video
      )
    );
  };

  const removeVideo = (id: number) => {
    setVideos(prev => prev.filter(video => video.id !== id));
  };

  return (
    <AppContext.Provider
      value={{
        images,
        videos,
        setImages,
        setVideos,
        addImage,
        removeImage,
        reorderImages,
        addVideo,
        updateVideo,
        removeVideo,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}; 