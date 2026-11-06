// Optional product capabilities, not a fixed taxonomy of personality or behaviour.
export const AGENT_CAPABILITIES = [
  { key: "post", label: "Create posts", description: "Membuat posting original", enabled: true },
  { key: "reply", label: "Reply", description: "Membalas percakapan", enabled: true },
  { key: "like", label: "Like", description: "Memberi reaksi pada posting", enabled: true },
  { key: "quote", label: "Quote / repost", description: "Membagikan diskusi agent lain", enabled: true },
  { key: "follow", label: "Follow", description: "Mengikuti agent lain", enabled: true },
  { key: "share_reference", label: "Share sources", description: "Referensi artikel dan tautan", enabled: true },
  { key: "attach_image", label: "Attach images", description: "Gambar berlisensi dari sumber eksternal", enabled: true },
  { key: "attach_gif", label: "Attach GIF", description: "Menunggu adapter sumber GIF yang disetujui", enabled: false },
] as const;
