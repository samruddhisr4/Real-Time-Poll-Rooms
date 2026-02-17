import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Share2, CheckCircle2, AlertCircle, Loader2, Copy } from 'lucide-react';


// Helper to generate browser fingerprint
const getFingerprint = () => {
    const { userAgent, language, hardwareConcurrency, deviceMemory } = navigator as any;
    const screenRes = `${window.screen.width}x${window.screen.height}`;
    return btoa(`${userAgent}-${language}-${screenRes}-${hardwareConcurrency}-${deviceMemory || 0}`);
};

interface Poll {
    id: string;
    question: string;
    created_at: string;
}

interface Option {
    id: string;
    poll_id: string;
    text: string;
    vote_count: number;
}

export function ViewPoll() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [poll, setPoll] = useState<Poll | null>(null);
    const [options, setOptions] = useState<Option[]>([]);
    const [loading, setLoading] = useState(true);
    const [voting, setVoting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userVotedOption, setUserVotedOption] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!id) return;

        // Check local storage for previous vote
        const storedVote = localStorage.getItem(`voted_poll_${id}`);
        if (storedVote) setUserVotedOption(storedVote);

        fetchPollData();

        // Real-time subscription
        const channel = supabase
            .channel('realtime-poll')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'options',
                    filter: `poll_id=eq.${id}`,
                },
                (payload) => {
                    setOptions((currentOptions) =>
                        currentOptions.map((opt) =>
                            opt.id === payload.new.id ? { ...opt, vote_count: payload.new.vote_count } : opt
                        )
                    );
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id]);

    const fetchPollData = async () => {
        try {
            const { data: pollData, error: pollError } = await supabase
                .from('polls')
                .select('*')
                .eq('id', id)
                .single();

            if (pollError) throw pollError;
            setPoll(pollData);

            const { data: optionsData, error: optionsError } = await supabase
                .from('options')
                .select('*')
                .eq('poll_id', id)
                .order('vote_count', { ascending: false });

            if (optionsData) {
                setOptions(optionsData.sort((a, b) => a.text.localeCompare(b.text)));
            }

        } catch (err: any) {
            setError('Poll not found or deleted');
        } finally {
            setLoading(false);
        }
    };

    const handleVote = async (optionId: string) => {
        if (userVotedOption) return;

        setVoting(true);
        setError(null);

        try {
            const fingerprint = getFingerprint();

            // Optimistic Update
            setOptions(opts => opts.map(o => o.id === optionId ? { ...o, vote_count: o.vote_count + 1 } : o));
            setUserVotedOption(optionId);
            localStorage.setItem(`voted_poll_${id}`, optionId);

            // Fetch IP
            const ipRes = await fetch('https://api.ipify.org?format=json');
            const { ip } = await ipRes.json();

            // Now call RPC with real IP
            const { error: rpcError } = await supabase.rpc('vote_for_option', {
                p_poll_id: id,
                p_option_id: optionId,
                p_fingerprint: fingerprint,
                p_ip_address: ip
            });

            if (rpcError) {
                // Revert optimistic update
                setOptions(opts => opts.map(o => o.id === optionId ? { ...o, vote_count: Math.max(0, o.vote_count - 1) } : o));
                setUserVotedOption(null);
                localStorage.removeItem(`voted_poll_${id}`);
                throw new Error(rpcError.message);
            }

        } catch (err: any) {
            setError(err.message);
            fetchPollData();
        } finally {
            setVoting(false);
        }
    };

    const copyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const totalVotes = options.reduce((sum, opt) => sum + opt.vote_count, 0);

    if (loading) return <div className="container"><Loader2 className="loader" size={40} /></div>;
    if (error) return (
        <div className="container">
            <div className="card" style={{ textAlign: 'center' }}>
                <AlertCircle size={64} style={{ color: 'red', margin: '0 auto' }} />
                <h2>Oops!</h2>
                <p>{error}</p>
                <button onClick={() => navigate('/')} className="btn-primary" style={{ width: 'auto' }}>Create a new poll</button>
            </div>
        </div>
    );

    return (
        <div className="card">
            <div className="poll-header">
                <h2>{poll?.question}</h2>
                <div className="poll-meta">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <CheckCircle2 size={16} color="green" />
                        {totalVotes} votes
                    </span>
                    <button onClick={copyLink} style={{ background: 'none', border: 'none', padding: 0, color: '#666', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                        {copied ? 'Copied!' : 'Share'}
                    </button>
                </div>
            </div>

            <div className="poll-options">
                {options.map((option) => {
                    const percent = totalVotes === 0 ? 0 : Math.round((option.vote_count / totalVotes) * 100);
                    const isVoted = userVotedOption === option.id;

                    return (
                        <button
                            key={option.id}
                            disabled={!!userVotedOption || voting}
                            onClick={() => handleVote(option.id)}
                            className={`poll-option-btn ${isVoted ? 'voted' : ''}`}
                        >
                            <div
                                className="progress-bar"
                                style={{ width: `${percent}%` }}
                            />

                            <div className="option-text-container">
                                {option.text}
                            </div>

                            <div className="option-stats">
                                <span className="vote-count">{option.vote_count} votes</span>
                                <span className="vote-percent">{percent}%</span>
                            </div>
                        </button>
                    );
                })}
            </div>

            {
                userVotedOption && (
                    <div className="voted-msg">
                        Thanks for voting!
                    </div>
                )
            }
            {
                error && (
                    <div className="error-message">
                        {error}
                    </div>
                )
            }
        </div >
    );
}

function max(a: number, b: number) {
    return a > b ? a : b;
}


