import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  const FALLBACK_ANSWER = 'No answer returned. Please check the backend connection.';

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
  const [sessions, setSessions] = useState<{id: string, title: string}[]>([]);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'brain',
      text: 'STRAND Brain Agent initialized. Ask me any question about the project specs, drawings, or active installation compliance.',
      timestamp: '02:30 AM'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [expandedCitations, setExpandedCitations] = useState<Record<string, boolean>>({});

  const toggleCitations = (msgId: string) => {
    setExpandedCitations(prev => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  };

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    initializeSession();

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  const initializeSession = async () => {
    try {
      const { data: fetchedSessions, error } = await supabase
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
        supabase.from('chat_sessions').insert({ title: 'New Conversation' }).select().single().then(({ data }) => {
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
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', activeId)
        .order('created_at', { ascending: true });

      if (data && data.length > 0) {
        setMessages(data.map(m => ({
          id: m.id,
          sender: m.sender as 'user' | 'brain',
          text: m.text,
          citations: Array.isArray(m.citations) ? m.citations : [],
          confidence: m.confidence as ChatMessage['confidence'] || 'Medium',
          timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })));
      } else {
        setMessages([{
          id: '1',
          sender: 'brain',
          text: 'STRAND Brain Agent initialized. Ask me any question about the project specs, drawings, or active installation compliance.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleNewChat = async () => {
    const tempId = 'local_' + Date.now();
    const newSession = { id: tempId, title: 'New Conversation' };
    
    setSessions(prev => [newSession, ...prev]);
    setSessionId(tempId);
    setMessages([{
      id: '1',
      sender: 'brain',
      text: 'STRAND Brain Agent initialized. Ask me any question about the project specs, drawings, or active installation compliance.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    setShowSessionModal(false);

    try {
      const { data } = await supabase.from('chat_sessions').insert({ title: 'New Conversation' }).select().single();
      if (data) {
        setSessions(prev => prev.map(s => s.id === tempId ? { id: data.id, title: 'New Conversation' } : s));
        setSessionId(data.id);
      }
    } catch (err) {
      console.error("Failed to sync new chat:", err);
    }
  };

  const switchSession = (id: string) => {
    setSessionId(id);
    fetchMessages(id);
    setShowSessionModal(false);
  };

  /** Factory to build a brain ChatMessage – single source of truth for the shape. */
  const buildBrainMessage = (opts: {
    text: string;
    citations?: Citation[];
    confidence?: ChatMessage['confidence'];
    responseTimeMs?: number;
  }): ChatMessage => ({
    id: (Date.now() + 1).toString(),
    sender: 'brain',
    text: opts.text,
    citations: opts.citations ?? [],
    confidence: opts.confidence ?? 'Medium',
    responseTimeMs: opts.responseTimeMs ?? 0,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  });


  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userText = inputText.trim();
    setInputText('');
    setIsTyping(true);
    let activeId = sessionId;

    try {
      if (!activeId) {
        // Fallback if somehow no session exists
        const { data: newSession } = await supabase
          .from('chat_sessions')
          .insert({
            title: userText.length > 30 ? userText.slice(0, 27) + '...' : userText
          })
          .select()
          .single();
          
        if (!newSession) throw new Error("Failed to create chat session");
        activeId = newSession.id;
        setSessionId(activeId);
        setSessions(prev => [newSession, ...prev]);
      } else {
        // Rename session if it's new
        const currentSession = sessions.find(s => s.id === activeId);
        if (currentSession && currentSession.title === 'New Conversation') {
          const newTitle = userText.length > 30 ? userText.slice(0, 27) + '...' : userText;
          await supabase.from('chat_sessions').update({ title: newTitle }).eq('id', activeId);
          setSessions(prev => prev.map(s => s.id === activeId ? { ...s, title: newTitle } : s));
        }
      }

      // Optimistic update for user message
      const tempMsgId = 'msg_' + Date.now();
      setMessages(prev => [
        ...prev,
        {
          id: tempMsgId,
          sender: 'user',
          text: userText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);

      // 1. Sync user message to DB in background
      if (activeId && !activeId.startsWith('local_')) {
        supabase.from('chat_messages').insert({
          session_id: activeId,
          sender: 'user',
          text: userText
        }).then();
      }

      // 2. Fetch answer from API
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(`${API_BASE_URL}/brain/query`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ question: userText, project_id: 'default' }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const raw = await response.json();
        const { answerText, confidence, citations, responseTimeMs } = parseBrainPayload(raw);

        const tempBrainId = 'brain_' + Date.now();
        setMessages(prev => [
          ...prev,
          {
            id: tempBrainId,
            sender: 'brain',
            text: answerText,
            citations: citations,
            confidence: confidence,
            responseTimeMs: responseTimeMs,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);

        // 3. Sync brain answer to DB
        if (activeId && !activeId.startsWith('local_')) {
          supabase.from('chat_messages').insert({
            session_id: activeId,
            sender: 'brain',
            text: answerText,
            citations: citations,
            confidence: confidence,
            response_time_ms: responseTimeMs
          }).then();
        }
      } else {
        throw new Error(`API returned status ${response.status}`);
      }
      setIsTyping(false);
    } catch (err) {
      console.log('Brain API offline or error:', err);
      const errorMsg = buildBrainMessage({ text: "Error: Could not reach the Brain API. Please check your connection.", confidence: 'Low' });
      setMessages(prev => [...prev, errorMsg]);
      setIsTyping(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setShowSessionModal(true)} style={styles.headerLeft}>
          <Text style={styles.headerButton}>☰ Chats</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Brain Agent</Text>
          <Text style={styles.subtitle}>Causal Query Intelligence</Text>
        </View>
        <TouchableOpacity onPress={handleNewChat} style={styles.headerRight}>
          <Text style={styles.headerButton}>+ New</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <ScrollView 
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          ref={scrollViewRef}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg) => (
            <View 
              key={msg.id} 
              style={[
                styles.messageRow, 
                msg.sender === 'user' ? styles.userRow : styles.brainRow
              ]}
            >
              <View 
                style={[
                  styles.bubble, 
                  msg.sender === 'user' ? styles.userBubble : styles.brainBubble
                ]}
              >
                <Text style={[
                  styles.messageText,
                  msg.sender === 'user' ? styles.userText : styles.brainText
                ]}>
                  {msg.text}
                </Text>
                
                {msg.sender === 'user' ? (
                  <Text style={styles.timestamp}>{msg.timestamp}</Text>
                ) : (
                  <>
                    {msg.citations && msg.citations.length > 0 && (
                      <View style={styles.citationsContainer}>
                        <TouchableOpacity 
                          style={styles.citationsHeader} 
                          onPress={() => toggleCitations(msg.id)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.citationsHeaderText}>
                            {expandedCitations[msg.id] ? '▼ Hide Grounding Sources' : `▶ View Grounding Sources (${msg.citations.length})`}
                          </Text>
                        </TouchableOpacity>
                        
                        {expandedCitations[msg.id] && (
                          <View style={styles.citationsList}>
                            {msg.citations.map((cit, idx) => (
                              <View key={idx} style={styles.citationCard}>
                                <Text style={styles.citationText}>
                                  📄 {cit.document.split('/').pop()} §{cit.section || 'N/A'} (Page {cit.page})
                                </Text>
                                {cit.excerpt ? (
                                  <Text style={styles.citationExcerpt}>&quot;{cit.excerpt.trim()}&quot;</Text>
                                ) : null}
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    )}
                    <View style={styles.metaRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {msg.confidence && (
                          <View style={[
                            styles.confidenceBadge,
                            msg.confidence === 'High' && styles.confHigh,
                            msg.confidence === 'Medium' && styles.confMed,
                            msg.confidence === 'Low' && styles.confLow,
                          ]}>
                            <Text style={[
                              styles.confidenceText,
                              msg.confidence === 'High' && styles.confHighText,
                              msg.confidence === 'Medium' && styles.confMedText,
                              msg.confidence === 'Low' && styles.confLowText,
                            ]}>
                              {msg.confidence.toUpperCase()}
                            </Text>
                          </View>
                        )}
                        {msg.responseTimeMs !== undefined && msg.responseTimeMs > 0 && (
                          <Text style={styles.latencyText}>
                            ⚡ {(msg.responseTimeMs / 1000).toFixed(2)}s
                          </Text>
                        )}
                      </View>
                      <Text style={[styles.timestamp, { marginTop: 0 }]}>{msg.timestamp}</Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          ))}

          {isTyping && (
            <View style={[styles.messageRow, styles.brainRow]}>
              <View style={[styles.bubble, styles.brainBubble, styles.typingBubble]}>
                <ActivityIndicator size="small" color="#E5E5E5" />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Query project specifications..."
            placeholderTextColor="#64748B"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSendMessage}
            editable={!isInitializing}
          />
          <TouchableOpacity 
            style={[styles.sendButton, isInitializing && { opacity: 0.5 }]} 
            onPress={handleSendMessage}
            disabled={isInitializing}
          >
            <Text style={styles.sendIcon}>➔</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Sessions Modal */}
      <Modal visible={showSessionModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chat History</Text>
              <TouchableOpacity onPress={() => setShowSessionModal(false)}>
                <Text style={styles.closeModalText}>Close</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sessionList}>
              {sessions.map(s => (
                <TouchableOpacity 
                  key={s.id} 
                  style={[styles.sessionItem, s.id === sessionId && styles.activeSessionItem]}
                  onPress={() => switchSession(s.id)}
                >
                  <Text style={[styles.sessionTitle, s.id === sessionId && styles.activeSessionTitle]} numberOfLines={1}>
                    {s.title || 'Conversation'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111111',
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#262626',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerCenter: {
    flex: 2,
    alignItems: 'center',
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  headerButton: {
    color: '#06B6D4',
    fontSize: 14,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#F5F5F5',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 11,
    color: '#A3A3A3',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 2,
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
    marginBottom: 16,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userBubble: {
    backgroundColor: '#262626',
    borderWidth: 1,
    borderColor: '#404040',
    borderRadius: 8,
    borderBottomRightRadius: 0,
  },
  brainBubble: {
    backgroundColor: '#1C1C1C',
    borderWidth: 1,
    borderColor: '#333333',
    borderTopColor: 'rgba(255,255,255,0.1)',
    borderLeftColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    borderBottomLeftRadius: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  typingBubble: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  userText: {
    color: '#E5E5E5',
  },
  brainText: {
    color: '#F5F5F5',
  },
  timestamp: {
    fontSize: 9,
    color: '#A3A3A3',
    alignSelf: 'flex-end',
    marginTop: 6,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  inputBar: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#111111',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#404040',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#F5F5F5',
    fontSize: 14,
  },
  sendButton: {
    backgroundColor: '#E5E5E5',
    width: 44,
    height: 44,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendIcon: {
    color: '#171717',
    fontSize: 16,
    fontWeight: 'bold',
  },
  citationsContainer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderColor: '#262626',
    paddingTop: 8,
  },
  citationsHeader: {
    paddingVertical: 4,
  },
  citationsHeaderText: {
    color: '#a3a3a3',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  citationsList: {
    marginTop: 8,
    gap: 8,
  },
  citationCard: {
    backgroundColor: '#0A0A0A',
    borderRadius: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: '#262626',
    borderBottomColor: '#404040',
  },
  citationText: {
    color: '#E5E5E5',
    fontSize: 11,
    fontWeight: '700',
  },
  citationExcerpt: {
    color: '#A3A3A3',
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
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  confidenceText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  confHigh: {
    backgroundColor: 'rgba(78, 222, 163, 0.1)',
    borderWidth: 1,
    borderColor: '#4edea3',
  },
  confHighText: {
    color: '#4edea3',
  },
  confMed: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  confMedText: {
    color: '#F59E0B',
  },
  confLow: {
    backgroundColor: 'rgba(255, 179, 173, 0.1)',
    borderWidth: 1,
    borderColor: '#ffb3ad',
  },
  confLowText: {
    color: '#ffb3ad',
  },
  latencyText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#171717',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    height: '60%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#262626',
  },
  modalTitle: {
    color: '#F5F5F5',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeModalText: {
    color: '#06B6D4',
    fontSize: 14,
    fontWeight: 'bold',
  },
  sessionList: {
    padding: 16,
  },
  sessionItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#1C1C1C',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#262626',
  },
  activeSessionItem: {
    borderColor: '#06B6D4',
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
  },
  sessionTitle: {
    color: '#E5E5E5',
    fontSize: 14,
    fontWeight: '600',
  },
  activeSessionTitle: {
    color: '#06B6D4',
  },
});
