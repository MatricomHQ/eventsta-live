import React, { useState, useEffect } from 'react';
import { PlusIcon, MinusIcon } from './Icons';

interface QuantitySelectorProps {
  initialQuantity?: number;
  ticketType: string;
  onChange: (ticketType: string, quantity: number) => void;
  disabled?: boolean;
}

const QuantitySelector: React.FC<QuantitySelectorProps> = ({ ticketType, onChange, initialQuantity = 0, disabled = false }) => {
  const [quantity, setQuantity] = useState(initialQuantity);

  const handleIncrease = () => {
    setQuantity(prev => prev + 1);
  };

  const handleDecrease = () => {
    setQuantity(prev => Math.max(0, prev - 1));
  };
  
  useEffect(() => {
    onChange(ticketType, quantity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quantity]);

  useEffect(() => {
    setQuantity(initialQuantity);
  }, [initialQuantity])

  return (
    <div className="flex-shrink-0">
      <div className="flex items-center border border-neutral-700 rounded-full p-1">
        <button
          onClick={handleDecrease}
          disabled={quantity === 0 || disabled}
          className="w-10 h-10 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 transition-colors disabled:opacity-50"
        >
          <MinusIcon className="w-5 h-5 mx-auto" />
        </button>
        <input
          type="number"
          readOnly
          value={quantity}
          className="qty-input w-16 h-10 bg-transparent text-white text-center font-bold text-lg outline-none border-none focus:ring-0"
        />
        <button
          onClick={handleIncrease}
          disabled={disabled}
          className="w-10 h-10 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors disabled:opacity-50"
        >
          <PlusIcon className="w-5 h-5 mx-auto" />
        </button>
      </div>
    </div>
  );
};

export default QuantitySelector;