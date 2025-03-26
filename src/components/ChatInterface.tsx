'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import axios from 'axios';
import styles from './ChatInterface.module.css';
import Link from 'next/link';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  messages: Message[];
  title?: string;
}

export default function ChatInterface() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionIndex, setActiveSessionIndex] = useState(0);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showMedicalData, setShowMedicalData] = useState(false);
  const [showMedicalDataEdit, setShowMedicalDataEdit] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [vitalsData, setVitalsData] = useState({
    heartRate: '',
    bloodPressure: '',
    temperature: '',
    medications: '',
    bloodSugar: '',
    height: '',
    weight: '',
    age: ''
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Check authentication and load sessions
  useEffect(() => {
    const fetchChatSessions = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        // Fetch user data
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        setUser(userData);

        // Load chat sessions from API
        console.log('Fetching chat sessions from API...');
        const response = await axios.get('/api/chat/sessions', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data && response.data.sessions) {
          console.log(`Retrieved ${response.data.sessions.length} sessions from API`);
          const apiSessions = response.data.sessions.map((session: any) => ({
            id: session.id,
            messages: session.messages.map((msg: any) => ({
              id: msg.id,
              role: msg.role,
              content: msg.content,
              timestamp: msg.timestamp
            })),
            title: session.messages.find((msg: any) => msg.role === 'user')?.content.substring(0, 30) || 'New chat'
          }));

          // If no sessions exist, create a default one
          if (apiSessions.length === 0) {
            console.log('No sessions found, creating default session');
            const defaultSession = {
              id: Date.now().toString(),
              messages: [
                {
                  id: '0',
                  role: 'assistant' as const,
                  content: '## Welcome to Techno Vaidhya!\n\nI\'m your virtual medical assistant. How can I help you today?\n\n**You can ask me about:**\n- General health advice\n- Common symptoms\n- Preventive care\n- When to see a doctor\n\n>',
                  timestamp: new Date().toISOString()
                }
              ],
              title: 'New chat'
            };
            setSessions([defaultSession]);
            setActiveSessionIndex(0);
            setSessionId(null); // This will be set by the server when first message is sent
            setMessages(defaultSession.messages);
          } else {
            // Use sessions from API
            setSessions(apiSessions);
            setActiveSessionIndex(0);
            setSessionId(apiSessions[0].id);
            setMessages(apiSessions[0].messages);
          }
        }
      } catch (error) {
        console.error('Error fetching chat sessions:', error);
        
        // Fallback to local storage or create default session
        const defaultSession = {
          id: Date.now().toString(),
          messages: [
            {
              id: '0',
              role: 'assistant' as const,
              content: '## Welcome to Techno Vaidhya!\n\nI\'m your virtual medical assistant. How can I help you today?\n\n**You can ask me about:**\n- General health advice\n- Common symptoms\n- Preventive care\n- When to see a doctor\n\n>',
              timestamp: new Date().toISOString()
            }
          ],
          title: 'New chat'
        };
        setSessions([defaultSession]);
        setActiveSessionIndex(0);
        setSessionId(null);
        setMessages(defaultSession.messages);
      }
    };

    // Initialize sidebar as hidden
    if (typeof window !== 'undefined') {
      setShowSidebar(false);
    }
    
    // Fetch chat sessions
    fetchChatSessions();
    
    // Add a resize listener to close sidebar on smaller screens
    const handleResize = () => {
      const isMobile = window.innerWidth <= 768;
      if (isMobile && showSidebar) {
        setShowSidebar(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Create a new chat session
  const createNewSession = async () => {
    const welcomeMessage = {
      id: `local_${Date.now()}`,
      role: 'assistant' as const,
      content: '## Welcome to Techno Vaidhya!\n\nI\'m your virtual medical assistant. How can I help you today?\n\n**You can ask me about:**\n- General health advice\n- Common symptoms\n- Preventive care\n- When to see a doctor\n\n>',
      timestamp: new Date().toISOString()
    };
    
    // Create a temporary local session (will be replaced with server session ID after first message)
    const newSession: ChatSession = {
      id: `local_${Date.now()}`,
      messages: [welcomeMessage],
      title: 'New chat'
    };
    
    // Update sessions state with the new session
    const updatedSessions = [...sessions, newSession];
    setSessions(updatedSessions);
    
    // Set active session to the new one
    const newIndex = updatedSessions.length - 1;
    setActiveSessionIndex(newIndex);
    setSessionId(null); // Will be set by server after first message
    setMessages(newSession.messages);
    setInput('');
    
    // Focus the input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // Switch to a different session
  const switchSession = (index: number) => {
    if (index >= 0 && index < sessions.length) {
      setActiveSessionIndex(index);
      setSessionId(sessions[index].id);
      setMessages(sessions[index].messages);
      setInput('');
    }
  };

  // Delete a session
  const deleteSession = async (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Get the session ID to delete
    const sessionToDelete = sessions[index];
    
    if (!sessionToDelete.id) {
      console.error("Cannot delete session with no ID");
      return;
    }
    
    // If it's a local-only session with no server ID, just remove it from state
    if (sessionToDelete.id.startsWith('local_')) {
      handleLocalSessionDelete(index);
      return;
    }
    
    try {
      setError('');
      
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }
      
      // Call the API to delete the session
      const response = await axios.delete(`/api/chat/${sessionToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.status === 200) {
        console.log(`Successfully deleted session ${sessionToDelete.id}`);
        
        // Update local state after successful deletion
        handleLocalSessionDelete(index);
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      setError('Failed to delete chat session. Please try again.');
    }
  };

  // Helper function to handle local state updates after deletion
  const handleLocalSessionDelete = (index: number) => {
    if (sessions.length <= 1) {
      // Don't delete the last session, just clear it
      clearChat();
      return;
    }
    
    const updatedSessions = [...sessions];
    updatedSessions.splice(index, 1);
    setSessions(updatedSessions);
    
    // If we deleted the active session, switch to the first one
    if (index === activeSessionIndex) {
      const newIndex = index > 0 ? index - 1 : 0;
      setActiveSessionIndex(newIndex);
      setSessionId(updatedSessions[newIndex].id);
      setMessages(updatedSessions[newIndex].messages);
    } else if (index < activeSessionIndex) {
      // If we deleted a session before the active one, adjust the index
      setActiveSessionIndex(activeSessionIndex - 1);
    }
  };

  // Clear the current chat by creating a new session
  const clearChat = () => {
    // Instead of clearing the existing session, we'll just create a new one
    // This way we maintain server-side session history
    createNewSession();
  };

  // Update session title based on first user message
  const updateSessionTitle = (newMessages: Message[]) => {
    const userMessages = newMessages.filter(m => m.role === 'user');
    if (userMessages.length === 1) {
      // This is the first user message, use it as the title
      const title = userMessages[0].content.substring(0, 30) + (userMessages[0].content.length > 30 ? '...' : '');
      
      const updatedSessions = [...sessions];
      updatedSessions[activeSessionIndex].title = title;
      updatedSessions[activeSessionIndex].messages = newMessages;
      
      setSessions(updatedSessions);
      
      // No need to save to localStorage as sessions are stored on the server
      // The title will be visible in the UI immediately from the state update
    } else {
      // Just update the messages
      const updatedSessions = [...sessions];
      updatedSessions[activeSessionIndex].messages = newMessages;
      
      setSessions(updatedSessions);
    }
  };

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle height adjustments for textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;
    
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }
    
    // Add user message to state
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };
    
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    updateSessionTitle(updatedMessages);
    
    setInput('');
    setIsLoading(true);
    setError('');
    
    try {
      // Reset textarea height
      const textarea = document.querySelector('textarea');
      if (textarea) textarea.style.height = 'auto';
      
      // Send message to API with the current sessionId
      const response = await axios.post('/api/chat', 
        { 
          message: input,
          sessionId: sessionId // Include the current sessionId
        },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      // Get the returned sessionId
      if (!response.data.sessionId) {
        throw new Error('Failed to get session ID');
      }
      
      // Set session ID if it's a new conversation
      if (!sessionId) {
        setSessionId(response.data.sessionId);
        
        // Update the current session with the server-provided ID
        const updatedSessions = [...sessions];
        updatedSessions[activeSessionIndex].id = response.data.sessionId;
        setSessions(updatedSessions);
        localStorage.setItem('chatSessions', JSON.stringify(updatedSessions));
      }
      
      // Add assistant response to messages
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response.data.message,
        timestamp: new Date().toISOString()
      };
      
      const newMessages = [...updatedMessages, assistantMessage];
      setMessages(newMessages);
      updateSessionTitle(newMessages);
      
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('chatSessions');
    router.push('/');
  };

  // CSS for markdown rendering
  const markdownStyles = {
    p: 'mb-4 last:mb-0',
    h1: 'text-xl font-bold mb-4 mt-6',
    h2: 'text-lg font-bold mb-3 mt-5',
    h3: 'text-base font-bold mb-2 mt-4',
    h4: 'text-sm font-bold mb-2 mt-3',
    ul: 'list-disc ml-6 mb-4',
    ol: 'list-decimal ml-6 mb-4',
    li: 'mb-1',
    blockquote: 'border-l-4 border-gray-500 pl-4 italic my-4',
    code: 'font-mono bg-gray-800 rounded px-1 py-0.5',
    pre: 'font-mono bg-gray-800 rounded p-3 my-4 overflow-x-auto',
    a: 'text-blue-400 underline',
    strong: 'font-bold',
    em: 'italic',
    table: 'border-collapse border border-gray-600 my-4',
    th: 'border border-gray-600 p-2 font-bold',
    td: 'border border-gray-600 p-2',
    hr: 'border-t border-gray-500 my-6',
  };

  // Function to handle medical data quick edits
  const handleQuickEdit = (field: string, currentValue: string | string[] | 'object' | undefined) => {
    setShowMedicalDataEdit(field);
    
    if (currentValue === 'object') {
      // For complex objects like vitalSigns and lifestyle, we edit them in-place
      // So we don't need to set editValue
      return;
    }
    
    setEditValue(Array.isArray(currentValue) ? currentValue.join(', ') : currentValue || '');
  };
  
  // Function to save medical data quick edits
  const saveQuickEdit = async () => {
    if (!showMedicalDataEdit || !user) return;
    
    try {
      const token = localStorage.getItem('token');
      console.log('Token available:', !!token);
      if (token) {
        // Log the first 10 chars of token for debugging (don't log full token for security)
        console.log('Token starts with:', token.substring(0, 10) + '...');
      }
      
      if (!token) {
        setError('Authentication required. Please log in again.');
        setTimeout(() => setError(''), 3000);
        return;
      }
      
      // Prepare the medical data to be sent - only send the specific field that changed
      let medicalDataToSend: any = {};
      
      if (showMedicalDataEdit === 'vitalSigns' || showMedicalDataEdit === 'lifestyle') {
        // For complex objects, send only that object
        medicalDataToSend[showMedicalDataEdit] = user.medicalData?.[showMedicalDataEdit] || {};
      } else if (
        showMedicalDataEdit === 'medications' || 
        showMedicalDataEdit === 'conditions' || 
        showMedicalDataEdit === 'allergies'
      ) {
        // For array fields, split and trim the editValue
        medicalDataToSend[showMedicalDataEdit] = editValue.split(',').map(item => item.trim()).filter(Boolean);
      } else {
        // For simple string fields
        medicalDataToSend[showMedicalDataEdit] = editValue;
      }
      
      console.log('Sending medical data to API:', medicalDataToSend);
      console.log('Current user ID:', user.id);
      
      // Send data to the API endpoint
      console.log('Making API request to update medical data...');
      const response = await fetch('/api/user/update-medical-data', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ medicalData: medicalDataToSend })
      });
      
      console.log('API response status:', response.status);
      const data = await response.json();
      
      if (!response.ok) {
        console.error('API error response:', data);
        throw new Error(data.error || 'Failed to update medical data');
      }
      
      console.log('API success response:', data);
      
      // Important: Update the user with the data received from the server
      // This ensures we have the most up-to-date data
      if (data.user) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
      } else {
        // If the API doesn't return updated user data, update locally
        const updatedMedicalData = {
          ...user.medicalData,
          ...medicalDataToSend
        };
        const updatedUser = { ...user, medicalData: updatedMedicalData };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      
      // Reset edit value
      setEditValue('');
      
      // Note: We don't reset showMedicalDataEdit here because the parent components
      // need to handle that after they've performed their own cleanup
      
      // Show success message
      setError('Medical data updated successfully');
      setTimeout(() => setError(''), 3000);
      
      // Alert AI about updated data (for demonstration purposes)
      console.log('Alerting Gemini AI about updated medical data:', medicalDataToSend);
    } catch (error) {
      console.error('Error saving medical data:', error);
      setError(error instanceof Error ? error.message : 'Failed to update medical data. Please try again.');
      setTimeout(() => setError(''), 5000);
    }
  };
  
  const cancelQuickEdit = () => {
    setShowMedicalDataEdit(null);
    setEditValue('');
  };

  // Click handler for save buttons in medical data sections
  const handleSaveMedicalData = () => {
    saveQuickEdit();
    setShowMedicalDataEdit(null);
  };

  // Update the toggle sidebar function:
  const toggleSidebar = () => {
    // Toggle sidebar visibility
    const newValue = !showSidebar;
    setShowSidebar(newValue);
    
    // We need to force immediate DOM updates for better user experience
    // The opposite logic is needed because React hasn't updated the state yet
    const sidebarElement = document.querySelector(`.${styles.chatSidebar}`);
    if (sidebarElement) {
      if (newValue) {
        sidebarElement.classList.add(styles.visible);
      } else {
        sidebarElement.classList.remove(styles.visible);
      }
    }
    
    // Update the header and input container positions
    const headerElement = document.querySelector(`.${styles.chatHeader}`);
    const inputContainerElement = document.querySelector(`.${styles.inputContainer}`);
    
    if (headerElement && inputContainerElement) {
      if (newValue) {
        headerElement.classList.add(styles.withSidebar);
        headerElement.classList.remove(styles.fullWidth);
        inputContainerElement.classList.add(styles.withSidebar);
      } else {
        headerElement.classList.remove(styles.withSidebar);
        headerElement.classList.add(styles.fullWidth);
        inputContainerElement.classList.remove(styles.withSidebar);
      }
    }
    
    // Update overlay
    const overlayElement = document.querySelector(`.${styles.sidebarOverlay}`);
    if (overlayElement) {
      if (newValue) {
        overlayElement.classList.add(styles.visible);
      } else {
        overlayElement.classList.remove(styles.visible);
      }
    }
  };

  const handleVitalsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setVitalsData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveVitals = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      // Get current user data
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      
      // Create updated user data with age field
      const updatedUser = {
        ...userData,
        age: vitalsData.age ? vitalsData.age : userData.age
      };
      
      // Update vital signs
      const updatedMedicalData = {
        ...userData.medicalData,
        vitalSigns: {
          ...userData.medicalData?.vitalSigns,
          heartRate: vitalsData.heartRate,
          bloodPressure: vitalsData.bloodPressure,
          temperature: vitalsData.temperature,
          bloodSugar: vitalsData.bloodSugar,
          height: vitalsData.height,
          weight: vitalsData.weight
        },
        medications: vitalsData.medications ? vitalsData.medications.split(',').map(m => m.trim()) : []
      };

      // Send update to API
      const apiResponse = await fetch('/api/user/update-medical-data', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          medicalData: updatedMedicalData,
          age: vitalsData.age // Include age in the update
        })
      });

      if (!apiResponse.ok) {
        throw new Error('Failed to update medical data');
      }

      const data = await apiResponse.json();
      
      // Update local storage and user state
      if (data.user) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
      } else {
        // If the API doesn't return user data, update locally
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }

      // Show success message
      setError('Vital signs updated successfully');
      setTimeout(() => setError(''), 3000);

      // Close modal and reset form
      setShowVitalsModal(false);
      setVitalsData({
        heartRate: '',
        bloodPressure: '',
        temperature: '',
        medications: '',
        bloodSugar: '',
        height: '',
        weight: '',
        age: ''
      });
    } catch (error) {
      console.error('Error updating vitals:', error);
      setError('Failed to update vital signs. Please try again.');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Add the useEffect to populate vitals data when modal opens
  useEffect(() => {
    if (showVitalsModal && user?.medicalData) {
      const md = user.medicalData;
      const vs = md.vitalSigns || {};
      
      setVitalsData({
        heartRate: vs.heartRate || '',
        bloodPressure: vs.bloodPressure || '',
        temperature: vs.temperature || '',
        medications: md.medications ? md.medications.join(', ') : '',
        bloodSugar: vs.bloodSugar || '',
        height: vs.height || '',
        weight: vs.weight || '',
        age: user.age ? String(user.age) : ''
      });
    }
  }, [showVitalsModal, user]);

  return (
    <div className={styles.chatContainer} ref={chatContainerRef}>
      {/* Sidebar overlay - closes sidebar when clicked */}
      <div 
        className={`${styles.sidebarOverlay} ${showSidebar ? styles.visible : ''}`} 
        onClick={toggleSidebar}
      />
      
      {/* Sidebar */}
      <div className={`${styles.chatSidebar} ${showSidebar ? styles.visible : ''}`}>
        <div className={styles.sidebarHeader}>
          <button 
            onClick={createNewSession}
            className={styles.newChatBtn}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            New chat
          </button>
        </div>
        
        {/* Chat Sessions List */}
        <div className={styles.sessionsList}>
          {sessions.map((session, index) => (
            <div 
              key={session.id} 
              className={`${styles.sessionItem} ${index === activeSessionIndex ? styles.active : ''}`}
              onClick={() => switchSession(index)}
            >
              <div className={styles.sessionTitle}>
                {session.title || 'New chat'}
              </div>
              <button 
                onClick={(e) => deleteSession(index, e)}
                className={styles.deleteBtn}
                aria-label="Delete chat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          ))}
        </div>
        
        {/* User Profile & Logout */}
        <div className={styles.userSection}>
          {user && (
            <div className={styles.userInfo}>
              <div className={styles.userAvatar}>
                {user.name?.charAt(0) || 'U'}
              </div>
              <div className={styles.userName}>
                {user.name}
              </div>
            </div>
          )}
          <div className={styles.userActions}>
            <button
              onClick={() => setShowMedicalData(true)}
              className={styles.medicalDataBtn}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
              </svg>
              Medical Data
            </button>
            <button
              onClick={handleLogout}
              className={styles.logoutBtn}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              Log out
            </button>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className={`${styles.chatMain} ${showSidebar ? styles.chatMainWithSidebar : ''}`}>
        {/* Header */}
        <div className={`${styles.chatHeader} ${showSidebar ? styles.withSidebar : styles.fullWidth}`}>
          <button 
            onClick={toggleSidebar} 
            className={styles.menuToggle}
            aria-label="Toggle menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          
          <div className={styles.headerActions}>
            <button 
              onClick={createNewSession}
              className={styles.headerNewChatBtn}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              New Chat
            </button>
            
            <h1 className={styles.headerTitle}>
              {sessions[activeSessionIndex]?.title || 'New Chat'}
            </h1>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={() => setShowMedicalData(true)}
                className={styles.medicalDataButton}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                </svg>
                Medical Data
              </button>
              
              <button 
                onClick={clearChat}
                className={styles.clearChatBtn}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                Clear
              </button>
            </div>
          </div>
        </div>
        
        {/* Messages Container */}
        <div className={styles.messagesContainer}>
          {error && (
            <div className={`${styles.message} ${styles.assistantMessage}`} style={{backgroundColor: 'rgba(239, 68, 68, 0.2)'}}>
              <div className={styles.messageContent}>
                <div className={styles.assistantAvatar} style={{backgroundColor: '#ef4444'}}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                </div>
                <div className={styles.messageBody}>
                  {error}
                </div>
              </div>
            </div>
          )}
          
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={`${styles.message} ${
                message.role === 'user' ? styles.userMessage : styles.assistantMessage
              }`}
            >
              <div className={styles.messageContent}>
                {message.role === 'assistant' ? (
                  <div className={styles.assistantAvatar}>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.avatarIcon}>
                      <path d="M9 11.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" fill="currentColor" />
                      <path d="M15 11.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" fill="currentColor" />
                      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M7.5 16.5a4.5 4.5 0 0 1 9 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                ) : (
                  <div className={styles.userAvatar}>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.avatarIcon}>
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
                <div className={styles.messageBody}>
                  <div className={styles.messageText}>
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({node, ...props}) => <p className={markdownStyles.p} {...props} />,
                        h1: ({node, ...props}) => <h1 className={markdownStyles.h1} {...props} />,
                        h2: ({node, ...props}) => <h2 className={markdownStyles.h2} {...props} />,
                        h3: ({node, ...props}) => <h3 className={markdownStyles.h3} {...props} />,
                        h4: ({node, ...props}) => <h4 className={markdownStyles.h4} {...props} />,
                        ul: ({node, ...props}) => <ul className={markdownStyles.ul} {...props} />,
                        ol: ({node, ...props}) => <ol className={markdownStyles.ol} {...props} />,
                        li: ({node, ...props}) => <li className={markdownStyles.li} {...props} />,
                        blockquote: ({node, ...props}) => <blockquote className={markdownStyles.blockquote} {...props} />,
                        code: ({...props}) => {
                          if (props.className?.includes('language-')) {
                            return <pre className={markdownStyles.pre}><code {...props} /></pre>;
                          }
                          return <code className={markdownStyles.code} {...props} />;
                        },
                        a: ({node, ...props}) => <a className={markdownStyles.a} target="_blank" rel="noopener noreferrer" {...props} />,
                        strong: ({node, ...props}) => <strong className={markdownStyles.strong} {...props} />,
                        em: ({node, ...props}) => <em className={markdownStyles.em} {...props} />,
                        table: ({node, ...props}) => <table className={markdownStyles.table} {...props} />,
                        th: ({node, ...props}) => <th className={markdownStyles.th} {...props} />,
                        td: ({node, ...props}) => <td className={markdownStyles.td} {...props} />,
                        hr: ({node, ...props}) => <hr className={markdownStyles.hr} {...props} />,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className={`${styles.message} ${styles.assistantMessage}`}>
              <div className={styles.messageContent}>
                <div className={styles.assistantAvatar}>
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.avatarIcon}>
                    <path d="M9 11.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" fill="currentColor" />
                    <path d="M15 11.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" fill="currentColor" />
                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M7.5 16.5a4.5 4.5 0 0 1 9 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className={styles.messageBody}>
                  <div className={styles.loadingIndicator}>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Ref for auto-scrolling */}
          <div ref={messagesEndRef} className="h-4" />
        </div>
        
        {/* Input Area */}
        <div className={`${styles.inputContainer} ${showSidebar ? styles.withSidebar : ''}`}>
          <form onSubmit={handleSubmit} className={styles.inputForm}>
            <div className={styles.inputWrapper}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleInputKeyDown}
                disabled={isLoading}
                placeholder="Message Techno Vaidhya..."
                className={styles.inputField}
                rows={1}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className={styles.sendButton}
                aria-label="Send message"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.sendIcon}>
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>
      
      {/* Medical Data Modal */}
      {showMedicalData && (
        <div className={styles.modalOverlay} onClick={() => setShowMedicalData(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Your Medical Data</h2>
              <button 
                onClick={() => setShowMedicalData(false)}
                className={styles.modalCloseBtn}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <div className={styles.modalBody}>
              {user?.medicalData ? (
                <>
                  {/* Current Medications - with quick edit */}
                  <div className={styles.medicalItem}>
                    <div className={styles.medicalItemHeader}>
                      <h3>Current Medications</h3>
                      <button 
                        className={styles.editButton}
                        onClick={() => handleQuickEdit('medications', user.medicalData.medications)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Edit
                      </button>
                    </div>
                    {showMedicalDataEdit === 'medications' ? (
                      <div style={{ marginTop: '0.5rem' }}>
                        <textarea 
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          placeholder="Enter medications separated by commas"
                          style={{ 
                            width: '100%', 
                            padding: '0.5rem',
                            borderRadius: '0.25rem',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: 'white',
                            fontSize: '0.875rem',
                            minHeight: '80px'
                          }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            onClick={cancelQuickEdit}
                            style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.25rem',
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                              border: 'none',
                              color: 'white',
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveMedicalData}
                            style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.25rem',
                              backgroundColor: '#10a37f',
                              border: 'none',
                              color: 'white',
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p>{user.medicalData.medications?.length > 0 ? user.medicalData.medications.join(', ') : 'None'}</p>
                    )}
                  </div>
                  
                  {/* Current Conditions - with quick edit */}
                  <div className={styles.medicalItem}>
                    <div className={styles.medicalItemHeader}>
                      <h3>Current Conditions</h3>
                      <button 
                        className={styles.editButton}
                        onClick={() => handleQuickEdit('conditions', user.medicalData.conditions)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Edit
                      </button>
                    </div>
                    {showMedicalDataEdit === 'conditions' ? (
                      <div style={{ marginTop: '0.5rem' }}>
                        <textarea 
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          placeholder="Enter conditions separated by commas"
                          style={{ 
                            width: '100%', 
                            padding: '0.5rem',
                            borderRadius: '0.25rem',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: 'white',
                            fontSize: '0.875rem',
                            minHeight: '80px'
                          }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            onClick={cancelQuickEdit}
                            style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.25rem',
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                              border: 'none',
                              color: 'white',
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveMedicalData}
                            style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.25rem',
                              backgroundColor: '#10a37f',
                              border: 'none',
                              color: 'white',
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p>{user.medicalData.conditions?.length > 0 ? user.medicalData.conditions.join(', ') : 'None'}</p>
                    )}
                  </div>
                  
                  {/* Allergies - with quick edit */}
                  <div className={styles.medicalItem}>
                    <div className={styles.medicalItemHeader}>
                      <h3>Allergies</h3>
                      <button 
                        className={styles.editButton}
                        onClick={() => handleQuickEdit('allergies', user.medicalData.allergies)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Edit
                      </button>
                    </div>
                    {showMedicalDataEdit === 'allergies' ? (
                      <div style={{ marginTop: '0.5rem' }}>
                        <textarea 
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          placeholder="Enter allergies separated by commas"
                          style={{ 
                            width: '100%', 
                            padding: '0.5rem',
                            borderRadius: '0.25rem',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: 'white',
                            fontSize: '0.875rem',
                            minHeight: '80px'
                          }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            onClick={cancelQuickEdit}
                            style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.25rem',
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                              border: 'none',
                              color: 'white',
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveMedicalData}
                            style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.25rem',
                              backgroundColor: '#10a37f',
                              border: 'none',
                              color: 'white',
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p>{user.medicalData.allergies?.length > 0 ? user.medicalData.allergies.join(', ') : 'None'}</p>
                    )}
                  </div>
                  
                  {/* Medical History */}
                  <div className={styles.medicalItem}>
                    <div className={styles.medicalItemHeader}>
                      <h3>Medical History</h3>
                      <button 
                        className={styles.editButton}
                        onClick={() => handleQuickEdit('medicalHistory', user.medicalData.medicalHistory)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Edit
                      </button>
                    </div>
                    {showMedicalDataEdit === 'medicalHistory' ? (
                      <div style={{ marginTop: '0.5rem' }}>
                        <textarea 
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          placeholder="Enter your medical history"
                          style={{ 
                            width: '100%', 
                            padding: '0.5rem',
                            borderRadius: '0.25rem',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: 'white',
                            fontSize: '0.875rem',
                            minHeight: '80px'
                          }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            onClick={cancelQuickEdit}
                            style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.25rem',
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                              border: 'none',
                              color: 'white',
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveMedicalData}
                            style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.25rem',
                              backgroundColor: '#10a37f',
                              border: 'none',
                              color: 'white',
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p>{user.medicalData.medicalHistory || 'None'}</p>
                    )}
                  </div>
                  
                  {/* Vital Signs - with quick edit */}
                  <div className={styles.medicalItem}>
                    <div className={styles.medicalItemHeader}>
                      <h3>Vital Signs</h3>
                      <button 
                        className={styles.editButton}
                        onClick={() => handleQuickEdit('vitalSigns', 'object')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Edit
                      </button>
                    </div>
                    {showMedicalDataEdit === 'vitalSigns' ? (
                      <div style={{ marginTop: '0.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                          <div>
                            <label style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.25rem', display: 'block' }}>
                              Blood Pressure
                            </label>
                            <input
                              type="text"
                              value={user?.medicalData?.vitalSigns?.bloodPressure || ''}
                              onChange={(e) => {
                                const updatedUser = { ...user };
                                if (!updatedUser.medicalData) updatedUser.medicalData = {};
                                if (!updatedUser.medicalData.vitalSigns) updatedUser.medicalData.vitalSigns = {};
                                updatedUser.medicalData.vitalSigns.bloodPressure = e.target.value;
                                setUser(updatedUser);
                              }}
                              placeholder="e.g. 120/80 mmHg"
                              style={{ 
                                width: '100%', 
                                padding: '0.5rem',
                                borderRadius: '0.25rem',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: 'white',
                                fontSize: '0.875rem'
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.25rem', display: 'block' }}>
                              Heart Rate
                            </label>
                            <input
                              type="text"
                              value={user?.medicalData?.vitalSigns?.heartRate || ''}
                              onChange={(e) => {
                                const updatedUser = { ...user };
                                if (!updatedUser.medicalData) updatedUser.medicalData = {};
                                if (!updatedUser.medicalData.vitalSigns) updatedUser.medicalData.vitalSigns = {};
                                updatedUser.medicalData.vitalSigns.heartRate = e.target.value;
                                setUser(updatedUser);
                              }}
                              placeholder="e.g. 75 bpm"
                              style={{ 
                                width: '100%', 
                                padding: '0.5rem',
                                borderRadius: '0.25rem',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: 'white',
                                fontSize: '0.875rem'
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.25rem', display: 'block' }}>
                              Temperature
                            </label>
                            <input
                              type="text"
                              value={user?.medicalData?.vitalSigns?.temperature || ''}
                              onChange={(e) => {
                                const updatedUser = { ...user };
                                if (!updatedUser.medicalData) updatedUser.medicalData = {};
                                if (!updatedUser.medicalData.vitalSigns) updatedUser.medicalData.vitalSigns = {};
                                updatedUser.medicalData.vitalSigns.temperature = e.target.value;
                                setUser(updatedUser);
                              }}
                              placeholder="e.g. 98.6°F or 37°C"
                              style={{ 
                                width: '100%', 
                                padding: '0.5rem',
                                borderRadius: '0.25rem',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: 'white',
                                fontSize: '0.875rem'
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.25rem', display: 'block' }}>
                              Blood Sugar
                            </label>
                            <input
                              type="text"
                              value={user?.medicalData?.vitalSigns?.bloodSugar || ''}
                              onChange={(e) => {
                                const updatedUser = { ...user };
                                if (!updatedUser.medicalData) updatedUser.medicalData = {};
                                if (!updatedUser.medicalData.vitalSigns) updatedUser.medicalData.vitalSigns = {};
                                updatedUser.medicalData.vitalSigns.bloodSugar = e.target.value;
                                setUser(updatedUser);
                              }}
                              placeholder="e.g. 100 mg/dL"
                              style={{ 
                                width: '100%', 
                                padding: '0.5rem',
                                borderRadius: '0.25rem',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: 'white',
                                fontSize: '0.875rem'
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.25rem', display: 'block' }}>
                              Height
                            </label>
                            <input
                              type="text"
                              value={user?.medicalData?.vitalSigns?.height || ''}
                              onChange={(e) => {
                                const updatedUser = { ...user };
                                if (!updatedUser.medicalData) updatedUser.medicalData = {};
                                if (!updatedUser.medicalData.vitalSigns) updatedUser.medicalData.vitalSigns = {};
                                updatedUser.medicalData.vitalSigns.height = e.target.value;
                                setUser(updatedUser);
                              }}
                              placeholder="e.g. 175 cm"
                              style={{ 
                                width: '100%', 
                                padding: '0.5rem',
                                borderRadius: '0.25rem',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: 'white',
                                fontSize: '0.875rem'
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.25rem', display: 'block' }}>
                              Weight
                            </label>
                            <input
                              type="text"
                              value={user?.medicalData?.vitalSigns?.weight || ''}
                              onChange={(e) => {
                                const updatedUser = { ...user };
                                if (!updatedUser.medicalData) updatedUser.medicalData = {};
                                if (!updatedUser.medicalData.vitalSigns) updatedUser.medicalData.vitalSigns = {};
                                updatedUser.medicalData.vitalSigns.weight = e.target.value;
                                setUser(updatedUser);
                              }}
                              placeholder="e.g. 70 kg"
                              style={{ 
                                width: '100%', 
                                padding: '0.5rem',
                                borderRadius: '0.25rem',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: 'white',
                                fontSize: '0.875rem'
                              }}
                            />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => setShowMedicalDataEdit(null)}
                            style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.25rem',
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                              border: 'none',
                              color: 'white',
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveMedicalData}
                            style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.25rem',
                              backgroundColor: '#10a37f',
                              border: 'none',
                              color: 'white',
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <ul className={styles.vitalsList}>
                        {user?.medicalData?.vitalSigns?.bloodPressure && (
                          <li><strong>Blood Pressure:</strong> {user.medicalData.vitalSigns.bloodPressure}</li>
                        )}
                        {user?.medicalData?.vitalSigns?.heartRate && (
                          <li><strong>Heart Rate:</strong> {user.medicalData.vitalSigns.heartRate}</li>
                        )}
                        {user?.medicalData?.vitalSigns?.temperature && (
                          <li><strong>Temperature:</strong> {user.medicalData.vitalSigns.temperature}</li>
                        )}
                        {user?.medicalData?.vitalSigns?.bloodSugar && (
                          <li><strong>Blood Sugar:</strong> {user.medicalData.vitalSigns.bloodSugar}</li>
                        )}
                        {user?.medicalData?.vitalSigns?.height && (
                          <li><strong>Height:</strong> {user.medicalData.vitalSigns.height}</li>
                        )}
                        {user?.medicalData?.vitalSigns?.weight && (
                          <li><strong>Weight:</strong> {user.medicalData.vitalSigns.weight}</li>
                        )}
                        {!user?.medicalData?.vitalSigns || Object.keys(user?.medicalData?.vitalSigns).length === 0 && (
                          <li className={styles.noDataText}>No vital signs recorded</li>
                        )}
                      </ul>
                    )}
                  </div>
                  
                  {/* Lifestyle - with quick edit */}
                  <div className={styles.medicalItem}>
                    <div className={styles.medicalItemHeader}>
                      <h3>Lifestyle</h3>
                      <button 
                        className={styles.editButton}
                        onClick={() => handleQuickEdit('lifestyle', 'object')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Edit
                      </button>
                    </div>
                    {showMedicalDataEdit === 'lifestyle' ? (
                      <div style={{ marginTop: '0.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                          <div>
                            <label style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.25rem', display: 'block' }}>
                              Diet
                            </label>
                            <input
                              type="text"
                              value={user?.medicalData?.lifestyle?.diet || ''}
                              onChange={(e) => {
                                const updatedUser = { ...user };
                                if (!updatedUser.medicalData) updatedUser.medicalData = {};
                                if (!updatedUser.medicalData.lifestyle) updatedUser.medicalData.lifestyle = {};
                                updatedUser.medicalData.lifestyle.diet = e.target.value;
                                setUser(updatedUser);
                              }}
                              placeholder="e.g. Vegetarian"
                              style={{ 
                                width: '100%', 
                                padding: '0.5rem',
                                borderRadius: '0.25rem',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: 'white',
                                fontSize: '0.875rem'
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.25rem', display: 'block' }}>
                              Sleep Hours
                            </label>
                            <input
                              type="text"
                              value={user?.medicalData?.lifestyle?.sleepHours || ''}
                              onChange={(e) => {
                                const updatedUser = { ...user };
                                if (!updatedUser.medicalData) updatedUser.medicalData = {};
                                if (!updatedUser.medicalData.lifestyle) updatedUser.medicalData.lifestyle = {};
                                updatedUser.medicalData.lifestyle.sleepHours = e.target.value;
                                setUser(updatedUser);
                              }}
                              placeholder="e.g. 7-8 hours nightly"
                              style={{ 
                                width: '100%', 
                                padding: '0.5rem',
                                borderRadius: '0.25rem',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: 'white',
                                fontSize: '0.875rem'
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.25rem', display: 'block' }}>
                              Stress Level
                            </label>
                            <select
                              value={user?.medicalData?.lifestyle?.stressLevel || 'medium'}
                              onChange={(e) => {
                                const updatedUser = { ...user };
                                if (!updatedUser.medicalData) updatedUser.medicalData = {};
                                if (!updatedUser.medicalData.lifestyle) updatedUser.medicalData.lifestyle = {};
                                updatedUser.medicalData.lifestyle.stressLevel = e.target.value;
                                setUser(updatedUser);
                              }}
                              style={{ 
                                width: '100%', 
                                padding: '0.5rem',
                                borderRadius: '0.25rem',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: 'white',
                                fontSize: '0.875rem'
                              }}
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.25rem', display: 'block' }}>
                              Exercise
                            </label>
                            <input
                              type="text"
                              value={user?.medicalData?.lifestyle?.exercise || ''}
                              onChange={(e) => {
                                const updatedUser = { ...user };
                                if (!updatedUser.medicalData) updatedUser.medicalData = {};
                                if (!updatedUser.medicalData.lifestyle) updatedUser.medicalData.lifestyle = {};
                                updatedUser.medicalData.lifestyle.exercise = e.target.value;
                                setUser(updatedUser);
                              }}
                              placeholder="e.g. 30 mins daily"
                              style={{ 
                                width: '100%', 
                                padding: '0.5rem',
                                borderRadius: '0.25rem',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: 'white',
                                fontSize: '0.875rem'
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.25rem', display: 'block' }}>
                              Smoking
                            </label>
                            <select
                              value={user?.medicalData?.lifestyle?.smoking ? 'yes' : 'no'}
                              onChange={(e) => {
                                const updatedUser = { ...user };
                                if (!updatedUser.medicalData) updatedUser.medicalData = {};
                                if (!updatedUser.medicalData.lifestyle) updatedUser.medicalData.lifestyle = {};
                                updatedUser.medicalData.lifestyle.smoking = e.target.value === 'yes';
                                setUser(updatedUser);
                              }}
                              style={{ 
                                width: '100%', 
                                padding: '0.5rem',
                                borderRadius: '0.25rem',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: 'white',
                                fontSize: '0.875rem'
                              }}
                            >
                              <option value="no">No</option>
                              <option value="yes">Yes</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.25rem', display: 'block' }}>
                              Alcohol
                            </label>
                            <select
                              value={user?.medicalData?.lifestyle?.alcohol ? 'yes' : 'no'}
                              onChange={(e) => {
                                const updatedUser = { ...user };
                                if (!updatedUser.medicalData) updatedUser.medicalData = {};
                                if (!updatedUser.medicalData.lifestyle) updatedUser.medicalData.lifestyle = {};
                                updatedUser.medicalData.lifestyle.alcohol = e.target.value === 'yes';
                                setUser(updatedUser);
                              }}
                              style={{ 
                                width: '100%', 
                                padding: '0.5rem',
                                borderRadius: '0.25rem',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: 'white',
                                fontSize: '0.875rem'
                              }}
                            >
                              <option value="no">No</option>
                              <option value="yes">Yes</option>
                            </select>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => setShowMedicalDataEdit(null)}
                            style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.25rem',
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                              border: 'none',
                              color: 'white',
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveMedicalData}
                            style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.25rem',
                              backgroundColor: '#10a37f',
                              border: 'none',
                              color: 'white',
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <ul className={styles.lifestyleList}>
                        {user?.medicalData?.lifestyle?.diet && (
                          <li><strong>Diet:</strong> {user.medicalData.lifestyle.diet}</li>
                        )}
                        {user?.medicalData?.lifestyle?.sleepHours && (
                          <li><strong>Sleep Hours:</strong> {user.medicalData.lifestyle.sleepHours}</li>
                        )}
                        {user?.medicalData?.lifestyle?.stressLevel && (
                          <li><strong>Stress Level:</strong> {user.medicalData.lifestyle.stressLevel}</li>
                        )}
                        {user?.medicalData?.lifestyle?.exercise && (
                          <li><strong>Exercise:</strong> {user.medicalData.lifestyle.exercise}</li>
                        )}
                        {user?.medicalData?.lifestyle?.smoking !== undefined && (
                          <li><strong>Smoking:</strong> {user.medicalData.lifestyle.smoking ? 'Yes' : 'No'}</li>
                        )}
                        {user?.medicalData?.lifestyle?.alcohol !== undefined && (
                          <li><strong>Alcohol:</strong> {user.medicalData.lifestyle.alcohol ? 'Yes' : 'No'}</li>
                        )}
                        {!user?.medicalData?.lifestyle || Object.keys(user?.medicalData?.lifestyle).length === 0 && (
                          <li className={styles.noDataText}>No lifestyle information recorded</li>
                        )}
                      </ul>
                    )}
                  </div>
                </>
              ) : (
                <p className={styles.noMedicalData}>No medical data available. Please update your profile.</p>
              )}
              
              <div className={styles.modalFooter}>
                <Link href="/profile" className={styles.updateMedicalDataBtn}>
                  Update Full Medical Profile
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Update Vitals Button */}
      <button
        onClick={() => setShowVitalsModal(true)}
        className={styles.updateVitalsButton}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.vitalsIcon}>
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
        </svg>
        Update Vitals
      </button>

      {/* Vitals Update Modal */}
      {showVitalsModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.vitalsModal}>
            <div className={styles.modalHeader}>
              <h2>Update Vital Signs</h2>
              <button
                onClick={() => setShowVitalsModal(false)}
                className={styles.closeButton}
              >
                ×
              </button>
            </div>
            
            <div className={styles.vitalsForm}>
              <div className={styles.formGroup}>
                <label htmlFor="heartRate">Heart Rate (BPM)</label>
                <input
                  type="text"
                  id="heartRate"
                  name="heartRate"
                  value={vitalsData.heartRate}
                  onChange={handleVitalsChange}
                  placeholder="e.g., 72"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="bloodPressure">Blood Pressure</label>
                <input
                  type="text"
                  id="bloodPressure"
                  name="bloodPressure"
                  value={vitalsData.bloodPressure}
                  onChange={handleVitalsChange}
                  placeholder="e.g., 120/80"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="temperature">Temperature</label>
                <input
                  type="text"
                  id="temperature"
                  name="temperature"
                  value={vitalsData.temperature}
                  onChange={handleVitalsChange}
                  placeholder="e.g., 98.6°F"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="medications">Current Medications</label>
                <input
                  type="text"
                  id="medications"
                  name="medications"
                  value={vitalsData.medications}
                  onChange={handleVitalsChange}
                  placeholder="Separate with commas"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="bloodSugar">Blood Sugar</label>
                <input
                  type="text"
                  id="bloodSugar"
                  name="bloodSugar"
                  value={vitalsData.bloodSugar}
                  onChange={handleVitalsChange}
                  placeholder="e.g., 100 mg/dL"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="height">Height</label>
                <input
                  type="text"
                  id="height"
                  name="height"
                  value={vitalsData.height}
                  onChange={handleVitalsChange}
                  placeholder="e.g., 5'10 or 178 cm"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="weight">Weight</label>
                <input
                  type="text"
                  id="weight"
                  name="weight"
                  value={vitalsData.weight}
                  onChange={handleVitalsChange}
                  placeholder="e.g., 160 lbs or 73 kg"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="age">Age</label>
                <input
                  type="text"
                  id="age"
                  name="age"
                  value={vitalsData.age}
                  onChange={handleVitalsChange}
                  placeholder="Your age"
                />
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                onClick={() => setShowVitalsModal(false)}
                className={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveVitals}
                className={styles.saveButton}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 