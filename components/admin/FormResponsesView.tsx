
import React, { useState, useEffect } from 'react';
import { CompetitionForm } from '../../types';
import * as api from '../../services/api';
import { ArrowLeftIcon, DownloadIcon } from '../Icons';

interface FormResponsesViewProps {
    form: CompetitionForm;
    onBack: () => void;
}

const FormResponsesView: React.FC<FormResponsesViewProps> = ({ form, onBack }) => {
    const [responses, setResponses] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const data = await api.getFormResponses(form.id);
                setResponses(data);
            } catch (e) {
                console.error("Failed to load responses", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [form.id]);

    const exportCSV = () => {
        if (responses.length === 0) return;

        // Define headers
        const headers = ['Submission Date', 'Email', ...form.elements.map(el => el.label)];
        
        // Create rows
        const rows = responses.map(response => {
            const rowData = [
                new Date(response.submissionDate).toLocaleString(),
                `"${response.email || ''}"`,
                ...form.elements.map(el => {
                    const val = response[el.id];
                    if (Array.isArray(val)) return `"${val.join(', ')}"`; // CSV escape for arrays (checkboxes)
                    return `"${val || ''}"`; // CSV escape strings
                })
            ];
            return rowData.join(',');
        });

        const csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(',') + "\n" 
            + rows.join('\n');

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${form.title.replace(/\s+/g, '_')}_responses.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0">
                <div>
                    <button onClick={onBack} className="flex items-center text-sm text-neutral-400 hover:text-white mb-2">
                        <ArrowLeftIcon className="w-4 h-4 mr-2" /> Back to Forms
                    </button>
                    <h2 className="text-2xl font-bold text-white">{form.title} <span className="text-neutral-500 text-lg font-normal">/ Responses</span></h2>
                </div>
                <button 
                    onClick={exportCSV} 
                    disabled={responses.length === 0}
                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
                >
                    <DownloadIcon className="w-4 h-4" /> Export CSV
                </button>
            </div>

            <div className="flex-grow bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col min-h-[400px]">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full text-neutral-500">Loading responses...</div>
                ) : responses.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-neutral-500">No responses yet.</div>
                ) : (
                    <div className="overflow-auto custom-scrollbar flex-grow">
                        <table className="w-full text-sm text-left text-neutral-300 whitespace-nowrap">
                            <thead className="text-xs text-neutral-400 uppercase bg-neutral-950 border-b border-neutral-800 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-3 font-bold min-w-[180px]">Submission Date</th>
                                    <th className="px-6 py-3 font-bold min-w-[250px]">Email</th>
                                    {form.elements.map(el => (
                                        <th key={el.id} className="px-6 py-3 font-bold min-w-[200px]">
                                            {el.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800 bg-neutral-900">
                                {responses.map((response, idx) => (
                                    <tr key={idx} className="hover:bg-neutral-800/50">
                                        <td className="px-6 py-4 font-mono text-xs text-neutral-500">
                                            {new Date(response.submissionDate).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-white">
                                            {response.email || '-'}
                                        </td>
                                        {form.elements.map(el => {
                                            const value = response[el.id];
                                            return (
                                                <td key={el.id} className="px-6 py-4 text-white truncate max-w-[300px]" title={Array.isArray(value) ? value.join(', ') : value}>
                                                    {Array.isArray(value) ? value.join(', ') : (value || '-')}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FormResponsesView;
