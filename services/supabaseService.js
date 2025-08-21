const { supabase, supabaseAdmin } = require('../config/database');

class SupabaseService {
  async createUser(userData) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert([userData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  async getUserById(id) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }
  
  async updateUser(id, updates) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  async deleteUser(id) {
    const { error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  }
  
  async getUsers(limit = 50, offset = 0) {
    const { data, error, count } = await supabase
      .from('users')
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1);
    
    if (error) throw error;
    return { data, count };
  }
  
  async subscribeToChanges(table, callback) {
    return supabase
      .channel(`${table}_changes`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table }, 
        callback
      )
      .subscribe();
  }
}

module.exports = new SupabaseService();