// EmptyStatePro.jsx — Chat Version
import React from "react";
import { ArrowLeft, MessageSquare } from "lucide-react";

export default function EmptyStatePro({
  title = "No Chat Details Found",
  subtitle = "Try a different Chat ID or check your filters.",
  onBack,
}) {
  return (
    <div className="w-full">
      <style>{`
        @keyframes floatY {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
          100% { transform: translateY(0px); }
        }
        @keyframes spinSlow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes glowPulse {
          0%,100% { box-shadow: 0 10px 30px rgba(56,189,248,.18); }
          50% { box-shadow: 0 20px 40px rgba(56,189,248,.28); }
        }
        .animate-floatY { animation: floatY 3.6s ease-in-out infinite; }
        .animate-spinSlow { animation: spinSlow 12s linear infinite; }
        .animate-glowPulse { animation: glowPulse 2.8s ease-in-out infinite; }
      `}</style>

      <div className="mx-auto max-w-xl">
        <div className="relative bg-white rounded-2xl border border-slate-200 p-8 md:p-10 text-center overflow-hidden">
          {/* background gradient glow */}
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div
              className="absolute -top-24 -left-24 h-56 w-56 rounded-full blur-3xl opacity-40"
              style={{
                background:
                  "radial-gradient(120px 120px at 50% 50%, rgba(56,189,248,.35), transparent 60%)",
              }}
            />
            <div
              className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full blur-3xl opacity-30"
              style={{
                background:
                  "radial-gradient(140px 140px at 50% 50%, rgba(99,102,241,.28), transparent 65%)",
              }}
            />
          </div>

          {/* animated halo ring */}
          <div className="mx-auto h-28 w-28 relative animate-glowPulse">
            <div
              className="absolute inset-0 rounded-2xl [mask:linear-gradient(#000,#000)_content-box,linear-gradient(#000,#000)] [mask-composite:exclude] p-[2px]"
              style={{
                background:
                  "conic-gradient(from 0deg, rgba(56,189,248,.2), rgba(99,102,241,.25), rgba(56,189,248,.2))",
              }}
            />
            <div className="absolute -inset-[2px] rounded-2xl overflow-hidden">
              <div
                className="absolute inset-0 rounded-2xl opacity-40 animate-spinSlow"
                style={{
                  background:
                    "conic-gradient(from 0deg, transparent, rgba(56,189,248,.25), transparent 50%)",
                }}
              />
            </div>

            {/* icon badge */}
            <div className="relative h-full w-full grid place-items-center bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200">
              <div className="h-12 w-12 rounded-xl grid place-items-center bg-gradient-to-br from-sky-500 to-indigo-500 text-white animate-floatY">
                <MessageSquare size={22} />
              </div>
            </div>
          </div>

          {/* title / subtitle */}
          <div className="mt-6">
            <h3 className="text-slate-900 font-semibold text-lg">{title}</h3>
            <p className="text-slate-500 text-sm mt-1">{subtitle}</p>
          </div>

          {/* back button */}
          <div className="mt-7 flex items-center justify-center gap-3">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 active:scale-[.98] transition"
            >
              <ArrowLeft size={16} />
              Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
