
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { CompetitionForm, FormElement, FormElementType } from '../types';
import * as api from '../services/api';
import { 
    TypeIcon, ListIcon, ImagePlusIcon, EyeIcon, 
    GripHorizontalIcon, TrashIcon, CheckCircleIcon, PlusIcon,
    FileText, UploadCloudIcon, LinkIcon, ArrowRightIcon
} from './Icons';

interface FormBuilderProps {
    form: CompetitionForm;
    onSave: (form: CompetitionForm) => void;
    onCancel: () => void;
}

const FormBuilder: React.FC<FormBuilderProps> = ({ form: initialForm, onSave, onCancel }) => {
    const [form, setForm] = useState<CompetitionForm>(initialForm);
    const [activeElementId, setActiveElementId] = useState<string | null>(null);
    const [headerImagePreview, setHeaderImagePreview] = useState<string | null>(initialForm.headerImageUrl || null);
    const [isSaving, setIsSaving] = useState(false);
    const [isHeaderUploading, setIsHeaderUploading] = useState(false);
    const headerInputRef = useRef<HTMLInputElement>(null);
    const [copySuccess, setCopySuccess] = useState(false);

    // Editable Refs
    const titleRef = useRef<HTMLHeadingElement>(null);
    const descRef = useRef<HTMLDivElement>(null);

    // Refs for Drag and Drop
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    const handleHeaderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 1. Instant Preview with Object URL
        const objectUrl = URL.createObjectURL(file);
        setHeaderImagePreview(objectUrl);
        setIsHeaderUploading(true);

        try {
            // 2. Upload in background
            const uploadedUrl = await api.uploadFile(file);
            
            // 3. Update form state with remote URL
            setForm(prev => ({ ...prev, headerImageUrl: uploadedUrl }));
        } catch (error) {
            console.error("Header image upload failed", error);
            alert("Failed to upload image. Please try again.");
        } finally {
            setIsHeaderUploading(false);
            // Reset input so same file can be selected again if needed
            if (headerInputRef.current) {
                headerInputRef.current.value = '';
            }
        }
    };

    const addElement = (type: FormElementType) => {
        const newElement: FormElement = {
            id: uuidv4(),
            type,
            label: type === 'SHORT_TEXT' ? 'Short Answer' : 
                   type === 'LONG_TEXT' ? 'Paragraph' : 
                   type === 'SINGLE_CHOICE' ? 'Multiple Choice' : 'Checkboxes',
            required: false,
            options: (type === 'SINGLE_CHOICE' || type === 'MULTIPLE_CHOICE') 
                ? [{ id: uuidv4(), label: 'Option 1' }, { id: uuidv4(), label: 'Option 2' }] 
                : undefined
        };
        setForm(prev => ({ ...prev, elements: [...prev.elements, newElement] }));
        setActiveElementId(newElement.id);
        
        // Scroll to bottom of form container
        setTimeout(() => {
            const container = document.getElementById('form-elements-container');
            if (container) container.scrollTop = container.scrollHeight;
        }, 100);
    };

    const updateElement = (id: string, updates: Partial<FormElement>) => {
        setForm(prev => ({
            ...prev,
            elements: prev.elements.map(el => el.id === id ? { ...el, ...updates } : el)
        }));
    };

    const deleteElement = (id: string) => {
        setForm(prev => ({
            ...prev,
            elements: prev.elements.filter(el => el.id !== id)
        }));
        if (activeElementId === id) setActiveElementId(null);
    };

    const handleDragStart = (index: number) => {
        dragItem.current = index;
    };

    const handleDragEnter = (index: number) => {
        dragOverItem.current = index;
    };

    const handleDragEnd = () => {
        if (dragItem.current === null || dragOverItem.current === null) return;
        const newElements = [...form.elements];
        const draggedItem = newElements.splice(dragItem.current, 1)[0];
        newElements.splice(dragOverItem.current, 0, draggedItem);
        setForm(prev => ({ ...prev, elements: newElements }));
        dragItem.current = null;
        dragOverItem.current = null;
    };

    const handleSave = async () => {
        if (isHeaderUploading) {
            alert("Please wait for image upload to complete.");
            return;
        }

        setIsSaving(true);
        
        // Capture content from refs safely using optional chaining.
        const currentTitle = titleRef.current?.innerText ?? form.title;
        const currentDesc = descRef.current?.innerHTML ?? form.description;
        
        const finalForm = {
            ...form,
            title: currentTitle,
            description: currentDesc
        };

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        onSave(finalForm);
        
        // Only update state if component is still mounted (implied by ref presence)
        if (titleRef.current) {
            setIsSaving(false);
        }
    };

    const copyPublicLink = () => {
        const url = `${window.location.origin}/#/form/${form.id}`;
        navigator.clipboard.writeText(url);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black text-white animate-fade-in">
            {/* Header Toolbar */}
            <div className="h-16 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between px-6 flex-shrink-0 z-50 relative shadow-lg">
                <div className="flex items-center gap-4">
                    <button onClick={onCancel} className="text-neutral-400 hover:text-white text-sm font-medium transition-colors px-2 py-1 rounded hover:bg-neutral-800">
                        &larr; Exit Builder
                    </button>
                    <div className="h-6 w-px bg-neutral-700 hidden md:block"></div>
                    <span className="text-white font-bold text-lg hidden md:block">Form Studio</span>
                    {form.id && (
                        <>
                            <button onClick={copyPublicLink} className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-300 transition-colors border border-neutral-700">
                                {copySuccess ? <CheckCircleIcon className="w-3 h-3 text-green-400" /> : <LinkIcon className="w-3 h-3" />}
                                {copySuccess ? 'Link Copied' : 'Copy Link'}
                            </button>
                            <Link 
                                to={`/form/${form.id}`} 
                                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-300 transition-colors border border-neutral-700"
                            >
                                <EyeIcon className="w-3 h-3" />
                                View Public
                            </Link>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden lg:flex items-center text-xs text-neutral-500 mr-4">
                        <EyeIcon className="w-3 h-3 mr-1.5" /> Changes auto-save to draft
                    </div>
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving || isHeaderUploading}
                        className="bg-white hover:bg-neutral-200 text-black px-6 py-2 rounded-full text-sm font-bold transition-colors flex items-center gap-2 disabled:opacity-50 shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                    >
                        {isSaving ? 'Saving...' : isHeaderUploading ? 'Uploading...' : 'Save & Close'}
                    </button>
                </div>
            </div>

            <div className="flex flex-col flex-grow overflow-hidden relative">
                {/* Main Canvas (Top Section) */}
                <div className="flex-grow relative overflow-hidden bg-neutral-950 flex flex-col items-center">
                    {/* Scrollable Form Area */}
                    <div id="form-elements-container" className="w-full h-full overflow-y-auto custom-scrollbar relative">
                        
                        {/* Parallax Background Layer */}
                        <div className="absolute top-0 left-0 w-full h-[500px] z-0 pointer-events-none overflow-hidden">
                            {headerImagePreview && (
                                <div 
                                    className="absolute inset-0 bg-cover bg-center opacity-40 blur-3xl scale-110"
                                    style={{ backgroundImage: `url(${headerImagePreview})` }}
                                ></div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-neutral-950"></div>
                        </div>

                        <div className="relative z-10 max-w-3xl mx-auto py-8 md:py-12 px-4 md:px-8 min-h-full flex flex-col">
                            
                            {/* Form Card */}
                            <div className="bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden transition-all duration-500 mb-20">
                                
                                {/* Header Image Area */}
                                <div 
                                    className="relative w-full aspect-[3/1] bg-neutral-800/50 border-b border-white/5 overflow-hidden group cursor-pointer"
                                    onClick={() => headerInputRef.current?.click()}
                                >
                                    {headerImagePreview ? (
                                        <img src={headerImagePreview} alt="Header" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-500 group-hover:text-neutral-300 transition-colors">
                                            <ImagePlusIcon className="w-12 h-12 mb-2 opacity-50" />
                                            <span className="text-sm font-medium">Add Cover Image</span>
                                        </div>
                                    )}
                                    
                                    {/* Uploading Overlay */}
                                    {isHeaderUploading && (
                                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-20">
                                            <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin mb-2"></div>
                                            <span className="text-white text-xs font-bold uppercase tracking-wider">Uploading...</span>
                                        </div>
                                    )}

                                    {/* Hover Overlay (only when not uploading) */}
                                    {!isHeaderUploading && (
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                                            <span className="text-white font-medium flex items-center gap-2 px-4 py-2 bg-black/50 rounded-full backdrop-blur-md border border-white/10">
                                                <UploadCloudIcon className="w-5 h-5"/> Change Cover
                                            </span>
                                        </div>
                                    )}
                                    <input type="file" ref={headerInputRef} className="hidden" accept="image/*" onChange={handleHeaderUpload} />
                                </div>

                                <div className="p-6 md:p-12">
                                    {/* Editable Intro */}
                                    <div className="mb-12 text-center md:text-left border-b border-white/5 pb-8">
                                        <h1
                                            ref={titleRef}
                                            contentEditable
                                            suppressContentEditableWarning
                                            onBlur={(e) => {
                                                const newTitle = e.currentTarget.innerText;
                                                setForm(prev => ({ ...prev, title: newTitle }));
                                            }}
                                            className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight leading-tight outline-none border-b border-transparent hover:border-white/20 transition-colors empty:before:content-['Click_to_edit_title'] empty:before:text-neutral-600"
                                        >
                                            {form.title}
                                        </h1>
                                        <div
                                            ref={descRef}
                                            contentEditable
                                            suppressContentEditableWarning
                                            onBlur={(e) => {
                                                const newDesc = e.currentTarget.innerHTML;
                                                setForm(prev => ({ ...prev, description: newDesc }));
                                            }}
                                            className="text-base md:text-lg text-neutral-300 leading-relaxed outline-none border-b border-transparent hover:border-white/20 transition-colors min-h-[28px] empty:before:content-['Click_to_add_description...'] empty:before:text-neutral-600"
                                            dangerouslySetInnerHTML={{ __html: form.description }}
                                        />
                                    </div>

                                    {/* Elements List */}
                                    <div className="space-y-6 min-h-[100px]">
                                        {form.elements.length === 0 && (
                                            <div className="text-center py-12 border-2 border-dashed border-neutral-800 rounded-2xl bg-neutral-900/50">
                                                <p className="text-neutral-500">Your form is empty. Add fields from the toolbar below.</p>
                                            </div>
                                        )}
                                        {form.elements.map((element, index) => (
                                            <div 
                                                key={element.id}
                                                draggable
                                                onDragStart={() => handleDragStart(index)}
                                                onDragEnter={() => handleDragEnter(index)}
                                                onDragEnd={handleDragEnd}
                                                onDragOver={(e) => e.preventDefault()}
                                                onClick={() => setActiveElementId(element.id)}
                                                className={`relative p-6 rounded-2xl border-2 transition-all duration-200 cursor-pointer group ${
                                                    activeElementId === element.id 
                                                    ? 'bg-neutral-800 border-purple-500 shadow-lg shadow-purple-500/10 scale-[1.01]' 
                                                    : 'bg-neutral-800/30 border-transparent hover:border-neutral-700 hover:bg-neutral-800/50'
                                                }`}
                                            >
                                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 flex gap-2 transition-opacity bg-neutral-900/80 p-1 rounded-lg backdrop-blur-sm border border-white/10 z-10">
                                                    <div className="cursor-grab p-1.5 text-neutral-400 hover:text-white rounded"><GripHorizontalIcon className="w-4 h-4" /></div>
                                                    <button onClick={(e) => { e.stopPropagation(); deleteElement(element.id); }} className="p-1.5 text-neutral-400 hover:text-red-400 rounded"><TrashIcon className="w-4 h-4" /></button>
                                                </div>

                                                {/* Element Content */}
                                                <div className="pr-8">
                                                    {activeElementId === element.id ? (
                                                        <input 
                                                            type="text" 
                                                            value={element.label} 
                                                            onChange={(e) => updateElement(element.id, { label: e.target.value })}
                                                            className="w-full bg-transparent text-white font-bold text-lg border-b border-purple-500/50 focus:border-purple-500 focus:outline-none mb-4 pb-1"
                                                            autoFocus
                                                            placeholder="Question Label"
                                                        />
                                                    ) : (
                                                        <label className="block text-lg font-medium text-white mb-3">
                                                            {element.label} {element.required && <span className="text-purple-500">*</span>}
                                                        </label>
                                                    )}

                                                    {/* Input Preview */}
                                                    {element.type === 'SHORT_TEXT' && (
                                                        <div className="h-12 bg-neutral-900/50 rounded-xl border border-neutral-700 w-full px-4 flex items-center text-neutral-600 text-sm">Short Answer Text</div>
                                                    )}
                                                    {element.type === 'LONG_TEXT' && (
                                                        <div className="h-24 bg-neutral-900/50 rounded-xl border border-neutral-700 w-full p-4 text-neutral-600 text-sm">Long Answer Text</div>
                                                    )}
                                                    {(element.type === 'SINGLE_CHOICE' || element.type === 'MULTIPLE_CHOICE') && (
                                                        <div className="space-y-3">
                                                            {element.options?.map((opt, optIdx) => (
                                                                <div key={opt.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-900/50 transition-colors">
                                                                    <div className={`w-5 h-5 flex-shrink-0 ${element.type === 'SINGLE_CHOICE' ? 'rounded-full' : 'rounded'} border-2 border-neutral-600`}></div>
                                                                    {activeElementId === element.id ? (
                                                                        <input 
                                                                            type="text" 
                                                                            value={opt.label} 
                                                                            onChange={(e) => {
                                                                                const newOpts = [...(element.options || [])];
                                                                                newOpts[optIdx].label = e.target.value;
                                                                                updateElement(element.id, { options: newOpts });
                                                                            }}
                                                                            className="flex-grow bg-transparent text-neutral-300 text-sm focus:outline-none border-b border-transparent focus:border-neutral-500"
                                                                        />
                                                                    ) : (
                                                                        <span className="text-neutral-300 text-sm">{opt.label}</span>
                                                                    )}
                                                                    {activeElementId === element.id && (
                                                                        <button 
                                                                            onClick={() => {
                                                                                const newOpts = element.options?.filter((_, i) => i !== optIdx);
                                                                                updateElement(element.id, { options: newOpts });
                                                                            }}
                                                                            className="text-neutral-600 hover:text-red-400 ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                        >
                                                                            <TrashIcon className="w-3 h-3" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ))}
                                                            {activeElementId === element.id && (
                                                                <button 
                                                                    onClick={() => updateElement(element.id, { options: [...(element.options || []), { id: uuidv4(), label: `Option ${(element.options?.length || 0) + 1}` }] })}
                                                                    className="text-xs text-purple-400 hover:text-purple-300 font-bold mt-2 flex items-center gap-1 px-2 py-1 rounded hover:bg-purple-500/10 transition-colors w-fit"
                                                                >
                                                                    <PlusIcon className="w-3 h-3" /> Add Option
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {activeElementId === element.id && (
                                                    <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={element.required} 
                                                                    onChange={(e) => updateElement(element.id, { required: e.target.checked })}
                                                                    className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer checked:right-0 checked:border-purple-600"
                                                                    id={`req-${element.id}`}
                                                                    style={{ right: element.required ? '0' : 'auto', left: element.required ? 'auto' : '0' }}
                                                                />
                                                                <label 
                                                                    htmlFor={`req-${element.id}`} 
                                                                    className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer ${element.required ? 'bg-purple-600' : 'bg-neutral-700'}`}
                                                                ></label>
                                                            </div>
                                                            <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Required Field</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Visual Submit Button */}
                                    <div className="mt-12 pt-8 border-t border-white/10">
                                        <button disabled className="w-full h-16 bg-purple-600 opacity-50 text-white text-lg font-bold rounded-2xl flex items-center justify-center gap-3 cursor-not-allowed">
                                            Submit Application <ArrowRightIcon className="w-6 h-6" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Toolbar (Icons Only) */}
                <div className="h-20 bg-neutral-950 border-t border-neutral-800 flex items-center justify-center gap-6 px-6 z-20 shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
                    <ToolButton label="Short Answer" icon={TypeIcon} onClick={() => addElement('SHORT_TEXT')} />
                    <ToolButton label="Paragraph" icon={FileText} onClick={() => addElement('LONG_TEXT')} />
                    <ToolButton label="Multiple Choice" icon={ListIcon} onClick={() => addElement('SINGLE_CHOICE')} />
                    <ToolButton label="Checkboxes" icon={CheckCircleIcon} onClick={() => addElement('MULTIPLE_CHOICE')} />
                </div>
            </div>
        </div>
    );
};

const ToolButton: React.FC<{ label: string, icon: React.FC<any>, onClick: () => void }> = ({ label, icon: Icon, onClick }) => (
    <button 
        onClick={onClick}
        className="relative group p-4 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-purple-400 transition-all duration-200 active:scale-95"
        title={label}
    >
        <Icon className="w-6 h-6" />
        {/* Tooltip */}
        <span className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 px-2 py-1 bg-neutral-800 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap shadow-lg border border-neutral-700">
            {label}
            <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-neutral-800"></span>
        </span>
    </button>
);

export default FormBuilder;
