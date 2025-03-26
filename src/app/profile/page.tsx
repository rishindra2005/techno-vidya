'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MedicalData } from '@/utils/db';
import styles from './profile.module.css';
import navStyles from '../home/home.module.css';
import ImageCropper from '../../components/ImageCropper';

interface User {
  id: string;
  name: string;
  email: string;
  gender?: string;
  age?: string;
  profilePicture?: string;
  medicalData?: MedicalData;
  createdAt?: string;
}

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editMode, setEditMode] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropSettings, setCropSettings] = useState({
    scale: 1,
    rotation: 0
  });
  
  // Form state
  const [formData, setFormData] = useState({
    medicalHistory: '',
    conditions: '',
    medications: '',
    allergies: '',
    familyHistory: '',
    smoking: false,
    alcohol: false,
    exercise: '',
    diet: '',
    sleepHours: '',
    stressLevel: '',
    height: '',
    weight: '',
    bloodPressure: '',
    heartRate: '',
    temperature: '',
    bloodSugar: ''
  });

  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);

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
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setProfilePic(parsedUser.profilePicture || null);
        
        // Initialize form with user data
        if (parsedUser.medicalData) {
          const md = parsedUser.medicalData;
          setFormData({
            medicalHistory: md.medicalHistory || '',
            conditions: md.conditions ? md.conditions.join(', ') : '',
            medications: md.medications ? md.medications.join(', ') : '',
            allergies: md.allergies ? md.allergies.join(', ') : '',
            familyHistory: md.familyHistory || '',
            smoking: md.lifestyle?.smoking || false,
            alcohol: md.lifestyle?.alcohol || false,
            exercise: md.lifestyle?.exercise || '',
            diet: md.lifestyle?.diet || '',
            sleepHours: md.lifestyle?.sleepHours || '',
            stressLevel: md.lifestyle?.stressLevel || '',
            height: md.vitalSigns?.height || '',
            weight: md.vitalSigns?.weight || '',
            bloodPressure: md.vitalSigns?.bloodPressure || '',
            heartRate: md.vitalSigns?.heartRate || '',
            temperature: md.vitalSigns?.temperature || '',
            bloodSugar: md.vitalSigns?.bloodSugar || ''
          });
        }
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ type: '', text: '' });
    
    try {
      // Create the updated medical data object
      const updatedMedicalData: MedicalData = {
        medicalHistory: formData.medicalHistory,
        conditions: formData.conditions ? formData.conditions.split(',').map(c => c.trim()) : [],
        medications: formData.medications ? formData.medications.split(',').map(m => m.trim()) : [],
        allergies: formData.allergies ? formData.allergies.split(',').map(a => a.trim()) : [],
        familyHistory: formData.familyHistory,
        lifestyle: {
          smoking: formData.smoking,
          alcohol: formData.alcohol,
          exercise: formData.exercise,
          diet: formData.diet,
          sleepHours: formData.sleepHours,
          stressLevel: formData.stressLevel
        },
        vitalSigns: {
          height: formData.height,
          weight: formData.weight,
          bloodPressure: formData.bloodPressure,
          heartRate: formData.heartRate,
          temperature: formData.temperature,
          bloodSugar: formData.bloodSugar
        }
      };
      
      // Get the token from local storage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      console.log('Sending medical data update with token', token.substring(0, 10) + '...');
      
      // Send data to the API endpoint
      const response = await fetch('/api/user/update-medical-data', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ medicalData: updatedMedicalData })
      });
      
      console.log('API response status:', response.status);
      const data = await response.json();
      
      if (!response.ok) {
        console.error('API error response:', data);
        throw new Error(data.error || 'Failed to update medical data');
      }
      
      console.log('API success response:', data);
      
      // Update the user in local storage with data from the API response
      if (data.user) {
        // Use the data returned from the API
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
      } else if (user) {
        // Fallback to local update if API doesn't return user data
        const updatedUser = {
          ...user,
          medicalData: updatedMedicalData
        };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      
      setMessage({ 
        type: 'success', 
        text: 'Your medical information has been updated successfully.'
      });
      setEditMode(false);
      
      // Log to console that we're sending data to Gemini system
      console.log('Sending updated medical data to Gemini system:', updatedMedicalData);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'An error occurred while updating your information. Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const result = reader.result as string;
        // Store the original image and show the cropper
        setOriginalImage(result);
        setShowCropper(true);
      };
      
      reader.readAsDataURL(file);
    }
  };

  // Function to handle cropped image
  const handleCroppedImage = (croppedImage: string) => {
    setProfilePic(croppedImage);
    setShowCropper(false);
    setOriginalImage(null);
  };
  
  // Function to cancel cropping
  const handleCancelCrop = () => {
    setShowCropper(false);
    setOriginalImage(null);
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemoveProfilePic = async () => {
    if (!user) return;
    
    setIsUploadingPicture(true);
    setMessage({ type: '', text: '' });
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Send data to the API endpoint
      const response = await fetch('/api/user/update-profile-picture', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ profilePicture: '' }) // Empty string to remove
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove profile picture');
      }
      
      // Update the user in local storage with data from the API response
      if (data.user) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
      } else if (user) {
        // Fallback to local update if API doesn't return user data
        const updatedUser = {
          ...user,
          profilePicture: ''
        };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      
      setProfilePic(null);
      setMessage({ 
        type: 'success', 
        text: 'Your profile picture has been removed.'
      });
      
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error removing profile picture:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'An error occurred while removing your profile picture. Please try again.'
      });
    } finally {
      setIsUploadingPicture(false);
    }
  };

  const saveProfilePicture = async () => {
    if (!profilePic || !user) return;
    
    setIsUploadingPicture(true);
    setMessage({ type: '', text: '' });
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      console.log('Sending profile picture update request...');
      
      // Send data to the API endpoint
      const response = await fetch('/api/user/update-profile-picture', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ profilePicture: profilePic })
      });
      
      console.log('API response status:', response.status);
      const data = await response.json();
      
      if (!response.ok) {
        console.error('API error response:', data);
        throw new Error(data.error || 'Failed to update profile picture');
      }
      
      console.log('API success response:', data);
      
      // Update the user in local storage with data from the API response
      if (data.user) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
      } else if (user) {
        // Fallback to local update if API doesn't return user data
        const updatedUser = {
          ...user,
          profilePicture: profilePic
        };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      
      setProfilePic(null);
      setMessage({ 
        type: 'success', 
        text: 'Your profile picture has been updated successfully.'
      });
      
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error updating profile picture:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'An error occurred while updating your profile picture. Please try again.'
      });
    } finally {
      setIsUploadingPicture(false);
    }
  };

  if (isLoading) {
    return (
      <div className={navStyles.loadingContainer}>
        <div className={navStyles.spinnerContainer}>
          <div className={navStyles.spinner}></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className={navStyles.header}>
        <div className={navStyles.headerContent}>
          <Link href="/home" className={navStyles.logo}>
            <span className={navStyles.logoText}>Techno Vaidhya</span>
          </Link>
          
          <div className={navStyles.mobileMenuButton} onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </div>
          
          <div className={navStyles.userActions}>
            <div className={navStyles.userInfo}>
              <span className={navStyles.welcomeText}>
                Welcome, {user?.name}
                {user?.medicalData?.conditions && user.medicalData.conditions.length > 0 && (
                  <span className={navStyles.medicalBadge} title={`Conditions: ${user.medicalData.conditions.join(', ')}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                    </svg>
                  </span>
                )}
              </span>
            </div>
            
            {user?.profilePicture ? (
              <div className={navStyles.profileImage}>
                <img 
                  src={user.profilePicture} 
                  alt={`${user.name}'s profile`} 
                />
              </div>
            ) : (
              <div className={navStyles.profileInitial}>
                {user?.name?.charAt(0) || 'U'}
              </div>
            )}
            
            <button 
              onClick={handleLogout}
              className={navStyles.logoutButton}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={navStyles.logoutIcon}>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span className={navStyles.logoutText}>Logout</span>
            </button>
          </div>
        </div>
      </header>
      
      {/* Navigation */}
      <nav className={`${navStyles.nav} ${isMenuOpen ? navStyles.mobileMenuOpen : ''}`}>
        <div className={navStyles.navContent}>
          <Link 
            href="/home" 
            className={navStyles.navLink}
            onClick={() => setIsMenuOpen(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={navStyles.navIcon}>
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span>Home</span>
          </Link>
          
          <Link 
            href="/chat" 
            className={navStyles.navLink}
            onClick={() => setIsMenuOpen(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={navStyles.navIcon}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>Chat</span>
          </Link>
          
          <Link 
            href="/profile" 
            className={`${navStyles.navLink} ${navStyles.active}`}
            onClick={() => setIsMenuOpen(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={navStyles.navIcon}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span>Profile</span>
          </Link>
        </div>
      </nav>
      
      {/* Image Cropper Modal */}
      {showCropper && originalImage && (
        <div className={styles.modalOverlay}>
          <ImageCropper
            src={originalImage}
            onCrop={handleCroppedImage}
            onCancel={handleCancelCrop}
          />
        </div>
      )}
      
      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Profile Header */}
          <div className={styles.profileHeader}>
            <div className={styles.profileAvatar}>
              {profilePic ? (
                <img 
                  src={profilePic} 
                  alt="New profile picture"
                  className="w-full h-full object-cover" 
                />
              ) : user?.profilePicture ? (
                <img 
                  src={user.profilePicture} 
                  alt={`${user.name}'s profile`} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className={styles.avatarInitial}>{user?.name?.charAt(0) || 'U'}</span>
              )}
              
              <div className={styles.avatarOverlay}>
                <button 
                  onClick={triggerFileInput} 
                  className={styles.avatarEditButton}
                  title="Change profile picture"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                  </svg>
                </button>
                
                {user?.profilePicture && (
                  <button 
                    onClick={handleRemoveProfilePic} 
                    className={styles.avatarRemoveButton}
                    title="Remove profile picture"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18"></path>
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                    </svg>
                  </button>
                )}
              </div>
              
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleProfilePicChange}
                accept="image/*"
                className={styles.hiddenFileInput}
                style={{ display: 'none' }}
              />
            </div>
            
            {profilePic && (
              <div className={styles.profilePicActions}>
                <button 
                  onClick={saveProfilePicture} 
                  className={styles.saveButton}
                  disabled={isUploadingPicture}
                >
                  {isUploadingPicture ? 'Saving...' : 'Save Photo'}
                </button>
                <button 
                  onClick={() => setProfilePic(null)} 
                  className={styles.cancelButton}
                  disabled={isUploadingPicture}
                >
                  Cancel
                </button>
              </div>
            )}
            
            <div className={styles.profileInfo}>
              <h1 className={styles.profileName}>{user?.name}</h1>
              <p className={styles.profileEmail}>{user?.email}</p>
              <div className={styles.profileDetails}>
                {user?.gender && (
                  <span className={styles.profileDetail}>
                    Gender: {user.gender}
                  </span>
                )}
                {user?.age && (
                  <span className={styles.profileDetail}>
                    Age: {user.age}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Status Message */}
          {message.text && (
            <div className={`${styles.messageBox} ${message.type === 'success' ? styles.successMessage : styles.errorMessage}`}>
              {message.text}
            </div>
          )}
          
          {/* Medical Information */}
          <div className={styles.medicalCard}>
            <div className={styles.medicalCardHeader}>
              <h2 className={styles.sectionTitle}>Medical Information</h2>
              <button
                onClick={() => setEditMode(!editMode)}
                className={`${styles.editButton} ${editMode ? styles.cancelButton : ''}`}
              >
                {editMode ? 'Cancel' : 'Edit Information'}
              </button>
            </div>
            
            {editMode ? (
              <form onSubmit={handleSubmit} className={styles.medicalForm}>
                <h3 className={styles.subsectionTitle}>Medical History</h3>
                <div className={styles.formSection}>
                  <div className={styles.formField}>
                    <label htmlFor="medicalHistory" className={styles.formLabel}>
                      Medical History
                    </label>
                    <textarea
                      id="medicalHistory"
                      name="medicalHistory"
                      value={formData.medicalHistory}
                      onChange={handleChange}
                      className={styles.textArea}
                      placeholder="Enter your medical history"
                    />
                  </div>
                  
                  <div className={styles.formField}>
                    <label htmlFor="conditions" className={styles.formLabel}>
                      Medical Conditions
                    </label>
                    <input
                      type="text"
                      id="conditions"
                      name="conditions"
                      value={formData.conditions}
                      onChange={handleChange}
                      className={styles.inputField}
                      placeholder="Separate multiple conditions with commas"
                    />
                  </div>
                  
                  <div className={styles.formField}>
                    <label htmlFor="medications" className={styles.formLabel}>
                      Current Medications
                    </label>
                    <input
                      type="text"
                      id="medications"
                      name="medications"
                      value={formData.medications}
                      onChange={handleChange}
                      className={styles.inputField}
                      placeholder="Separate multiple medications with commas"
                    />
                  </div>
                  
                  <div className={styles.formField}>
                    <label htmlFor="allergies" className={styles.formLabel}>
                      Allergies
                    </label>
                    <input
                      type="text"
                      id="allergies"
                      name="allergies"
                      value={formData.allergies}
                      onChange={handleChange}
                      className={styles.inputField}
                      placeholder="Separate multiple allergies with commas"
                    />
                  </div>
                  
                  <div className={styles.formField}>
                    <label htmlFor="familyHistory" className={styles.formLabel}>
                      Family Medical History
                    </label>
                    <textarea
                      id="familyHistory"
                      name="familyHistory"
                      value={formData.familyHistory}
                      onChange={handleChange}
                      className={styles.textArea}
                      placeholder="Enter your family's medical history"
                    />
                  </div>
                </div>
                
                <h3 className={styles.subsectionTitle}>Lifestyle</h3>
                <div className={styles.formSection}>
                  <div className={styles.checkboxGroup}>
                    <div className={styles.checkbox}>
                      <input
                        type="checkbox"
                        id="smoking"
                        name="smoking"
                        checked={formData.smoking}
                        onChange={handleChange}
                        className={styles.checkboxInput}
                      />
                      <label htmlFor="smoking" className={styles.checkboxLabel}>
                        Smoking
                      </label>
                    </div>
                    
                    <div className={styles.checkbox}>
                      <input
                        type="checkbox"
                        id="alcohol"
                        name="alcohol"
                        checked={formData.alcohol}
                        onChange={handleChange}
                        className={styles.checkboxInput}
                      />
                      <label htmlFor="alcohol" className={styles.checkboxLabel}>
                        Alcohol
                      </label>
                    </div>
                  </div>
                  
                  <div className={styles.fieldsGrid}>
                    <div className={styles.formField}>
                      <label htmlFor="exercise" className={styles.formLabel}>
                        Exercise
                      </label>
                      <input
                        type="text"
                        id="exercise"
                        name="exercise"
                        value={formData.exercise}
                        onChange={handleChange}
                        className={styles.inputField}
                        placeholder="Exercise routine"
                      />
                    </div>
                    
                    <div className={styles.formField}>
                      <label htmlFor="diet" className={styles.formLabel}>
                        Diet
                      </label>
                      <input
                        type="text"
                        id="diet"
                        name="diet"
                        value={formData.diet}
                        onChange={handleChange}
                        className={styles.inputField}
                        placeholder="Dietary habits"
                      />
                    </div>

                    <div className={styles.formField}>
                      <label htmlFor="sleepHours" className={styles.formLabel}>
                        Sleep Hours
                      </label>
                      <input
                        type="text"
                        id="sleepHours"
                        name="sleepHours"
                        value={formData.sleepHours}
                        onChange={handleChange}
                        className={styles.inputField}
                        placeholder="e.g., 7-8 hours"
                      />
                    </div>
                    
                    <div className={styles.formField}>
                      <label htmlFor="stressLevel" className={styles.formLabel}>
                        Stress Level
                      </label>
                      <input
                        type="text"
                        id="stressLevel"
                        name="stressLevel"
                        value={formData.stressLevel}
                        onChange={handleChange}
                        className={styles.inputField}
                        placeholder="e.g., Low, Medium, High"
                      />
                    </div>
                  </div>
                </div>
                
                <h3 className={styles.subsectionTitle}>Vital Signs</h3>
                <div className={styles.fieldsGrid}>
                  <div className={styles.formField}>
                    <label htmlFor="height" className={styles.formLabel}>
                      Height
                    </label>
                    <input
                      type="text"
                      id="height"
                      name="height"
                      value={formData.height}
                      onChange={handleChange}
                      className={styles.inputField}
                      placeholder="e.g., 5'10 or 178 cm"
                    />
                  </div>
                  
                  <div className={styles.formField}>
                    <label htmlFor="weight" className={styles.formLabel}>
                      Weight
                    </label>
                    <input
                      type="text"
                      id="weight"
                      name="weight"
                      value={formData.weight}
                      onChange={handleChange}
                      className={styles.inputField}
                      placeholder="e.g., 160 lbs or 73 kg"
                    />
                  </div>
                  
                  <div className={styles.formField}>
                    <label htmlFor="bloodPressure" className={styles.formLabel}>
                      Blood Pressure
                    </label>
                    <input
                      type="text"
                      id="bloodPressure"
                      name="bloodPressure"
                      value={formData.bloodPressure}
                      onChange={handleChange}
                      className={styles.inputField}
                      placeholder="e.g., 120/80"
                    />
                  </div>
                  
                  <div className={styles.formField}>
                    <label htmlFor="heartRate" className={styles.formLabel}>
                      Heart Rate
                    </label>
                    <input
                      type="text"
                      id="heartRate"
                      name="heartRate"
                      value={formData.heartRate}
                      onChange={handleChange}
                      className={styles.inputField}
                      placeholder="e.g., 72 bpm"
                    />
                  </div>

                  <div className={styles.formField}>
                    <label htmlFor="temperature" className={styles.formLabel}>
                      Temperature
                    </label>
                    <input
                      type="text"
                      id="temperature"
                      name="temperature"
                      value={formData.temperature}
                      onChange={handleChange}
                      className={styles.inputField}
                      placeholder="e.g., 98.6 °F or 37 °C"
                    />
                  </div>
                  
                  <div className={styles.formField}>
                    <label htmlFor="bloodSugar" className={styles.formLabel}>
                      Blood Sugar
                    </label>
                    <input
                      type="text"
                      id="bloodSugar"
                      name="bloodSugar"
                      value={formData.bloodSugar}
                      onChange={handleChange}
                      className={styles.inputField}
                      placeholder="e.g., 100 mg/dL"
                    />
                  </div>
                </div>
                
                <div className={styles.formActions}>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className={styles.saveButton}
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <div className={styles.medicalInfo}>
                <div className={styles.infoSection}>
                  <h3 className={styles.subsectionTitle}>Medical History</h3>
                  <div className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                      <h4 className={styles.infoLabel}>Medical History</h4>
                      <p className={styles.infoValue}>
                        {user?.medicalData?.medicalHistory || 'No information provided'}
                      </p>
                    </div>
                    
                    <div className={styles.infoItem}>
                      <h4 className={styles.infoLabel}>Medical Conditions</h4>
                      <p className={styles.infoValue}>
                        {user?.medicalData?.conditions?.length 
                          ? user.medicalData.conditions.join(', ') 
                          : 'None specified'}
                      </p>
                    </div>
                    
                    <div className={styles.infoItem}>
                      <h4 className={styles.infoLabel}>Current Medications</h4>
                      <p className={styles.infoValue}>
                        {user?.medicalData?.medications?.length 
                          ? user.medicalData.medications.join(', ') 
                          : 'None specified'}
                      </p>
                    </div>
                    
                    <div className={styles.infoItem}>
                      <h4 className={styles.infoLabel}>Allergies</h4>
                      <p className={styles.infoValue}>
                        {user?.medicalData?.allergies?.length 
                          ? user.medicalData.allergies.join(', ') 
                          : 'None specified'}
                      </p>
                    </div>
                    
                    <div className={styles.infoItem}>
                      <h4 className={styles.infoLabel}>Family Medical History</h4>
                      <p className={styles.infoValue}>
                        {user?.medicalData?.familyHistory || 'No information provided'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className={styles.infoSection}>
                  <h3 className={styles.subsectionTitle}>Lifestyle</h3>
                  <div className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                      <h4 className={styles.infoLabel}>Smoking</h4>
                      <p className={styles.infoValue}>
                        {user?.medicalData?.lifestyle?.smoking ? 'Yes' : 'No'}
                      </p>
                    </div>
                    
                    <div className={styles.infoItem}>
                      <h4 className={styles.infoLabel}>Alcohol</h4>
                      <p className={styles.infoValue}>
                        {user?.medicalData?.lifestyle?.alcohol ? 'Yes' : 'No'}
                      </p>
                    </div>
                    
                    <div className={styles.infoItem}>
                      <h4 className={styles.infoLabel}>Exercise</h4>
                      <p className={styles.infoValue}>
                        {user?.medicalData?.lifestyle?.exercise || 'No information provided'}
                      </p>
                    </div>
                    
                    <div className={styles.infoItem}>
                      <h4 className={styles.infoLabel}>Diet</h4>
                      <p className={styles.infoValue}>
                        {user?.medicalData?.lifestyle?.diet || 'No information provided'}
                      </p>
                    </div>

                    <div className={styles.infoItem}>
                      <h4 className={styles.infoLabel}>Sleep Hours</h4>
                      <p className={styles.infoValue}>
                        {user?.medicalData?.lifestyle?.sleepHours || 'No information provided'}
                      </p>
                    </div>
                    
                    <div className={styles.infoItem}>
                      <h4 className={styles.infoLabel}>Stress Level</h4>
                      <p className={styles.infoValue}>
                        {user?.medicalData?.lifestyle?.stressLevel || 'No information provided'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className={styles.infoSection}>
                  <h3 className={styles.subsectionTitle}>Vital Signs</h3>
                  <div className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                      <h4 className={styles.infoLabel}>Height</h4>
                      <p className={styles.infoValue}>
                        {user?.medicalData?.vitalSigns?.height || 'Not specified'}
                      </p>
                    </div>
                    
                    <div className={styles.infoItem}>
                      <h4 className={styles.infoLabel}>Weight</h4>
                      <p className={styles.infoValue}>
                        {user?.medicalData?.vitalSigns?.weight || 'Not specified'}
                      </p>
                    </div>
                    
                    <div className={styles.infoItem}>
                      <h4 className={styles.infoLabel}>Blood Pressure</h4>
                      <p className={styles.infoValue}>
                        {user?.medicalData?.vitalSigns?.bloodPressure || 'Not specified'}
                      </p>
                    </div>
                    
                    <div className={styles.infoItem}>
                      <h4 className={styles.infoLabel}>Heart Rate</h4>
                      <p className={styles.infoValue}>
                        {user?.medicalData?.vitalSigns?.heartRate || 'Not specified'}
                      </p>
                    </div>

                    <div className={styles.infoItem}>
                      <h4 className={styles.infoLabel}>Temperature</h4>
                      <p className={styles.infoValue}>
                        {user?.medicalData?.vitalSigns?.temperature || 'Not specified'}
                      </p>
                    </div>
                    
                    <div className={styles.infoItem}>
                      <h4 className={styles.infoLabel}>Blood Sugar</h4>
                      <p className={styles.infoValue}>
                        {user?.medicalData?.vitalSigns?.bloodSugar || 'Not specified'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className={styles.disclaimerText}>
            <p>This information is used to provide you with more personalized health guidance.</p>
            <p>It is stored locally and transmitted securely to our AI service.</p>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-gray-800 py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-gray-400 text-sm">
          <p>© {new Date().getFullYear()} Techno Vaidhya Medical Assistant. All rights reserved.</p>
          <p className="mt-2">
            This application provides general health information and is not a substitute for professional medical advice, diagnosis, or treatment.
          </p>
        </div>
      </footer>
    </div>
  );
} 