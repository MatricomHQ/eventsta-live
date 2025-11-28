
import React, { useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { PlusIcon, TrashIcon, GripVerticalIcon } from './Icons';
import * as api from '../services/api';

interface ImageItem {
  id: string;
  url: string; // Remote URL
}

interface UploadingFile {
  id: string;
  name: string;
  progress: number;
}

interface ImageGalleryEditorProps {
  images: string[];
  onImagesChange: (newImages: string[]) => void;
}

const ImageGalleryEditor: React.FC<ImageGalleryEditorProps> = ({ images, onImagesChange }) => {
  const [galleryImages, setGalleryImages] = useState<ImageItem[]>(() =>
    images.map(url => ({ id: uuidv4(), url }))
  );
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = Array.from(event.target.files || []);
    if (!files.length) return;

    // Create placeholders for progress
    const newUploads: UploadingFile[] = files.map(file => ({
        id: uuidv4(),
        name: file.name,
        progress: 10,
    }));
    setUploadingFiles(prev => [...prev, ...newUploads]);

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uploadId = newUploads[i].id;
        
        try {
            // Upload to server
            const uploadedUrl = await api.uploadFile(file);
            
            const newImage = { id: uuidv4(), url: uploadedUrl };

            // Update internal state
            setGalleryImages(prev => {
                const updated = [...prev, newImage];
                // Update parent state with all URLs
                onImagesChange(updated.map(img => img.url));
                return updated;
            });

        } catch (error) {
            console.error("Error uploading file:", error);
            alert(`Failed to upload ${file.name}`);
        } finally {
            // Remove from uploading list
            setUploadingFiles(prev => prev.filter(f => f.id !== uploadId));
        }
    }
     // Reset file input
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleDelete = (idToDelete: string) => {
    const newGalleryImages = galleryImages.filter(img => img.id !== idToDelete);
    setGalleryImages(newGalleryImages);
    onImagesChange(newGalleryImages.map(img => img.url));
  };

  const handleDragSort = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;

    const newGalleryImages = [...galleryImages];
    const draggedItemContent = newGalleryImages.splice(dragItem.current, 1)[0];
    newGalleryImages.splice(dragOverItem.current, 0, draggedItemContent);
    
    dragItem.current = null;
    dragOverItem.current = null;

    setGalleryImages(newGalleryImages);
    onImagesChange(newGalleryImages.map(img => img.url));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {galleryImages.map((image, index) => (
          <div
            key={image.id}
            className="relative group aspect-video bg-neutral-800 rounded-lg overflow-hidden"
            draggable
            onDragStart={() => dragItem.current = index}
            onDragEnter={() => dragOverItem.current = index}
            onDragEnd={handleDragSort}
            onDragOver={(e) => e.preventDefault()}
          >
            <img src={image.url} alt={`Event image ${index + 1}`} className="w-full h-full object-cover"/>
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center space-x-2">
               <button
                onClick={() => handleDelete(image.id)}
                className="w-8 h-8 rounded-full bg-red-600/80 hover:bg-red-600 text-white flex items-center justify-center"
                title="Delete Image"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
               <div className="p-2 text-white cursor-grab" title="Drag to reorder">
                 <GripVerticalIcon className="w-5 h-5"/>
               </div>
            </div>
          </div>
        ))}
         <button
            onClick={() => fileInputRef.current?.click()}
            className="aspect-video w-full bg-neutral-800/50 rounded-lg border-2 border-dashed border-neutral-700 hover:border-purple-500 transition-colors flex flex-col items-center justify-center text-neutral-400 hover:text-white"
            >
            <PlusIcon className="w-8 h-8 mb-2" />
            <span className="text-sm font-semibold">Add Image</span>
        </button>
        <input
            type="file"
            multiple
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
        />
      </div>
      
      {uploadingFiles.length > 0 && (
          <div className="space-y-3 mt-4">
              {uploadingFiles.map(file => (
                  <div key={file.id} className="text-white">
                      <p className="text-xs text-neutral-400 truncate mb-1">{file.name}</p>
                      <div className="w-full bg-neutral-700 rounded-full h-2 overflow-hidden">
                           <div 
                                className="bg-purple-600 h-full rounded-full animate-pulse" 
                                style={{ width: '100%' }}
                           ></div>
                      </div>
                  </div>
              ))}
          </div>
      )}
    </div>
  );
};

export default ImageGalleryEditor;
