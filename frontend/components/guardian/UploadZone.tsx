"use client";

import React, { useState } from 'react';
import { UploadCloud, File } from 'lucide-react';

interface UploadZoneProps {
  onUpload: (file: File) => Promise<void>;
}

export default function UploadZone({ onUpload }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      startUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      e.target.value = "";
      startUpload(file);
    }
  };

  const startUpload = async (file: File) => {
    setIsUploading(true);
    setProgress(20);
    try {
      setProgress(65);
      await onUpload(file);
      setProgress(100);
    } catch {
      setProgress(0);
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setProgress(0);
      }, 350);
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`relative w-full h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-colors duration-200 ${
        isDragging ? 'border-primary bg-[rgba(229,229,229,0.05)]' : 'border-outline-variant bg-surface-container-lowest hover:bg-surface-container'
      }`}
    >
      <input 
        type="file" 
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
        onChange={handleFileChange} 
        disabled={isUploading}
        accept=".pdf"
      />
      
      {isUploading ? (
        <div className="flex flex-col items-center w-64">
          <File className="w-10 h-10 text-primary mb-3 animate-pulse" />
          <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-200 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="mt-2 text-sm text-on-surface-variant font-medium">Scanning document {progress}%...</span>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center">
          <UploadCloud className={`w-12 h-12 mb-3 ${isDragging ? 'text-primary' : 'text-outline'}`} />
          <h3 className="text-on-surface font-bold mb-1">Upload Vendor Submittal</h3>
          <p className="text-on-surface-variant text-sm">Drag and drop PDF, or click to browse</p>
        </div>
      )}
    </div>
  );
}
