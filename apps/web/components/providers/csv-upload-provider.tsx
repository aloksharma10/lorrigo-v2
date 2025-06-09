'use client';

import type React from 'react';

import { createContext, useContext, useEffect, useState } from 'react';

type CSVUploadStatus = {
  isUploading: boolean;
  progress: number;
  startTime?: number;
};

type CSVUploadContextType = {
  uploadStatus: CSVUploadStatus;
  checkForExistingUpload: () => void;
};

const CSVUploadContext = createContext<CSVUploadContextType>({
  uploadStatus: { isUploading: false, progress: 0 },
  checkForExistingUpload: () => {},
});

export function CSVUploadProvider({ children }: { children: React.ReactNode }) {
  const [uploadStatus, setUploadStatus] = useState<CSVUploadStatus>({
    isUploading: false,
    progress: 0,
  });

  // Check for existing uploads in localStorage
  const checkForExistingUpload = () => {
    const savedProgress = localStorage.getItem('csvUploadProgress');
    if (savedProgress) {
      try {
        const progress = JSON.parse(savedProgress);
        if (progress.status === 'processing') {
          setUploadStatus({
            isUploading: true,
            progress: 0,
            startTime: progress.startTime,
          });
        }
      } catch (error) {
        console.error('Error parsing saved progress:', error);
        localStorage.removeItem('csvUploadProgress');
      }
    }
  };

  // Check for existing uploads on mount
  useEffect(() => {
    checkForExistingUpload();
  }, []);

  // Simulate progress updates when uploading
  useEffect(() => {
    if (uploadStatus.isUploading) {
      const interval = setInterval(() => {
        setUploadStatus((prev) => {
          const newProgress = prev.progress + (100 - prev.progress) * 0.1;
          return {
            ...prev,
            progress: newProgress > 99 ? 99 : newProgress,
          };
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [uploadStatus.isUploading]);

  return (
    <CSVUploadContext.Provider value={{ uploadStatus, checkForExistingUpload }}>
      {children}
    </CSVUploadContext.Provider>
  );
}

export const useCSVUpload = () => useContext(CSVUploadContext);
