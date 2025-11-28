import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface HostLinkProps {
  hostId: string;
  hostName: string;
  className?: string;
}

const HostLink: React.FC<HostLinkProps> = ({ hostId, hostName, className }) => {
  const location = useLocation();
  return (
    <Link 
      to={`/host/${hostId}`} 
      state={{ from: location }}
      className={`hover:underline transition-colors ${className}`}
      onClick={(e) => e.stopPropagation()} // Prevent parent card clicks
    >
      {hostName}
    </Link>
  );
};

export default HostLink;