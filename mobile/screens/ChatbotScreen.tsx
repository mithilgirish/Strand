import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  Modal,
  Vibration,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../config';
import { supabase } from '../supabase';

interface Citation {
  document: string;
  page: number;
  section: string;
  excerpt?: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'brain';
  text: string;
  timestamp: string;
  citations?: Citation[];
  confidence?: 'High' | 'Medium' | 'Low';
  responseTimeMs?: number;
}

const VALID_CONFIDENCE = new Set<ChatMessage['confidence']>(['High', 'Medium', 'Low']);

/** Safely normalise a raw API response so downstream renderers cannot crash. */
function parseBrainPayload(data: unknown): {
  answerText: string;
  confidence: ChatMessage['confidence'];
  citations: Citation[];
  responseTimeMs: number;
} {
  const FALLBACK_ANSWER = 'No response returned from the Brain API. Please verify backend connection.';

  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return { answerText: FALLBACK_ANSWER, confidence: 'Medium', citations: [], responseTimeMs: 0 };
  }

  const d = data as Record<string, unknown>;

  const answerText =
    typeof d.answer === 'string' && d.answer.trim() ? d.answer : FALLBACK_ANSWER;

  const confidence: ChatMessage['confidence'] = VALID_CONFIDENCE.has(
    d.confidence as ChatMessage['confidence']
  )
    ? (d.confidence as ChatMessage['confidence'])
    : 'Medium';

  const citations: Citation[] = Array.isArray(d.citations)
    ? (d.citations as unknown[]).filter(
        (c): c is Citation =>
          c !== null &&
          typeof c === 'object' &&
          !Array.isArray(c) &&
          typeof (c as Record<string, unknown>).document === 'string'
      )
    : [];

  const responseTimeMs =
    typeof d.response_time_ms === 'number' && isFinite(d.response_time_ms)
      ? d.response_time_ms
      : 0;

  return { answerText, confidence, citations, responseTimeMs };
}

