# Document scans are cached as bytes, not as signed URLs

The papers screen must be fully readable with no signal, scans included. The scans live in a
private bucket, so they are reached through signed URLs — and a cached URL is worthless at 3am
because it has expired.

So the service worker caches the image *bytes*, keyed by object path, and serves them offline.
Signed URLs stay short-lived.

The alternative — signing for a year and caching the URLs — is a few lines instead of a few
dozen, and was rejected because of what these images are: scans of KTP, Kartu Keluarga, the
marriage book and insurance cards. A long-lived signed URL that leaks is a year of
unauthenticated access to the household's identity documents.
