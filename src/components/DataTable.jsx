import React from "react";
import Badge from "./Badge.jsx";

export default function DataTable({ rows }) {
  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border-b border-slate-200">
        <div className="space-y-1 min-w-0">
          <div className="text-slate-900 font-semibold text-sm sm:text-base">Lead Data</div>
          <div className="text-xs text-slate-500">Showing 1 to {rows.length} of {rows.length} entries</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2">Show All</button>
          <button className="btn text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2">Columns</button>
          <button className="btn text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2">Filters</button>
        </div>
      </div>
      <div className="overflow-auto">
        <table className="min-w-full text-xs sm:text-sm min-w-[700px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left text-slate-600">
              <th className="px-4 py-2 font-medium">ID</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Phone</th>
              <th className="px-4 py-2 font-medium">Company</th>
              <th className="px-4 py-2 font-medium">Service</th>
              <th className="px-4 py-2 font-medium">Site Name</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((r) => (
              <tr key={r.mysqlId} className="text-slate-800">
                <td className="px-4 py-2">{r.mysqlId}</td>
                <td className="px-4 py-2">{r.email}</td>
                <td className="px-4 py-2">{r.name}</td>
                <td className="px-4 py-2">{r.phone}</td>
                <td className="px-4 py-2">{r.company}</td>
                <td className="px-4 py-2">
                  <Badge tone="blue">{r.service}</Badge>
                </td>
                <td className="px-4 py-2 text-blue-600 hover:underline">
                  <a href={"https://" + r.site} target="_blank" rel="noreferrer">{r.site}</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
