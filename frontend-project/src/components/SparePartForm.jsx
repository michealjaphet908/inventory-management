import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import Modal from './Modal';
import Toast from './Toast';

export default function SparePartForm() {
  const { authAxios } = useContext(AuthContext);
  const [spareParts, setSpareParts] = useState([]);
  const [form, setForm] = useState({ id: null, name: '', category: '', unit_price: '', total_price: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info', visible: false });

  const fetchSpareParts = async () => {
    try {
      setLoading(true);
      const res = await authAxios.get('/spareparts');
      setSpareParts(res.data);
    } catch (err) {
      setError('Failed to fetch spare parts');
      showToast('Failed to fetch spare parts', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpareParts();
  }, []);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const showToast = (message, type = 'info') => {
    setToast({ message, type, visible: true });
  };

  const closeToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    try {
      if (form.id) {
        await authAxios.put(`/spareparts/${form.id}`, {
          name: form.name,
          category: form.category,
          unit_price: parseFloat(form.unit_price),
          total_price: parseFloat(form.total_price),
        });
        showToast('Spare part updated successfully', 'success');
      } else {
        await authAxios.post('/spareparts', {
          name: form.name,
          category: form.category,
          unit_price: parseFloat(form.unit_price),
          total_price: parseFloat(form.total_price),
        });
        showToast('Spare part added successfully', 'success');
      }
      setForm({ id: null, name: '', category: '', unit_price: '', total_price: '' });
      setIsModalOpen(false);
      fetchSpareParts();
    } catch (err) {
      setError('Failed to save spare part');
      showToast('Failed to save spare part', 'error');
    }
  };

  const handleEdit = part => {
    setForm({
      id: part.id,
      name: part.name,
      category: part.category || '',
      unit_price: part.unit_price,
      total_price: part.total_price,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async id => {
    if (!window.confirm('Are you sure you want to delete this spare part?')) return;
    try {
      await authAxios.delete(`/spareparts/${id}`);
      showToast('Spare part deleted successfully', 'success');
      fetchSpareParts();
    } catch (err) {
      setError('Failed to delete spare part');
      showToast('Failed to delete spare part', 'error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Spare Parts</h2>
      {error && <div className="mb-4 text-red-600">{error}</div>}
      <form onSubmit={handleSubmit} className="mb-6 bg-white p-4 rounded shadow grid grid-cols-1 md:grid-cols-5 gap-4">
        <input
          type="text"
          name="name"
          placeholder="Name"
          value={form.name}
          onChange={handleChange}
          required
          className="border border-gray-300 rounded px-3 py-2"
        />
        <input
          type="text"
          name="category"
          placeholder="Category"
          value={form.category}
          onChange={handleChange}
          className="border border-gray-300 rounded px-3 py-2"
        />
        <input
          type="number"
          name="unit_price"
          placeholder="Unit Price"
          value={form.unit_price}
          onChange={handleChange}
          step="0.01"
          min="0"
          required
          className="border border-gray-300 rounded px-3 py-2"
        />
        <input
          type="number"
          name="total_price"
          placeholder="Total Price"
          value={form.total_price}
          onChange={handleChange}
          step="0.01"
          min="0"
          required
          className="border border-gray-300 rounded px-3 py-2"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700 transition"
        >
          {form.id ? 'Update' : 'Add'}
        </button>
      </form>

      <table className="w-full bg-white rounded shadow overflow-hidden">
        <thead className="bg-gray-200">
          <tr>
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-left">Category</th>
            <th className="p-2 text-right">Unit Price</th>
            <th className="p-2 text-right">Total Price</th>
            <th className="p-2 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {spareParts.map(part => (
            <tr key={part.id} className="border-t">
              <td className="p-2">{part.name}</td>
              <td className="p-2">{part.category || '-'}</td>
              <td className="p-2 text-right">{Number(part.unit_price).toFixed(2)}</td>
              <td className="p-2 text-right">{Number(part.total_price).toFixed(2)}</td>
              <td className="p-2 text-center space-x-2">
                <button
                  onClick={() => handleEdit(part)}
                  className="text-blue-600 hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(part.id)}
                  className="text-red-600 hover:underline"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {spareParts.length === 0 && (
            <tr>
              <td colSpan="5" className="p-4 text-center text-gray-500">
                No spare parts found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={form.id ? 'Update Spare Part' : 'Add Spare Part'}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          <input
            type="text"
            name="name"
            placeholder="Name"
            value={form.name}
            onChange={handleChange}
            required
            className="border border-gray-300 rounded px-3 py-2"
          />
          <input
            type="text"
            name="category"
            placeholder="Category"
            value={form.category}
            onChange={handleChange}
            className="border border-gray-300 rounded px-3 py-2"
          />
          <input
            type="number"
            name="unit_price"
            placeholder="Unit Price"
            value={form.unit_price}
            onChange={handleChange}
            step="0.01"
            min="0"
            required
            className="border border-gray-300 rounded px-3 py-2"
          />
          <input
            type="number"
            name="total_price"
            placeholder="Total Price"
            value={form.total_price}
            onChange={handleChange}
            step="0.01"
            min="0"
            required
            className="border border-gray-300 rounded px-3 py-2"
          />
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700 transition"
            >
              {form.id ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </Modal>

      {toast.visible && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
    </div>
  );
}
