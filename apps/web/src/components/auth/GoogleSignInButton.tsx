import { useEffect, useRef } from 'react';

// Public Google OAuth Client ID. When unset, the button renders nothing so the
// rest of the auth UI degrades gracefully (same pattern as our other optional services).
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export const GOOGLE_ENABLED = !!CLIENT_ID;

let scriptPromise: Promise<void> | null = null;

/** Loads the Google Identity Services script once and resolves when ready. */
function loadGisScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    if ((window as any).google?.accounts?.id) return resolve();
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google sign-in'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

interface Props {
  /** Receives the Google ID token (credential) to send to the backend. */
  onCredential: (credential: string) => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
}

export default function GoogleSignInButton({ onCredential, text = 'continue_with' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;

    loadGisScript()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const google = (window as any).google;
        if (!google?.accounts?.id) return;

        google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response: { credential?: string }) => {
            if (response?.credential) onCredential(response.credential);
          },
        });

        containerRef.current.innerHTML = '';
        const width = Math.min(containerRef.current.offsetWidth || 320, 400);
        google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text,
          shape: 'pill',
          logo_alignment: 'center',
          width,
        });
      })
      .catch(() => {
        /* Network/script failure — button simply won't appear. */
      });

    return () => {
      cancelled = true;
    };
  }, [onCredential, text]);

  if (!CLIENT_ID) return null;
  return <div ref={containerRef} className="flex w-full justify-center" />;
}
