import { api } from '../api/client';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function registerPushDevice(): Promise<{
  success: boolean;
  permission: NotificationPermission;
  error?: string;
}> {
  if (!isPushSupported()) {
    return {
      success: false,
      permission: typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied',
      error: 'Push notifications are not supported in this browser environment.'
    };
  }

  const permission = Notification.permission;
  if (permission !== 'granted') {
    return {
      success: false,
      permission,
      error: 'Notification permission has not been granted yet.'
    };
  }

  try {
    // 1. Ensure Service Worker is registered and active
    let registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    }
    await navigator.serviceWorker.ready;

    // 2. Fetch server's public VAPID key
    const { publicKey } = await api.getVapidKey();
    if (!publicKey) {
      throw new Error('Server did not return a valid VAPID public key.');
    }

    const convertedKey = urlBase64ToUint8Array(publicKey);

    // 3. Check for existing subscription or create new
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey as unknown as BufferSource
      });
    }

    // 4. Send subscription JSON to server
    const rawSub = subscription.toJSON();
    await api.subscribePush(rawSub);

    return {
      success: true,
      permission: 'granted'
    };
  } catch (err: any) {
    console.warn('Push registration error:', err);
    return {
      success: false,
      permission: Notification.permission,
      error: err?.message || 'Failed to complete push subscription'
    };
  }
}

export async function requestAndRegisterNotifications(): Promise<{
  permission: NotificationPermission;
  registered: boolean;
}> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { permission: 'denied', registered: false };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const res = await registerPushDevice();
      return { permission: 'granted', registered: res.success };
    }
    return { permission, registered: false };
  } catch {
    return { permission: Notification.permission, registered: false };
  }
}
