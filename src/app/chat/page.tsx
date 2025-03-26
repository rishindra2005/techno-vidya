'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ChatInterface from '@/components/ChatInterface';
import styles from '../home/home.module.css';

interface User {
  id: string;
  name: string;
  email: string;
  gender?: string;
  age?: number;
  profilePicture?: string;
  medicalData?: {
    medicalHistory?: string;
    conditions?: string[];
    medications?: string[];
    allergies?: string[];
    familyHistory?: string;
    lifestyle?: {
      smoking?: boolean;
      alcohol?: boolean;
      exercise?: string;
      diet?: string;
    };
    vitalSigns?: {
      height?: string;
      weight?: string;
      bloodPressure?: string;
      heartRate?: string;
    };
  };
}

export default function Chat() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token) {
      router.push('/login');
      return;
    }

    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        // Invalid user data in localStorage
        localStorage.removeItem('user');
        router.push('/login');
      }
    } else {
      router.push('/login');
    }
    
    setIsLoading(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinnerContainer}>
          <div className={styles.spinner}></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Link href="/home" className={styles.logo}>
            <span className={styles.logoText}>Techno Vaidhya</span>
          </Link>
          
          <div className={styles.mobileMenuButton} onClick={toggleMenu}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </div>
          
          <div className={styles.userActions}>
            <div className={styles.userInfo}>
              <span className={styles.welcomeText}>
                Welcome, {user?.name}
                {user?.medicalData?.conditions && user.medicalData.conditions.length > 0 && (
                  <span className={styles.medicalBadge} title={`Conditions: ${user.medicalData.conditions.join(', ')}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                    </svg>
                  </span>
                )}
              </span>
            </div>
            
            {user?.profilePicture ? (
              <div className={styles.profileImage}>
                <img 
                  src={user.profilePicture} 
                  alt={`${user.name}'s profile`} 
                />
              </div>
            ) : (
              <div className={styles.profileInitial}>
                {user?.name?.charAt(0) || 'U'}
              </div>
            )}
            
            <button 
              onClick={handleLogout}
              className={styles.logoutButton}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.logoutIcon}>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span className={styles.logoutText}>Logout</span>
            </button>
          </div>
        </div>
      </header>
      
      {/* Navigation */}
      <nav className={`${styles.nav} ${isMenuOpen ? styles.mobileMenuOpen : ''}`}>
        <div className={styles.navContent}>
          <Link 
            href="/home" 
            className={styles.navLink}
            onClick={() => setIsMenuOpen(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.navIcon}>
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span>Home</span>
          </Link>
          
          <Link 
            href="/chat" 
            className={`${styles.navLink} ${styles.active}`}
            onClick={() => setIsMenuOpen(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.navIcon}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>Chat</span>
          </Link>
          
          <Link 
            href="/profile" 
            className={styles.navLink}
            onClick={() => setIsMenuOpen(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.navIcon}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span>Profile</span>
          </Link>
        </div>
      </nav>

      {/* Chat Interface Container */}
      <main className={styles.fullHeightMain}>
        <div className={styles.chatPageContainer}>
          <ChatInterface />
        </div>
      </main>
    </div>
  );
}