
import React, { useState, useEffect } from 'react';
import { TicketOption, AddOn, CheckoutCart } from '../types';
import { MinusIcon, PlusIcon } from './Icons';

interface DonationItemSelectorProps {
    item: TicketOption | AddOn;
    onChange: (itemType: string, quantity: number, donationAmount?: number) => void;
    cartItem?: CheckoutCart[string];
}

const DonationItemSelector: React.FC<DonationItemSelectorProps> = ({ item, onChange, cartItem }) => {
    const recommendedDonation = item.price;
    const minimumDonation = item.minimumDonation ?? 0;
    
    const [quantity, setQuantity] = useState(cartItem?.quantity || 0);
    
    // Use string | number to allow empty input while typing
    const [amount, setAmount] = useState<string | number>(cartItem?.donationAmount || recommendedDonation);
    
    // The 'name' property is on AddOn, 'type' is on TicketOption.
    const itemName = 'name' in item ? item.name : item.type;

    useEffect(() => {
        // Ensure we pass a valid number to the parent
        const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        const validAmount = isNaN(numericAmount) ? 0 : numericAmount;
        onChange(itemName, quantity, validAmount);
    }, [quantity, amount, itemName, onChange]);

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val === '') {
            setAmount('');
            return;
        }
        const parsed = parseFloat(val);
        if (!isNaN(parsed)) {
            setAmount(parsed);
        }
    };
    
    const handleAmountBlur = () => {
        const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        const validAmount = isNaN(numericAmount) ? 0 : numericAmount;

        if (validAmount < minimumDonation) {
            setAmount(minimumDonation);
        } else {
            // Just to clean up if it was a string like "20."
            setAmount(validAmount);
        }
    }

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col gap-4">
            <div>
                <h4 className="text-lg font-semibold text-white">{itemName}</h4>
                <p className="text-neutral-400 text-sm mb-2">{item.description || ''}</p>
                <span className="text-sm text-neutral-400">Min: ${minimumDonation.toFixed(2)} | Rec: ${recommendedDonation.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">$</span>
                    <input 
                        type="number"
                        value={amount}
                        onChange={handleAmountChange}
                        onBlur={handleAmountBlur}
                        className="w-32 h-12 pl-7 pr-4 bg-neutral-800 border border-neutral-700 rounded-lg text-white font-bold text-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        step="1"
                    />
                </div>
                <div className="flex items-center border border-neutral-700 rounded-full p-1">
                    <button onClick={() => setQuantity(q => Math.max(0, q - 1))} className="w-10 h-10 rounded-full bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50" disabled={quantity === 0}><MinusIcon className="w-5 h-5 mx-auto text-neutral-400" /></button>
                    <span className="w-10 text-center font-bold text-lg text-white">{quantity}</span>
                    <button onClick={() => setQuantity(q => q + 1)} className="w-10 h-10 rounded-full bg-neutral-800 hover:bg-neutral-700"><PlusIcon className="w-5 h-5 mx-auto text-neutral-200" /></button>
                </div>
            </div>
        </div>
    );
};

export default DonationItemSelector;
