// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// Resolve environment variables universally for Node.js (process.env) and Vite (import.meta.env)
const getEnvVar = (name) => {
  if (typeof import.meta !== 'undefined' && import.meta?.env && import.meta.env[name]) {
    return import.meta.env[name];
  }
  if (typeof process !== 'undefined' && process?.env && process.env[name]) {
    return process.env[name];
  }
  return '';
};

const supabaseUrl = 
  getEnvVar('VITE_SUPABASE_URL') || 
  getEnvVar('SUPABASE_URL') || 
  'https://your-project-id.supabase.co';

const supabaseKey = 
  getEnvVar('SUPABASE_SERVICE_ROLE_KEY') ||
  getEnvVar('VITE_SUPABASE_ANON_KEY') || 
  getEnvVar('SUPABASE_ANON_KEY') || 
  'sb_publishable_pkcPc1bflYRtm2nzrUDOYw_4pYLwtyG';

export const isSupabaseConfigured = 
  Boolean(supabaseUrl) && 
  !supabaseUrl.includes('your-project-id') &&
  Boolean(supabaseKey);

export const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
