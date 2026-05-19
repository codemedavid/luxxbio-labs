import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Shield, ExternalLink, Sparkles, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ImageUpload from './ImageUpload';

interface COAManagerProps {
  onBack?: () => void;
}

interface COAReport {
  id: string;
  product_name: string;
  batch: string;
  test_date: string;
  purity_percentage: number;
  quantity: string;
  task_number: string;
  verification_key: string;
  image_url: string;
  featured: boolean;
  manufacturer: string;
  laboratory: string;
}

const COAManager: React.FC<COAManagerProps> = ({ onBack }) => {
  const [coaReports, setCOAReports] = useState<COAReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [coaPageEnabled, setCoaPageEnabled] = useState<boolean>(true);
  const [formData, setFormData] = useState<Partial<COAReport>>({
    product_name: '',
    batch: 'Unknown',
    test_date: new Date().toISOString().split('T')[0],
    purity_percentage: 99.0,
    quantity: '',
    task_number: '',
    verification_key: '',
    image_url: '/coa/',
    featured: false,
    manufacturer: 'peptalk.ph',
    laboratory: 'Janoshik Analytical',
  });

  useEffect(() => {
    fetchCOAReports();
    fetchCOAPageSetting();
  }, []);

  const fetchCOAPageSetting = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', 'coa_page_enabled')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setCoaPageEnabled(data?.value === 'true' || data?.value === true || !data);
    } catch (error) {
      console.error('Error fetching COA page setting:', error);
      // Default to enabled if setting doesn't exist
      setCoaPageEnabled(true);
    }
  };

  const toggleCOAPage = async (enabled: boolean) => {
    try {
      // First, check if the setting exists
      const { data: existing, error: checkError } = await supabase
        .from('site_settings')
        .select('id')
        .eq('id', 'coa_page_enabled')
        .single();

      let error;

      if (checkError && checkError.code === 'PGRST116') {
        // Setting doesn't exist, insert it
        const { error: insertError } = await supabase
          .from('site_settings')
          .insert({
            id: 'coa_page_enabled',
            value: enabled ? 'true' : 'false',
            type: 'boolean',
            description: 'Enable or disable the COA page on the website',
            updated_at: new Date().toISOString()
          });
        error = insertError;
      } else if (checkError) {
        // Some other error checking
        throw checkError;
      } else {
        // Setting exists, update it
        const { error: updateError } = await supabase
          .from('site_settings')
          .update({
            value: enabled ? 'true' : 'false',
            updated_at: new Date().toISOString()
          })
          .eq('id', 'coa_page_enabled');
        error = updateError;
      }

      if (error) {
        console.error('Error updating COA page setting:', error);
        throw error;
      }

      setCoaPageEnabled(enabled);
      alert(enabled ? '✅ COA page is now visible on the website' : '❌ COA page is now hidden from the website');
    } catch (error: any) {
      console.error('Error updating COA page setting:', error);
      const errorMessage = error?.message || 'Unknown error';
      alert(`❌ Failed to update COA page setting: ${errorMessage}\n\nThis might be a permissions issue. Please check your database RLS policies.`);
    }
  };

  const fetchCOAReports = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('coa_reports')
        .select('*')
        .order('test_date', { ascending: false });

      if (error) {
        console.error('Error fetching COA reports:', error);

        // Check if table doesn't exist
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          alert('❌ COA reports table not found. Please run the database migration to create the table.');
        } else if (error.code === '42501' || error.message?.includes('permission')) {
          alert('❌ Permission denied. Please check your database permissions.');
        } else {
          alert(`❌ Failed to load COA reports: ${error.message || 'Unknown error'}`);
        }
        throw error;
      }

      setCOAReports(data || []);
    } catch (error) {
      console.error('Error fetching COA reports:', error);
      // Don't show alert here if we already showed it above
      setCOAReports([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.image_url || formData.image_url === '/coa/') {
      alert('❌ Please upload a COA image first.');
      return;
    }

    const payload = {
      product_name: formData.product_name?.trim() || 'Lab Report',
      batch: formData.batch?.trim() || 'Unknown',
      test_date: formData.test_date || new Date().toISOString().split('T')[0],
      purity_percentage: formData.purity_percentage ?? 0,
      quantity: formData.quantity?.trim() || '',
      task_number: formData.task_number?.trim() || '',
      verification_key: formData.verification_key?.trim() || '',
      image_url: formData.image_url,
      featured: formData.featured ?? false,
      manufacturer: formData.manufacturer?.trim() || 'LUXXBIO LABS',
      laboratory: formData.laboratory?.trim() || 'Janoshik Analytical',
    };

    try {
      if (editingId) {
        // Update existing report
        const { error } = await supabase
          .from('coa_reports')
          .update(payload)
          .eq('id', editingId);

        if (error) throw error;
        alert('✅ COA report updated successfully!');
      } else {
        // Create new report
        const { error } = await supabase
          .from('coa_reports')
          .insert([payload]);

        if (error) throw error;
        alert('✅ COA report added successfully!');
      }

      setEditingId(null);
      setIsAdding(false);
      resetForm();
      fetchCOAReports();
    } catch (error) {
      console.error('Error saving COA report:', error);
      alert('❌ Failed to save COA report');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this COA report?')) return;

    try {
      const { error } = await supabase
        .from('coa_reports')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('✅ COA report deleted successfully!');
      fetchCOAReports();
    } catch (error) {
      console.error('Error deleting COA report:', error);
      alert('❌ Failed to delete COA report');
    }
  };

  const handleEdit = (report: COAReport) => {
    setFormData(report);
    setEditingId(report.id);
    setIsAdding(false);
  };

  const handleAdd = () => {
    resetForm();
    setEditingId(null);
    setIsAdding(true);
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAdding(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      product_name: '',
      batch: 'Unknown',
      test_date: new Date().toISOString().split('T')[0],
      purity_percentage: 99.0,
      quantity: '',
      task_number: '',
      verification_key: '',
      image_url: '/coa/',
      featured: false,
      manufacturer: 'LUXXBIO LABS',
      laboratory: 'Janoshik Analytical',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-14">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Go Back"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
          )}
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Shield className="w-7 h-7 text-gold-600" />
              COA Lab Reports
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage certificates of analysis and lab test reports
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* COA Page Toggle */}
          <div className="flex items-center gap-2 bg-white border border-navy-700/30 rounded-lg px-3 py-2 shadow-sm">
            <span className="text-xs font-medium text-gray-700">Show COA Page:</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={coaPageEnabled}
                onChange={(e) => toggleCOAPage(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-gold-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-600"></div>
            </label>
            <span className={`text-xs font-semibold ${coaPageEnabled ? 'text-gold-600' : 'text-gray-400'}`}>
              {coaPageEnabled ? 'ON' : 'OFF'}
            </span>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-black px-4 py-2 rounded-lg font-medium transition-all shadow-md"
          >
            <Plus className="w-5 h-5" />
            Add COA Report
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {(isAdding || editingId) && (
        <div className="bg-white rounded-3xl p-6 border border-gold-300 shadow-md">
          <h3 className="text-xl font-bold text-black mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gold-600" />
            {editingId ? 'Edit COA Report' : 'Add New COA Report'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                COA Report Image * <span className="text-xs font-normal text-gray-500">(only this is required)</span>
              </label>
              <ImageUpload
                currentImage={formData.image_url}
                onImageChange={(url) => setFormData({ ...formData, image_url: url || '' })}
                folder="coa-images"
              />
            </div>

            <details className="bg-gray-50 rounded-xl border border-gray-200">
              <summary className="cursor-pointer px-4 py-3 font-semibold text-sm text-gray-700 hover:text-black select-none">
                Optional Details (leave blank to skip)
              </summary>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 pt-2">
              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Product Name
                </label>
                <input
                  type="text"
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  className="w-full px-4 py-3 font-sans text-sm rounded-xl bg-white text-black border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-500/30 focus:outline-none transition-all placeholder-gray-400"
                  placeholder="e.g., Tirzepatide 15mg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Batch Number
                </label>
                <input
                  type="text"
                  value={formData.batch}
                  onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                  className="w-full px-4 py-3 font-sans text-sm rounded-xl bg-white text-black border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-500/30 focus:outline-none transition-all placeholder-gray-400"
                  placeholder="Unknown"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Test Date
                </label>
                <input
                  type="date"
                  value={formData.test_date}
                  onChange={(e) => setFormData({ ...formData, test_date: e.target.value })}
                  className="w-full px-4 py-3 font-sans text-sm rounded-xl bg-white text-black border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-500/30 focus:outline-none transition-all placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Purity (%)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={formData.purity_percentage ?? ''}
                  onChange={(e) => setFormData({ ...formData, purity_percentage: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                  className="w-full px-4 py-3 font-sans text-sm rounded-xl bg-white text-black border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-500/30 focus:outline-none transition-all placeholder-gray-400"
                  placeholder="99.658"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Quantity
                </label>
                <input
                  type="text"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="w-full px-4 py-3 font-sans text-sm rounded-xl bg-white text-black border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-500/30 focus:outline-none transition-all placeholder-gray-400"
                  placeholder="e.g., 16.80 mg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Task Number
                </label>
                <input
                  type="text"
                  value={formData.task_number}
                  onChange={(e) => setFormData({ ...formData, task_number: e.target.value })}
                  className="w-full px-4 py-3 font-sans text-sm rounded-xl bg-white text-black border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-500/30 focus:outline-none transition-all placeholder-gray-400"
                  placeholder="#68396"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Verification Key
                </label>
                <input
                  type="text"
                  value={formData.verification_key}
                  onChange={(e) => setFormData({ ...formData, verification_key: e.target.value })}
                  className="w-full px-4 py-3 font-sans text-sm rounded-xl bg-white text-black border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-500/30 focus:outline-none transition-all placeholder-gray-400"
                  placeholder="9AUYT3EZV9Y9"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Manufacturer
                </label>
                <input
                  type="text"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  className="w-full px-4 py-3 font-sans text-sm rounded-xl bg-white text-black border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-500/30 focus:outline-none transition-all placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Laboratory
                </label>
                <input
                  type="text"
                  value={formData.laboratory}
                  onChange={(e) => setFormData({ ...formData, laboratory: e.target.value })}
                  className="w-full px-4 py-3 font-sans text-sm rounded-xl bg-white text-black border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-500/30 focus:outline-none transition-all placeholder-gray-400"
                />
              </div>
              </div>
            </details>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="featured"
                checked={formData.featured}
                onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                className="w-4 h-4 text-gold-600 rounded focus:ring-gold-500"
              />
              <label htmlFor="featured" className="text-sm font-medium text-gray-700">
                Featured Report (show prominently)
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="flex items-center gap-2 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-black px-6 py-3 rounded-2xl font-medium transition-all shadow-lg"
              >
                <Save className="w-5 h-5" />
                {editingId ? 'Update Report' : 'Add Report'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center gap-2 bg-white text-black border-2 border-black hover:bg-black hover:text-white px-6 py-3 rounded-2xl font-medium transition-all"
              >
                <X className="w-5 h-5" />
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* COA Reports List */}
      <div className="space-y-4">
        {coaReports.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-gold-200">
            <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No COA reports yet. Add your first lab report!</p>
          </div>
        ) : (
          coaReports.map((report) => (
            <div
              key={report.id}
              className="bg-white rounded-3xl p-6 border border-gold-200 hover:border-gold-400 shadow-md hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-bold text-black">
                      {report.product_name}
                    </h3>
                    {report.featured && (
                      <span className="bg-black text-gold-400 px-3 py-1 rounded-full text-xs font-bold border border-gold-500">
                        ⭐ FEATURED
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Purity:</span>
                      <p className="font-bold text-gold-700">{report.purity_percentage}%</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Quantity:</span>
                      <p className="font-bold text-black">{report.quantity}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Task Number:</span>
                      <p className="font-mono text-black">{report.task_number}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Test Date:</span>
                      <p className="text-black">{new Date(report.test_date).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-3 text-sm">
                    <a
                      href={`https://www.janoshik.com/verify/?key=${report.verification_key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-gold-700 hover:text-gold-800 font-medium"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Verify on Janoshik
                    </a>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-600">Lab: {report.laboratory}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(report)}
                    className="p-2 text-black hover:bg-gold-100 rounded-xl transition-all"
                    title="Edit"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(report.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default COAManager;

