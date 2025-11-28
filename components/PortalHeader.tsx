
import React from 'react';

interface PortalHeaderProps {
  title: string;
  subtitle: string;
  children?: React.ReactNode; // For action buttons
}

const PortalHeader: React.FC<PortalHeaderProps> = ({ title, subtitle, children }) => (
  <div className="flex flex-col md:flex-row justify-between md:items-center mb-12">
    <div>
        <h1 className="text-4xl font-bold tracking-tight text-white mb-4">{title}</h1>
        <p className="text-neutral-400">{subtitle}</p>
    </div>
    {children && <div className="mt-6 md:mt-0">{children}</div>}
  </div>
);

export default PortalHeader;
