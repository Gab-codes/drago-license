"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [licenses, setLicenses] = useState([]);
  const [notification, setNotification] = useState("");

  async function loadLicenses() {
    try {
      const res = await fetch("../api/license?action=list");
      const data = await res.json();
      setLicenses(data);
    } catch (error) {
      setNotification("Error loading license keys");
    }
  }

  async function generateLicense() {
    try {
      const res = await fetch("../api/license?action=generate");
      const data = await res.json();
      if (data.license_key) {
        setNotification("New License Key: " + data.license_key);
        loadLicenses();
      } else if (data.error) {
        setNotification(data.error);
      }
    } catch (error) {
      setNotification("Error generating license key");
    }
  }

  async function revokeKey(key) {
    try {
      const res = await fetch(
        "../api/license?action=revoke&key=" + encodeURIComponent(key)
      );
      const data = await res.json();
      if (data.success) {
        setNotification("License key revoked");
        loadLicenses();
      } else {
        setNotification(data.error || "Error revoking key");
      }
    } catch (error) {
      setNotification("Error revoking license key");
    }
  }

  function confirmRevoke(key) {
    if (confirm("Are you sure you want to delete this license key?")) {
      revokeKey(key);
    }
  }

  useEffect(() => {
    loadLicenses();
  }, []);

  return (
    <div className="bg-gray-100 p-10 min-h-screen text-black">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow-lg">
        <h1 className="text-2x font-bold mb-4">License Key Manager</h1>
        {notification && (
          <div className="mb-4 p-2 rounded bg-green-100 text-green-800">
            {notification}
          </div>
        )}
        <button
          onClick={generateLicense}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
        >
          Generate License Key
        </button>
        <table className="w-full mt-6 border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-2">License Key</th>
              <th className="border p-2">Status</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {licenses.map((license) => (
              <tr key={license.license_key} className="border">
                <td className="border p-2 font-mono">{license.license_key}</td>
                <td className="border p-2">
                  {license.used ? "Used" : "Active"}
                </td>
                <td className="border p-2">
                  <button
                    onClick={() => confirmRevoke(license.license_key)}
                    className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
