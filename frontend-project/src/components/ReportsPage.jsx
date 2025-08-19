import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../App';

export default function ReportsPage() {
  const { authAxios } = useContext(AuthContext);
  const [dailyStockOut, setDailyStockOut] = useState([]);
  const [stockStatus, setStockStatus] = useState([]);
  const [error, setError] = useState('');
  const dailyReportRef = useRef();
  const stockStatusRef = useRef();

  const fetchReports = async () => {
    try {
      const [dailyRes, statusRes] = await Promise.all([
        authAxios.get('/reports/daily-stockout'),
        authAxios.get('/reports/stock-status'),
      ]);
      setDailyStockOut(dailyRes.data);
      setStockStatus(statusRes.data);
    } catch (err) {
      setError('Failed to fetch reports');
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const printSection = (ref) => {
    if (!ref.current) return;
    const printContent = ref.current.innerHTML;
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      <h2 className="text-2xl font-bold">Reports</h2>
      {error && <div className="text-red-600">{error}</div>}

      <section>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xl font-semibold">Daily StockOut Report</h3>
          <button
            onClick={() => printSection(dailyReportRef)}
            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
          >
            Print
          </button>
        </div>
        <div ref={dailyReportRef} className="overflow-x-auto bg-white rounded shadow p-4">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-300 p-2">Date</th>
                <th className="border border-gray-300 p-2">Spare Part</th>
                <th className="border border-gray-300 p-2 text-right">Total Quantity</th>
                <th className="border border-gray-300 p-2 text-right">Total Price</th>
              </tr>
            </thead>
            <tbody>
              {dailyStockOut.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-4 text-center text-gray-500">No data available</td>
                </tr>
              ) : (
                dailyStockOut.map((item, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="border border-gray-300 p-2">{item.stock_out_date}</td>
                    <td className="border border-gray-300 p-2">{item.spare_part_name}</td>
                    <td className="border border-gray-300 p-2 text-right">{item.total_quantity}</td>
                    <td className="border border-gray-300 p-2 text-right">{Number(item.total_price).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xl font-semibold">Stock Status (Remaining Quantity)</h3>
          <button
            onClick={() => printSection(stockStatusRef)}
            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
          >
            Print
          </button>
        </div>
        <div ref={stockStatusRef} className="overflow-x-auto bg-white rounded shadow p-4">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-300 p-2">Spare Part</th>
                <th className="border border-gray-300 p-2 text-right">Total Stock In</th>
                <th className="border border-gray-300 p-2 text-right">Total Stock Out</th>
                <th className="border border-gray-300 p-2 text-right">Remaining Quantity</th>
              </tr>
            </thead>
            <tbody>
              {stockStatus.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-4 text-center text-gray-500">No data available</td>
                </tr>
              ) : (
                stockStatus.map((item, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="border border-gray-300 p-2">{item.spare_part_name}</td>
                    <td className="border border-gray-300 p-2 text-right">{item.total_stock_in}</td>
                    <td className="border border-gray-300 p-2 text-right">{item.total_stock_out}</td>
                    <td className="border border-gray-300 p-2 text-right">{item.remaining_quantity}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

