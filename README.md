# Media

A Progressive Web App that tracks movies, series, books, games and other media.

- Define your own categories, each with a color. The first start adds Movies, Series, Books and Games.
- Add an item with a title, a category, a start day, an optional end day, an optional rating from 1 to 5 stars and an optional note.
- The list shows the items in progress first, then the finished items by year, newest first.
- Tap the check button of an item in progress to finish it today.
- Show one category or all, and search the titles and notes.
- Tap an item to edit it. Swipe an item to the left to show Edit and Delete.
- Export all data to a backup file, and import the file on a new phone.

## Tech

- React, TypeScript and Vite
- `vite-plugin-pwa` for the manifest, the service worker and the offline cache
- `localStorage` for the data

## Development

```bash
npm install
npm run dev
```

## Deployment

The GitHub Actions workflow `.github/workflows/deploy.yml` builds the app and publishes it to GitHub Pages on each push to `main`. The app is served at `https://pglira.github.io/media-tracker/`.

## Install on iOS

Open the URL in Safari, tap Share and select "Add to Home Screen".
