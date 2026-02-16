// ChatTracker.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ExternalLink, User, Users, MessageSquare,
  MapPin, Globe, CalendarClock, Tag
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import api from "../lib/api";
import PhoneCallHero from "./PhoneCallHero";
import EmptyState from "./EmptyState"; // or EmptyStatePro if you prefer

/* ---------------- tiny helpers ---------------- */
const cx = (...xs) => xs.filter(Boolean).join(" ");
const val = (x) => (x === null || x === undefined || x === "" ? "N/A" : String(x));
const fmtDate = (x) => (x ? x : "N/A");

/* ===========================================================
   Chat Tracker (FWS Contacts layout)
   =========================================================== */
export default function ChatTracker() {
  const [searchParams, setSearchParams] = useSearchParams();

  // read chatid from URL if present
  const initialChatId = searchParams.get("chatid") || searchParams.get("id") || "";
  const [chatIdInput, setChatIdInput] = useState(initialChatId);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [data, setData] = useState(null);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType] = useState("error"); // "error", "success", "warning"

  const chat = useMemo(() => {
    const chats = data?.data?.chats;
    return Array.isArray(chats) && chats.length ? chats[0] : null;
  }, [data]);

  const noChat =
    data && (!chat || data.status === false || (data.status !== "success" && !data.status));

  // Toast notification function
  const showToast = (message, type = "error") => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    // Auto-hide after 4 seconds
    setTimeout(() => {
      setToastVisible(false);
    }, 4000);
  };

  // deep link fetch
  useEffect(() => {
    const deepChatId = searchParams.get("chatid") || searchParams.get("id");
    if (deepChatId && !data && !isLoading) {
      fetchChat(deepChatId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchChat = async (id) => {
    try {
      setIsLoading(true);
      setErrorMsg("");
      const res = await api.post("/chat-tracker", { chatid: String(id).trim() });
      setData(res.data);
      setSearchParams({ chatid: String(id).trim() }, { replace: false });
    } catch (err) {
      console.error(err);
      setData(null);
      setErrorMsg("Failed to fetch data. Please try again.");
      showToast("Failed to fetch data. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    if (!chatIdInput.trim()) {
      // setErrorMsg("Please enter your Chat ID.");
      showToast("Please enter your Chat ID.", "warning");
      return;
    }
    fetchChat(chatIdInput.trim());
  };

  const goBack = () => {
    setSearchParams({});
    setData(null);
    setErrorMsg("");
    setChatIdInput("");
  };

  return (
    <div className="min-w-0">
      <div className="card relative flex flex-col min-h-[calc(100vh-6rem)] max-h-[calc(105vh-6rem)]">
        {/* Header row (matches FWS Contacts header) */}
        <div className="shrink-0 flex items-center justify-between p-4 border-b border-slate-200 bg-white">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-slate-900 font-semibold">
              <MessageSquare className="text-sky-500" />
              Chat Tracker
            </div>
          </div>

          {/* Right controls: Chat ID input + Submit */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={chatIdInput}
              onChange={(e) => setChatIdInput(e.target.value)}
              placeholder="Enter Chat ID…"
              className="w-56 px-3 py-1.5 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300"
            />
            <button
              type="submit"
              disabled={isLoading}
              className={cx(
                "inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md text-white",
                isLoading ? "bg-sky-400 cursor-not-allowed" : "bg-sky-600 hover:bg-sky-700"
              )}
              title="Fetch chat"
            >
              {isLoading ? "Fetching…" : "Submit"}
            </button>
          </form>
        </div>


        {/* Error banner */}
        {errorMsg && (
          <div className="shrink-0 p-4 text-sm text-rose-700 bg-rose-50 border-b border-rose-200">
            {errorMsg}
          </div>
        )}

        {/* Viewport-capped scroll area (same pattern as FWS Contacts table) */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50">
          <div className="p-4 w-full mx-auto max-w-none">
            {/* Initial empty state */}
            {!data && !isLoading && !errorMsg && (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 flex flex-col items-center gap-6 text-slate-700">
                <PhoneCallHero />
                <div className="text-center">
                  <h3 className="text-slate-900 font-semibold text-lg">Enter a Chat ID</h3>
                  <p className="text-slate-500 text-sm mt-1">
                    Use the input at the top-right and press Submit to load chat details.
                  </p>
                </div>
              </div>
            )}

            {/* No chat / not found */}
            {noChat && (
              <div className="bg-white border border-slate-200 rounded-2xl p-10">
                <EmptyState subtitle="No Chat Found." onBack={goBack} />
              </div>
            )}

            {/* Loaded state */}
            {!noChat && data && chat && (
              <div className="space-y-6">
                <Section title="Chat ID" icon={<MessageSquare size={18} />}>
                  <div className="text-slate-700">
                    <span className="font-semibold">Chat ID: </span>
                    <span className="font-mono">{val(chat?.id)}</span>
                  </div>
                </Section>

                <Section title="Users" icon={<Users size={18} />} tight>
                  <div className="overflow-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          {["Name", "Email", "Type", "Present", "Avatar"].map((h) => (
                            <th
                              key={h}
                              className="px-4 py-2 text-left text-sm font-semibold text-slate-600"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(chat?.users || []).map((u, idx) => (
                          <tr key={u.id || idx} className="align-top">
                            <td className="px-4 py-2 text-sm text-slate-800">{val(u.name)}</td>
                            <td className="px-4 py-2 text-sm text-sky-700 break-all">
                              {u.email ? (
                                <a href={`mailto:${u.email}`} className="hover:underline">
                                  {u.email}
                                </a>
                              ) : (
                                <span className="text-slate-600">N/A</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-800">{val(u.type)}</td>
                            <td className="px-4 py-2 text-sm">
                              <span
                                className={cx(
                                  "inline-flex items-center px-2 py-0.5 rounded-full text-xs",
                                  u.present
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-slate-100 text-slate-600"
                                )}
                              >
                                {u.present ? "Yes" : "No"}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              {u.avatar ? (
                                <img
                                  src={u.avatar}
                                  alt={u.name || "avatar"}
                                  className="h-8 w-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-slate-200" />
                              )}
                            </td>
                          </tr>
                        ))}
                        {!chat?.users?.length && (
                          <tr>
                            <td className="px-4 py-3 text-sm text-slate-500" colSpan={5}>
                              No users
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Section>

                <LastVisitAndStats users={chat?.users || []} />

                <SessionFields users={chat?.users || []} />

                {/* <ThreadTags thread={chat?.thread} /> */}

                <ChatEvents events={chat?.thread?.events || []} />

                <Section title="Custom Variables" icon={<User size={18} />} tight>
                  <div className="overflow-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-sm font-semibold text-slate-600">
                            Key
                          </th>
                          <th className="px-4 py-2 text-left text-sm font-semibold text-slate-600">
                            Value
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(chat?.thread?.custom_variables || []).map((kv, i) => (
                          <tr key={`${kv.key}-${i}`}>
                            <td className="px-4 py-2 text-sm font-medium text-slate-800">
                              {val(kv.key)}
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-800 break-words">
                              {val(kv.value)}
                            </td>
                          </tr>
                        ))}
                        {!chat?.thread?.custom_variables?.length && (
                          <tr>
                            <td className="px-4 py-3 text-sm text-slate-500" colSpan={2}>
                              No custom variables
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Section>

                <ThreadPropertiesCard thread={chat?.thread} />
                <ChatPropertiesCard chatProps={chat?.properties} />
                {/* <AccessInfoCard access={chat?.thread?.access} /> */}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastVisible && (
        <div className="fixed top-4 right-4 z-[9999] min-w-[300px] max-w-[400px]">
          <div className={`rounded-lg shadow-lg border-l-4 p-4 animate-in slide-in-from-right duration-300 ${
            toastType === "success"
              ? "bg-green-50 border-green-500 text-green-800"
              : toastType === "warning"
              ? "bg-yellow-50 border-yellow-500 text-yellow-800"
              : "bg-red-50 border-red-500 text-red-800"
          }`}>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                {toastType === "success" && (
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                {toastType === "warning" && (
                  <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
                {toastType === "error" && (
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{toastMessage}</p>
              </div>
              <button
                onClick={() => setToastVisible(false)}
                className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== Section wrapper (matches your bordered blocks) ===================== */
function Section({ title, icon, children, tight = false }) {
  return (
<div className="bg-white border border-slate-200 rounded-xl overflow-hidden w-full">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
        {icon ? <span className="text-slate-500">{icon}</span> : null}
        <h3 className="font-semibold text-slate-800">{title}</h3>
      </div>
      <div className={tight ? "p-0" : "p-4"}>{children}</div>
    </div>
  );
}

/* ===================== Sub-sections ===================== */

function LastVisitAndStats({ users }) {
  const customer = users?.find((u) => u.type === "customer");
  const v = customer?.visit;
  const stats = customer?.statistics;

  return (
    <Section title="Last Visit Info (Customer)" icon={<CalendarClock size={18} />}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full overflow-x-auto">
        <div>
          <div className="text-sm text-slate-800 space-y-1">
            <div>
              <span className="font-semibold">IP:</span> {val(v?.ip)}
            </div>
            <div>
              <span className="font-semibold">Started:</span> {fmtDate(v?.started_at)}
            </div>
            <div>
              <span className="font-semibold">Ended:</span> {fmtDate(v?.ended_at)}
            </div>
            <div className="break-all">
              <span className="font-semibold">Referrer:</span>{" "}
              {v?.referrer ? (
                <a
                  href={v.referrer}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-700 hover:underline inline-flex items-center gap-1"
                >
                  {v.referrer} <ExternalLink size={14} />
                </a>
              ) : (
                "Direct"
              )}
            </div>
            <div className="break-words">
              <span className="font-semibold">User Agent:</span>{" "}
              {val(v?.user_agent || customer?.user_agent)}
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center gap-2 text-slate-700 mb-2">
              <MapPin size={16} className="text-slate-500" />
              <span className="font-semibold">Geolocation</span>
            </div>
            <ul className="text-sm text-slate-800 space-y-1 ml-6 list-disc">
              <li>Country: {val(v?.geolocation?.country)}</li>
              <li>Country_code: {val(v?.geolocation?.country_code)}</li>
              <li>Region: {val(v?.geolocation?.region)}</li>
              <li>City: {val(v?.geolocation?.city)}</li>
              <li>Timezone: {val(v?.geolocation?.timezone)}</li>
              <li>Latitude: {val(v?.geolocation?.latitude)}</li>
              <li>Longitude: {val(v?.geolocation?.longitude)}</li>
            </ul>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 text-slate-700 mb-2">
            <Globe size={16} className="text-slate-500" />
            <span className="font-semibold">Last Visited Pages</span>
          </div>
          <ul className="ml-6 list-disc text-sm space-y-1">
            {(v?.last_pages || []).map((p, i) => (
              <li key={i} className="break-all">
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-700 hover:underline inline-flex items-center gap-1"
                >
                  {p.url} <ExternalLink size={14} />
                </a>
                {p.opened_at ? (
                  <span className="text-slate-500"> (Opened at: {p.opened_at})</span>
                ) : null}
              </li>
            ))}
            {!v?.last_pages?.length && <li className="text-slate-500">No pages</li>}
          </ul>

          <div className="mt-4">
            <div className="font-semibold text-slate-700 mb-1">Customer Statistics:</div>
            <ul className="ml-6 list-disc text-sm space-y-1">
              <li>Chats count: {val(stats?.chats_count)}</li>
              <li>Threads count: {val(stats?.threads_count)}</li>
              <li>Visits count: {val(stats?.visits_count)}</li>
              <li>Page views count: {val(stats?.page_views_count)}</li>
              <li>Greetings accepted count: {val(stats?.greetings_accepted_count)}</li>
              <li>Greetings converted count: {val(stats?.greetings_converted_count)}</li>
              <li>Tickets count: {val(stats?.tickets_count)}</li>
              <li>Tickets inbox count: {val(stats?.tickets_inbox_count)}</li>
              <li>Tickets archive count: {val(stats?.tickets_archive_count)}</li>
              <li>Tickets spam count: {val(stats?.tickets_spam_count)}</li>
              <li>Tickets trash count: {val(stats?.tickets_trash_count)}</li>
              <li>Orders count: {val(stats?.orders_count)}</li>
              <li>Last activity at: {fmtDate(stats?.last_activity_at)}</li>
              <li>Last visit at: {fmtDate(stats?.last_visit_at)}</li>
              <li>Last chat at: {fmtDate(stats?.last_chat_at)}</li>
              <li>Last campaign interaction at: {fmtDate(stats?.last_campaign_interaction_at)}</li>
            </ul>
          </div>
        </div>
      </div>
    </Section>
  );
}

function SessionFields({ users }) {
  const customer = users?.find((u) => u.type === "customer");
  const sessionFields = customer?.session_fields || [];

  // Convert session fields array to object for easier display
  const sessionData = {};
  sessionFields.forEach(field => {
    if (typeof field === 'object' && field !== null) {
      Object.assign(sessionData, field);
    }
  });

  return (
    <Section title="Session Fields (UTM Parameters)" icon={<Globe size={18} />}>
      <div className="grid md:grid-cols-2 gap-6 text-sm">
        <div>
          <div className="font-semibold text-slate-700 mb-1">Marketing Parameters:</div>
          <ul className="ml-6 list-disc space-y-1 text-slate-800">
            <li>UTM Source: <span className="font-mono">{val(sessionData.utm_source)}</span></li>
            <li>UTM Medium: <span className="font-mono">{val(sessionData.utm_medium)}</span></li>
            <li>UTM Campaign: <span className="font-mono">{val(sessionData.utm_campaign)}</span></li>
            <li>UTM Content: <span className="font-mono">{val(sessionData.utm_content)}</span></li>
            <li>UTM Ad Group: <span className="font-mono">{val(sessionData.utm_adgroup)}</span></li>
            <li>UTM Term: <span className="font-mono">{val(sessionData.utm_term)}</span></li>
            <li>GCLID: <span className="font-mono">{val(sessionData.gclid)}</span></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-slate-700 mb-1">Session Information:</div>
          <ul className="ml-6 list-disc space-y-1 text-slate-800">
            <li>User ID: <span className="font-mono">{val(sessionData.userId)}</span></li>
            <li>MMLID: <span className="font-mono">{val(sessionData.MMLID)}</span></li>
            <li>Started URL: <span className="font-mono text-xs break-all">{val(sessionData.startedUrl)}</span></li>
          </ul>
        </div>
      </div>
    </Section>
  );
}

// function ThreadTags({ thread }) {
//   const tags = thread?.tags || [];

//   return (
//     <Section title="Thread Tags" icon={<Tag size={18} />}>
//       <div className="space-y-2">
//         {tags.length > 0 ? (
//           <div className="flex flex-wrap gap-2">
//             {tags.map((tag, index) => (
//               <span
//                 key={index}
//                 className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200"
//               >
//                 {tag}
//               </span>
//             ))}
//           </div>
//         ) : (
//           <div className="text-sm text-slate-500 italic">No tags found for this conversation.</div>
//         )}
//       </div>
//     </Section>
//   );
// }

function ChatEvents({ events }) {
  return (
    <Section title="Chat Events" icon={<MessageSquare size={18} />}>
      <div className="space-y-4">
        {(events || []).map((e, i) => {
          const isSystem = e.type === "system_message";
          const isAgent =
            e.author_id?.includes("@flatworldsolutions.com") ||
            e.author_id?.includes("@flatworld.com");
          const align = isSystem ? "justify-start" : isAgent ? "justify-end" : "justify-start";
          const bubbleColor = isSystem
            ? "bg-amber-50 text-amber-800"
            : isAgent
            ? "bg-sky-100 text-slate-800"
            : "bg-white text-slate-800";
          const borderColor = isSystem
            ? "border-amber-300"
            : isAgent
            ? "border-sky-300"
            : "border-slate-200";

          return (
            <div key={e.id || i} className={`flex ${align}`}>
              <div className={`max-w-[75%] border ${borderColor} ${bubbleColor} rounded-2xl px-4 py-2 shadow-sm`}>
                {e.text && <div className="text-sm">{e.text}</div>}
                <div
                  className={`text-[9px] mt-1 ${
                    isAgent ? "text-slate-900 text-right" : "text-amber-700 text-left"
                  }`}
                >
                  {isSystem
                    ? e.system_message_type || "System Message"
                    : `By: ${e.author_id || "Unknown"} | ${fmtDate(e.created_at)}`}
                </div>
              </div>
            </div>
          );
        })}
        {!events?.length && <div className="text-sm text-slate-500 text-center">No events</div>}
      </div>
    </Section>
  );
}

function ThreadPropertiesCard({ thread }) {
  const r = thread?.properties?.routing || {};
  const src = thread?.properties?.source || {};
  return (
    <Section title="Thread Properties">
      <div className="grid md:grid-cols-2 gap-6 text-sm">
        <div>
          <div className="font-semibold text-slate-700 mb-1">Routing:</div>
          <ul className="ml-6 list-disc space-y-1 text-slate-800">
            <li>Continuous: {String(r.continuous ?? "N/A")}</li>
            <li>Group_status_at_start: {val(r.group_status_at_start)}</li>
            <li>Idle: {String(r.idle ?? "N/A")}</li>
            <li>Pinned: {String(r.pinned ?? "N/A")}</li>
            <li className="break-all">
              Start_url:{" "}
              {r.start_url ? (
                <a
                  href={r.start_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-700 hover:underline inline-flex items-center gap-1"
                >
                  {r.start_url} <ExternalLink size={14} />
                </a>
              ) : (
                "N/A"
              )}
            </li>
            <li>Unassigned: {String(r.unassigned ?? "N/A")}</li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-slate-700 mb-1">Source:</div>
          <ul className="ml-6 list-disc space-y-1 text-slate-800">
            <li>
              Client_id: <span className="font-mono">{val(src.client_id)}</span>
            </li>
          </ul>
          <div className="mt-4">
            <div className="font-semibold text-slate-700">Access Info</div>
            <ul className="ml-6 list-disc space-y-1 text-slate-800 mt-1">
              <li>
                Group_ids:{" "}
                {Array.isArray(thread?.access?.group_ids)
                  ? thread.access.group_ids.join(", ")
                  : "N/A"}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </Section>
  );
}

function ChatPropertiesCard({ chatProps }) {
  const r = chatProps?.routing || {};
  const src = chatProps?.source || {};
  const sup = chatProps?.supervising || {};
  return (
    <Section title="Chat Properties">
      <div className="grid md:grid-cols-3 gap-6 text-sm">
        <div>
          <div className="font-semibold text-slate-700 mb-1">Routing:</div>
          <ul className="ml-6 list-disc space-y-1 text-slate-800">
            <li>Continuous: {String(r.continuous ?? "N/A")}</li>
            <li>Pinned: {String(r.pinned ?? "N/A")}</li>
            <li>Was_pinned: {String(r.was_pinned ?? "N/A")}</li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-slate-700 mb-1">Source:</div>
          <ul className="ml-6 list-disc space-y-1 text-slate-800">
            <li>
              Client_id: <span className="font-mono">{val(src.client_id)}</span>
            </li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-slate-700 mb-1">Supervising:</div>
          <ul className="ml-6 list-disc space-y-1 text-slate-800">
            <li>Agent_ids: {val(sup.agent_ids)}</li>
          </ul>
        </div>
      </div>
    </Section>
  );
}

// function AccessInfoCard({ access }) {
//   return (
//     <Section title="Access Info">
//       <div className="text-sm text-slate-800">
//         Group_ids: {Array.isArray(access?.group_ids) ? access.group_ids.join(", ") : "N/A"}
//       </div>
//     </Section>
//   );
// }
