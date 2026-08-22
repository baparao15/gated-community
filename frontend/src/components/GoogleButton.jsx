import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import api from '../services/api';
import { setCredentials } from '../store/authSlice';
import { showToast } from '../store/uiSlice';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Module-level singleton: initialize() is called exactly once across all
// GoogleButton instances (Login + Register pages both render this component).
let scriptPromise = null;
let gsiInitialized = false;
const _callbackRef = { current: null };

function loadAndInit(clientId) {
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const initGsi = () => {
        if (!gsiInitialized) {
          window.google.accounts.id.initialize({
            client_id: clientId,
            // Always delegates to whatever the latest closure is via the ref.
            callback: (r) => _callbackRef.current?.(r),
          });
          gsiInitialized = true;
        }
        resolve();
      };
      if (window.google?.accounts?.id) {
        initGsi();
      } else {
        const s = document.createElement('script');
        s.src = 'https://accounts.google.com/gsi/client';
        s.async = true;
        s.defer = true;
        s.onload = initGsi;
        s.onerror = reject;
        document.head.appendChild(s);
      }
    });
  }
  return scriptPromise;
}

export default function GoogleButton() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const buttonRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return;

    const handleCredential = async (response) => {
      try {
        const { data } = await api.post('/auth/google', { credential: response.credential });
        if (data.data?.pending) {
          // Brand-new Google registration: account created but pending admin approval.
          // Navigate to /login with state so the banner shows even if already on /login.
          navigate('/login', {
            state: {
              pendingMsg: 'Your account has been created and is awaiting admin approval. You will receive access once an admin activates it.',
            },
          });
          return;
        }
        dispatch(setCredentials(data.data));
        navigate('/app/dashboard');
      } catch (err) {
        if (err.response?.status === 403 && err.response?.data?.message?.toLowerCase().includes('pending')) {
          // Existing Google user — account still pending.
          navigate('/login', {
            state: {
              pendingMsg: 'Your account is still awaiting admin approval. Please check back later or contact your community admin.',
            },
          });
          return;
        }
        dispatch(showToast({ message: err.response?.data?.message || 'Google sign-in failed', severity: 'error' }));
      }
    };

    // Update the shared ref so the singleton callback always calls the latest closure
    _callbackRef.current = handleCredential;

    loadAndInit(CLIENT_ID)
      .then(() => {
        if (!buttonRef.current) return;
        // renderButton is safe to call on each mount — it only renders the UI widget
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline', size: 'large', width: 360, text: 'continue_with',
        });
        setReady(true);
      })
      .catch(() => {});

    return () => {
      // Clear so a stale closure cannot fire after this instance unmounts
      _callbackRef.current = null;
    };
  }, [dispatch, navigate]);

  if (!CLIENT_ID) {
    return (
      <div className="rounded-xl border-2 border-dashed border-earth-300 px-4 py-3 text-center text-xs font-semibold text-earth-500">
        Google sign-in is not configured. Set VITE_GOOGLE_CLIENT_ID to enable it.
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      {!ready && <div className="text-xs text-earth-400">Loading Google sign-in...</div>}
      <div ref={buttonRef} />
    </div>
  );
}