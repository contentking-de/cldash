"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Send,
  Plus,
  MessageCircle,
  Search,
  Users,
  ArrowLeft,
  Check,
  CheckCheck,
} from "lucide-react";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { de } from "date-fns/locale";

type User = {
  id: string;
  name: string | null;
  email: string;
};

type Message = {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  sender: { id: string; name: string | null; email: string };
};

type Conversation = {
  id: string;
  title: string | null;
  isGroup: boolean;
  updatedAt: string;
  participants: User[];
  lastMessage: (Message & { sender: { id: string; name: string | null } }) | null;
  hasUnread: boolean;
};

function getInitials(name: string | null, email: string): string {
  if (name) return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  return email[0].toUpperCase();
}

function getConversationName(conv: Conversation, currentUserId: string): string {
  if (conv.title) return conv.title;
  const others = conv.participants.filter((p) => p.id !== currentUserId);
  return others.map((p) => p.name || p.email).join(", ");
}

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Gestern";
  return format(date, "dd.MM.yy");
}

function MessageDateSeparator({ date }: { date: string }) {
  const d = new Date(date);
  let label: string;
  if (isToday(d)) label = "Heute";
  else if (isYesterday(d)) label = "Gestern";
  else label = format(d, "dd. MMMM yyyy", { locale: de });

  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-slate-200" />
      <span className="text-[11px] font-medium text-slate-400">{label}</span>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  );
}

function shouldShowDateSeparator(current: Message, previous: Message | null): boolean {
  if (!previous) return true;
  const a = new Date(current.createdAt).toDateString();
  const b = new Date(previous.createdAt).toDateString();
  return a !== b;
}

