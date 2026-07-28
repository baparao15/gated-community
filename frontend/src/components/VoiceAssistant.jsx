import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Loader2, Mic, Square } from 'lucide-react';
import api from '../services/api';
import { showToast } from '../store/uiSlice';
import { runVoiceCommand } from '../utils/voiceCommands';

const SpeechRecognitionCtor = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

// Recording auto-stops on silence (rather than a blind fixed timer) so a longer command
// like "book the swimming pool at six thirty" doesn't get cut off mid-word.
const MAX_LISTEN_MS = 12000;
const MIN_LISTEN_MS = 700;
const SILENCE_MS = 1400;
const SILENCE_RMS_THRESHOLD = 0.02;

const PREFERRED_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
const pickMimeType = () => PREFERRED_MIME_TYPES.find((t) => window.MediaRecorder?.isTypeSupported?.(t)) || '';

export default function VoiceAssistant() {
  const [status, setStatus] = useState('idle'); // idle | listening | thinking | done
  const [caption, setCaption] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const role = useSelector((s) => s.auth.user?.role);

  const recognitionRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const stopTimerRef = useRef(null);
  const clearTimerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const silenceIntervalRef = useRef(null);

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const cleanupSilenceDetection = () => {
    clearInterval(silenceIntervalRef.current);
    silenceIntervalRef.current = null;
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  };

  const finish = useCallback((message, severity = 'success') => {
    setStatus('done');
    setCaption(message);
    dispatch(showToast({ message, severity }));
    clearTimerRef.current = setTimeout(() => { setStatus('idle'); setCaption(''); }, 4500);
  }, [dispatch]);

  const stopListening = useCallback(() => {
    clearTimeout(stopTimerRef.current);
    cleanupSilenceDetection();
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.stop();
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
  }, []);

  // Watches mic volume and auto-stops once the user has paused for SILENCE_MS after
  // speaking, instead of always recording for a fixed duration.
  const watchForSilence = (stream) => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const audioCtx = new AudioCtx();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    audioCtxRef.current = audioCtx;

    const data = new Uint8Array(analyser.fftSize);
    const startedAt = Date.now();
    let lastLoudAt = Date.now();

    silenceIntervalRef.current = setInterval(() => {
      analyser.getByteTimeDomainData(data);
      let sumSquares = 0;
      for (let i = 0; i < data.length; i += 1) {
        const normalized = (data[i] - 128) / 128;
        sumSquares += normalized * normalized;
      }
      const rms = Math.sqrt(sumSquares / data.length);
      const elapsed = Date.now() - startedAt;
      if (rms > SILENCE_RMS_THRESHOLD) lastLoudAt = Date.now();

      if (elapsed > MAX_LISTEN_MS || (elapsed > MIN_LISTEN_MS && Date.now() - lastLoudAt > SILENCE_MS)) {
        stopListening();
      }
    }, 150);
  };

  const startListening = useCallback(async () => {
    clearTimeout(clearTimerRef.current);
    setCaption('Listening…');
    setStatus('listening');

    if (SpeechRecognitionCtor) {
      const recognition = new SpeechRecognitionCtor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';
      recognition.onresult = (event) => {
        const text = Array.from(event.results).map((r) => r[0].transcript).join(' ');
        if (text.trim()) setCaption(text);
      };
      recognition.onerror = () => {};
      try { recognition.start(); recognitionRef.current = recognition; } catch { /* already running */ }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, { ...(mimeType && { mimeType }), audioBitsPerSecond: 128000 });
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = async () => {
        cleanupStream();
        setStatus('thinking');
        setCaption('Thinking…');
        try {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          const form = new FormData();
          form.append('audio', blob, `command.${blob.type.includes('mp4') ? 'm4a' : 'webm'}`);
          form.append('language', 'en');
          const { data } = await api.post('/voice/transcribe', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          const text = data.data?.text?.trim();
          if (!text) { finish("I didn't catch that — try again.", 'error'); return; }
          setCaption(text);
          const result = await runVoiceCommand(text, { api, navigate, role });
          finish(result.message, result.severity);
        } catch (err) {
          finish(err.response?.data?.message || 'Voice transcription failed.', 'error');
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      watchForSilence(stream);
      stopTimerRef.current = setTimeout(stopListening, MAX_LISTEN_MS);
    } catch {
      recognitionRef.current?.stop();
      setStatus('idle');
      setCaption('');
      dispatch(showToast({ message: 'Microphone access is required for voice commands.', severity: 'error' }));
    }
  }, [dispatch, navigate, role, stopListening]);

  const handleClick = () => {
    if (status === 'listening') stopListening();
    else if (status === 'idle' || status === 'done') startListening();
  };

  const busy = status === 'thinking';

  useEffect(() => () => {
    recognitionRef.current?.stop();
    cleanupStream();
    cleanupSilenceDetection();
    clearTimeout(stopTimerRef.current);
    clearTimeout(clearTimerRef.current);
  }, []);

  return (
    <>
      {caption && (
        <div className="voice-bubble" role="status">
          {status === 'listening' && <span className="voice-bubble-dot" />}
          {caption}
        </div>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className={`voice-fab ${status === 'listening' ? 'voice-fab-active' : ''} ${busy ? 'opacity-90' : ''}`}
        aria-label={status === 'listening' ? 'Stop listening' : 'Ask the voice assistant'}
        title="Voice assistant — try 'book the gym at 6pm' or 'sell homemade cake for 200'"
      >
        {status === 'listening'
          ? <Square size={20} fill="currentColor" />
          : busy
            ? <Loader2 size={24} className="animate-spin" />
            : <Mic size={24} />}
      </button>
    </>
  );
}
