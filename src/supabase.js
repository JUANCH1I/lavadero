import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fojuemdohljcqunzpagg.supabase.co'
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvanVlbWRvaGxqY3F1bnpwYWdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg4NTYzNjUsImV4cCI6MjA1NDQzMjM2NX0.uoRJ-lUv_XKNFEAtUOrewnXOv-cYl1I3-MuqTeId52o'
export const supabase = createClient(supabaseUrl, supabaseKey)
