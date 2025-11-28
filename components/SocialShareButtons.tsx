
import React, { useState } from 'react';
import { FacebookIcon, TwitterIcon, LinkedInIcon, MailIcon, LinkIcon, CheckCircleIcon } from './Icons';

interface SocialShareButtonsProps {
  url: string;
  title: string;
}

const SocialShareButtons: React.FC<SocialShareButtonsProps> = ({ url, title }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLinks = [
    {
      name: 'Facebook',
      icon: FacebookIcon,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      className: 'hover:text-[#1877F2] hover:bg-[#1877F2]/10',
    },
    {
      name: 'X (Twitter)',
      icon: TwitterIcon,
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
      className: 'hover:text-white hover:bg-neutral-800',
    },
    {
      name: 'LinkedIn',
      icon: LinkedInIcon,
      href: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
      className: 'hover:text-[#0A66C2] hover:bg-[#0A66C2]/10',
    },
    {
      name: 'Email',
      icon: MailIcon,
      href: `mailto:?subject=${encodeURIComponent(title)}&body=Check out this event: ${encodeURIComponent(url)}`,
      className: 'hover:text-purple-400 hover:bg-purple-500/10',
    }
  ];

  return (
    <div className="flex items-center gap-1 mt-4 animate-fade-in">
      {shareLinks.map((link) => (
        <a
          key={link.name}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Share on ${link.name}`}
          className={`w-9 h-9 rounded-full flex items-center justify-center text-neutral-400 transition-all duration-300 hover:scale-110 ${link.className}`}
        >
          <link.icon className="w-4 h-4" />
        </a>
      ))}
      
      <button
        onClick={handleCopy}
        aria-label="Copy Link"
        className={`w-9 h-9 rounded-full flex items-center justify-center text-neutral-400 transition-all duration-300 hover:scale-110 hover:text-white hover:bg-white/10 relative group`}
      >
        {copied ? <CheckCircleIcon className="w-4 h-4 text-green-400" /> : <LinkIcon className="w-4 h-4" />}
        
        {/* Tooltip */}
        <span className={`absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-black text-white text-[10px] font-medium rounded opacity-0 transition-opacity ${copied ? 'opacity-100' : 'group-hover:opacity-100'} pointer-events-none`}>
            {copied ? 'Copied!' : 'Copy Link'}
        </span>
      </button>
    </div>
  );
};

export default SocialShareButtons;
