
import React from 'react';

interface SEOHeadProps {
  title: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'event' | 'profile';
}

const SEOHead: React.FC<SEOHeadProps> = ({ 
  title, 
  description = "A next-generation event discovery and hosting platform.", 
  image = "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1200&auto=format&fit=crop",
  url,
  type = 'website'
}) => {
  const siteTitle = "Eventsta";
  const fullTitle = `${title} | ${siteTitle}`;
  const effectiveUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

  // In React 19, <title> and <meta> tags rendered in components are automatically hoisted to the <head>.
  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={effectiveUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={effectiveUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </>
  );
};

export default SEOHead;
