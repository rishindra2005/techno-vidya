'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import styles from './register.module.css';
import Image from 'next/image';
import ImageCropper from '../../components/ImageCropper';

export default function Register() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    gender: '',
    age: '',
    medicalHistory: '',
    conditions: '',
    medications: '',
    allergies: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
const [showPassword, setShowPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
      router.push('/home');
    }
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create a FileReader to read the file as data URL
      const reader = new FileReader();
      reader.onload = (event) => {
        // Store original image and show cropper
        setOriginalImage(event.target?.result as string);
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
    fileInputRef.current?.click();
  };

  const handleRemoveImage = () => {
    setProfilePic(null);
  };

const togglePasswordVisibility = (field: 'password' | 'confirmPassword') => {
  if (field === 'password') {
    setShowPassword(!showPassword);
  } else {
    setShowConfirmPassword(!showConfirmPassword);
  }
};
  const validateStep1 = () => {
    if (!formData.name) return "Name is required";
    if (!formData.email) return "Email is required";
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) return "Email is invalid";
    if (!formData.password) return "Password is required";
    if (formData.password.length < 6) return "Password must be at least 6 characters";
    if (formData.password !== formData.confirmPassword) return "Passwords do not match";
    return "";
  };

  const nextStep = () => {
    const error = validateStep1();
    if (error) {
      setError(error);
      return;
    }
    setError('');
    setStep(2);
  };

  const prevStep = () => {
    setStep(1);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Prepare data for API
      const apiData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        gender: formData.gender || undefined,
        age: formData.age || undefined,
        profilePicture: profilePic,
        medicalData: {
          medicalHistory: formData.medicalHistory || undefined,
          conditions: formData.conditions ? formData.conditions.split(',').map(item => item.trim()) : [],
          medications: formData.medications ? formData.medications.split(',').map(item => item.trim()) : [],
          allergies: formData.allergies ? formData.allergies.split(',').map(item => item.trim()) : []
        }
      };

      const response = await axios.post('/api/auth/register', apiData);

      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        router.push('/home');
      } else {
        setError('Registration failed. Please try again.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.leftPanel}>
        <div className={styles.content}>
          <div className={styles.logo}>Techno Vaidhya</div>
          <h1 className={styles.title}>Your Personal <br />Medical Companion</h1>
          <p className={styles.subtitle}>
            Sign up today to get personalized health guidance and information tailored to your specific medical profile.
          </p>

          <div className={styles.features}>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div className={styles.featureText}>
                <h3>Personalized Profile</h3>
                <p>Create a secure medical profile</p>
              </div>
            </div>

            <div className={styles.feature}>
              <div className={styles.featureIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div className={styles.featureText}>
                <h3>Private & Secure</h3>
                <p>Your medical data is protected</p>
              </div>
            </div>

            <div className={styles.feature}>
              <div className={styles.featureIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <div className={styles.featureText}>
                <h3>Accurate Responses</h3>
                <p>AI guidance based on your health data</p>
              </div>
            </div>
          </div>

          <div className={styles.disclaimer}>
            Not a replacement for professional medical advice. Always consult with healthcare professionals for medical concerns.
          </div>
        </div>
      </div>

      <div className={styles.rightPanel}>
        <div className={styles.formContainer}>
          <div className={styles.formHeader}>
            <h2>Create Your Account</h2>
            <p>Begin your health journey with Techno Vaidhya</p>

            {step === 1 ? (
              <div className={styles.stepIndicator}>
                <div className={styles.stepActive}>Account Information</div>
                <div className={styles.stepConnector}></div>
                <div className={styles.stepInactive}>Medical Information</div>
              </div>
            ) : (
              <div className={styles.stepIndicator}>
                <div className={styles.stepComplete}>Account Information</div>
                <div className={styles.stepConnector}></div>
                <div className={styles.stepActive}>Medical Information</div>
              </div>
            )}
          </div>

          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}

          <form onSubmit={step === 1 ? (e) => { e.preventDefault(); nextStep(); } : handleSubmit} className={styles.form}>
            {step === 1 ? (
              // Step 1: Account Information
              <>
                <div className={styles.formGroup}>
                  <label htmlFor="name" className={styles.formLabel}>
                    Full Name
                  </label>
                  <div className={styles.inputWrapper}>
                    <svg className={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="Enter your full name"
                      className={styles.input}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="email" className={styles.formLabel}>
                    Email Address
                  </label>
                  <div className={styles.inputWrapper}>
                    <svg className={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="Enter your email"
                      className={styles.input}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="password" className={styles.formLabel}>
                    Password
                  </label>
                  <div className={styles.inputWrapper}>
                    <svg className={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      placeholder="Create a password"
                      className={styles.input}
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('password')}
                      className={styles.passwordToggle}
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.passwordToggleIcon}>
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.passwordToggleIcon}>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className={styles.passwordHint}>Password must be at least 6 characters</p>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="confirmPassword" className={styles.formLabel}>
                    Confirm Password
                  </label>
                  <div className={styles.inputWrapper}>
                    <svg className={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      placeholder="Confirm your password"
                      className={styles.input}
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('confirmPassword')}
                      className={styles.passwordToggle}
                    >
                      {showConfirmPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.passwordToggleIcon}>
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.passwordToggleIcon}>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Profile Picture (Optional)
                  </label>
                  <div className={styles.profilePicSection}>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleProfilePicChange}
                      accept="image/*"
                      className={styles.fileInput}
                      key={profilePic ? 'has-file' : 'no-file'}
                    />

                    {!profilePic ? (
                      <div className={styles.uploadPlaceholder} onClick={triggerFileInput}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.uploadIcon}>
                          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                          <circle cx="9" cy="9" r="2" />
                          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                        </svg>
                        <span>Click to upload image</span>
                      </div>
                    ) : (
                      <div className={styles.profilePreviewContainer}>
                        <div className={styles.profilePreview}>
                          <img 
                            src={profilePic} 
                            alt="Profile preview" 
                            className={styles.previewImage}
                          />
                        </div>
                        <button 
                          type="button" 
                          onClick={handleRemoveImage}
                          className={styles.removeImageBtn}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  className={styles.submitButton}
                >
                  Continue
                </button>
              </>
            ) : (
              // Step 2: Medical Information
              <>
                <div className={styles.formGroup}>
                  <label htmlFor="age" className={styles.formLabel}>
                    Age
                  </label>
                  <div className={styles.inputWrapper}>
                    <input
                      type="number"
                      id="age"
                      name="age"
                      value={formData.age}
                      onChange={handleChange}
                      placeholder="Your age"
                      className={styles.input}
                      min="1"
                      max="120"
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="gender" className={styles.formLabel}>
                    Gender
                  </label>
                  <div className={styles.inputWrapper}>
                    <select
                      id="gender"
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className={styles.input}
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer_not_to_say">Prefer not to say</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="medicalHistory" className={styles.formLabel}>
                    Medical History (Optional)
                  </label>
                  <textarea
                    id="medicalHistory"
                    name="medicalHistory"
                    value={formData.medicalHistory}
                    onChange={handleChange}
                    placeholder="Brief summary of your medical history"
                    className={styles.textarea}
                    rows={3}
                  ></textarea>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="conditions" className={styles.formLabel}>
                    Medical Conditions (Optional)
                  </label>
                  <div className={styles.inputWrapper}>
                    <input
                      type="text"
                      id="conditions"
                      name="conditions"
                      value={formData.conditions}
                      onChange={handleChange}
                      placeholder="e.g., Diabetes, Hypertension (separate with commas)"
                      className={styles.input}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="medications" className={styles.formLabel}>
                    Current Medications (Optional)
                  </label>
                  <div className={styles.inputWrapper}>
                    <input
                      type="text"
                      id="medications"
                      name="medications"
                      value={formData.medications}
                      onChange={handleChange}
                      placeholder="e.g., Aspirin, Insulin (separate with commas)"
                      className={styles.input}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="allergies" className={styles.formLabel}>
                    Allergies (Optional)
                  </label>
                  <div className={styles.inputWrapper}>
                    <input
                      type="text"
                      id="allergies"
                      name="allergies"
                      value={formData.allergies}
                      onChange={handleChange}
                      placeholder="e.g., Penicillin, Peanuts (separate with commas)"
                      className={styles.input}
                    />
                  </div>
                </div>

                <div className={styles.formActions}>
                  <button
                    type="button"
                    onClick={prevStep}
                    className={styles.backButton}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className={styles.submitButton}
                  >
                    {loading ? (
                      <div className={styles.loadingSpinner}>
                        <svg className={styles.spinner} viewBox="0 0 50 50">
                          <circle className={styles.spinnerPath} cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
                        </svg>
                        <span>Creating account...</span>
                      </div>
                    ) : (
                      'Create Account'
                    )}
                  </button>
                </div>
              </>
            )}
          </form>

          <div className={styles.formFooter}>
            <p>
              Already have an account?{' '}
              <Link href="/login" className={styles.formLink}>
                Log In
              </Link>
            </p>
          </div>
        </div>
      </div>

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
    </div>
  );
}