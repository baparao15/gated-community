import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import api from '../services/api';
import { setCredentials } from '../store/authSlice';
import { showToast } from '../store/uiSlice';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
let scriptPromise = null;

// Loads Google's Identity Services script once, no matter how many times this
// component mounts (e.g. Login and Register both render it).
function loadGoogleScript() {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export default function GoogleButton() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const buttonRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;

    const handleCredential = async (response) => {
      try {
        const { data } = await api.post('/auth/google', { credential: response.credential });
        if (data.data?.pending) {
          dispatch(showToast({ message: data.message || 'Registration submitted. Awaiting admin approval.' }));
          return;
        }
        dispatch(setCredentials(data.data));
        navigate('/app/dashboard');
      } catch (err) {
        dispatch(showToast({ message: err.response?.data?.message || 'Google sign-in failed', severity: 'error' }));
      }
    };

    loadGoogleScript().then(() => {
      if (cancelled || !buttonRef.current) return;
      window.google.accounts.id.initialize({ client_id: CLIENT_ID, callback: handleCredential });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline', size: 'large', width: 360, text: 'continue_with',
      });
      setReady(true);
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [dispatch, navigate]);

  if (!CLIENT_ID) {
    return (
      <div className="rounded-xl border-2 border-dashed border-earth-300 px-4 py-3 text-center text-xs font-semibold text-earth-500">
        Google sign-in isn't configured yet — set VITE_GOOGLE_CLIENT_ID to enable it.
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      {!ready && <div className="text-xs text-earth-400">Loading Google sign-in…</div>}
      <div ref={buttonRef} />
    </div>
  );
}
