// ChatConversation.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ExternalLink, User, Users, MessageSquare,
  MapPin, Globe, CalendarClock
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import api from "../lib/api";
import PhoneCallHero from "../ChatTracker/PhoneCallHero";
import EmptyState from "../ChatTracker/EmptyState"; // or EmptyStatePro if you prefer

/* ---------------- tiny helpers ---------------- */
const cx = (...xs) => xs.filter(Boolean).join(" ");
const val = (x) => (x === null || x === undefined || x === "" ? "N/A" : String(x));
const fmtDate = (x) => (x ? x : "N/A");

/* ===========================================================
   Chat Conversation (FWS Contacts layout)
   =========================================================== */
export default function ChatConversation() {
  const [searchParams, setSearchParams] = useSearchParams();

  // read conversation id from URL if present
  const initialConversationId = searchParams.get("conversationid") || searchParams.get("id") || "";
  const [conversationIdInput, setConversationIdInput] = useState(initialConversationId);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [data, setData] = useState(null);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType] = useState("error"); // "error", "success", "warning"

  const conversation = useMemo(() => {
    // Handle the specific webhook payload structure
    if (data?.data?.webhook_payload?.data) {
      return data.data.webhook_payload.data;
    }
    // Fallback for potential other structures
    const conversations = data?.data?.conversations;
    return Array.isArray(conversations) && conversations.length ? conversations[0] : null;
  }, [data]);

  const noConversation =
    data && (!conversation || data.status === false || (data.status !== "success" && !data.status));

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
    const deepConversationId = searchParams.get("conversationid") || searchParams.get("id");
    if (deepConversationId && !data && !isLoading) {
      fetchConversation(deepConversationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchConversation = async (id) => {
    try {
      setIsLoading(true);
      setErrorMsg("");
      const res = await api.get(`/widget-tracker?id=${String(id).trim()}`);
      setData(res.data);
      setSearchParams({ conversationid: String(id).trim() }, { replace: false });
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
    if (!conversationIdInput.trim()) {
      showToast("Please enter your Conversation ID.", "warning");
      return;
    }
    fetchConversation(conversationIdInput.trim());
  };

  const goBack = () => {
    setSearchParams({});
    setData(null);
    setErrorMsg("");
    setConversationIdInput("");
  };

  return (
    <div className="min-w-0">
      <div className="card relative flex flex-col min-h-[calc(100vh-6rem)] max-h-[calc(105vh-6rem)]">
        {/* Header row (matches FWS Contacts header) */}
        <div className="shrink-0 flex items-center justify-between p-4 border-b border-slate-200 bg-white">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-slate-900 font-semibold">
              <MessageSquare className="text-sky-500" />
              Chat Conversation
            </div>
          </div>

          {/* Right controls: Conversation ID input + Submit */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={conversationIdInput}
              onChange={(e) => setConversationIdInput(e.target.value)}
              placeholder="Enter Conversation ID…"
              className="w-56 px-3 py-1.5 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300"
            />
            <button
              type="submit"
              disabled={isLoading}
              className={cx(
                "inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md text-white",
                isLoading ? "bg-sky-400 cursor-not-allowed" : "bg-sky-600 hover:bg-sky-700"
              )}
              title="Fetch conversation"
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
                  <h3 className="text-slate-900 font-semibold text-lg">Enter a Conversation ID</h3>
                  <p className="text-slate-500 text-sm mt-1">
                    Use the input at the top-right and press Submit to load conversation details.
                  </p>
                </div>
              </div>
            )}

            {/* No conversation / not found */}
            {noConversation && (
              <div className="bg-white border border-slate-200 rounded-2xl p-10">
                <EmptyState subtitle="No Conversation Found." onBack={goBack} />
              </div>
            )}

            {/* Loaded state */}
            {!noConversation && data && conversation && (
              <div className="space-y-6">
                <Section title="Conversation ID" icon={<MessageSquare size={18} />}>
                  <div className="text-slate-700">
                    <span className="font-semibold">Conversation ID: </span>
                    <span className="font-mono">{val(conversation?.conversation_id)}</span>
                  </div>
                </Section>

                <Section title="Dynamic Variables" icon={<MessageSquare size={18} />}>
                  <div className="grid md:grid-cols-3 gap-6 text-sm">
                    <div>
                      <div className="font-semibold text-slate-700 mb-1">Session Information:</div>
                      <ul className="ml-6 list-disc space-y-1 text-slate-800">
                        <li>Started URL: <span className="font-mono text-xs break-all">{val(conversation?.conversation_initiation_client_data?.dynamic_variables?.startedUrl)}</span></li>
                        <li>Country: <span className="font-mono">{val(conversation?.conversation_initiation_client_data?.dynamic_variables?.country)}</span></li>
                        <li>Session Source: <span className="font-mono">{val(conversation?.conversation_initiation_client_data?.dynamic_variables?.session_source)}</span></li>
                      </ul>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-700 mb-1">UTM Parameters:</div>
                      <ul className="ml-6 list-disc space-y-1 text-slate-800">
                        <li>UTM Source: <span className="font-mono">{val(conversation?.conversation_initiation_client_data?.dynamic_variables?.utm_source)}</span></li>
                        <li>UTM Medium: <span className="font-mono">{val(conversation?.conversation_initiation_client_data?.dynamic_variables?.utm_medium)}</span></li>
                        <li>UTM Campaign: <span className="font-mono">{val(conversation?.conversation_initiation_client_data?.dynamic_variables?.utm_campaign)}</span></li>
                        <li>UTM Content: <span className="font-mono">{val(conversation?.conversation_initiation_client_data?.dynamic_variables?.utm_content)}</span></li>
                        <li>UTM Term: <span className="font-mono">{val(conversation?.conversation_initiation_client_data?.dynamic_variables?.utm_term)}</span></li>
                        <li>GCLID: <span className="font-mono">{val(conversation?.conversation_initiation_client_data?.dynamic_variables?.gclid)}</span></li>
                        <li>User ID: <span className="font-mono">{val(conversation?.conversation_initiation_client_data?.dynamic_variables?.userId)}</span></li>
                      </ul>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-700 mb-1">System Information:</div>
                      <ul className="ml-6 list-disc space-y-1 text-slate-800">
                        <li>System Time: <span className="font-mono">{val(conversation?.conversation_initiation_client_data?.dynamic_variables?.system__time)}</span></li>
                        <li>System Time UTC: <span className="font-mono">{val(conversation?.conversation_initiation_client_data?.dynamic_variables?.system__time_utc)}</span></li>
                        <li>System Timezone: <span className="font-mono">{val(conversation?.conversation_initiation_client_data?.dynamic_variables?.system__timezone)}</span></li>
                        <li>Chat Initiated At: <span className="font-mono">{val(conversation?.conversation_initiation_client_data?.dynamic_variables?.chat_initiated_at)}</span></li>
                      </ul>
                    </div>
                  </div>
                </Section>

                <Section title="Customer Information" icon={<User size={18} />}>
                  <div className="grid md:grid-cols-2 gap-6 text-sm">
                    <div>
                      <div className="font-semibold text-slate-700 mb-1">Customer Details:</div>
                      <ul className="ml-6 list-disc space-y-1 text-slate-800">
                        <li>User ID: {val(conversation?.user_id)}</li>
                        <li>Agent ID: {val(conversation?.agent_id)}</li>
                        <li>Agent Name: {val(conversation?.agent_name)}</li>
                        <li>Status: {val(conversation?.status)}</li>
                      </ul>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-700 mb-1">Call Details:</div>
                      <ul className="ml-6 list-disc space-y-1 text-slate-800">
                        <li>Call Duration: {conversation?.metadata?.call_duration_secs ? `${conversation.metadata.call_duration_secs}s` : "N/A"}</li>
                        <li>Start Time: {conversation?.metadata?.start_time_unix_secs ? new Date(conversation.metadata.start_time_unix_secs * 1000).toLocaleString() : "N/A"}</li>
                        <li>Termination: {val(conversation?.metadata?.termination_reason)}</li>
                        <li>Language: {val(conversation?.metadata?.main_language)}</li>
                      </ul>
                    </div>
                  </div>
                </Section>

                <Section title="Messages" icon={<MessageSquare size={18} />}>
                  <div className="space-y-4">
                    {(conversation?.transcript || []).map((message, idx) => {
                      const isAgent = message.role === "agent";
                      const isCustomer = message.role === "user";
                      const isSystem = message.role === "system";
                      
                      const align = isSystem ? "justify-start" : isAgent ? "justify-end" : "justify-start";
                      const bubbleColor = isSystem
                        ? "bg-amber-50 text-amber-800 border-amber-300"
                        : isAgent
                        ? "bg-sky-100 text-slate-800 border-sky-300"
                        : "bg-white text-slate-800 border-slate-300";

                      return (
                        <div key={idx} className={`flex ${align}`}>
                          <div className={`max-w-md rounded-lg border p-3 ${bubbleColor}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold">
                                {isAgent ? conversation.agent_name || "Agent" : isCustomer ? "Customer" : "System"}
                              </span>
                              <span className="text-xs text-slate-500">
                                {message.time_in_call_secs ? `${message.time_in_call_secs}s` : ""}
                              </span>
                            </div>
                            <div className="text-sm">{val(message.message)}</div>
                            {message.tool_calls && message.tool_calls.length > 0 && (
                              <div className="mt-2 text-xs text-slate-500">
                                🛠️ Tool calls: {message.tool_calls.length}
                              </div>
                            )}
                            {message.llm_usage && (
                              <div className="mt-2 text-xs text-slate-500">
                                🤖 LLM tokens: {Object.values(message.llm_usage.model_usage || {}).reduce((sum, model) => 
                                  sum + (model.input?.tokens || 0) + (model.output_total?.tokens || 0), 0
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {(!conversation?.transcript || conversation.transcript.length === 0) && (
                      <div className="text-center text-slate-500 py-8">
                        No transcript found in this conversation.
                      </div>
                    )}
                  </div>
                </Section>

                <Section title="Analysis Results" icon={<MessageSquare size={18} />}>
                  <div className="space-y-6 text-sm">
                    <div>
                      <div className="font-semibold text-slate-700 mb-1">Call Analysis:</div>
                      <ul className="ml-6 list-disc space-y-1 text-slate-800">
                        <li>Call Successful: <span className={`font-semibold ${conversation?.analysis?.call_successful === "success" ? "text-green-600" : "text-red-600"}`}>
                          {val(conversation?.analysis?.call_successful)}
                        </span></li>
                        <li>Summary Title: {val(conversation?.analysis?.call_summary_title)}</li>
                        <li>Transcript Summary: {val(conversation?.analysis?.transcript_summary)}</li>
                      </ul>
                    </div>

                    <div>
                      <div className="font-semibold text-slate-700 mb-2">Data Collection Results:</div>
                      <div className="space-y-3">
                        {conversation?.analysis?.data_collection_results && Object.entries(conversation.analysis.data_collection_results).map(([key, result]) => (
                          <div key={key} className="bg-slate-50 p-3 rounded-lg">
                            <div className="font-medium text-slate-900 capitalize mb-1">{key.replace(/_/g, ' ')}</div>
                            <div className="text-slate-600 text-xs mb-1">Value: <span className="font-mono">{val(result.value) || "Not provided"}</span></div>
                            <div className="text-slate-500 text-xs italic">{result.rationale}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="font-semibold text-slate-700 mb-1">Evaluation Criteria:</div>
                      <ul className="ml-6 list-disc space-y-1 text-slate-800">
                        {conversation?.analysis?.evaluation_criteria_results && Object.entries(conversation.analysis.evaluation_criteria_results).map(([key, result]) => (
                          <li key={key}>
                            <span className="font-medium">{key.replace(/_/g, ' ')}:</span>{" "}
                            <span className={`font-semibold ${result.result === "success" ? "text-green-600" : "text-red-600"}`}>
                              {val(result.result)}
                            </span>
                            <div className="text-slate-500 text-xs italic mt-1">{result.rationale}</div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Section>

                <Section title="Technical Information" icon={<Globe size={18} />}>
                  <div className="grid md:grid-cols-3 gap-6 text-sm">
                    <div>
                      <div className="font-semibold text-slate-700 mb-1">Call Metadata:</div>
                      <ul className="ml-6 list-disc space-y-1 text-slate-800">
                        <li>Cost: ${val(conversation?.metadata?.cost)}</li>
                        <li>Timezone: {val(conversation?.metadata?.timezone)}</li>
                        <li>Main Language: {val(conversation?.metadata?.main_language)}</li>
                        <li>Text Only: {val(conversation?.metadata?.text_only)}</li>
                      </ul>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-700 mb-1">Source Information:</div>
                      <ul className="ml-6 list-disc space-y-1 text-slate-800">
                        <li>
                          Client ID: <span className="font-mono">{val(conversation?.metadata?.client_id)}</span>
                        </li>
                        <li>
                          Branch ID: <span className="font-mono">{val(conversation?.branch_id)}</span>
                        </li>
                        <li>Initiation Source: {val(conversation?.metadata?.conversation_initiation_source)}</li>
                        <li>Version: {val(conversation?.metadata?.conversation_initiation_source_version)}</li>
                      </ul>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-700 mb-1">Charging Info:</div>
                      <ul className="ml-6 list-disc space-y-1 text-slate-800">
                        <li>Tier: {val(conversation?.metadata?.charging?.tier)}</li>
                        <li>LLM Charge: ${val(conversation?.metadata?.charging?.llm_charge)}</li>
                        <li>Call Charge: ${val(conversation?.metadata?.charging?.call_charge)}</li>
                        <li>Is Burst: {val(conversation?.metadata?.charging?.is_burst)}</li>
                      </ul>
                    </div>
                  </div>
                </Section>
              </div>
            )}
          </div>
        </div>

        {/* Toast notification */}
        {toastVisible && (
          <div className="fixed bottom-4 right-4 z-50">
            <div
              className={`px-4 py-3 rounded-lg shadow-lg text-white ${
                toastType === "error"
                  ? "bg-red-500"
                  : toastType === "success"
                  ? "bg-green-500"
                  : "bg-yellow-500"
              }`}
            >
              {toastMessage}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===================== Section wrapper (matches your bordered blocks) ===================== */
function Section({ title, icon, children, tight = false }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden w-full">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
        {icon && <div className="text-slate-600">{icon}</div>}
        <h3 className="font-semibold text-slate-900">{title}</h3>
      </div>
      <div className={tight ? "p-4" : "p-6"}>
        {children}
      </div>
    </div>
  );
}
