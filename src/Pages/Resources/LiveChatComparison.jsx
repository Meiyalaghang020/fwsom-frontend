"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Volume2, Play, Pause, ChevronDown, MessageSquare, FileText, RefreshCw } from 'lucide-react';
import api from '../../lib/api';

/* ───────────────────────── main component ──────────────────────── */

export default function LiveChatComparison() {
  const [openVoiceLeft, setOpenVoiceLeft] = useState(null);
  const [openVoiceRight, setOpenVoiceRight] = useState(null);
  const [openChatLeft, setOpenChatLeft] = useState(null);
  const [openChatRight, setOpenChatRight] = useState(null);
  // Main accordions are always open - no state needed
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Data states
  const [voiceData, setVoiceData] = useState({
    matched_files: [],
    audio1_files: [],
    audio2_files: []
  });

  const [chatData, setChatData] = useState({
    matched_files: [],
    chat1_files: [],
    chat2_files: []
  });

  // Fetch audio data
  const fetchAudioData = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/livechat/audio');

      if (response.data && response.data.success) {
        setVoiceData(response.data.data);
        // Open first matched file by default on both sides
        if (response.data.data.matched_files.length > 0) {
          setOpenVoiceLeft(response.data.data.matched_files[0].pattern);
          setOpenVoiceRight(response.data.data.matched_files[0].pattern);
        }
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Failed to fetch audio data:', err);
      setError('Failed to load audio data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch chat data
  const fetchChatData = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/livechat/chat');

      if (response.data && response.data.success) {
        setChatData(response.data.data);
        // Open first matched file by default on both sides
        if (response.data.data.matched_files.length > 0) {
          setOpenChatLeft(response.data.data.matched_files[0].pattern);
          setOpenChatRight(response.data.data.matched_files[0].pattern);
        }
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Failed to fetch chat data:', err);
      setError('Failed to load chat data');
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchAudioData();
    fetchChatData();
  }, []);

  /* ───────────────────── audio player sub-component ──────────────── */

  function AudioPlayer({ src, label }) {
    const audioRef = useRef(null);
    const progressRef = useRef(null);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState("0:00");
    const [duration, setDuration] = useState("0:00");

    function fmt(s) {
      if (!s || !isFinite(s)) return "0:00";
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60);
      return `${m}:${sec.toString().padStart(2, "0")}`;
    }

    useEffect(() => {
      const a = audioRef.current;
      if (!a) return;
      const onTime = () => {
        setProgress(a.duration ? (a.currentTime / a.duration) * 100 : 0);
        setCurrentTime(fmt(a.currentTime));
      };
      const onMeta = () => setDuration(fmt(a.duration));
      const onEnd = () => setPlaying(false);
      a.addEventListener("timeupdate", onTime);
      a.addEventListener("loadedmetadata", onMeta);
      a.addEventListener("ended", onEnd);
      return () => {
        a.removeEventListener("timeupdate", onTime);
        a.removeEventListener("loadedmetadata", onMeta);
        a.removeEventListener("ended", onEnd);
      };
    }, [src]);

    function toggle() {
      const a = audioRef.current;
      if (!a) return;
      if (playing) a.pause();
      else a.play().catch(() => { });
      setPlaying(!playing);
    }

    function seek(e) {
      const a = audioRef.current;
      const bar = progressRef.current;
      if (!a || !bar || !a.duration) return;
      const rect = bar.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      a.currentTime = pct * a.duration;
    }

    const noSrc = !src;

    return (
      <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <audio ref={audioRef} src={src} preload="metadata" />
        <span className="text-xs font-medium text-gray-500 w-12">{label}</span>
        {noSrc ? (
          <span className="text-sm text-gray-400 italic">No audio file loaded</span>
        ) : (
          <>
            <button
              onClick={toggle}
              className="w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition-colors"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </button>
            <div
              ref={progressRef}
              className="flex-1 h-2 bg-blue-100 rounded-full cursor-pointer"
              onClick={seek}
              role="progressbar"
              aria-valuenow={progress}
            >
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 font-medium w-16 text-right">
              {currentTime} / {duration}
            </span>
          </>
        )}
      </div>
    );
  }

  /* ─────────────────── accordion item sub-component ──────────────── */

  function AccordionItem({
    label,
    open,
    onToggle,
    children,
  }) {
    return (
      <div className="border border-gray-200 rounded-lg mb-3">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium transition-colors"
          aria-expanded={open}
        >
          <span>{label}</span>
          <ChevronDown
            className="w-4 h-4 transition-transform duration-200"
            style={{
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </button>
        {open && <div className="p-4 bg-white">{children}</div>}
      </div>
    );
  }

  /* ───────────────────────── main component ──────────────────────── */

  // Force scroll to work by manipulating DOM
  useEffect(() => {
    // Force body and html to allow scrolling
    document.body.style.height = 'auto';
    document.body.style.overflow = 'visible';
    document.documentElement.style.height = 'auto';
    document.documentElement.style.overflow = 'visible';
    
    // Find parent containers and force them to allow scrolling
    const parentElements = document.querySelectorAll('main, #root, .app, [class*="app"], [class*="main"], [class*="layout"]');
    parentElements.forEach(el => {
      el.style.height = 'auto';
      el.style.overflow = 'visible';
    });
    
    // Cleanup function to restore styles when component unmounts
    return () => {
      document.body.style.height = '';
      document.body.style.overflow = '';
      document.documentElement.style.height = '';
      document.documentElement.style.overflow = '';
      parentElements.forEach(el => {
        el.style.height = '';
        el.style.overflow = '';
      });
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50" style={{ 
      height: 'auto', 
      overflow: 'visible',
      position: 'relative'
    }}>
      {/* Sticky Header */}
      <div className="sticky top-0 left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-50">
        <div className="px-4 sm:px-6 py-2 sm:py-3">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex-shrink-0">Live Chat Comparison</h1>
            <button
              onClick={() => {
                fetchAudioData();
                fetchChatData();
              }}
              disabled={loading}
              className="p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg transition-colors shadow-md hover:shadow-lg flex-shrink-0"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-8 sm:pb-12">
        {/* Error display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* ── body ── */}
        <div className="space-y-6">
          {/* Voice Section */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
            <div className="w-full flex items-center justify-between p-3 sm:p-4 bg-gray-50 text-gray-700 font-medium rounded-t-lg">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="font-semibold text-sm sm:text-base">Voice Comparison</span>
              </div>
            </div>
            <div className="p-3 sm:p-4 bg-white">
              {/* ─── voice tab ─── */}
              <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                {/* left accordion list */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 sm:mb-4">AI Voice Agent</h3>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                    </div>
                  ) : voiceData.matched_files.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No audio files found</p>
                    </div>
                  ) : (
                    voiceData.matched_files.map((audio) => (
                      <AccordionItem
                        key={audio.pattern}
                        label={audio.audio1?.filename || 'N/A'}
                        open={openVoiceLeft === audio.pattern}
                        onToggle={() => {
                          const newOpenState = openVoiceLeft === audio.pattern ? null : audio.pattern;
                          setOpenVoiceLeft(newOpenState);
                          setOpenVoiceRight(newOpenState); // Synchronize with right side
                        }}
                      >
                        <AudioPlayer src={audio.audio1?.url || ''} label="Audio A" />
                      </AccordionItem>
                    ))
                  )}
                </div>

                {/* VS divider */}
                <div className="flex flex-col lg:flex-row items-center justify-center w-auto lg:w-16 flex-shrink-0 my-2 lg:my-0">
                  <div className="hidden lg:flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-amber-600 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                      VS
                    </span>
                  </div>
                  <div className="flex lg:hidden items-center justify-center w-full py-2 border-t border-b border-gray-200">
                    <span className="text-sm font-bold text-amber-600 px-3 py-1 rounded bg-amber-50 border border-amber-200">
                      VS
                    </span>
                  </div>
                </div>

                {/* right accordion list */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 sm:mb-4">Philippines Agent</h3>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                    </div>
                  ) : voiceData.matched_files.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No audio files found</p>
                    </div>
                  ) : (
                    voiceData.matched_files.map((audio) => (
                      <AccordionItem
                        key={audio.pattern}
                        label={audio.audio2?.filename || 'N/A'}
                        open={openVoiceRight === audio.pattern}
                        onToggle={() => {
                          const newOpenState = openVoiceRight === audio.pattern ? null : audio.pattern;
                          setOpenVoiceRight(newOpenState);
                          setOpenVoiceLeft(newOpenState); // Synchronize with left side
                        }}
                      >
                        <AudioPlayer src={audio.audio2?.url || ''} label="Audio B" />
                      </AccordionItem>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Chat Section */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
              <div className="w-full flex items-center justify-between p-3 sm:p-4 bg-gray-50 text-gray-700 font-medium rounded-t-lg">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="font-semibold text-sm sm:text-base">Chat Comparison</span>
                </div>
              </div>
              <div className="p-3 sm:p-4 bg-white">
                {/* ─── chat tab ───  */}
                <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                  {/* left accordion list */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 sm:mb-4">AI Chat Agent</h3>
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                      </div>
                    ) : chatData.matched_files.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p>No chat files found</p>
                      </div>
                    ) : (
                      chatData.matched_files.map((chat) => (
                        <AccordionItem
                          key={chat.pattern}
                          label={chat.chat1?.filename || 'N/A'}
                          open={openChatLeft === chat.pattern}
                          onToggle={() => {
                            const newOpenState = openChatLeft === chat.pattern ? null : chat.pattern;
                            setOpenChatLeft(newOpenState);
                            setOpenChatRight(newOpenState); // Synchronize with right side
                          }}
                        >
                          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg h-80 overflow-y-auto">
                            <div className="space-y-4">
                              {chat.chat1?.parsed_chat?.messages?.length > 0 ? (
                                chat.chat1.parsed_chat.messages.map((msg) => {
                                  // Determine if this is a customer message (not a staff member)
                                  const isCustomer = msg.sender && !msg.sender.includes('Alex');

                                  // Format timestamp
                                  const formatTimestamp = (timestamp) => {
                                    if (!timestamp) return '';
                                    return timestamp; // Show full timestamp as-is
                                  };

                                  // Get sender initials for avatar
                                  const getInitials = (name) => {
                                    if (!name) return 'U';
                                    const parts = name.split(' ');
                                    return parts.map(part => part[0]).join('').toUpperCase().slice(0, 2);
                                  };

                                  return (
                                    <div key={msg.id} className={`flex items-end gap-1 sm:gap-2 ${isCustomer ? 'justify-start' : 'justify-end'}`}>
                                      {isCustomer && (
                                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                                          <span className="text-xs font-medium text-white">{getInitials(msg.sender)}</span>
                                        </div>
                                      )}

                                      <div className={`max-w-[70%] sm:max-w-xs lg:max-w-md px-2 sm:px-4 py-1.5 sm:py-2 rounded-2xl ${isCustomer
                                        ? 'bg-blue-500 text-white rounded-bl-sm'
                                        : 'bg-white border border-gray-200 text-gray-800 rounded-br-sm'
                                        }`}>
                                        <p className="text-xs sm:text-sm leading-relaxed">{msg.message}</p>
                                        <p className={`text-xs mt-1 ${isCustomer ? 'text-blue-100' : 'text-gray-500'}`}>
                                          {msg.sender} ({formatTimestamp(msg.timestamp)})
                                        </p>
                                      </div>

                                      {!isCustomer && (
                                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                                          <span className="text-xs font-medium text-gray-600">{getInitials(msg.sender)}</span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              ) : (
                                <p className="text-gray-500 text-center italic">No messages available</p>
                              )}
                            </div>
                          </div>
                        </AccordionItem>
                      ))
                    )}
                  </div>

                  {/* VS divider */}
                  <div className="flex flex-col lg:flex-row items-center justify-center w-auto lg:w-16 flex-shrink-0 my-2 lg:my-0">
                    <div className="hidden lg:flex flex-col items-center justify-center">
                      <span className="text-lg font-bold text-amber-600 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                        VS
                      </span>
                    </div>
                    <div className="flex lg:hidden items-center justify-center w-full py-2 border-t border-b border-gray-200">
                      <span className="text-sm font-bold text-amber-600 px-3 py-1 rounded bg-amber-50 border border-amber-200">
                        VS
                      </span>
                    </div>
                  </div>

                  {/* right accordion list */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 sm:mb-4">Philippines Chat</h3>
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                      </div>
                    ) : chatData.matched_files.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p>No chat files found</p>
                      </div>
                    ) : (
                      chatData.matched_files.map((chat) => (
                        <AccordionItem
                          key={chat.pattern}
                          label={chat.chat2?.filename || 'N/A'}
                          open={openChatRight === chat.pattern}
                          onToggle={() => {
                            const newOpenState = openChatRight === chat.pattern ? null : chat.pattern;
                            setOpenChatRight(newOpenState);
                            setOpenChatLeft(newOpenState); // Synchronize with left side
                          }}
                        >
                          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg h-80 overflow-y-auto">
                            <div className="space-y-4">
                              {chat.chat2?.parsed_chat?.messages?.length > 0 ? (
                                chat.chat2.parsed_chat.messages.map((msg) => {
                                  // Determine if this is a customer message (not a staff member)
                                  const isCustomer = msg.sender && !msg.sender.includes('Mae Quirante') && !msg.sender.includes('Cesar Monapco') && !msg.sender.includes('Cheska Deallo') && !msg.sender.includes('Muthiah Ramanathan');

                                  // Format timestamp
                                  const formatTimestamp = (timestamp) => {
                                    if (!timestamp) return '';
                                    return timestamp; // Show full timestamp as-is
                                  };

                                  // Get sender initials for avatar
                                  const getInitials = (name) => {
                                    if (!name) return 'U';
                                    const parts = name.split(' ');
                                    return parts.map(part => part[0]).join('').toUpperCase().slice(0, 2);
                                  };

                                  return (
                                    <div key={msg.id} className={`flex items-end gap-1 sm:gap-2 ${isCustomer ? 'justify-start' : 'justify-end'}`}>
                                      {isCustomer && (
                                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                                          <span className="text-xs font-medium text-white">{getInitials(msg.sender)}</span>
                                        </div>
                                      )}

                                      <div className={`max-w-[70%] sm:max-w-xs lg:max-w-md px-2 sm:px-4 py-1.5 sm:py-2 rounded-2xl ${isCustomer
                                        ? 'bg-blue-500 text-white rounded-bl-sm'
                                        : 'bg-white border border-gray-200 text-gray-800 rounded-br-sm'
                                        }`}>
                                        <p className="text-xs sm:text-sm leading-relaxed">{msg.message}</p>
                                        <p className={`text-xs mt-1 ${isCustomer ? 'text-blue-100' : 'text-gray-500'}`}>
                                          {msg.sender} ({formatTimestamp(msg.timestamp)})
                                        </p>
                                      </div>

                                      {!isCustomer && (
                                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                                          <span className="text-xs font-medium text-gray-600">{getInitials(msg.sender)}</span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              ) : (
                                <p className="text-gray-500 text-center italic">No messages available</p>
                              )}
                            </div>
                          </div>
                        </AccordionItem>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
