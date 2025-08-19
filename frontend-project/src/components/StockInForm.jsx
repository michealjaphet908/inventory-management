import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';

export default function StockInForm() {
  const { authAxios } = useContext(AuthContext);
  const [spareParts, setSpareParts] = useState([]);
  const [stockIns, setStockIns] = useState([]);
  const [form, setForm] = useState({ spare_part_id: '', stock_in_quantity: '', stock_in_date: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchSpareParts = async () => {
    try {
      const res = await authAxios.get('/spareparts');
      setSpareParts(res.data);
    } catch (err) {
      setError('Failed to fetch spare parts');
    }
  };

  const fetchStockIns = async () => {
    try {
      setLoading(true);
      const res = await authAxios.get('/stockin');
      setStockIns(res.data);
    } catch (err) {
      setError('Failed to fetch stock in records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpareParts();
    fetchStockIns();
  }, []);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    try {
      await authAxios.post('/stockin', {
        spare_part_id: form.spare_part_id,
        stock_in_quantity: parseInt(form.stock_in_quantity),
        stock_in_date: form.stock_in_date,
      });
      setForm({ spare_part_id: '', stock_in_quantity: '', stock_in_date: '' });
      fetchStockIns();
    } catch (err) {
      setError('Failed to add stock in record');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Stock In</h2>
      {error && <div className="mb-4 text-red-600">{error}</div>}
      <form onSubmit={handleSubmit} className="mb-6 bg-white p-4 rounded shadow grid grid-cols-1 md:grid-cols-4 gap-4">
        <select
          name="spare_part_id"
          value={form.spare_part_id}
          onChange={handleChange}
          required
          className="border border-gray-300 rounded px-3 py-2"
        >
          <option value="">Select Spare Part</option>
          {spareParts.map(sp => (
            <option key={sp.id} value={sp.id}>{sp.name}</option>
          ))}
        </select>
        <input
          type="number"
          name="stock_in_quantity"
          placeholder="Quantity"
          value={form.stock_in_quantity}
          onChange={handleChange}
          min="1"
          required
          className="border border-gray-300 rounded px-3 py-2"
        />
        <input
          type="date"
          name="stock_in_date"
          value={form.stock_in_date}
          onChange={handleChange}
          required
          className="border border-gray-300 rounded px-3 py-2"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700 transition"
        >
          Add 
        </button>
      </form>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <table className="w-full bg-white rounded shadow overflow-hidden">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2 text-left">Spare Part</th>
              <th className="p-2 text-right">Quantity</th>
              <th className="p-2 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {stockIns.map(si => (
              <tr key={si.id} className="border-t">
                <td className="p-2">{si.spare_part_name}</td>
                <td className="p-2 text-right">{si.stock_in_quantity}</td>
                <td className="p-2">{si.stock_in_date}</td>
              </tr>
            ))}
            {stockIns.length === 0 && (
              <tr>
                <td colSpan="3" className="p-4 text-center text-gray-500">
                  No stock in records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
