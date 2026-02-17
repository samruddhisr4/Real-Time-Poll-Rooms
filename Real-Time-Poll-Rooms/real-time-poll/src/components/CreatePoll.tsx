import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Loader2, Link } from 'lucide-react';

export function CreatePoll() {
    const navigate = useNavigate();
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAddOption = () => {
        setOptions([...options, '']);
    };

    const handleRemoveOption = (index: number) => {
        if (options.length > 2) {
            const newOptions = options.filter((_, i) => i !== index);
            setOptions(newOptions);
        }
    };

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!question.trim()) {
            setError('Question is required');
            return;
        }
        if (options.some(opt => !opt.trim())) {
            setError('All options must be filled');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // 1. Create Poll
            const { data: pollData, error: pollError } = await supabase
                .from('polls')
                .insert([{ question }])
                .select()
                .single();

            if (pollError) throw pollError;

            // 2. Create Options
            const optionsData = options.map(text => ({
                poll_id: pollData.id,
                text,
            }));

            const { error: optionsError } = await supabase
                .from('options')
                .insert(optionsData);

            if (optionsError) throw optionsError;

            navigate(`/poll/${pollData.id}`);
        } catch (err: any) {
            setError(err.message || 'Failed to create poll');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card">
            <h1 style={{ fontSize: '2rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <span style={{ backgroundColor: '#646cff', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                    <Link size={24} />
                </span>
                Create a New Poll
            </h1>

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>
                        Your Question
                    </label>
                    <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="e.g., What's the best programming language?"
                        className="input-field"
                    />
                </div>

                <div className="form-group">
                    <label>
                        Answer Options
                    </label>
                    {options.map((option, index) => (
                        <div key={index} className="option-row">
                            <input
                                type="text"
                                value={option}
                                onChange={(e) => handleOptionChange(index, e.target.value)}
                                placeholder={`Option ${index + 1}`}
                                className="input-field"
                            />
                            {options.length > 2 && (
                                <button
                                    type="button"
                                    onClick={() => handleRemoveOption(index)}
                                    className="btn-secondary"
                                    style={{ padding: '0 1rem' }}
                                >
                                    <Trash2 size={20} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <button
                        type="button"
                        onClick={handleAddOption}
                        className="btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                        <Plus size={20} />
                        Add Option
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="loader" size={20} />
                                Creating Poll...
                            </>
                        ) : (
                            'Create & Share Poll'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
