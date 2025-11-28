import React, { useState, useEffect } from 'react';
import * as api from '../services/api';
import { LeaderboardEntry } from '../types';
import { TrophyIcon } from './Icons';

interface CompetitionLeaderboardProps {
  eventId: string;
  userId: string;
}

const CompetitionLeaderboard: React.FC<CompetitionLeaderboardProps> = ({ eventId, userId }) => {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                setIsLoading(true);
                const data = await api.getCompetitionLeaderboard(eventId);
                setLeaderboard(data);
            } catch (err) {
                setError("Could not load leaderboard.");
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchLeaderboard();
    }, [eventId]);

    if (isLoading) {
        return <div className="text-center text-sm text-neutral-400 py-4">Loading leaderboard...</div>;
    }

    if (error) {
        return <div className="text-center text-sm text-red-400 py-4">{error}</div>;
    }

    const currentUserIndex = leaderboard.findIndex(entry => entry.userId === userId);
    const currentUserEntry = currentUserIndex !== -1 ? leaderboard[currentUserIndex] : null;
    const topEntries = leaderboard.slice(0, 3);
    const isUserInTop = currentUserIndex !== -1 && currentUserIndex < 3;

    const rankColors = [
        'text-yellow-400', // 1st
        'text-neutral-300', // 2nd
        'text-orange-400'  // 3rd
    ];

    const LeaderboardRow: React.FC<{ entry: LeaderboardEntry, rank: number, isCurrentUser: boolean }> = ({ entry, rank, isCurrentUser }) => (
        <div className={`flex items-center justify-between p-3 rounded-lg ${isCurrentUser ? 'bg-purple-500/10' : ''}`}>
            <div className="flex items-center">
                <span className={`w-6 text-center font-bold text-sm ${rank <= 3 ? rankColors[rank - 1] : 'text-neutral-400'}`}>
                    {rank}
                </span>
                <span className={`ml-3 font-medium ${isCurrentUser ? 'text-white' : 'text-neutral-300'}`}>{entry.userName}</span>
            </div>
            <span className={`font-semibold ${isCurrentUser ? 'text-white' : 'text-neutral-300'}`}>${entry.salesValue.toFixed(2)}</span>
        </div>
    );

    return (
        <div className="border-t border-neutral-800 mt-6 pt-4">
            <h5 className="text-sm font-bold text-white mb-3 flex items-center">
                <TrophyIcon className="w-4 h-4 mr-2 text-purple-400"/>
                Competition Leaderboard
            </h5>
            <div className="space-y-1">
                {topEntries.map((entry, index) => (
                    <LeaderboardRow key={entry.userId} entry={entry} rank={index + 1} isCurrentUser={entry.userId === userId} />
                ))}

                {!isUserInTop && currentUserEntry && (
                    <>
                        <div className="text-center text-neutral-600 font-bold tracking-widest py-1">...</div>
                        <LeaderboardRow entry={currentUserEntry} rank={currentUserIndex + 1} isCurrentUser={true} />
                    </>
                )}
            </div>
        </div>
    );
};

export default CompetitionLeaderboard;