/**
 * PWA Utilities for update checking and install prompts
 */

// Extend Navigator interface for standalone property
declare global {
  interface Navigator {
    standalone?: boolean;
  }
}

// Check if the app is running as a PWA
export function isPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://');
}

// Check if PWA can be installed
export function canInstallPWA(): boolean {
  return 'serviceWorker' in navigator;
}

// Type for the beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Get install prompt event (if available)
let deferredPrompt: BeforeInstallPromptEvent | null = null;

window.addEventListener('beforeinstallprompt', (e: Event) => {
  e.preventDefault();
  deferredPrompt = e as BeforeInstallPromptEvent;
});

export async function showInstallPrompt(): Promise<boolean> {
  if (!deferredPrompt) {
    return false;
  }

  try {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    return outcome === 'accepted';
  } catch (error) {
    console.error('Failed to show install prompt:', error);
    return false;
  }
}

// Check if app is installed
export function isAppInstalled(): boolean {
  return isPWA();
}

// Force service worker to check for updates
export async function checkForUpdates(): Promise<boolean> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        return true;
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
    }
  }
  return false;
}

// Get app version from manifest or package info
export function getAppVersion(): string {
  // This would typically come from your build process
  return import.meta.env.VITE_APP_VERSION || '1.0.0';
} 