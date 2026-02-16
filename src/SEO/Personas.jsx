import React, { useState } from "react";
import { ArrowPathIcon, EyeIcon } from "@heroicons/react/24/outline";
import ModuleHeader, { commonActions } from '../components/ModuleHeader.jsx';

const GoogleSheetViewer = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // Define your sheets/tabs
  const sheets = [
    {
      name: "SEO/Social Media Personas",
      type: "google",
      viewUrl: "https://docs.google.com/spreadsheets/d/1WKWFyH4VLh6sOwaDA1TDyAgQ8SVE324SVLBRhmTqFiE/edit?gid=256107974#gid=256107974",
      embedUrl: "https://docs.google.com/spreadsheets/d/1WKWFyH4VLh6sOwaDA1TDyAgQ8SVE324SVLBRhmTqFiE/edit?usp=sharing&gid=256107974&single=true&widget=true&headers=false"
    },
    {
      name: "Mailboxes & Forwards",
      type: "sharepoint", 
      viewUrl: "https://flatworldsol.sharepoint.com/:x:/s/FWSOM/EfhEwkQUy41IsWF1FxU2PpMBSAX5JRqC7TL0VbP187bE_A?e=m9Wu0w",
      embedUrl: "https://flatworldsol.sharepoint.com/sites/FWSOM/_layouts/15/Doc.aspx?sourcedoc={EfhEwkQUy41IsWF1FxU2PpMBSAX5JRqC7TL0VbP187bE_A}&action=embedview&wdStartOn=1"
    }
  ];

  const currentSheet = sheets[activeTab];

  const handleRefresh = () => {
    setIsRefreshing(true);

    // Force iframe reload by changing src temporarily
    const iframe = document.querySelector('#sheet-iframe');
    if (iframe) {
      iframe.src = '';
      setTimeout(() => {
        iframe.src = currentSheet.embedUrl;
        setIsRefreshing(false);
      }, 100);
    } else {
      // Fallback: just stop refreshing
      setTimeout(() => {
        setIsRefreshing(false);
      }, 1000);
    }
  };

  return (
    <div className="min-w-0">
      <div className="card relative flex flex-col min-h-[calc(100vh-6rem)] max-h-[calc(105vh-6rem)]">
        <ModuleHeader
          title="Personas"
          subtitle="Customer personas and target audience data"
          actions={[
            commonActions.refresh(handleRefresh, isRefreshing),
            commonActions.view(null, currentSheet.viewUrl)
          ]}
        >
          {/* Sheet Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto ml-4">
            {sheets.map((sheet, index) => (
              <button
                key={index}
                onClick={() => setActiveTab(index)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                  activeTab === index
                    ? "bg-blue-100 text-blue-700 border border-blue-200"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {sheet.name}
              </button>
            ))}
          </div>
        </ModuleHeader>

        {/* Content */}
        <div className="flex justify-center p-4">
          <div className="w-full relative">
            <iframe
              id="sheet-iframe"
              src={currentSheet.embedUrl}
              width="100%"
              height="600"
              style={{ border: "1px solid #e2e8f0", borderRadius: "8px" }}
              title={`${currentSheet.name} Viewer`}
              frameBorder="0"
              allowFullScreen
            />
            {/* SharePoint fallback message */}
            {currentSheet.type === 'sharepoint' && (
              <div className="absolute top-4 left-4 right-4 bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">SharePoint Notice:</span>
                </div>
                <p className="mt-1">
                  If the SharePoint document doesn't load, it may be due to organizational security policies. 
                  <a 
                    href={currentSheet.viewUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-1 text-yellow-700 underline hover:text-yellow-900"
                  >
                    Click here to view in SharePoint directly.
                  </a>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleSheetViewer;
