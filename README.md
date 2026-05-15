# Daily Pledge

A local-first pledge tracker with no account, no backend, and no subscription.

## Run It

From this folder:

```sh
python3 -m http.server 4173
```

Open it on this Mac:

```text
http://127.0.0.1:4173
```

Open it from a phone on the same Wi-Fi:

```text
http://192.168.0.2:4173
```

## Phone Notes

On iPhone, open the phone URL in Safari, then use Share and Add to Home Screen.

On Android, open the phone URL in Chrome, then use the browser menu and Add to Home screen or Install app.

For the most app-like install and offline behavior on a phone, put this folder on a free HTTPS static host such as GitHub Pages, Netlify, or Cloudflare Pages.

## Publish With GitHub Pages

After signing in with GitHub CLI:

```sh
gh auth login
gh repo create daily-pledge-app --public --source=. --remote=origin --push
gh api -X POST repos/:owner/daily-pledge-app/pages -f source.branch=main -f source.path=/
```

Your app will be available at:

```text
https://YOUR-GITHUB-USERNAME.github.io/daily-pledge-app/
```

## Data

Pledges, notes, and streaks are stored in the browser on the device. Use Export before clearing browser data or moving phones.