// --- New Conversation Modal ---
function NewConversationModal({
  currentUserId,
  onClose,
  onCreated,
}: {
  currentUserId: string;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [users, setUsers] = useState<User[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [groupTitle, setGroupTitle] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data: Array<{ id: string; name: string | null; email: string }>) =>
        setUsers(data.filter((u) => u.id !== currentUserId).map((u) => ({ id: u.id, name: u.name, email: u.email })))
      );
  }, [currentUserId]);

  const filtered = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  function toggleUser(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleCreate() {
    if (selected.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantIds: selected,
          title: selected.length > 1 ? groupTitle || undefined : undefined,
        }),
      });
      const data = await res.json();
      onCreated(data.id);
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Neues Gespräch</h2>
          <p className="text-sm text-slate-500 mt-0.5">Wähle einen oder mehrere Teilnehmer</p>
        </div>

        <div className="px-5 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name oder E-Mail suchen..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
        </div>

        {selected.length > 1 && (
          <div className="px-5 pb-2">
            <input
              type="text"
              value={groupTitle}
              onChange={(e) => setGroupTitle(e.target.value)}
              placeholder="Gruppenname (optional)"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
        )}

        <div className="max-h-64 overflow-y-auto px-2">
          {filtered.map((u) => {
            const isSelected = selected.includes(u.id);
            return (
              <button
                key={u.id}
                onClick={() => toggleUser(u.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
                  isSelected ? "bg-primary-50" : "hover:bg-slate-50"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                    isSelected ? "bg-primary-500 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {isSelected ? <Check className="w-4 h-4" /> : getInitials(u.name, u.email)}
                </div>
                <div className="text-left min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{u.name || u.email}</p>
                  {u.name && <p className="text-xs text-slate-500 truncate">{u.email}</p>}
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-6">Keine Nutzer gefunden</p>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          >
            Abbrechen
          </button>
          <button
            onClick={handleCreate}
            disabled={selected.length === 0 || loading}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "..." : "Chat starten"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Main Chat Component ---
export function CleverChat({ currentUserId }: { currentUserId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeId = searchParams.get("id");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sending, setSending] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeConversation = conversations.find((c) => c.id === activeId);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/conversations");
      if (res.ok) setConversations(await res.json());
    } catch {}
  }, []);

  const fetchMessages = useCallback(async (convId: string) => {
    try {
      const res = await fetch(`/api/chat/conversations/${convId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 15_000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  useEffect(() => {
    if (activeId) {
      fetchMessages(activeId);
      setMobileShowChat(true);
      const interval = setInterval(() => fetchMessages(activeId), 5_000);
      return () => clearInterval(interval);
    } else {
      setMessages([]);
      setMobileShowChat(false);
    }
  }, [activeId, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function selectConversation(id: string) {
    router.push(`/cleverchat?id=${id}`);
  }

  async function handleSend() {
    if (!input.trim() || !activeId || sending) return;
    const content = input.trim();
    setInput("");
    setSending(true);

    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      content,
      senderId: currentUserId,
      createdAt: new Date().toISOString(),
      sender: { id: currentUserId, name: null, email: "" },
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await fetch(`/api/chat/conversations/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? msg : m)));
        fetchConversations();
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setInput(content);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleCreated(id: string) {
    setShowNewModal(false);
    fetchConversations();
    selectConversation(id);
  }

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery) return true;
    const name = getConversationName(c, currentUserId).toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex h-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      {/* Sidebar */}
      <div
        className={`w-80 border-r border-slate-200 flex flex-col bg-white flex-shrink-0 ${
          mobileShowChat && activeId ? "hidden lg:flex" : "flex"
        } ${!activeId ? "flex-1 lg:flex-none" : ""}`}
      >
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-900">CleverChat</h2>
            <button
              onClick={() => setShowNewModal(true)}
              className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition"
              title="Neues Gespräch"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Gespräche suchen..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
              <MessageCircle className="w-12 h-12 text-slate-200 mb-3" />
              <p className="text-sm font-medium text-slate-400">Keine Gespräche</p>
              <p className="text-xs text-slate-400 mt-1">Starte ein neues Gespräch</p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv.id === activeId;
              const name = getConversationName(conv, currentUserId);
              const others = conv.participants.filter((p) => p.id !== currentUserId);
              const avatar = others[0];

              return (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 transition border-b border-slate-50 last:border-0 ${
                    isActive ? "bg-primary-50" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    {conv.isGroup ? (
                      <div className="w-11 h-11 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center">
                        <Users className="w-5 h-5" />
                      </div>
                    ) : avatar ? (
                      <div className="w-11 h-11 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-sm font-semibold">
                        {getInitials(avatar.name, avatar.email)}
                      </div>
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                        <MessageCircle className="w-5 h-5" />
                      </div>
                    )}
                    {conv.hasUnread && (
                      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary-500 rounded-full ring-2 ring-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${conv.hasUnread ? "font-semibold text-slate-900" : "font-medium text-slate-700"}`}>
                        {name}
                      </p>
                      {conv.lastMessage && (
                        <span className="text-[11px] text-slate-400 flex-shrink-0">
                          {formatMessageTime(conv.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    {conv.lastMessage && (
                      <p className={`text-xs mt-0.5 truncate ${conv.hasUnread ? "text-slate-600 font-medium" : "text-slate-400"}`}>
                        {conv.lastMessage.sender.id === currentUserId ? "Du: " : ""}
                        {conv.lastMessage.content}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      {activeId && activeConversation ? (
        <div className={`flex-1 flex flex-col ${mobileShowChat ? "flex" : "hidden lg:flex"}`}>
          {/* Chat Header */}
          <div className="h-16 px-4 flex items-center gap-3 border-b border-slate-200 bg-white flex-shrink-0">
            <button
              onClick={() => {
                setMobileShowChat(false);
                router.push("/cleverchat");
              }}
              className="lg:hidden p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-shrink-0">
              {activeConversation.isGroup ? (
                <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-sm font-semibold">
                  {getInitials(
                    activeConversation.participants.filter((p) => p.id !== currentUserId)[0]?.name ?? null,
                    activeConversation.participants.filter((p) => p.id !== currentUserId)[0]?.email ?? ""
                  )}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {getConversationName(activeConversation, currentUserId)}
              </p>
              <p className="text-xs text-slate-400">
                {activeConversation.participants.length} Teilnehmer
              </p>
            </div>
          </div>

          {/* Messages */}
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4 bg-slate-50/50">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mb-4">
                  <MessageCircle className="w-8 h-8 text-primary-300" />
                </div>
                <p className="text-sm font-medium text-slate-400">Noch keine Nachrichten</p>
                <p className="text-xs text-slate-400 mt-1">Schreibe die erste Nachricht!</p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isMine = msg.senderId === currentUserId;
                const prev = idx > 0 ? messages[idx - 1] : null;
                const showSeparator = shouldShowDateSeparator(msg, prev);
                const showAvatar = !isMine && (!prev || prev.senderId !== msg.senderId || showSeparator);

                return (
                  <div key={msg.id}>
                    {showSeparator && <MessageDateSeparator date={msg.createdAt} />}
                    <div className={`flex gap-2 mb-1 ${isMine ? "justify-end" : "justify-start"}`}>
                      {!isMine && (
                        <div className="w-8 flex-shrink-0">
                          {showAvatar && (
                            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[11px] font-semibold">
                              {getInitials(msg.sender.name, msg.sender.email)}
                            </div>
                          )}
                        </div>
                      )}
                      <div className={`max-w-[70%] ${isMine ? "items-end" : "items-start"}`}>
                        {showAvatar && !isMine && (
                          <p className="text-[11px] font-medium text-slate-500 mb-0.5 ml-1">
                            {msg.sender.name || msg.sender.email}
                          </p>
                        )}
                        <div
                          className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                            isMine
                              ? "bg-primary-600 text-white rounded-br-md"
                              : "bg-white text-slate-800 border border-slate-200 rounded-bl-md"
                          }`}
                        >
                          {msg.content}
                        </div>
                        <div className={`flex items-center gap-1 mt-0.5 ${isMine ? "justify-end" : "justify-start"} px-1`}>
                          <span className="text-[10px] text-slate-400">
                            {format(new Date(msg.createdAt), "HH:mm")}
                          </span>
                          {isMine && !msg.id.startsWith("temp-") && (
                            <CheckCheck className="w-3 h-3 text-primary-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-slate-200 bg-white flex-shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nachricht schreiben..."
                rows={1}
                className="flex-1 px-4 py-2.5 text-sm border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 max-h-32"
                style={{ minHeight: "42px" }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="p-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center bg-slate-50/30">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-semibold text-slate-400">CleverChat</h3>
            <p className="text-sm text-slate-400 mt-1">Wähle ein Gespräch oder starte ein neues</p>
          </div>
        </div>
      )}

      {showNewModal && (
        <NewConversationModal
          currentUserId={currentUserId}
          onClose={() => setShowNewModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
