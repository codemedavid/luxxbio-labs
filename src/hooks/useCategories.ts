import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Category {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);

      const { data, error: fetchError } = await supabase
        .from('categories')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true });

      if (fetchError) throw fetchError;

      const hasAllCategory = data?.some(cat => cat.id === 'all');

      let finalCategories = data || [];

      if (!hasAllCategory) {
        const allCategory: Category = {
          id: 'all',
          name: 'All Peptides',
          icon: 'Grid',
          sort_order: 0,
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        finalCategories = [allCategory, ...finalCategories];
      }

      setCategories(finalCategories);
      setError(null);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async (category: Omit<Category, 'id' | 'created_at' | 'updated_at'> & { id?: string }) => {
    try {
      const payload: Record<string, unknown> = {
        name: category.name,
        icon: category.icon,
        sort_order: category.sort_order,
        active: category.active,
      };
      if (category.id) payload.id = category.id;

      const { data, error: insertError } = await supabase
        .from('categories')
        .insert(payload)
        .select()
        .single();

      if (insertError) throw insertError;

      await fetchCategories();
      return data;
    } catch (err) {
      console.error('Error adding category:', err);
      throw err;
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    try {
      const { error: updateError } = await supabase
        .from('categories')
        .update({
          name: updates.name,
          icon: updates.icon,
          sort_order: updates.sort_order,
          active: updates.active
        })
        .eq('id', id);

      if (updateError) throw updateError;

      await fetchCategories();
    } catch (err) {
      console.error('Error updating category:', err);
      throw err;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      // Check if category has products
      const { data: products, error: checkError } = await supabase
        .from('products')
        .select('id')
        .eq('category', id)
        .limit(1);

      if (checkError) throw checkError;

      if (products && products.length > 0) {
        throw new Error('Cannot delete category that contains products. Please move or delete the products first.');
      }

      const { error: deleteError } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      await fetchCategories();
    } catch (err) {
      console.error('Error deleting category:', err);
      throw err;
    }
  };

  const reorderCategories = async (reorderedCategories: Category[]) => {
    try {
      const updates = reorderedCategories.map((cat, index) => ({
        id: cat.id,
        sort_order: index + 1
      }));

      for (const update of updates) {
        await supabase
          .from('categories')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);
      }

      await fetchCategories();
    } catch (err) {
      console.error('Error reordering categories:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchCategories();

    // Set up real-time subscription for category changes
    const categoriesChannel = supabase
      .channel('categories-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories'
        },
        (payload) => {
          console.log('Category changed:', payload);
          fetchCategories(); // Refetch categories when any change occurs
        }
      )
      .subscribe();

    // Refetch data when window regains focus
    const handleFocus = () => {
      fetchCategories();
    };

    window.addEventListener('focus', handleFocus);

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(categoriesChannel);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  return {
    categories,
    loading,
    error,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    refetch: fetchCategories
  };
};