# Sentinel face verification demo

This repository now contains a Vercel-ready static application in `public/`. It replaces the
original PHP/MySQL flow and missing Windows Python launcher with device-local browser face
verification.

## Preview locally

```powershell
npm.cmd start
```

Open <http://127.0.0.1:4173>. Internet access is required the first time the pinned browser ML
library and models load; the models are cached by the browser after that.

## Deploy to Vercel

Import this repository into Vercel. The included `vercel.json` serves `public/` directly, so no
build command, PHP runtime, local server, or database is needed.

## Privacy and scope

- Camera frames are processed in the browser and are not uploaded by this application.
- Three numerical face descriptors are stored in browser `localStorage` after explicit consent.
- The user can delete the local profile from the verifier.
- This is a demonstration. It does not include production liveness detection, shared accounts,
  server-side access control, or cross-device profile synchronisation.

The original PHP files remain in the local workspace as a legacy reference but are ignored by Git
and excluded from the Vercel deployment.
