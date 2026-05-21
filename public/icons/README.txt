PWA icons are referenced by /manifest.json. Drop the real icons into this
folder before Phase 5 launch:

  - icon-192.png            192x192, any purpose
  - icon-512.png            512x512, any purpose
  - icon-maskable-512.png   512x512, maskable purpose (safe area at center)
  - apple-touch-icon.png    180x180, iOS home-screen icon

Until these exist, browsers will show "icon failed to load" warnings on
install, which is harmless in development.
