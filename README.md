# YouTube Playback Guard

YouTube Playback Guard is a lightweight browser extension that prevents specific YouTube videos and channels from playing based on a configurable blocklist.

It is designed to help protect users who are vulnerable to misleading, manipulative, or distressing video content - particularly content that claims to deliver personal messages, financial promises, or divine revelations.

---

## How it works

The extension works by:

- Automatically pausing videos on load  
- Blocking playback if a video title or channel matches configured rules  
- Allowing safe videos to play normally without redirection  
- Supporting local and remote blocklists that can be updated automatically  

Configuration is fully local to the browser and never shared externally.  
Remote blocklists are fetched only from URLs explicitly provided by the user.

---

## Key features

- Blocks YouTube videos by **title keywords** and **channel handles**
- Prevents playback without redirecting or breaking the page
- Supports **remote blocklists (JSON)** with periodic background updates
- Keeps the **last known good blocklist** if a remote fetch fails
- Optional per-origin permissions for fetching remote lists
- Works on **Firefox and Chromium-based browsers**
- No tracking, analytics, or external services

---

## Who this is for

This project was built to help:

- Family members supporting someone vulnerable to online misinformation
- Carers and guardians looking for non-confrontational safeguards
- Users who want fine-grained control over YouTube content without censorship at the platform level

It is not intended to shame, monitor, or spy on users, and does not attempt to "judge" content beyond simple rule matching.

---

## Design principles

- **Fail closed**: blocked content stays blocked if anything goes wrong
- **Minimal permissions**
- **No ads, no tracking, no data collection**
- **Transparent, auditable behaviour**

---

## Development notes

### Firefox
- `amo-metadata.json` contains metadata used when publishing to Mozilla Add-ons (AMO).
- `.env.local` is used for local AMO signing credentials and is intentionally not committed.
- To build the extension for Firefox, run:

```bash
./scripts/firefox-build
```
- To run the extension for Firefox, run:

```bash
./scripts/firefox-run
```
- To sign the extension for Firefox, run:

```bash
./scripts/firefox-sign
```
