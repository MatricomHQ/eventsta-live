

import React from 'react';
import { ProfileSection } from '../types';
import { TrashIcon, GripVerticalIcon } from './Icons';
import ImageGalleryEditor from './ImageGalleryEditor';

interface SectionEditorProps {
    section: ProfileSection;
    onUpdate: (section: ProfileSection) => void;
    onDelete: (id: string) => void;
}

const SectionEditor: React.FC<SectionEditorProps> = ({ section, onUpdate, onDelete }) => {
    
    const handleContentChange = (field: string, value: any) => {
        onUpdate({
            ...section,
            content: {
                ...section.content,
                [field]: value
            }
        });
    };
    
    const renderEditorContent = () => {
        switch (section.type) {
            case 'TEXT':
                return (
                    <div className="space-y-4">
                        <input
                            type="text"
                            value={section.content.title || ''}
                            onChange={(e) => handleContentChange('title', e.target.value)}
                            placeholder="Section Title"
                            className="w-full text-xl font-bold bg-transparent text-white focus:outline-none"
                        />
                        <textarea
                            value={section.content.body || ''}
                            onChange={(e) => handleContentChange('body', e.target.value)}
                            placeholder="Tell your story..."
                            rows={6}
                            className="w-full bg-transparent text-neutral-300 focus:outline-none resize-none"
                        />
                    </div>
                );
            case 'GALLERY':
                return (
                     <ImageGalleryEditor
                        images={section.content.images || []}
                        onImagesChange={(newImages) => handleContentChange('images', newImages)}
                    />
                );
            case 'SOUNDCLOUD':
            case 'YOUTUBE':
                 return (
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-400">
                           {section.type === 'SOUNDCLOUD' ? 'SoundCloud Embed URL' : 'YouTube Video URL'}
                        </label>
                        <input
                            type="text"
                            value={section.content.url || ''}
                            onChange={(e) => handleContentChange('url', e.target.value)}
                            placeholder={section.type === 'YOUTUBE' ? 'e.g., https://www.youtube.com/embed/VIDEO_ID' : 'e.g., https://w.soundcloud.com/player/?url=...'}
                            className="w-full h-10 px-3 bg-neutral-700 border border-neutral-600 rounded-md text-white"
                        />
                         <p className="text-xs text-neutral-500">
                           {section.type === 'YOUTUBE' ? 'Please use the embed URL from YouTube\'s "Share" option.' : 'Please use the embed code URL from SoundCloud\'s "Share" option.'}
                        </p>
                    </div>
                );
            default:
                return null;
        }
    };
    
    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl flex gap-4 transition-colors hover:border-neutral-700">
            <div className="p-4 cursor-grab text-neutral-500 hover:text-white transition-colors flex-shrink-0">
                <GripVerticalIcon className="w-6 h-6"/>
            </div>
            <div className="flex-grow p-6">
                 {renderEditorContent()}
            </div>
             <div className="p-4 flex-shrink-0">
                <button onClick={() => onDelete(section.id)} className="p-2 text-neutral-500 hover:text-red-400 transition-colors" title="Delete Section">
                    <TrashIcon className="w-5 h-5"/>
                </button>
            </div>
        </div>
    );
};

export default SectionEditor;