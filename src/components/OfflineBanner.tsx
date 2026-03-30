import { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";

const OfflineBanner = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        setShowReconnected(true);
        setTimeout(() => setShowReconnected(false), 3000);
      }
    };
    const goOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [wasOffline]);

  if (isOnline && !showReconnected) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-all duration-300 ${
        isOnline
          ? "bg-green-600 text-white"
          : "bg-destructive text-destructive-foreground"
      }`}
    >
      {isOnline ? (
        <>
          <Wifi size={16} />
          <span>Back online</span>
        </>
      ) : (
        <>
          <WifiOff size={16} />
          <span>No internet connection. Please check your network.</span>
        </>
      )}
    </div>
  );
};

export default OfflineBanner;
