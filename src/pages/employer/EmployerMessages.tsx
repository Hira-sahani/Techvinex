import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useEmployerCandidates, useEmployerJobs } from "@/hooks/useEmployerData";
import { supabase } from "@/integrations/supabase/client";
import { subscribeRealtime, debouncedInvalidate } from "@/lib/realtimeBus";
import { Send, Search, MessageSquare, Check, CheckCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { EmployerListSkeleton } from "@/components/skeletons/EmployerSkeletons";
import { formatDistanceToNow } from "date-fns";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  job_id: string | null;
  candidate_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

// Bypass TS for new table
const db = supabase as any;

const EmployerMessages = () => {
  const { user } = useAuth();
  const { data: candidates = [], isLoading: candLoading } = useEmployerCandidates();
  const { data: jobs = [] } = useEmployerJobs();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch messages
  const fetchMessages = async () => {
    if (!user) return;
    const { data } = await db.from("employer_messages").select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: true });
    setMessages(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();

    if (!user) return;
    // Multiplexed onto the shared global realtime channel with 250 ms debounce.
    const refetch = debouncedInvalidate(() => { void fetchMessages(); }, 250);
    return subscribeRealtime({
      table: "employer_messages",
      scope: "global",
      handler: refetch,
    });
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedCandidate]);

  // Get unique conversation partners from candidates
  const conversationCandidates = candidates.filter(c => {
    if (!search) return true;
    return c.candidate_name.toLowerCase().includes(search.toLowerCase());
  });

  // Messages for selected candidate (using candidate_id field)
  const selectedMessages = selectedCandidate
    ? messages.filter(m => m.candidate_id === selectedCandidate)
    : [];

  const selectedCandidateInfo = candidates.find(c => c.id === selectedCandidate);
  const getJobTitle = (jobId: string) => jobs.find(j => j.id === jobId)?.title || "";

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedCandidate || !user) return;
    setSending(true);

    try {
      const candidate = candidates.find(c => c.id === selectedCandidate);
      const { error } = await db.from("employer_messages").insert({
        sender_id: user.id,
        receiver_id: user.id, // In a real system this would be the candidate's user_id
        candidate_id: selectedCandidate,
        job_id: candidate?.job_id || null,
        message: newMessage.trim(),
      });

      if (error) throw error;
      setNewMessage("");

      // Send notification
      supabase.functions.invoke("send-notification", {
        body: {
          user_id: user.id,
          title: `Message sent to ${candidate?.candidate_name}`,
          body: newMessage.trim().slice(0, 100),
          trigger_type: "message_sent",
        },
      }).catch(() => {});
    } catch (e: any) {
      toast.error(e.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  if (candLoading || loading) {
    return <EmployerListSkeleton />;
  }

  return (
    <div className="flex h-[calc(100vh-120px)] max-w-6xl gap-0 bg-card rounded-xl border border-border shadow-card overflow-hidden">
      {/* Sidebar: Candidate list */}
      <div className="w-80 border-r border-border flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground mb-3">Messages</h2>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search candidates..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 text-sm h-9" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversationCandidates.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No candidates to message</p>
          ) : (
            conversationCandidates.map(c => {
              const candidateMessages = messages.filter(m => m.candidate_id === c.id);
              const lastMsg = candidateMessages[candidateMessages.length - 1];
              const isSelected = selectedCandidate === c.id;

              return (
                <button key={c.id} onClick={() => setSelectedCandidate(c.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border/50 ${
                    isSelected ? "bg-primary/5 border-l-2 border-l-primary" : ""
                  }`}>
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                    {c.candidate_name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{c.candidate_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {lastMsg ? lastMsg.message.slice(0, 40) : getJobTitle(c.job_id)}
                    </p>
                  </div>
                  {candidateMessages.length > 0 && (
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">
                      {formatDistanceToNow(new Date(lastMsg.created_at), { addSuffix: false })}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {!selectedCandidate ? (
          <div className="flex-1 flex items-center justify-center flex-col gap-3">
            <MessageSquare size={48} className="text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Select a candidate to start messaging</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="px-5 py-4 border-b border-border flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                {selectedCandidateInfo?.candidate_name.split(" ").map(n => n[0]).join("")}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{selectedCandidateInfo?.candidate_name}</p>
                <p className="text-xs text-muted-foreground">{getJobTitle(selectedCandidateInfo?.job_id || "")}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {selectedMessages.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-xs text-muted-foreground">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                selectedMessages.map(m => {
                  const isMine = m.sender_id === user?.id;
                  return (
                    <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                        isMine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"
                      }`}>
                        <p className="text-sm">{m.message}</p>
                        <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : ""}`}>
                          <span className={`text-[10px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                          </span>
                          {isMine && (m.is_read ? <CheckCheck size={12} className="text-primary-foreground/60" /> : <Check size={12} className="text-primary-foreground/40" />)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-5 py-4 border-t border-border">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                  className="flex-1"
                />
                <Button onClick={handleSend} disabled={sending || !newMessage.trim()} size="icon"
                  className="gradient-cta text-primary-foreground border-0 w-10 h-10">
                  <Send size={16} />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EmployerMessages;
