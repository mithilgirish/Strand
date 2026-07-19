import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard } from 'react-native';
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
      // Load the most recent session or create one
      const { data: sessions, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching sessions:', error);
        return;
      }

      if (sessions && sessions.length > 0) {
        setSessionId(sessions[0].id);
        void fetchMessages(sessions[0].id);
      } else {
        const { data: newSession, error: createError } = await supabase
          .from('chat_sessions')
          .insert({
            title: 'Mobile Conversation'
          })
          .select()
          .single();

        if (newSession) {
          setSessionId(newSession.id);
        }
      }
    } catch (err) {
      console.error('Failed to initialize mobile chat session:', err);
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
      }
    } catch (err) {
      console.error(err);
    }
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
      }

      // 1. Insert user message to DB
      const { data: userMsgData } = await supabase
        .from('chat_messages')
        .insert({
          session_id: activeId,
          sender: 'user',
          text: userText
        })
        .select()
        .single();

      if (userMsgData) {
        setMessages(prev => [
          ...prev,
          {
            id: userMsgData.id,
            sender: 'user',
            text: userText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
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

        // 3. Insert brain answer to DB
        const { data: brainMsgData } = await supabase
          .from('chat_messages')
          .insert({
            session_id: activeId,
            sender: 'brain',
            text: answerText,
            citations: citations,
            confidence: confidence,
            response_time_ms: responseTimeMs
          })
          .select()
          .single();

        if (brainMsgData) {
          setMessages(prev => [
            ...prev,
            {
              id: brainMsgData.id,
              sender: 'brain',
              text: answerText,
              citations: citations,
              confidence: confidence,
              responseTimeMs: responseTimeMs,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
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
        <Text style={styles.title}>Brain Agent</Text>
        <Text style={styles.subtitle}>Causal Query Intelligence</Text>
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

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111111',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#262626',
    alignItems: 'center',
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
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  userBubble: {
    backgroundColor: '#E5E5E5',
    borderBottomRightRadius: 4,
  },
  brainBubble: {
    backgroundColor: '#1C1C1C',
    borderWidth: 1,
    borderColor: '#262626',
    borderBottomLeftRadius: 4,
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
    fontWeight: '600',
  },
  userText: {
    color: '#171717',
  },
  brainText: {
    color: '#F5F5F5',
  },
  timestamp: {
    fontSize: 9,
    color: '#A3A3A3',
    alignSelf: 'flex-end',
    marginTop: 4,
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#171717',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#1C1C1C',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#F5F5F5',
    fontSize: 14,
  },
  sendButton: {
    backgroundColor: '#E5E5E5',
    width: 40,
    height: 40,
    borderRadius: 20,
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
    color: '#06B6D4',
    fontSize: 12,
    fontWeight: 'bold',
  },
  citationsList: {
    marginTop: 6,
    gap: 6,
  },
  citationCard: {
    backgroundColor: '#0A0A0A',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#262626',
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  confidenceText: {
    fontSize: 9,
    fontWeight: 'bold',
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
});
