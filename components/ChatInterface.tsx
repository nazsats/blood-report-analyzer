// components/ChatInterface.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, X, Loader2, Bot, User, Sparkles, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "@/lib/firebaseClient";
import ReactMarkdown from "react-markdown";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
}

interface ChatInterfaceProps {
    reportId: string;
    reportSummary: string;
}

const SUGGESTIONS = [
    "What's causing my abnormal results?",
    "What should I eat to improve my results?",
    "What are my biggest health risks?",
    "Which supplements should I take first?",
    "How soon should I retest?",
];

export default function ChatInterface({ reportId, reportSummary }: ChatInterfaceProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            role: "assistant",
            content: "Hi! 👋 I've reviewed your full blood report — every marker, prediction, and recommendation. Ask me anything about your results and I'll give you specific, personalised answers.",
        },
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const handleSend = async (text?: string) => {
        const msg = (text || input).trim();
        if (!msg || loading) return;

        const userMsg: Message = { id: Date.now().toString(), role: "user", content: msg };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setLoading(true);

        try {
            // Get auth token if available for richer context
            const token = await auth.currentUser?.getIdToken().catch(() => null);
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    reportId,
                    messages: [...messages, userMsg],
                    context: reportSummary,
                }),
            });

            if (!res.ok) throw new Error("Failed to get response");
            const data = await res.json();
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: data.response,
            }]);
        } catch {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
            }]);
        } finally {
            setLoading(false);
        }
    };

    const showSuggestions = messages.length <= 1;

    return (
        <>
            {/* Floating button */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setIsOpen(true)}
                        className="fixed bottom-8 right-8 z-40 p-4 rounded-2xl bg-gradient-to-br from-primary-600 to-secondary-500 text-white shadow-2xl shadow-primary-600/40 flex items-center gap-3 group"
                    >
                        <MessageCircle className="h-6 w-6" />
                        <span className="hidden sm:inline text-sm font-bold">Ask Dr. AI</span>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Chat window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 80, scale: 0.92 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 80, scale: 0.92 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed bottom-8 right-4 sm:right-8 z-50 w-[calc(100vw-2rem)] sm:w-[420px] h-[620px] max-h-[85vh] rounded-3xl overflow-hidden shadow-2xl shadow-black/50 flex flex-col"
                        style={{ background: "linear-gradient(160deg, #12072a 0%, #0a0414 100%)", border: "1px solid rgba(124,58,237,0.25)" }}
                    >
                        {/* Top gradient line */}
                        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary-500 to-transparent" />

                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-white/8 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-600 to-secondary-500 flex items-center justify-center">
                                    <Bot className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-sm">Dr. AI Assistant</h3>
                                    <p className="text-xs text-accent-400 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-accent-400 inline-block animate-pulse" />
                                        Report loaded · Ready to help
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)}
                                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-all">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin" ref={scrollRef}>
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex items-end gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mb-0.5 ${msg.role === "user"
                                        ? "bg-gradient-to-br from-primary-600 to-secondary-500"
                                        : "bg-white/8 border border-white/10"}`}>
                                        {msg.role === "user"
                                            ? <User className="h-3.5 w-3.5 text-white" />
                                            : <Bot className="h-3.5 w-3.5 text-primary-300" />}
                                    </div>
                                    <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === "user"
                                        ? "bg-gradient-to-br from-primary-600 to-secondary-600 text-white rounded-br-none"
                                        : "bg-white/6 border border-white/8 text-gray-200 rounded-bl-none"}`}>
                                        <div className="prose prose-sm prose-invert max-w-none [&_p]:mb-1 [&_ul]:mt-1 [&_strong]:text-white">
                                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {loading && (
                                <div className="flex items-end gap-2.5">
                                    <div className="w-7 h-7 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center shrink-0">
                                        <Bot className="h-3.5 w-3.5 text-primary-300" />
                                    </div>
                                    <div className="bg-white/6 border border-white/8 rounded-2xl rounded-bl-none px-4 py-3">
                                        <div className="flex gap-1">
                                            {[0, 1, 2].map(i => (
                                                <div key={i} className="w-2 h-2 rounded-full bg-primary-400 animate-bounce"
                                                    style={{ animationDelay: `${i * 0.15}s` }} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Suggestions */}
                            {showSuggestions && !loading && (
                                <div className="pt-2">
                                    <p className="text-xs text-gray-600 mb-2 flex items-center gap-1.5">
                                        <Sparkles className="w-3 h-3" /> Suggested questions
                                    </p>
                                    <div className="flex flex-col gap-2">
                                        {SUGGESTIONS.map((s, i) => (
                                            <button key={i} onClick={() => handleSend(s)}
                                                className="text-left text-xs text-primary-300 border border-primary-500/20 rounded-xl px-3 py-2.5 bg-primary-500/5 hover:bg-primary-500/15 hover:border-primary-500/40 transition-all flex items-center justify-between group">
                                                {s}
                                                <ChevronDown className="w-3 h-3 rotate-[-90deg] opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-white/8 shrink-0">
                            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ask about your results…"
                                    className="flex-1 bg-white/6 border border-white/10 text-white placeholder:text-gray-600 px-4 py-3 rounded-2xl focus:outline-none focus:border-primary-500/50 focus:bg-white/8 transition-all text-sm"
                                />
                                <button type="submit" disabled={!input.trim() || loading}
                                    className="p-3 bg-gradient-to-br from-primary-600 to-secondary-500 text-white rounded-2xl hover:shadow-lg hover:shadow-primary-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0">
                                    <Send className="h-4 w-4" />
                                </button>
                            </form>
                            <p className="text-center text-gray-700 text-xs mt-2">AI for informational purposes only · Not medical advice</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
