// PhoneCallHero.jsx
import { Phone } from "lucide-react";

export default function PhoneCallHero() {
  return (
    <div className="relative h-20 w-20 mx-auto select-none">
      {/* soft blob glow */}
      <div className="absolute inset-0 blur-2xl rounded-full bg-gradient-to-br from-sky-400/40 via-cyan-400/30 to-indigo-400/40 animate-blob" />

      {/* expanding rings */}
      <span className="absolute inset-0 rounded-full border-2 border-sky-400/60 animate-ring" />
      <span className="absolute inset-0 rounded-full border-2 border-cyan-400/50 animate-ring [animation-delay:220ms]" />
      <span className="absolute inset-0 rounded-full border-2 border-indigo-400/40 animate-ring [animation-delay:440ms]" />

      {/* central badge */}
      <div className="absolute inset-0 grid place-items-center">
        <div className="relative grid place-items-center h-16 w-16 rounded-2xl bg-white shadow-[0_10px_30px_-5px_rgba(2,132,199,0.35)] ring-1 ring-sky-100">
          {/* small pulse dot */}
          <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-sky-500 shadow animate-pingDot" />
          {/* phone */}
          <Phone className="h-8 w-8 text-sky-600 animate-phone" />
        </div>
      </div>

      {/* accessibility: stops motion for users who prefer reduced motion */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .animate-ring, .animate-phone, .animate-blob, .animate-pingDot { animation: none !important; }
        }
        @keyframes ring {
          0%   { transform: scale(0.6); opacity: .55; }
          70%  { transform: scale(1.25); opacity: .15; }
          100% { transform: scale(1.35); opacity: 0; }
        }
        .animate-ring { animation: ring 1.8s cubic-bezier(.22,.61,.36,1) infinite; }

        @keyframes phone {
          0%, 100% { transform: translateY(0) rotate(0deg); filter: drop-shadow(0 6px 14px rgba(56,189,248,.35)); }
          20% { transform: translateY(-2px) rotate(-8deg); }
          40% { transform: translateY(1px) rotate(10deg); }
          60% { transform: translateY(-1px) rotate(-6deg); }
          80% { transform: translateY(1px) rotate(6deg); }
        }
        .animate-phone { animation: phone 1.6s ease-in-out infinite; }

        @keyframes blob {
          0%,100% { transform: translate3d(0,0,0) scale(1); }
          50%     { transform: translate3d(0,2px,0) scale(1.03); }
        }
        .animate-blob { animation: blob 4s ease-in-out infinite; }

        @keyframes pingDot {
          0%   { transform: scale(.9); box-shadow: 0 0 0 0 rgba(59,130,246,.5); }
          70%  { transform: scale(1.2); box-shadow: 0 0 0 12px rgba(59,130,246,0); }
          100% { transform: scale(.9); box-shadow: 0 0 0 0 rgba(59,130,246,0); }
        }
        .animate-pingDot { animation: pingDot 1.8s ease-out infinite; }
      `}</style>
    </div>
  );
}
