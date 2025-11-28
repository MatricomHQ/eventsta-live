
import React from 'react';
import { FileText, ImageIcon, MusicIcon, YoutubeIcon } from './Icons';
import { ProfileSection } from '../types';

interface AddSectionBarProps {
  onAddSection: (type: ProfileSection['type']) => void;
}

const AddSectionBar: React.FC<AddSectionBarProps> = ({ onAddSection }) => {
  const buttonClasses = "flex flex-col items-center justify-center h-20 w-20 rounded-xl bg-neutral-800/80 backdrop-blur-sm text-neutral-300 hover:bg-purple-600 hover:text-white transition-all duration-200";

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center space-x-4 p-2 bg-neutral-900/50 border border-neutral-700 rounded-2xl shadow-2xl shadow-black/50">
        <button onClick={() => onAddSection('TEXT')} className={buttonClasses} title="Add Text Section">
          <FileText className="w-6 h-6 mb-1" />
          <span className="text-xs font-semibold">Text</span>
        </button>
        <button onClick={() => onAddSection('GALLERY')} className={buttonClasses} title="Add Image Gallery">
          <ImageIcon className="w-6 h-6 mb-1" />
          <span className="text-xs font-semibold">Gallery</span>
        </button>
        <button onClick={() => onAddSection('SOUNDCLOUD')} className={buttonClasses} title="Add SoundCloud Embed">
          <MusicIcon className="w-6 h-6 mb-1" />
          <span className="text-xs font-semibold">SoundCloud</span>
        </button>
        <button onClick={() => onAddSection('YOUTUBE')} className={buttonClasses} title="Add YouTube Video">
          <YoutubeIcon className="w-6 h-6 mb-1" />
          <span className="text-xs font-semibold">YouTube</span>
        </button>
      </div>
    </div>
  );
};

export default AddSectionBar;
