'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './home.module.css';

interface User {
  id: string;
  name: string;
  email: string;
  gender?: string;
  age?: number;
  profilePicture?: string;
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
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
              <span className={styles.welcomeText}>Welcome, {user?.name}</span>
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
            className={`${styles.navLink} ${activeTab === 'home' ? styles.active : ''}`}
            onClick={() => {setActiveTab('home'); setIsMenuOpen(false);}}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.navIcon}>
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span>Home</span>
          </Link>
          
          <Link 
            href="/chat" 
            className={`${styles.navLink} ${activeTab === 'chat' ? styles.active : ''}`}
            onClick={() => {setActiveTab('chat'); setIsMenuOpen(false);}}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.navIcon}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>Chat</span>
          </Link>
          
          <Link 
            href="/profile" 
            className={`${styles.navLink} ${activeTab === 'profile' ? styles.active : ''}`}
            onClick={() => {setActiveTab('profile'); setIsMenuOpen(false);}}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.navIcon}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span>Profile</span>
          </Link>
        </div>
      </nav>
      
      {/* Main Content */}
      <main className={styles.main}>
        <section className={styles.welcome}>
          <h2>Welcome, {user?.name}!</h2>
          <p>
            Your virtual medical assistant is ready to help you with health information,
            guidance, and preventive care tips. What would you like to do today?
          </p>
        </section>
        
        <div className={styles.cardsContainer}>
          {/* Chat Card */}
          <div className={styles.card}>
            <div className={styles.cardContent}>
              <div className={styles.cardIcon} style={{backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6'}}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
              
              <h3>Medical Chat Assistant</h3>
              <p>
                Chat with your virtual medical assistant to get health information and guidance.
              </p>
              
              <Link href="/chat" className={styles.cardButton} style={{backgroundColor: '#3b82f6'}}>
                Start Chat
              </Link>
            </div>
          </div>
          
          {/* Profile Card */}
          <div className={styles.card}>
            <div className={styles.cardContent}>
              <div className={styles.cardIcon} style={{backgroundColor: 'rgba(20, 184, 166, 0.2)', color: '#14b8a6'}}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              
              <h3>Your Profile</h3>
              <p>
                View and update your profile information, including medical history.
              </p>
              
              <Link href="/profile" className={styles.cardButton} style={{backgroundColor: '#14b8a6'}}>
                View Profile
              </Link>
            </div>
          </div>
        </div>
        
        {/* Features Section */}
        <section className={styles.features}>
          <h3>Features</h3>
          
          <div className={styles.featuresList}>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon} style={{backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa'}}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                </svg>
              </div>
              <div className={styles.featureContent}>
                <h4>Health Information</h4>
                <p>
                  Access reliable information about medical conditions, treatments, and preventive care.
                </p>
              </div>
            </div>
            
            <div className={styles.featureItem}>
              <div className={styles.featureIcon} style={{backgroundColor: 'rgba(20, 184, 166, 0.1)', color: '#2dd4bf'}}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                </svg>
              </div>
              <div className={styles.featureContent}>
                <h4>Medical Records</h4>
                <p>
                  Store and manage your medical history, conditions, medications, and allergies.
                </p>
              </div>
            </div>
            
            <div className={styles.featureItem}>
              <div className={styles.featureIcon} style={{backgroundColor: 'rgba(168, 85, 247, 0.1)', color: '#c084fc'}}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15.05 5A5 5 0 0 1 19 8.95M15.05 1A9 9 0 0 1 23 8.94m-1 7.98v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
              </div>
              <div className={styles.featureContent}>
                <h4>Personalized Care</h4>
                <p>
                  Receive information tailored to your medical history and health needs.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <p>© {new Date().getFullYear()} Techno Vaidhya Medical Assistant. All rights reserved.</p>
          <p>
            This application provides general health information and is not a substitute for professional medical advice, diagnosis, or treatment.
          </p>
        </div>
      </footer>
    </div>
  );
} 