import React, { useState, useEffect } from 'react';
import { DocumentArrowDownIcon, DocumentIcon, PresentationChartLineIcon } from '@heroicons/react/24/outline';
import api from "../lib/api";

export default function DownloadFiles() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedServices, setExpandedServices] = useState(new Set());

  // Fetch creatives data
  useEffect(() => {
    fetchCreatives();
  }, []);

  const fetchCreatives = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('https://dev.fwsom.com/api/creatives');
      
      if (response.data.success) {
        setServices(response.data.data);
      } else {
        setError('Failed to load creatives data');
      }
    } catch (err) {
      console.error('Error fetching creatives:', err);
      setError('Failed to load creatives data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter services based on search term and hide services with no creatives
  const filteredServices = services.filter(service => {
    // First check if service has creatives
    if (service.creatives_count === 0 || !service.creatives || service.creatives.length === 0) {
      return false; // Hide services with no data
    }
    
    // Then apply search filter
    return service.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           service.creatives.some(creative => 
             creative.creative_name.toLowerCase().includes(searchTerm.toLowerCase())
           );
  });

  // Toggle service expansion
  const toggleService = (serviceId) => {
    const newExpanded = new Set(expandedServices);
    if (newExpanded.has(serviceId)) {
      newExpanded.delete(serviceId);
    } else {
      newExpanded.add(serviceId);
    }
    setExpandedServices(newExpanded);
  };

  // Download file function
  const downloadFile = (filePath, fileName) => {
    if (!filePath || filePath === 'No' || filePath === 'no' || !filePath.trim()) {
      alert('File not available for download');
      return;
    }

    // Extract just the filename from the path
    const fileNameOnly = filePath.split('/').pop();
    
    // Use the new API endpoint with file name as URL parameter
    const downloadUrl = `https://dev.fwsom.com/api/creatives/download?url=${encodeURIComponent(fileNameOnly)}`;
    
    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName || fileNameOnly;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get file icon based on file type
  const getFileIcon = (filePath) => {
    if (!filePath || filePath === 'No' || filePath === 'no') {
      return <DocumentIcon className="h-4 w-4 text-gray-400" />;
    }
    
    const extension = filePath.split('.').pop()?.toLowerCase();
    if (extension === 'pdf') {
      return <DocumentIcon className="h-4 w-4 text-red-500" />;
    } else if (['ppt', 'pptx', 'pps'].includes(extension)) {
      return <PresentationChartLineIcon className="h-4 w-4 text-orange-500" />;
    }
    return <DocumentIcon className="h-4 w-4 text-blue-500" />;
  };

  // Check if file is available
  const isFileAvailable = (filePath) => {
    return filePath && filePath !== 'No' && filePath !== 'no' && filePath.trim();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-2rem)] overflow-auto bg-slate-50">
      <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Download Files</h1>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search services or creatives..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}
      </div>

      {/* Services Table */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  #
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Name
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium">
                  PPT
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium">
                  PPT (PDF)
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium">
                  Brochure
                </th>
                
              </tr>
            </thead>
            <tbody>
              {filteredServices.map((service, serviceIndex) => (
                <React.Fragment key={service.id}>
                  {/* Service Category Header */}
                  <tr className="bg-blue-100">
                    <td colSpan="6" className="px-4 py-2 text-center text-sm font-semibold text-slate-700">
                      {service.service_name}
                    </td>
                  </tr>
                  {/* Service Creatives - Only show if creatives exist */}
                  {service.creatives.map((creative, index) => (
                    <tr key={creative.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900">
                        <div>
                          <div className="font-medium">{creative.creative_name}</div>
                          <div className="text-xs text-slate-500">
                            ( v {creative.version} - {new Date(creative.publish_date).toLocaleDateString()} )
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isFileAvailable(creative.ppt_up_path) ? (
                          <button
                            onClick={() => downloadFile(creative.ppt_up_path, `${creative.creative_name}.pptx`)}
                            className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1 rounded transition-colors"
                          >
                            Download
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs">- No -</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isFileAvailable(creative.ppt_pdf_path) ? (
                          <button
                            onClick={() => downloadFile(creative.ppt_pdf_path, `${creative.creative_name}.pdf`)}
                            className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1 rounded transition-colors"
                          >
                            Download
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs">- No -</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isFileAvailable(creative.brochure_up_path) ? (
                          <button
                            onClick={() => downloadFile(creative.brochure_up_path, `${creative.creative_name}_brochure.pdf`)}
                            className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1 rounded transition-colors"
                          >
                            Download
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs">- No -</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
          <div>
            <span className="font-medium">Total Services:</span> {filteredServices.length}
          </div>
          <div>
            <span className="font-medium">Total Creatives:</span> {filteredServices.reduce((sum, service) => sum + service.creatives_count, 0)}
          </div>
          <div>
            <span className="font-medium">Services with Creatives:</span> {filteredServices.filter(service => service.creatives_count > 0).length}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
