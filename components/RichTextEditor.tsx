
import React, { useRef, useEffect, useState } from 'react';
import { BoldIcon, ItalicIcon, AlignLeftIcon, AlignCenterIcon, AlignRightIcon, LinkIcon, ImageIcon, PlusIcon } from './Icons';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  className?: string;
  autoHeight?: boolean;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, className, autoHeight = false }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [isTagDropdownOpen, setTagDropdownOpen] = useState(false);

  // Sync external value to contentEditable
  useEffect(() => {
    if (contentRef.current) {
        // Prevent update if the content is practically the same to avoid cursor jumping
        // or if the element is currently focused (user is typing)
        if (document.activeElement === contentRef.current) {
            return;
        }
        
        if (contentRef.current.innerHTML !== value) {
             // Handle empty case to prevent accumulation of <br> tags sometimes inserted by browsers
            if (value === '' && (contentRef.current.innerHTML === '<br>' || contentRef.current.innerHTML === '<br/>')) return;
            contentRef.current.innerHTML = value;
        }
    }
  }, [value]);

  const handleInput = () => {
    if (contentRef.current) {
      const html = contentRef.current.innerHTML;
      if (html !== value) {
        onChange(html);
      }
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    contentRef.current?.focus();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        execCommand('insertImage', url);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    // Intercept paste to handle images or strip rich text if desired
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const blob = items[i].getAsFile();
        if(blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const url = event.target?.result as string;
                execCommand('insertImage', url);
            };
            reader.readAsDataURL(blob);
        }
        return;
      }
    }
  };

  const insertLink = () => {
    if (linkUrl) {
        execCommand('createLink', linkUrl);
        setLinkUrl('');
        setIsLinkModalOpen(false);
    }
  };

  const insertTag = (tag: string) => {
      // Focus first to ensure insertion happens at cursor
      contentRef.current?.focus();
      execCommand('insertText', tag);
      setTagDropdownOpen(false);
  }

  const ToolbarButton: React.FC<{ icon: any, onClick: () => void, active?: boolean, title?: string }> = ({ icon: Icon, onClick, active, title }) => (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={`p-2 rounded hover:bg-neutral-200 transition-colors ${active ? 'bg-neutral-300 text-black' : 'text-neutral-600'}`}
      title={title}
    >
      <Icon className="w-4 h-4" />
    </button>
  );

  return (
    <div className={`border border-neutral-200 rounded-lg overflow-hidden flex flex-col bg-white shadow-inner ${autoHeight ? 'h-auto' : 'h-full'} ${className || ''}`}>
      {/* Toolbar */}
      <div className="bg-neutral-50 border-b border-neutral-200 p-2 flex flex-wrap gap-1 items-center shrink-0">
        <ToolbarButton icon={BoldIcon} onClick={() => execCommand('bold')} title="Bold" />
        <ToolbarButton icon={ItalicIcon} onClick={() => execCommand('italic')} title="Italic" />
        <div className="w-px h-6 bg-neutral-300 mx-1"></div>
        <ToolbarButton icon={AlignLeftIcon} onClick={() => execCommand('justifyLeft')} title="Align Left" />
        <ToolbarButton icon={AlignCenterIcon} onClick={() => execCommand('justifyCenter')} title="Align Center" />
        <ToolbarButton icon={AlignRightIcon} onClick={() => execCommand('justifyRight')} title="Align Right" />
        <div className="w-px h-6 bg-neutral-300 mx-1"></div>
        <ToolbarButton icon={LinkIcon} onClick={() => setIsLinkModalOpen(true)} title="Insert Link" />
        <label className="p-2 rounded hover:bg-neutral-200 transition-colors text-neutral-600 cursor-pointer" title="Insert Image">
            <ImageIcon className="w-4 h-4" />
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        </label>
        
        <div className="ml-auto relative">
            <button 
                type="button"
                onClick={() => setTagDropdownOpen(!isTagDropdownOpen)}
                className="flex items-center px-3 py-1.5 text-xs font-bold bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors"
            >
                <PlusIcon className="w-3 h-3 mr-1"/> Insert Variable
            </button>
            {isTagDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-neutral-200 shadow-xl rounded-lg py-1 z-50">
                    <button onClick={() => insertTag('{{user_name}}')} className="block w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50">User Name</button>
                    <button onClick={() => insertTag('{{event_name}}')} className="block w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50">Event Name</button>
                    <button onClick={() => insertTag('{{user_email}}')} className="block w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50">User Email</button>
                    <button onClick={() => insertTag('{{ticket_link}}')} className="block w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50">Ticket Link</button>
                </div>
            )}
        </div>
      </div>

      {/* Link Modal */}
      {isLinkModalOpen && (
          <div className="absolute top-14 left-2 z-10 bg-white border border-neutral-300 shadow-lg rounded p-2 flex gap-2">
              <input 
                type="text" 
                value={linkUrl} 
                onChange={e => setLinkUrl(e.target.value)} 
                placeholder="https://..." 
                className="border border-neutral-300 rounded px-2 py-1 text-sm outline-none focus:border-purple-500 text-black"
                autoFocus
              />
              <button onClick={insertLink} className="px-2 py-1 bg-purple-600 text-white rounded text-sm font-medium hover:bg-purple-500">Add</button>
              <button onClick={() => setIsLinkModalOpen(false)} className="px-2 py-1 text-neutral-500 hover:bg-neutral-100 rounded">Close</button>
          </div>
      )}

      {/* Editor Area */}
      <div
        ref={contentRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        className={`p-6 outline-none text-neutral-900 prose prose-sm max-w-none ${
            autoHeight 
            ? 'min-h-[300px] overflow-y-hidden' 
            : 'flex-grow overflow-y-auto min-h-[300px]'
        }`}
        style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', lineHeight: '1.6' }}
      />
    </div>
  );
};

export default RichTextEditor;
