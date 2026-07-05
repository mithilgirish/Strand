import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE_URL } from '../config';

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


export default function ChatbotScreen({ navigation }: any) {
  const scrollViewRef = useRef<ScrollView>(null);
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

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

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

  const VALID_CONFIDENCE = new Set<ChatMessage['confidence']>(['High', 'Medium', 'Low']);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(`${API_BASE_URL}/brain/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMessage.text, project_id: 'default' }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        // Validate: guard against blank answer and illegal confidence value
        const answerText =
          typeof data.answer === 'string' && data.answer.trim()
            ? data.answer
            : 'No answer returned. Please check the backend connection.';
        const confidence: ChatMessage['confidence'] = VALID_CONFIDENCE.has(data.confidence)
          ? data.confidence
          : 'Medium';
        setMessages(prev => [
          ...prev,
          buildBrainMessage({ text: answerText, citations: data.citations, confidence, responseTimeMs: data.response_time_ms }),
        ]);
      } else {
        throw new Error(`API returned status ${response.status}`);
      }
      // Typing ends only after the success message is in state
      setIsTyping(false);
    } catch (err) {
      console.log('Brain API offline or error, falling back to local simulation.', err);
      // Keep the typing indicator alive until the fallback message is actually appended
      setTimeout(() => {
        const query = userMessage.text.toLowerCase();
        let responseText = "Analyzing spec documents... I'm currently monitoring compliance metrics on site.";
        if (query.includes('generator') || query.includes('gen-01')) {
          responseText =
            'GEN-01 (Caterpillar 3516C) spec verification:\n• Voltage: 11kV\n• Output: 2000 kVA\n• Status: Active. Downstream R0 contagion calculated at 4.2 due to fuel consumption rates exceeding threshold (285 L/h vs 260 L/h expected).';
        } else if (query.includes('cooling') || query.includes('ct-01')) {
          responseText =
            'Cooling Tower (CT-01) compliance check:\n• Expected: Design temperature capability of 50°C (TIA-942-B Clause §6.7.1).\n• Actual: Vendor submittal lists 45°C limit.\n• Alert: Ambient temperature mismatch hazard detected.';
        } else if (query.includes('r0') || query.includes('risk')) {
          responseText =
            'Active project risks:\n• R0: 4.2 (High risk anomaly in generator governor specs).\n• R0: 2.8 (Schedule delay impact on generator installation).';
        }
        setMessages(prev => [...prev, buildBrainMessage({ text: responseText, confidence: 'Medium' })]);
        // Typing ends only after the fallback message is in state
        setIsTyping(false);
      }, 1000);
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
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
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
