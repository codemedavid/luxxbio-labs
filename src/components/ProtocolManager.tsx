import React, { useState } from 'react';
import { ArrowLeft, Plus, Edit, Trash2, Save, X, Eye, EyeOff, FlaskConical, Search } from 'lucide-react';
import { useProtocols, Protocol } from '../hooks/useProtocols';
import ImageUpload from './ImageUpload';

interface ProtocolManagerProps {
    onBack: () => void;
}

const ProtocolManager: React.FC<ProtocolManagerProps> = ({ onBack }) => {
    const { protocols, loading, addProtocol, updateProtocol, deleteProtocol, toggleActive } = useProtocols();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const emptyForm = {
        name: '',
        category: '',
        dosage: '',
        frequency: '',
        duration: '',
        notes: [] as string[],
        storage: '',
        sort_order: 0,
        active: true,
        image_url: ''
    };

    const [formData, setFormData] = useState(emptyForm);
    const [notesText, setNotesText] = useState('');

    const handleEdit = (protocol: Protocol) => {
        setEditingId(protocol.id);
        setFormData({
            name: protocol.name,
            category: protocol.category,
            dosage: protocol.dosage,
            frequency: protocol.frequency,
            duration: protocol.duration,
            notes: protocol.notes,
            storage: protocol.storage,
            sort_order: protocol.sort_order,
            active: protocol.active,
            image_url: protocol.image_url || ''
        });
        setNotesText((protocol.notes || []).join('\n'));
        setIsAdding(false);
    };

    const handleAdd = () => {
        setIsAdding(true);
        setEditingId(null);
        setFormData({ ...emptyForm, sort_order: protocols.length + 1 });
        setNotesText('');
    };

    const handleCancel = () => {
        setEditingId(null);
        setIsAdding(false);
        setFormData(emptyForm);
        setNotesText('');
    };

    const handleSave = async () => {
        if (!formData.image_url && !formData.name?.trim()) {
            alert('Please upload an image or provide a protocol name.');
            return;
        }

        setIsProcessing(true);
        const notes = notesText.split('\n').filter(note => note.trim() !== '');
        const dataToSave = {
            ...formData,
            name: formData.name?.trim() || 'Protocol',
            category: formData.category?.trim() || 'General',
            dosage: formData.dosage?.trim() || '',
            frequency: formData.frequency?.trim() || '',
            duration: formData.duration?.trim() || '',
            storage: formData.storage?.trim() || '',
            image_url: formData.image_url || '',
            notes
        };

        try {
            if (isAdding) {
                const result = await addProtocol(dataToSave);
                if (!result.success) throw new Error(result.error);
            } else if (editingId) {
                const result = await updateProtocol(editingId, dataToSave);
                if (!result.success) throw new Error(result.error);
            }
            handleCancel();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to save');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this protocol?')) return;
        setIsProcessing(true);
        try {
            const result = await deleteProtocol(id);
            if (!result.success) throw new Error(result.error);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to delete');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleToggleActive = async (id: string, currentActive: boolean) => {
        setIsProcessing(true);
        try {
            const result = await toggleActive(id, !currentActive);
            if (!result.success) throw new Error(result.error);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to toggle');
        } finally {
            setIsProcessing(false);
        }
    };

    const query = searchQuery.trim().toLowerCase();
    const filteredProtocols = query
        ? protocols.filter((p) => {
            const haystack = [
                p.name,
                p.category,
                p.dosage,
                p.frequency,
                p.duration,
                p.storage,
                ...(p.notes || []),
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return haystack.includes(query);
        })
        : protocols;

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onBack}
                                className="text-gray-500 hover:text-gray-900 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <h1 className="text-xl font-bold text-gray-900">📋 Protocol Manager</h1>
                        </div>
                        {!isAdding && !editingId && (
                            <button
                                onClick={handleAdd}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-black font-medium rounded-lg shadow-md transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Add Protocol
                            </button>
                        )}
                    </div>
                </div>

                <div className="relative mt-4">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search protocols by name, category, dosage..."
                        className="w-full pl-10 pr-9 py-2.5 bg-white text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 placeholder-gray-400"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                            aria-label="Clear search"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-6">
                {/* Add/Edit Form */}
                {(isAdding || editingId) && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">
                            {isAdding ? '➕ Add New Protocol' : '✏️ Edit Protocol'}
                        </h2>

                        <div className="mb-4">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Protocol Image <span className="text-xs font-normal text-gray-500">(post just an image — other details optional)</span>
                            </label>
                            <ImageUpload
                                currentImage={formData.image_url}
                                onImageChange={(url) => setFormData({ ...formData, image_url: url || '' })}
                                folder="protocol-images"
                            />
                        </div>

                        <details className="bg-gray-50 rounded-xl border border-gray-200 mb-4">
                          <summary className="cursor-pointer px-4 py-3 font-semibold text-sm text-gray-700 hover:text-black select-none">
                            Optional Details (leave blank to skip)
                          </summary>
                          <div className="p-4 pt-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-white text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 placeholder-gray-400"
                                    placeholder="e.g., Tirzepatide"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <input
                                    type="text"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full px-3 py-2 bg-white text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 placeholder-gray-400"
                                    placeholder="e.g., Weight Management"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Dosage</label>
                                <input
                                    type="text"
                                    value={formData.dosage}
                                    onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                                    className="w-full px-3 py-2 bg-white text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 placeholder-gray-400"
                                    placeholder="e.g., 2.5mg - 15mg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                                <input
                                    type="text"
                                    value={formData.frequency}
                                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                                    className="w-full px-3 py-2 bg-white text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 placeholder-gray-400"
                                    placeholder="e.g., Once weekly"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                                <input
                                    type="text"
                                    value={formData.duration}
                                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                    className="w-full px-3 py-2 bg-white text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 placeholder-gray-400"
                                    placeholder="e.g., 12-16 weeks"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                                <input
                                    type="number"
                                    value={formData.sort_order}
                                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 bg-white text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 placeholder-gray-400"
                                />
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Storage Instructions</label>
                            <input
                                type="text"
                                value={formData.storage}
                                onChange={(e) => setFormData({ ...formData, storage: e.target.value })}
                                className="w-full px-3 py-2 bg-white text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 placeholder-gray-400"
                                placeholder="e.g., Refrigerate at 2-8°C"
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Protocol Notes (one per line)</label>
                            <textarea
                                value={notesText}
                                onChange={(e) => setNotesText(e.target.value)}
                                rows={5}
                                className="w-full px-3 py-2 bg-white text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 placeholder-gray-400"
                                placeholder="Enter each note on a new line..."
                            />
                        </div>

                          </div>
                        </details>

                        <div className="flex items-center gap-2 mb-4">
                            <input
                                type="checkbox"
                                id="active"
                                checked={formData.active}
                                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                                className="w-4 h-4 text-gold-600 rounded focus:ring-gold-500"
                            />
                            <label htmlFor="active" className="text-sm font-medium text-gray-700">Active (visible on website)</label>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleSave}
                                disabled={isProcessing}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-black font-medium rounded-lg shadow-md transition-colors disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                {isProcessing ? 'Saving...' : 'Save Protocol'}
                            </button>
                            <button
                                onClick={handleCancel}
                                className="flex items-center gap-2 px-4 py-2 border-2 border-black text-black rounded-lg hover:bg-black hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Protocols List */}
                <div className="space-y-3">
                    {protocols.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                            <p className="text-gray-500">No protocols yet. Add your first protocol!</p>
                        </div>
                    ) : filteredProtocols.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                            <p className="text-gray-500">No protocols match "{searchQuery}".</p>
                        </div>
                    ) : (
                        filteredProtocols.map((protocol) => (
                            <div
                                key={protocol.id}
                                className={`bg-white rounded-xl shadow-sm border ${protocol.active ? 'border-gray-200' : 'border-red-200 bg-red-50/30'} p-4`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-medium text-gold-700 uppercase tracking-wider">{protocol.category}</span>
                                            {!protocol.active && (
                                                <span className="text-xs font-medium text-red-500 bg-red-100 px-2 py-0.5 rounded">Hidden</span>
                                            )}
                                        </div>
                                        <h3 className="font-semibold text-gray-900">{protocol.name}</h3>
                                        <p className="text-sm text-gray-600 mt-1">
                                            {protocol.dosage} • {protocol.frequency}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <a
                                            href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(protocol.name)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                            title={`Research ${protocol.name} on PubMed`}
                                        >
                                            <FlaskConical className="w-4 h-4" />
                                        </a>
                                        <button
                                            onClick={() => handleToggleActive(protocol.id, protocol.active)}
                                            disabled={isProcessing}
                                            className={`p-2 rounded-lg transition-colors ${protocol.active ? 'text-gold-700 hover:bg-gold-100' : 'text-gray-400 hover:bg-gray-100'}`}
                                            title={protocol.active ? 'Hide from website' : 'Show on website'}
                                        >
                                            {protocol.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                        </button>
                                        <button
                                            onClick={() => handleEdit(protocol)}
                                            className="p-2 text-black hover:bg-gold-100 rounded-lg transition-colors"
                                            title="Edit"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(protocol.id)}
                                            disabled={isProcessing}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProtocolManager;
