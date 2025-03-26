'use client';

import { useState, FormEvent, useRef, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface AuthFormProps {
  formType: 'login' | 'register';
  onSuccess: (data: any) => void;
}

export default function AuthForms({ formType, onSuccess }: AuthFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    gender: 'other',
    age: '',
    profilePicture: null as File | null
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, profilePicture: file }));
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const endpoint = formType === 'login' ? '/api/auth/login' : '/api/auth/register';
      
      if (formType === 'login') {
        const payload = { 
          email: formData.email, 
          password: formData.password 
        };
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Authentication failed');
        }

        // Store user data and token in localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Call success callback
        onSuccess(data);
        
        // Redirect to home
        router.push('/home');
      } else {
        // Handle registration with file upload
        const formDataObj = new FormData();
        formDataObj.append('name', formData.name);
        formDataObj.append('email', formData.email);
        formDataObj.append('password', formData.password);
        formDataObj.append('gender', formData.gender);
        formDataObj.append('age', formData.age);
        
        if (formData.profilePicture) {
          formDataObj.append('profilePicture', formData.profilePicture);
        }
        
        const response = await fetch(endpoint, {
          method: 'POST',
          body: formDataObj,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Registration failed');
        }

        // Store user data and token in localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Call success callback
        onSuccess(data);
        
        // Redirect to home
        router.push('/home');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 cyber-card mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center neon-text">
        {formType === 'login' ? 'Login' : 'Create Account'}
      </h2>
      
      {error && (
        <div className="p-3 rounded-md mb-4" style={{backgroundColor: "rgba(239, 68, 68, 0.2)", color: "#ef4444"}}>
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {formType === 'register' && (
          <>
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="cyber-input w-full"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="gender" className="block text-sm font-medium mb-1">
                  Gender
                </label>
                <select
                  id="gender"
                  name="gender"
                  required
                  className="cyber-input w-full"
                  value={formData.gender}
                  onChange={handleChange}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="age" className="block text-sm font-medium mb-1">
                  Age
                </label>
                <input
                  id="age"
                  name="age"
                  type="number"
                  min="1"
                  max="120"
                  required
                  className="cyber-input w-full"
                  value={formData.age}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="profilePicture" className="block text-sm font-medium mb-1">
                Profile Picture
              </label>
              <div className="flex items-center space-x-4">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-600 rounded-lg p-4 cursor-pointer hover:border-primary flex flex-col items-center justify-center w-32 h-32"
                >
                  {profilePreview ? (
                    <img 
                      src={profilePreview} 
                      alt="Profile preview" 
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span className="text-xs text-gray-400 mt-2">Upload image</span>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  id="profilePicture"
                  name="profilePicture"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="text-xs text-gray-400">
                  <p>Click to upload your profile picture</p>
                  <p>Max size: 2MB</p>
                  <p>Formats: JPG, PNG</p>
                </div>
              </div>
            </div>
          </>
        )}
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="cyber-input w-full"
            value={formData.email}
            onChange={handleChange}
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="cyber-input w-full"
            value={formData.password}
            onChange={handleChange}
          />
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          className="cyber-button w-full mt-6"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : (
            formType === 'login' ? 'Login' : 'Create Account'
          )}
        </button>
      </form>
    </div>
  );
} 