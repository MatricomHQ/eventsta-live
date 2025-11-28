
import React, { ReactNode, useEffect } from 'react';
import { XIcon } from './Icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  showCloseButton?: boolean;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, showCloseButton = true }) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);

    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 animate-modal-fade-in"
      style={{ animation: 'modal-fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      <div className="relative z-10 w-full max-w-full flex justify-center my-4 md:my-8 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-fit">
            {showCloseButton && (
            <button
                onClick={onClose}
                className="absolute top-0 right-0 md:-right-10 md:top-0 text-neutral-400 hover:text-white transition-colors z-50 p-2 bg-black/50 rounded-full md:bg-transparent"
            >
                <XIcon className="w-6 h-6" />
            </button>
            )}
            {children}
        </div>
      </div>
    </div>
  );
};

// Add keyframes to a style tag in the head for animation
const style = document.createElement('style');
style.innerHTML = `
  @keyframes modal-fade-in {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
  }
`;
document.head.appendChild(style);


export default Modal;