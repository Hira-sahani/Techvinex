import { Video, Clock, Info, Shield, Calendar, RefreshCw, HelpCircle, Mic, MicOff, Volume2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/apiClient";

type Msg = { role: "user" | "assistant"; content: string };
type InterviewPhase = "info" | "setup" | "interview" | "completed";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-interview`;
const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;

interface ApplyStepInterviewProps {
  onInterviewComplete?: () => void;
  onPhaseChange?: (phase: InterviewPhase) => void;
}

// Extend window for SpeechRecognition
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

const ApplyStepInterview = ({ onInterviewComplete, onPhaseChange }: ApplyStepInterviewProps) => {
  const [phase, setPhaseRaw] = useState<InterviewPhase>("info");
  const setPhase = (p: InterviewPhase) => {
    setPhaseRaw(p);
    onPhaseChange?.(p);
  };
  const [permissionError, setPermissionError] = useState("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [speakerDevices, setSpeakerDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMic, setSelectedMic] = useState("");
  const [selectedSpeaker, setSelectedSpeaker] = useState("");
  const [selectedCamera, setSelectedCamera] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  // Interview state
  const [messages, setMessages] = useState<Msg[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [questionCount, setQuestionCount] = useState(0);
  const [statusText, setStatusText] = useState("Preparing...");
  const recognitionRef = useRef<any>(null);
  const speechInitializedRef = useRef(false);
  const messagesRef = useRef<Msg[]>([]);

  // Keep ref in sync
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Cleanup
  useEffect(() => {
    return () => {
      stream?.getTracks().forEach(t => t.stop());
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, [stream]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, phase]);

  // --- Warm up audio (must be called from user gesture to unlock audio playback on mobile) ---
  const audioContextRef = useRef<AudioContext | null>(null);
  const warmUpSpeech = useCallback(() => {
    // Create AudioContext from user gesture to unlock audio on mobile
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    // Play a silent buffer to unlock audio
    const buffer = audioContextRef.current.createBuffer(1, 1, 22050);
    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    source.start();
    speechInitializedRef.current = true;
  }, []);

  // --- Preload voices (async on mobile) ---
  const [voicesReady, setVoicesReady] = useState(false);
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const loadVoices = () => {
      const v = synth.getVoices();
      if (v.length > 0) setVoicesReady(true);
    };
    loadVoices();
    synth.addEventListener("voiceschanged", loadVoices);
    return () => synth.removeEventListener("voiceschanged", loadVoices);
  }, []);

  // --- Fallback: Browser Web Speech API ---
  const speakWithBrowserTTS = useCallback((text: string): Promise<void> => {
    return new Promise<void>((resolve) => {
      const synth = window.speechSynthesis;
      if (!synth) { console.warn("No speechSynthesis available"); resolve(); return; }

      // Cancel any pending speech (fixes Android Chrome)
      synth.cancel();

      const clean = text.replace(/\*\*/g, "").replace(/\*/g, "");
      
      const doSpeak = () => {
        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.lang = "en-US";

        const voices = synth.getVoices();
        const englishVoice = voices.find(v => v.lang === "en-US") || voices.find(v => v.lang.startsWith("en"));
        if (englishVoice) utterance.voice = englishVoice;

        // Safety timeout (common mobile bug where onend never fires)
        const timeout = setTimeout(() => {
          console.warn("Browser TTS timeout, resolving");
          resolve();
        }, Math.max(15000, clean.length * 80));

        utterance.onend = () => { clearTimeout(timeout); resolve(); };
        utterance.onerror = (e) => {
          console.warn("Browser TTS error:", e);
          clearTimeout(timeout);
          resolve();
        };

        synth.speak(utterance);

        // Android Chrome fix: sometimes speech pauses after 15s, keep it alive
        const resumeInterval = setInterval(() => {
          if (!synth.speaking) { clearInterval(resumeInterval); return; }
          synth.pause();
          synth.resume();
        }, 10000);
        utterance.onend = () => { clearInterval(resumeInterval); clearTimeout(timeout); resolve(); };
      };

      // Wait for voices if not yet loaded
      const voices = synth.getVoices();
      if (voices.length === 0) {
        const onVoicesChanged = () => {
          synth.removeEventListener("voiceschanged", onVoicesChanged);
          doSpeak();
        };
        synth.addEventListener("voiceschanged", onVoicesChanged);
        // If voices never load, speak anyway after 1s
        setTimeout(() => {
          synth.removeEventListener("voiceschanged", onVoicesChanged);
          doSpeak();
        }, 1000);
      } else {
        doSpeak();
      }
    });
  }, []);

  // --- TTS via ElevenLabs API with browser fallback ---
  const speakText = useCallback(async (text: string): Promise<void> => {
    setIsSpeaking(true);
    setStatusText("AI is speaking...");

    try {
      const response = await apiFetch(TTS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`TTS failed: ${response.status}`);
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const fallbackInfo = await response.json().catch(() => null);
        console.warn("TTS provider unavailable, using browser speech fallback:", fallbackInfo);
        await speakWithBrowserTTS(text);
        setIsSpeaking(false);
        return;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      await new Promise<void>((resolve, reject) => {
        const audio = new Audio(audioUrl);
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        audio.onerror = (e) => {
          URL.revokeObjectURL(audioUrl);
          console.error("Audio playback error:", e);
          reject(e);
        };
        audio.play().catch(reject);
      });
    } catch (e) {
      console.error("ElevenLabs TTS error, falling back to browser speech:", e);
      await speakWithBrowserTTS(text);
    }

    setIsSpeaking(false);
  }, [speakWithBrowserTTS]);

  // --- STT: Listen for user speech ---
  const startListening = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        reject(new Error("Speech recognition not supported in this browser"));
        return;
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      let finalTranscript = "";
      let silenceTimer: any = null;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript + " ";
          } else {
            interim += result[0].transcript;
          }
        }
        setCurrentTranscript(finalTranscript + interim);

        // Reset silence timer on new speech
        if (silenceTimer) clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => {
          // Stop after 3 seconds of silence
          if (finalTranscript.trim().length > 0) {
            recognition.stop();
          }
        }, 3000);
      };

      recognition.onend = () => {
        setIsListening(false);
        if (silenceTimer) clearTimeout(silenceTimer);
        resolve(finalTranscript.trim());
      };

      recognition.onerror = (e: any) => {
        setIsListening(false);
        if (silenceTimer) clearTimeout(silenceTimer);
        if (e.error === "no-speech") {
          resolve("");
        } else {
          reject(new Error(e.error));
        }
      };

      setIsListening(true);
      setCurrentTranscript("");
      setStatusText("Listening... Speak your answer");
      recognition.start();
    });
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
  }, []);

  // --- Stream AI response (non-streaming, collect full text to speak) ---
  const getAIResponse = useCallback(async (allMessages: Msg[]): Promise<string> => {
    setIsLoading(true);
    setStatusText("AI is thinking...");
    let assistantText = "";

    try {
      const resp = await apiFetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: allMessages, domain: "Software Engineering" }),
      });

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to connect");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "" || !line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) assistantText += content;
          } catch { textBuffer = line + "\n" + textBuffer; break; }
        }
      }
    } catch (e: any) {
      assistantText = `Sorry, I encountered an error: ${e.message}. Let me try again.`;
    }
    setIsLoading(false);
    return assistantText;
  }, []);

  // --- Main interview loop ---
  const runInterviewLoop = useCallback(async () => {
    // Step 1: Get AI introduction
    const introMessages: Msg[] = [{ role: "user", content: "Hello, I'm ready to start the interview." }];
    setMessages(introMessages);

    const introResponse = await getAIResponse(introMessages);
    const introMsg: Msg = { role: "assistant", content: introResponse };
    const afterIntro = [...introMessages, introMsg];
    setMessages(afterIntro);

    // Speak introduction
    await speakText(introResponse);

    let currentMessages = afterIntro;
    let qCount = 0;

    // Interview loop
    while (true) {
      // Listen for user answer
      setStatusText("🎤 Your turn — speak your answer...");
      let userAnswer = "";
      try {
        userAnswer = await startListening();
      } catch {
        setStatusText("Speech recognition error. Retrying...");
        await new Promise(r => setTimeout(r, 1000));
        try {
          userAnswer = await startListening();
        } catch {
          userAnswer = "I'm having trouble with my microphone.";
        }
      }

      if (!userAnswer.trim()) {
        // If no speech detected, prompt user
        await speakText("I didn't catch that. Could you please repeat your answer?");
        try {
          userAnswer = await startListening();
        } catch {
          userAnswer = "I need to skip this question.";
        }
        if (!userAnswer.trim()) userAnswer = "I'd like to move to the next question.";
      }

      const userMsg: Msg = { role: "user", content: userAnswer };
      currentMessages = [...currentMessages, userMsg];
      setMessages([...currentMessages]);
      setCurrentTranscript("");

      // Get AI response
      const aiResponse = await getAIResponse(currentMessages);
      const aiMsg: Msg = { role: "assistant", content: aiResponse };
      currentMessages = [...currentMessages, aiMsg];
      setMessages([...currentMessages]);
      qCount++;
      setQuestionCount(qCount);

      // Check if interview is complete
      const isComplete = qCount >= 5 && aiResponse.toLowerCase().match(/thank you|interview is (now )?complete|that concludes|wrap up|all the questions/);

      // Speak AI response
      await speakText(aiResponse);

      if (isComplete) {
        setPhase("completed");
        setStatusText("Interview completed! ✅");
        onInterviewComplete?.();
        break;
      }
    }
  }, [getAIResponse, speakText, startListening, onInterviewComplete]);

  const requestPermissions = async () => {
    try {
      setPermissionError("");
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(mediaStream);

      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioDevices(devices.filter(d => d.kind === "audioinput"));
      setVideoDevices(devices.filter(d => d.kind === "videoinput"));
      setSpeakerDevices(devices.filter(d => d.kind === "audiooutput"));

      const mic = devices.find(d => d.kind === "audioinput");
      const cam = devices.find(d => d.kind === "videoinput");
      const spk = devices.find(d => d.kind === "audiooutput");
      if (mic) setSelectedMic(mic.deviceId);
      if (cam) setSelectedCamera(cam.deviceId);
      if (spk) setSelectedSpeaker(spk.deviceId);

      setPhase("setup");
    } catch {
      setPermissionError("Camera & microphone access is required for the interview. Please enable permissions and try again.");
    }
  };

  const startInterview = async () => {
    // Warm up speech synthesis from user gesture context (required on mobile)
    warmUpSpeech();
    setPhase("interview");
    await new Promise(r => setTimeout(r, 500));
    runInterviewLoop();
  };

  // ====== PHASE: INFO ======
  if (phase === "info") {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-foreground">Domain Expert Interview</h2>
          <span className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded font-medium">17 min</span>
        </div>

        <div className="border border-border rounded-xl p-3 bg-card">
          <div className="w-full h-20 bg-muted rounded-lg flex items-center justify-center mb-2">
            <div className="flex items-center gap-2">
              <Video size={18} className="text-muted-foreground" />
              <p className="text-[11px] text-muted-foreground">Camera preview will appear here</p>
            </div>
          </div>

          <div className="space-y-1.5 mb-3">
            <div className="flex items-start gap-2">
              <Info size={13} className="text-primary mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground">Voice AI interview</span> — The AI will speak questions aloud. Answer by speaking.
              </p>
            </div>

            {[
              { icon: Clock, text: "~17 minutes" },
              { icon: RefreshCw, text: "3 retakes remaining" },
              { icon: Shield, text: "Your data is in your control" },
              { icon: Calendar, text: "Interview on your own time" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2">
                <Icon size={12} className="text-muted-foreground flex-shrink-0" />
                <span className="text-[11px] text-muted-foreground">{text}</span>
              </div>
            ))}
          </div>

          <Button
            onClick={requestPermissions}
            className="w-full rounded-lg gradient-cta border-0 text-primary-foreground hover:opacity-90 py-4 text-sm font-medium"
          >
            Start Interview
          </Button>

          {permissionError && (
            <p className="text-xs text-destructive mt-2 text-center">{permissionError}</p>
          )}
        </div>
      </div>
    );
  }

  // ====== PHASE: SETUP ======
  if (phase === "setup") {
    return (
      <div className="space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-bold text-foreground">Domain Expert Interview</h2>
            <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded font-medium">17 min</span>
          </div>
          <p className="text-xs text-muted-foreground">Discuss your knowledge in a domain of your choice.</p>
        </div>

        <div className="rounded-xl overflow-hidden border border-border bg-muted aspect-video">
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
        </div>

        <div className="space-y-2.5">
          <div className="flex items-start gap-2">
            <Info size={14} className="text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-foreground">This is a Voice AI interview</p>
              <p className="text-[11px] text-muted-foreground">
                The AI will speak questions aloud. Answer verbally — your speech will be transcribed automatically.
              </p>
            </div>
          </div>
          {[
            { icon: Clock, text: "Expect to spend ~17 minutes" },
            { icon: HelpCircle, text: "Need assistance? Just ask" },
            { icon: RefreshCw, text: "3 of 3 interview retakes remaining" },
            { icon: Shield, text: "Your data is in your control" },
            { icon: Calendar, text: "Interview on your own time" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2">
              <Icon size={13} className="text-muted-foreground flex-shrink-0" />
              <span className="text-[11px] text-muted-foreground">{text}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
              <Mic size={10} /> Microphone
            </div>
            <select value={selectedMic} onChange={(e) => setSelectedMic(e.target.value)}
              className="w-full text-[10px] bg-secondary border border-border rounded px-1.5 py-1.5 text-foreground">
              {audioDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || "Microphone"}</option>)}
            </select>
          </div>
          <div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
              <Volume2 size={10} /> Speaker
            </div>
            <select value={selectedSpeaker} onChange={(e) => setSelectedSpeaker(e.target.value)}
              className="w-full text-[10px] bg-secondary border border-border rounded px-1.5 py-1.5 text-foreground">
              {speakerDevices.length > 0 ? speakerDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || "Speaker"}</option>) : <option>Default</option>}
            </select>
          </div>
          <div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
              <Camera size={10} /> Camera
            </div>
            <select value={selectedCamera} onChange={(e) => setSelectedCamera(e.target.value)}
              className="w-full text-[10px] bg-secondary border border-border rounded px-1.5 py-1.5 text-foreground">
              {videoDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || "Camera"}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 rounded-lg py-4 text-xs" onClick={() => {}}>
            Troubleshooting help
          </Button>
          <Button onClick={startInterview}
            className="flex-1 rounded-lg gradient-cta border-0 text-primary-foreground hover:opacity-90 py-4 text-sm font-medium">
            Start
          </Button>
        </div>

        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><HelpCircle size={10} /> FAQ</span>
          <span className="text-primary">Contact Support →</span>
        </div>
      </div>
    );
  }

  // ====== PHASE: INTERVIEW (Voice-based) ======
  if (phase === "interview" || phase === "completed") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">Domain Expert Interview</h2>
            <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
              phase === "completed" ? "bg-green-500/10 text-green-600" : "bg-primary/10 text-primary"
            }`}>
              {phase === "completed" ? "COMPLETED" : "LIVE"}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground">Q{questionCount}/7</span>
        </div>

        {/* Camera view — large during interview */}
        <div className="relative rounded-xl overflow-hidden border border-border bg-muted aspect-video">
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />

          {/* Status overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isSpeaking && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] text-white font-medium">AI Speaking</span>
                  </div>
                )}
                {isListening && (
                  <div className="flex items-center gap-1.5">
                    <Mic size={12} className="text-red-400 animate-pulse" />
                    <span className="text-[10px] text-white font-medium">Listening...</span>
                  </div>
                )}
                {isLoading && !isSpeaking && !isListening && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                    <span className="text-[10px] text-white font-medium">Thinking...</span>
                  </div>
                )}
                {phase === "completed" && (
                  <span className="text-[10px] text-green-400 font-medium">✅ Interview Complete</span>
                )}
              </div>
              <div className="flex gap-1.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isListening ? "bg-red-500" : "bg-white/20"}`}>
                  {isListening ? <Mic size={13} className="text-white" /> : <MicOff size={13} className="text-white/60" />}
                </div>
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                  <Video size={13} className="text-white/80" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live transcript area */}
        <div className="border border-border rounded-xl bg-card p-4 min-h-[120px] max-h-[35vh] overflow-y-auto">
          {/* Show last AI message */}
          {messages.filter(m => m.role === "assistant").length > 0 && (
            <div className="mb-3">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                  <Volume2 size={10} className="text-primary" />
                </div>
                <span className="text-[10px] font-semibold text-primary">AI Interviewer</span>
              </div>
              <p className="text-xs text-foreground leading-5 whitespace-pre-wrap">
                {messages.filter(m => m.role === "assistant").slice(-1)[0]?.content}
              </p>
            </div>
          )}

          {/* Show current user transcript */}
          {(isListening || currentTranscript) && (
            <div className="border-t border-border pt-3">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center">
                  <Mic size={10} className="text-muted-foreground" />
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground">You</span>
                {isListening && <span className="text-[9px] text-red-400 animate-pulse">● Recording</span>}
              </div>
              <p className="text-xs text-muted-foreground leading-5 italic">
                {currentTranscript || "Waiting for your response..."}
              </p>
            </div>
          )}

          {/* Status message when neither speaking nor listening */}
          {!isListening && !currentTranscript && messages.length === 0 && (
            <div className="flex items-center justify-center h-20">
              <p className="text-xs text-muted-foreground">{statusText}</p>
            </div>
          )}
        </div>

        {/* Manual stop button when listening */}
        {isListening && (
          <Button
            onClick={stopListening}
            variant="outline"
            className="w-full rounded-lg py-4 text-xs border-red-500/30 text-red-500 hover:bg-red-500/10"
          >
            <MicOff size={14} className="mr-1" /> Done Speaking — Submit Answer
          </Button>
        )}

        {phase === "completed" && (
          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-center">
            <p className="text-sm font-medium text-green-600 mb-1">🎉 Interview Completed!</p>
            <p className="text-xs text-muted-foreground">Your responses have been recorded. Click Next to continue.</p>
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default ApplyStepInterview;
