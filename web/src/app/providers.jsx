'use client';

import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { VisitorLocationProvider } from '@/context/VisitorLocationContext';
import { LocationPrompt } from '@/components/common/LocationPrompt';

export function Providers({ children }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <VisitorLocationProvider>
          {children}
          <LocationPrompt />
          <Toaster position="top-right" />
        </VisitorLocationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
