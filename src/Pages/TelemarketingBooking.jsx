import React from "react";
import { useNavigate } from "react-router-dom";

export default function TelemarketingBooking() {
  const navigate = useNavigate();
  const bookingsUrl = "https://outlook.office.com/book/bookings@flatworldsolutions.com/?ismsaljsauthenabled";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-semibold text-gray-900">Telemarketing Booking</h1>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Microsoft Bookings</span>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col h-[calc(100vh-64px)]">
        <div className="flex-1 relative">

          {/* iframe for Microsoft Bookings */}
          <iframe
            src={bookingsUrl}
            width="100%"
            height="100%"
            scrolling="yes"
            style={{ border: 0 }}
            title="Microsoft Bookings - Telemarketing"
          />
        </div>
      </div>
    </div>
  );
}
