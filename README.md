# Media

A Progressive Web App that tracks movies, series, books, games and other media.

- Define your own categories, each with a color. Drag the handle of a category in the category list to change the order. The first start adds Movies, Series, Books and Games.
- Add an item with a title, an optional year of the work (for example the release year of a movie), a category, a state, an optional start day, an optional end day, an optional rating from 1 to 10 and an optional note.
- An item is ongoing, completed or aborted. The row shows the state as an icon: a filled check mark for completed, a filled cross for aborted, and a check button for ongoing.
- The list shows the ongoing items first, then the completed and aborted items by the year of the end day, newest first.
- Tap the check button of an ongoing item to complete it today.
- The ranking view shows the rated items of the selected category, or of all categories, by rating. Items with the same rating share a place.
- Show one category or all, and search the titles, years and notes.
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