export default function ChatbotScreen({ navigation }: any) {
  const scrollViewRef = useRef<ScrollView>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<{ id: string; title: string; created_at?: string }[]>([]);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'brain',
      text: 'STRAND Brain Agent online. Ask any question regarding project specifications, drawings, TIA-942 compliance, or field installation procedures.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [expandedCitations, setExpandedCitations] = useState<Record<string, boolean>>({});

  const toggleCitations = (msgId: string) => {
    Vibration.vibrate(15);
    setExpandedCitations((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  const handleOpenCitationDoc = (cit: Citation) => {
    Vibration.vibrate(20);
    setSelectedCitation(cit);
  };

  useEffect(() => {
    void initializeSession();
  }, []);

  const initializeSession = async () => {
    try {
      const { data: fetchedSessions } = await supabase
        .from('chat_sessions')
        .select('id, title, created_at')
        .order('created_at', { ascending: false });

      if (fetchedSessions && fetchedSessions.length > 0) {
        setSessions(fetchedSessions);
        setSessionId(fetchedSessions[0].id);
        void fetchMessages(fetchedSessions[0].id);
      } else {
        const fakeId = 'local_' + Date.now();
        setSessions([{ id: fakeId, title: 'New Conversation' }]);
        setSessionId(fakeId);
        supabase
          .from('chat_sessions')
          .insert({ title: 'New Conversation' })
          .select()
          .single()
          .then(({ data }) => {
            if (data) {
              setSessions([{ id: data.id, title: 'New Conversation' }]);
              setSessionId(data.id);
            }
          });
      }
    } catch (err) {
      console.error('Init session err:', err);
    } finally {
      setIsInitializing(false);
    }
  };

  const fetchMessages = async (activeId: string) => {
    try {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', activeId)
        .order('created_at', { ascending: true });

      if (data && data.length > 0) {
        setMessages(
          data.map((m) => ({
            id: m.id,
            sender: m.sender as 'user' | 'brain',
            text: m.text,
            citations: Array.isArray(m.citations) ? m.citations : [],
            confidence: (m.confidence as ChatMessage['confidence']) || 'Medium',
            timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }))
        );
      } else {
        setMessages([
          {
            id: '1',
            sender: 'brain',
            text: 'STRAND Brain Agent online. Ask any question regarding project specifications, drawings, TIA-942 compliance, or field installation procedures.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err) {
      console.error('Fetch messages error:', err);
    }
  };

  const handleNewChat = async () => {
    Vibration.vibrate(20);
    const tempId = 'local_' + Date.now();
    const newSession = { id: tempId, title: 'New Conversation' };

    setSessions((prev) => [newSession, ...prev]);
    setSessionId(tempId);
    setMessages([
      {
        id: '1',
        sender: 'brain',
        text: 'STRAND Brain Agent online. Ask any question regarding project specifications, drawings, TIA-942 compliance, or field installation procedures.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setShowSessionModal(false);

    try {
      const { data } = await supabase.from('chat_sessions').insert({ title: 'New Conversation' }).select().single();
      if (data) {
        setSessions((prev) => prev.map((s) => (s.id === tempId ? { id: data.id, title: 'New Conversation' } : s)));
        setSessionId(data.id);
      }
    } catch (err) {
      console.error('Failed to sync new chat:', err);
    }
  };

  const switchSession = (id: string) => {
    Vibration.vibrate(20);
    setSessionId(id);
    fetchMessages(id);
    setShowSessionModal(false);
  };

  const handleDeleteSession = (idToDelete: string, sessionTitle: string) => {
    Vibration.vibrate(20);
    Alert.alert(
      'Delete Conversation',
      `Are you sure you want to delete "${sessionTitle || 'this conversation'}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            Vibration.vibrate(30);
            const remaining = sessions.filter((s) => s.id !== idToDelete);
            setSessions(remaining);

            // If the deleted session was currently open, switch or reset
            if (sessionId === idToDelete) {
              if (remaining.length > 0) {
                setSessionId(remaining[0].id);
                fetchMessages(remaining[0].id);
              } else {
                void handleNewChat();
              }
            }

            // Sync deletion with Supabase DB
            if (!idToDelete.startsWith('local_')) {
              try {
                await supabase.from('chat_messages').delete().eq('session_id', idToDelete);
                await supabase.from('chat_sessions').delete().eq('id', idToDelete);
              } catch (err) {
                console.error('Failed to delete session from cloud:', err);
              }
            }
          },
        },
      ]
    );
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputText).trim();
    if (!textToSend) return;

    setInputText('');
    setIsTyping(true);
    let activeId = sessionId;

    try {
      if (!activeId) {
        const { data: newSession } = await supabase
          .from('chat_sessions')
          .insert({
            title: textToSend.length > 30 ? textToSend.slice(0, 27) + '...' : textToSend,
          })
          .select()
          .single();

        if (!newSession) throw new Error('Failed to create chat session');
        activeId = newSession.id;
        setSessionId(activeId);
        setSessions((prev) => [newSession, ...prev]);
      } else {
        const currentSession = sessions.find((s) => s.id === activeId);
        if (currentSession && currentSession.title === 'New Conversation') {
          const newTitle = textToSend.length > 30 ? textToSend.slice(0, 27) + '...' : textToSend;
          await supabase.from('chat_sessions').update({ title: newTitle }).eq('id', activeId);
          setSessions((prev) => prev.map((s) => (s.id === activeId ? { ...s, title: newTitle } : s)));
        }
      }

      // Optimistic user message
      const tempMsgId = 'msg_' + Date.now();
      setMessages((prev) => [
        ...prev,
        {
          id: tempMsgId,
          sender: 'user',
          text: textToSend,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);

      if (activeId && !activeId.startsWith('local_')) {
        supabase
          .from('chat_messages')
          .insert({
            session_id: activeId,
            sender: 'user',
            text: textToSend,
          })
          .then();
      }

      // Fetch answer from API
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(`${API_BASE_URL}/brain/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ question: textToSend, project_id: 'default' }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const raw = await response.json();
        const { answerText, confidence, citations, responseTimeMs } = parseBrainPayload(raw);

        const tempBrainId = 'brain_' + Date.now();
        setMessages((prev) => [
          ...prev,
          {
            id: tempBrainId,
            sender: 'brain',
            text: answerText,
            citations,
            confidence,
            responseTimeMs,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);

        if (activeId && !activeId.startsWith('local_')) {
          supabase
            .from('chat_messages')
            .insert({
              session_id: activeId,
              sender: 'brain',
              text: answerText,
              citations,
              confidence,
              response_time_ms: responseTimeMs,
            })
            .then();
        }
      } else {
        throw new Error(`API returned status ${response.status}`);
      }
      setIsTyping(false);
    } catch (err) {
      console.log('Brain API offline or error:', err);
      const fallbackMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'brain',
        text: 'The Brain API is currently unreachable. Grounded query responses require an active backend node connection.',
        confidence: 'Low',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
      setIsTyping(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => setShowSessionModal(true)}
          style={styles.headerBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubbles-outline" size={16} color="#4edea3" />
          <Text style={styles.headerBtnText}>History</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.title}>BRAIN AGENT</Text>
          <View style={styles.statusIndicatorRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.subtitle}>SPEC-DNA INTELLIGENCE</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleNewChat}
          style={styles.headerBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={16} color="#4edea3" />
          <Text style={styles.headerBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <ScrollView
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          keyboardShouldPersistTaps="handled"
          ref={scrollViewRef}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.messageRow,
                msg.sender === 'user' ? styles.userRow : styles.brainRow,
              ]}
            >
              <View
                style={[
                  styles.bubble,
                  msg.sender === 'user' ? styles.userBubble : styles.brainBubble,
                ]}
              >
                {/* Brain Header Tag */}
                {msg.sender === 'brain' && (
                  <View style={styles.brainHeaderTag}>
                    <Ionicons name="hardware-chip-outline" size={12} color="#4edea3" />
                    <Text style={styles.brainTagText}>STRAND BRAIN</Text>
                  </View>
                )}

                <Text
                  style={[
                    styles.messageText,
                    msg.sender === 'user' ? styles.userText : styles.brainText,
                  ]}
                >
                  {msg.text}
                </Text>

                {msg.sender === 'user' ? (
                  <Text style={styles.timestamp}>{msg.timestamp}</Text>
                ) : (
                  <>
                    {/* Citations Container */}
                    {msg.citations && msg.citations.length > 0 && (
                      <View style={styles.citationsContainer}>
                        <TouchableOpacity
                          style={styles.citationsHeader}
                          onPress={() => toggleCitations(msg.id)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={expandedCitations[msg.id] ? 'chevron-down' : 'chevron-forward'}
                            size={12}
                            color="#8e8e93"
                          />
                          <Text style={styles.citationsHeaderText}>
                            Grounding Sources ({msg.citations.length})
                          </Text>
                        </TouchableOpacity>

                        {expandedCitations[msg.id] && (
                          <View style={styles.citationsList}>
                            {msg.citations.map((cit, idx) => {
                              const docName = typeof cit?.document === 'string'
                                ? cit.document.split('/').pop() || 'Specification Document'
                                : 'Specification Document';
                              const sectionName = typeof cit?.section === 'string' && cit.section
                                ? `Section §${cit.section}`
                                : 'General Section';
                              const pageNum = cit?.page ? `Page ${cit.page}` : '';
                              const metaText = [sectionName, pageNum].filter(Boolean).join(' • ');
                              const excerptText = typeof cit?.excerpt === 'string' ? cit.excerpt.trim() : '';

                              return (
                                <TouchableOpacity
                                  key={idx}
                                  style={styles.citationCard}
                                  onPress={() => handleOpenCitationDoc(cit)}
                                  activeOpacity={0.7}
                                >
                                  <View style={styles.citationTopRow}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                                      <Ionicons name="document-text-outline" size={14} color="#4edea3" />
                                      <Text style={styles.citationDocName} numberOfLines={1}>
                                        {docName}
                                      </Text>
                                    </View>
                                    <View style={styles.openDocBadge}>
                                      <Text style={styles.openDocText}>Open Doc</Text>
                                      <Ionicons name="open-outline" size={11} color="#4edea3" />
                                    </View>
                                  </View>

                                  <Text style={styles.citationMeta}>
                                    {metaText}
                                  </Text>

                                  {excerptText ? (
                                    <Text style={styles.citationExcerpt} numberOfLines={2}>
                                      "{excerptText}"
                                    </Text>
                                  ) : null}
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    )}

                    {/* Metadata Footer */}
                    <View style={styles.metaRow}>
                      <View style={styles.metaLeft}>
                        {msg.confidence && (
                          <View
                            style={[
                              styles.confidenceBadge,
                              msg.confidence === 'High' && styles.confHigh,
                              msg.confidence === 'Medium' && styles.confMed,
                              msg.confidence === 'Low' && styles.confLow,
                            ]}
                          >
                            <Text
                              style={[
                                styles.confidenceText,
                                msg.confidence === 'High' && styles.confHighText,
                                msg.confidence === 'Medium' && styles.confMedText,
                                msg.confidence === 'Low' && styles.confLowText,
                              ]}
                            >
                              {msg.confidence.toUpperCase()} CONFIDENCE
                            </Text>
                          </View>
                        )}
                        {msg.responseTimeMs !== undefined && msg.responseTimeMs > 0 && (
                          <View style={styles.latencyBadge}>
                            <Ionicons name="time-outline" size={10} color="#737373" />
                            <Text style={styles.latencyText}>
                              {(msg.responseTimeMs / 1000).toFixed(2)}s
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.timestamp}>{msg.timestamp}</Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          ))}

          {isTyping && (
            <View style={[styles.messageRow, styles.brainRow]}>
              <View style={[styles.bubble, styles.brainBubble, styles.typingBubble]}>
                <ActivityIndicator size="small" color="#4edea3" />
                <Text style={styles.typingText}>Reasoning over spec database...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* ── Input Bar ──────────────────────────────────────────────── */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Ask about specs, drawings, NCRs..."
            placeholderTextColor="#666666"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => handleSendMessage()}
            editable={!isInitializing}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={() => handleSendMessage()}
            disabled={isInitializing || !inputText.trim()}
          >
            <Ionicons name="arrow-up" size={18} color="#111111" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ── Grounding Source Document Viewer Modal ─────────────────── */}
      {selectedCitation && (
        <Modal visible={true} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.docViewerSheet}>
              {/* Header */}
              <View style={styles.docViewerHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <View style={styles.docViewerIconBox}>
                    <Ionicons name="document-text" size={20} color="#4edea3" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docViewerTitle} numberOfLines={1}>
                      {typeof selectedCitation.document === 'string'
                        ? selectedCitation.document.split('/').pop() || 'Specification Document'
                        : 'Specification Document'}
                    </Text>
                    <Text style={styles.docViewerSubtitle}>SPEC-DNA GROUNDED SOURCE</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setSelectedCitation(null)}>
                  <Ionicons name="close" size={24} color="#737373" />
                </TouchableOpacity>
              </View>

              {/* Document Meta Chips */}
              <View style={styles.docMetaChipsRow}>
                <View style={styles.docMetaChip}>
                  <Ionicons name="bookmark-outline" size={12} color="#4edea3" />
                  <Text style={styles.docMetaChipText}>
                    Section §{selectedCitation.section || 'General'}
                  </Text>
                </View>
                <View style={styles.docMetaChip}>
                  <Ionicons name="newspaper-outline" size={12} color="#38bdf8" />
                  <Text style={[styles.docMetaChipText, { color: '#38bdf8' }]}>
                    Page {selectedCitation.page || 1}
                  </Text>
                </View>
                <View style={styles.docMetaChip}>
                  <Ionicons name="shield-checkmark-outline" size={12} color="#f59e0b" />
                  <Text style={[styles.docMetaChipText, { color: '#f59e0b' }]}>
                    Verified Lineage
                  </Text>
                </View>
              </View>

              {/* Document Source Path */}
              {selectedCitation.document ? (
                <View style={styles.docPathBox}>
                  <Text style={styles.docPathLabel}>DOCUMENT PATH:</Text>
                  <Text style={styles.docPathValue} numberOfLines={1}>
                    {selectedCitation.document}
                  </Text>
                </View>
              ) : null}

              {/* Document Excerpt Content */}
              <Text style={styles.excerptSectionLabel}>EXTRACTED SPECIFICATION EXCERPT</Text>
              <ScrollView style={styles.docExcerptScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.docExcerptContainer}>
                  <Text style={styles.docExcerptFullText}>
                    {selectedCitation.excerpt && selectedCitation.excerpt.trim()
                      ? selectedCitation.excerpt.trim()
                      : 'Full grounding paragraph verified against project specification index. No inline excerpt attached to this node reference.'}
                  </Text>
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View style={styles.docViewerActions}>
                <TouchableOpacity
                  style={styles.docViewerCloseBtn}
                  onPress={() => setSelectedCitation(null)}
                >
                  <Text style={styles.docViewerCloseText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ── Sessions Modal ─────────────────────────────────────────── */}
      <Modal visible={showSessionModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="chatbubbles-outline" size={18} color="#4edea3" />
                <Text style={styles.modalTitle}>Conversation History</Text>
              </View>
              <TouchableOpacity onPress={() => setShowSessionModal(false)}>
                <Ionicons name="close" size={22} color="#737373" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sessionList}>
              {sessions.length === 0 ? (
                <Text style={styles.emptySessionText}>No conversation history found.</Text>
              ) : (
                sessions.map((s) => (
                  <View
                    key={s.id}
                    style={[styles.sessionItem, s.id === sessionId && styles.activeSessionItem]}
                  >
                    <TouchableOpacity
                      style={styles.sessionItemContent}
                      onPress={() => switchSession(s.id)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[styles.sessionTitle, s.id === sessionId && styles.activeSessionTitle]}
                        numberOfLines={1}
                      >
                        {s.title || 'Conversation'}
                      </Text>
                      {s.created_at ? (
                        <Text style={styles.sessionDate}>
                          {new Date(s.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </Text>
                      ) : null}
                    </TouchableOpacity>

                    <View style={styles.sessionRightActions}>
                      {s.id === sessionId && (
                        <Ionicons name="checkmark-circle" size={17} color="#4edea3" style={{ marginRight: 6 }} />
                      )}
                      <TouchableOpacity
                        style={styles.deleteSessionBtn}
                        onPress={() => handleDeleteSession(s.id, s.title)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="trash-outline" size={15} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <TouchableOpacity style={styles.newChatModalBtn} onPress={handleNewChat}>
              <Ionicons name="add-circle-outline" size={16} color="#111111" />
              <Text style={styles.newChatModalBtnText}>Start New Conversation</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#262626',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111111',
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2d2d2d',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  headerBtnText: {
    color: '#e5e5e5',
    fontSize: 12,
    fontWeight: '700',
  },
  headerCenter: {
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '900',
    color: '#f5f5f5',
    letterSpacing: 0.8,
  },
  statusIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  onlineDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#4edea3',
  },
  subtitle: {
    fontSize: 9,
    color: '#737373',
    fontWeight: '800',
    letterSpacing: 0.6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  keyboardContainer: {
    flex: 1,
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    paddingBottom: 24,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 14,
    width: '100%',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  brainRow: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  userBubble: {
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: '#333333',
    borderBottomRightRadius: 2,
  },
  brainBubble: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#262626',
    borderBottomLeftRadius: 2,
  },
  brainHeaderTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  brainTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4edea3',
    letterSpacing: 0.8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  typingText: {
    fontSize: 11,
    color: '#737373',
    fontStyle: 'italic',
  },
  messageText: {
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: '400',
  },
  userText: {
    color: '#f0f0f0',
  },
  brainText: {
    color: '#e5e5e5',
  },
  timestamp: {
    fontSize: 9,
    color: '#737373',
    alignSelf: 'flex-end',
    marginTop: 6,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  citationsContainer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderColor: '#262626',
    paddingTop: 8,
  },
  citationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  citationsHeaderText: {
    color: '#8e8e93',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  citationsList: {
    marginTop: 6,
    gap: 6,
  },
  citationCard: {
    backgroundColor: '#111111',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#262626',
  },
  citationTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  citationDocName: {
    color: '#f5f5f5',
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  openDocBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(78, 222, 163, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(78, 222, 163, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  openDocText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#4edea3',
  },
  citationMeta: {
    color: '#737373',
    fontSize: 9,
    marginTop: 3,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  citationExcerpt: {
    color: '#a3a3a3',
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 4,
    lineHeight: 14,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 4,
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  confidenceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  confidenceText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  confHigh: {
    backgroundColor: 'rgba(78, 222, 163, 0.1)',
    borderColor: 'rgba(78, 222, 163, 0.3)',
  },
  confHighText: {
    color: '#4edea3',
  },
  confMed: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  confMedText: {
    color: '#f59e0b',
  },
  confLow: {
    backgroundColor: 'rgba(255, 179, 173, 0.1)',
    borderColor: 'rgba(255, 179, 173, 0.3)',
  },
  confLowText: {
    color: '#ffb3ad',
  },
  latencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#262626',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  latencyText: {
    color: '#737373',
    fontSize: 9,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  inputBar: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#111111',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: '#2d2d2d',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
    color: '#f5f5f5',
    fontSize: 13,
  },
  sendButton: {
    backgroundColor: '#4edea3',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#262626',
    opacity: 0.5,
  },
  docViewerSheet: {
    backgroundColor: '#171717',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: '#262626',
    borderBottomWidth: 0,
    maxHeight: '82%',
    padding: 16,
  },
  docViewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#262626',
  },
  docViewerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(78, 222, 163, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docViewerTitle: {
    color: '#f5f5f5',
    fontSize: 14,
    fontWeight: '800',
  },
  docViewerSubtitle: {
    color: '#737373',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 2,
  },
  docMetaChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 12,
  },
  docMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#262626',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  docMetaChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4edea3',
  },
  docPathBox: {
    backgroundColor: '#111111',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 8,
    marginBottom: 12,
  },
  docPathLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#737373',
    letterSpacing: 0.6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  docPathValue: {
    fontSize: 10,
    color: '#a3a3a3',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 2,
  },
  excerptSectionLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8e8e93',
    letterSpacing: 0.6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 6,
  },
  docExcerptScroll: {
    maxHeight: 220,
  },
  docExcerptContainer: {
    backgroundColor: '#111111',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 12,
  },
  docExcerptFullText: {
    color: '#e5e5e5',
    fontSize: 12,
    lineHeight: 18,
  },
  docViewerActions: {
    marginTop: 14,
  },
  docViewerCloseBtn: {
    backgroundColor: '#262626',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docViewerCloseText: {
    color: '#f5f5f5',
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#171717',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: '#262626',
    borderBottomWidth: 0,
    maxHeight: '75%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderColor: '#262626',
  },
  modalTitle: {
    color: '#f5f5f5',
    fontSize: 15,
    fontWeight: '800',
  },
  sessionList: {
    maxHeight: 320,
    marginVertical: 10,
  },
  emptySessionText: {
    fontSize: 12,
    color: '#737373',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#141414',
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#262626',
    overflow: 'hidden',
  },
  sessionItemContent: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  activeSessionItem: {
    borderColor: '#4edea3',
    backgroundColor: 'rgba(78, 222, 163, 0.08)',
  },
  sessionTitle: {
    color: '#e5e5e5',
    fontSize: 13,
    fontWeight: '600',
  },
  activeSessionTitle: {
    color: '#4edea3',
    fontWeight: '700',
  },
  sessionDate: {
    color: '#737373',
    fontSize: 9,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  sessionRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
  },
  deleteSessionBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  newChatModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#4edea3',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 8,
  },
  newChatModalBtnText: {
    color: '#111111',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
});
