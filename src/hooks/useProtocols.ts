import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface Protocol {
    id: string;
    name: string;
    category: string;
    dosage: string;
    frequency: string;
    duration: string;
    notes: string[];
    storage: string;
    sort_order: number;
    active: boolean;
    image_url?: string;
    product_id?: string;
    created_at: string;
    updated_at: string;
}

export function useProtocols() {
    const [protocols, setProtocols] = useState<Protocol[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProtocols = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('protocols')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            setProtocols(data || []);
        } catch (err) {
            console.error('Error fetching protocols:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch protocols');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProtocols();
    }, [fetchProtocols]);

    const addProtocol = async (protocol: Omit<Protocol, 'id' | 'created_at' | 'updated_at'>) => {
        try {
            const { data, error } = await supabase
                .from('protocols')
                .insert(protocol)
                .select()
                .single();

            if (error) throw error;
            await fetchProtocols();
            return { success: true, data };
        } catch (err) {
            console.error('Error adding protocol:', err);
            return { success: false, error: err instanceof Error ? err.message : 'Failed to add protocol' };
        }
    };

    const updateProtocol = async (id: string, updates: Partial<Protocol>) => {
        try {
            const { data, error } = await supabase
                .from('protocols')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            await fetchProtocols();
            return { success: true, data };
        } catch (err) {
            console.error('Error updating protocol:', err);
            return { success: false, error: err instanceof Error ? err.message : 'Failed to update protocol' };
        }
    };

    const deleteProtocol = async (id: string) => {
        try {
            const { error } = await supabase
                .from('protocols')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await fetchProtocols();
            return { success: true };
        } catch (err) {
            console.error('Error deleting protocol:', err);
            return { success: false, error: err instanceof Error ? err.message : 'Failed to delete protocol' };
        }
    };

    const toggleActive = async (id: string, active: boolean) => {
        return updateProtocol(id, { active });
    };

    return {
        protocols,
        loading,
        error,
        fetchProtocols,
        addProtocol,
        updateProtocol,
        deleteProtocol,
        toggleActive
    };
}
