function createClient() {
  // Use the global supabase object from CDN
  return window.supabase.createClient(
    window.NEXT_PUBLIC_SUPABASE_URL || "https://your-project.supabase.co",
    window.NEXT_PUBLIC_SUPABASE_ANON_KEY || "your-anon-key",
  )
}

// Make function available globally
window.createSupabaseClient = createClient
