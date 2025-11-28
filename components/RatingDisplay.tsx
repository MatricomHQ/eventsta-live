import React from 'react';
import { StarIcon } from './Icons';

export const RatingDisplay: React.FC<{ rating: number, reviewCount: number, size?: 'sm' | 'md' }> = ({ rating, reviewCount, size = 'md' }) => {
    const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
    
    return (
        <div className="flex items-center space-x-2">
            <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                    <StarIcon key={i} className={`${iconSize} ${i < Math.round(rating) ? 'text-yellow-400' : 'text-neutral-600'}`} />
                ))}
            </div>
            <span className={`font-semibold ${size === 'sm' ? 'text-sm' : 'text-base'} text-neutral-300`}>{rating.toFixed(1)}</span>
            <span className={`text-neutral-400 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>({reviewCount} reviews)</span>
        </div>
    );
};
