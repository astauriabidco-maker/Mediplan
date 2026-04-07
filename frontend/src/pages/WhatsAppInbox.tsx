import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Clock, MessageSquare, Search, Loader2, Phone, Zap, ShieldAlert, CheckCircle, XCircle } from 'lucide-react';
import axios from '../api/axios';
import { fetchShiftApplications } from '../api/planning.api';
import { useAppConfig } from '../store/useAppConfig';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface Message {
    id: number;
    from: string;
    to: string;
    content: string;
    direction: 'INBOUND' | 'OUTBOUND';
    timestamp: string;
    agent?: {
        nom: string;
        jobTitle: string;
    };
}

export const WhatsAppInbox = () => {
    const { themeColor } = useAppConfig();
    const [activeTab, setActiveTab] = useState<'chats' | 'vigie'>('chats');
    const [messages, setMessages] = useState<Message[]>([]);
    const [applications, setApplications] = useState<any[]>([]);
    const [selectedChat, setSelectedChat] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const fetchMessages = async () => {
        try {
            const response = await axios.get('/api/whatsapp/messages');
            setMessages(response.data);
        } catch (error) {
            console.error('Error fetching WhatsApp messages:', error);
        }
    };

    const fetchVigieData = async () => {
        try {
            const data = await fetchShiftApplications();
            setApplications(data);
        } catch (error) {
            console.error('Error fetching vigie data:', error);
        }
    }

    useEffect(() => {
        fetchMessages();
        fetchVigieData();
        const interval = setInterval(() => {
            fetchMessages();
            fetchVigieData();
        }, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, selectedChat]);

    const handleSend = async () => {
        if (!selectedChat || !replyText.trim()) return;

        setIsSending(true);
        try {
            await axios.post('/api/whatsapp/send', {
                to: selectedChat,
                message: replyText
            });
            setReplyText('');
            await fetchMessages();
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Erreur lors de l\'envoi du message');
        } finally {
            setIsSending(false);
        }
    };

    // Group messages by contact
    const chats = messages.reduce((acc: any, msg) => {
        const contact = msg.direction === 'INBOUND' ? msg.from : msg.to;
        if (!acc[contact]) {
            acc[contact] = {
                id: contact,
                lastMessage: msg,
                messages: [],
                agent: msg.agent
            };
        }
        acc[contact].messages.push(msg);
        if (new Date(msg.timestamp) > new Date(acc[contact].lastMessage.timestamp)) {
            acc[contact].lastMessage = msg;
        }
        return acc;
    }, {});

    const chatList = Object.values(chats).sort((a: any, b: any) =>
        new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime()
    );

    const filteredMessages = selectedChat ? (chats[selectedChat]?.messages || []) : [];
    const currentAgent = selectedChat ? chats[selectedChat]?.agent : null;

    return (
        <div className="flex h-full -m-8 bg-slate-950 overflow-hidden">
            {/* Sidebar List */}
            <div className="w-80 border-r border-slate-800 flex flex-col bg-slate-900/50">
                <div className="p-6 border-b border-slate-800">
                    <h1 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                        <MessageSquare className="text-emerald-500" /> WhatsApp
                    </h1>

                    <div className="flex bg-slate-800/50 p-1 rounded-xl mb-4">
                        <button
                            onClick={() => setActiveTab('chats')}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all",
                                activeTab === 'chats' ? "bg-slate-700 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
                            )}>
                            <MessageSquare size={16} /> Chats
                        </button>
                        <button
                            onClick={() => setActiveTab('vigie')}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all",
                                activeTab === 'vigie' ? "bg-rose-500/20 text-rose-400 shadow-md border border-rose-500/30" : "text-slate-400 hover:text-slate-200"
                            )}>
                            <Zap size={16} className={activeTab === 'vigie' ? "fill-rose-400" : ""} /> Vigie IA
                        </button>
                    </div>

                    {activeTab === 'chats' && (
                        <div className="relative mt-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input
                                type="text"
                                placeholder="Rechercher un agent..."
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500 transition-colors"
                            />
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto">
                    {activeTab === 'chats' ? (
                        <>
                            {chatList.map((chat: any) => (
                                <div
                                    key={chat.id}
                                    onClick={() => setSelectedChat(chat.id)}
                                    className={cn(
                                        "p-4 border-b border-slate-800/50 cursor-pointer transition-colors hover:bg-white/5",
                                        selectedChat === chat.id && "bg-emerald-500/10 border-r-2 border-r-emerald-500"
                                    )}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-bold text-slate-200 truncate pr-2">
                                            {chat.agent?.nom || chat.id}
                                        </h3>
                                        <span className="text-[10px] text-slate-500 whitespace-nowrap">
                                            {new Date(chat.lastMessage.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 truncate italic">
                                        {chat.lastMessage.direction === 'OUTBOUND' && <span className="text-emerald-500 mr-1 font-bold">Vous:</span>}
                                        {chat.lastMessage.content}
                                    </p>
                                </div>
                            ))}
                            {chatList.length === 0 && (
                                <div className="p-10 text-center text-slate-500 text-sm italic">
                                    Aucune conversation WhatsApp.
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="p-6">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Statut Algorithme</h3>
                            <div className="space-y-4">
                                <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-500 border border-rose-500/30">
                                        <ShieldAlert size={20} />
                                    </div>
                                    <div>
                                        <div className="text-2xl font-black text-slate-100">
                                            {applications.filter(a => a.status === 'PENDING').length}
                                        </div>
                                        <div className="text-xs font-medium text-slate-400">Encours d'analyse</div>
                                    </div>
                                </div>
                                <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 border border-emerald-500/30">
                                        <Zap size={20} className="fill-emerald-500" />
                                    </div>
                                    <div>
                                        <div className="text-2xl font-black text-slate-100">
                                            {applications.filter(a => a.status === 'ACCEPTED').length}
                                        </div>
                                        <div className="text-xs font-medium text-slate-400">Urgences Résolues</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex flex-col bg-slate-950">
                {activeTab === 'vigie' ? (
                    <div className="flex-1 flex flex-col p-8 overflow-y-auto w-full">
                        <div className="max-w-5xl mx-auto w-full">
                            <div className="mb-10">
                                <h1 className="text-3xl font-black text-white flex items-center gap-3">
                                    <div className="p-2 bg-gradient-to-br from-rose-500 to-indigo-600 rounded-xl">
                                        <Zap size={28} className="text-white fill-white" />
                                    </div>
                                    Vigie Bourse de Gardes
                                </h1>
                                <p className="text-slate-400 mt-2">
                                    Surveillance en temps réel de l'algorithme d'affectation paramétrique Ségur.
                                </p>
                            </div>

                            <div className="grid gap-6">
                                {applications.length === 0 ? (
                                    <div className="p-20 text-center text-slate-500 bg-slate-900/50 rounded-3xl border border-slate-800">
                                        Aucune activité d'urgence. Le planning est sécurisé.
                                    </div>
                                ) : (
                                    applications.map(app => (
                                        <div key={app.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center gap-6 shadow-xl relative overflow-hidden group">
                                            {/* Status accent border */}
                                            <div className={cn(
                                                "absolute left-0 top-0 bottom-0 w-1.5",
                                                app.status === 'PENDING' ? "bg-amber-500" :
                                                app.status === 'ACCEPTED' ? "bg-emerald-500" : "bg-rose-500"
                                            )} />
                                            
                                            <div className="flex-1 ml-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xl font-bold text-slate-200">
                                                            {app.agent?.nom}
                                                        </span>
                                                        <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full text-slate-400 border border-slate-700">
                                                            Score IA : {app.score?.toFixed(1) || '0'}
                                                        </span>
                                                    </div>
                                                    
                                                    {app.status === 'PENDING' && (
                                                        <span className="flex items-center gap-1.5 bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full text-xs font-bold border border-amber-500/20">
                                                            <Loader2 size={12} className="animate-spin" /> EN ANALYSE
                                                        </span>
                                                    )}
                                                    {app.status === 'ACCEPTED' && (
                                                        <span className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/20">
                                                            <CheckCircle size={12} /> RETENU
                                                        </span>
                                                    )}
                                                    {app.status === 'REJECTED' && (
                                                        <span className="flex items-center gap-1.5 bg-rose-500/10 text-rose-500 px-3 py-1 rounded-full text-xs font-bold border border-rose-500/20">
                                                            <XCircle size={12} /> REJETÉ
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-6 mt-4">
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Garde Concernée</p>
                                                        <p className="text-sm font-medium text-slate-300 mt-1">
                                                            ID #{app.shift?.id}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Candidature reçue</p>
                                                        <p className="text-sm font-medium text-slate-400 mt-1 flex items-center gap-1">
                                                            <Clock size={14} /> {new Date(app.appliedAt).toLocaleString('fr-FR')}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {app.status === 'PENDING' && (
                                                <div className="md:w-64 bg-slate-950 p-4 rounded-xl border border-slate-800/50">
                                                    <p className="text-xs text-slate-400 italic text-center">
                                                        L'algorithme tranchera automatiquement à la fin du compte à rebours selon les quotas légaux.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                ) : selectedChat ? (
                    <>
                        <div className="p-6 border-b border-slate-800 bg-slate-900/30 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-emerald-500 border border-slate-700">
                                    <User size={20} />
                                </div>
                                <div>
                                    <h2 className="font-bold text-white text-lg">{currentAgent?.nom || selectedChat}</h2>
                                    <p className="text-xs text-slate-500">{currentAgent?.jobTitle || 'Contact externe'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-slate-500 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                                    +{selectedChat}
                                </span>
                            </div>
                        </div>

                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-8 space-y-6 scroll-smooth"
                        >
                            {filteredMessages.map((msg: Message) => (
                                <div
                                    key={msg.id}
                                    className={cn(
                                        "flex flex-col max-w-[70%]",
                                        msg.direction === 'OUTBOUND' ? "ml-auto items-end" : "items-start"
                                    )}
                                >
                                    <div className={cn(
                                        "px-4 py-3 rounded-2xl shadow-lg",
                                        msg.direction === 'OUTBOUND'
                                            ? "bg-emerald-600 text-white rounded-tr-none"
                                            : "bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700"
                                    )}>
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                    </div>
                                    <span className="text-[10px] text-slate-500 mt-1 px-1 flex items-center gap-1">
                                        <Clock size={10} />
                                        {new Date(msg.timestamp).toLocaleString('fr-FR')}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="p-8 border-t border-slate-800 bg-slate-900/30">
                            <div className="flex gap-4 items-end max-w-4xl mx-auto">
                                <textarea
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="Écrivez votre réponse ici..."
                                    className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl p-4 text-sm text-slate-100 outline-none focus:border-emerald-500 transition-colors resize-none shadow-xl"
                                    rows={1}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={isSending || !replyText.trim()}
                                    className="p-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center min-w-[56px]"
                                >
                                    {isSending ? <Loader2 className="animate-spin" size={24} /> : <Send size={24} />}
                                </button>
                            </div>
                            <p className="text-center text-[10px] text-slate-500 mt-4">
                                Appuyez sur Entrée pour envoyer. Le message sera transmis via l'API WhatsApp Business.
                            </p>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-600 p-20 text-center">
                        <div className="w-20 h-20 rounded-full bg-slate-900 flex items-center justify-center mb-6">
                            <MessageSquare size={40} className="text-slate-800" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-400 mb-2">Sélectionnez une conversation</h2>
                        <p className="max-w-xs text-sm">Cliquez sur une discussion dans la liste de gauche pour lire les messages et répondre aux agents.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
