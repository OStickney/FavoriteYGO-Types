# Favorite Yu-Gi-Oh! Types

A static, mobile-friendly Yu-Gi-Oh! picker inspired by the FavoriteYGO monster-category picker. This version lets a visitor choose one favorite Monster Card for each of the game's 25 standard monster Types.

**Live site:** https://ostickney.github.io/FavoriteYGO-Types/

## Features

- All 25 standard monster Types in a five-by-five desktop poster
- Searchable, Type-filtered card selector powered by the YGOPRODeck v7 API
- Choices saved locally between visits
- One-click PNG export of the completed poster
- Responsive keyboard- and touch-friendly layout
- No build step or server required

## GitHub Pages

The deployment workflow publishes the static site to GitHub Pages whenever the `main` branch changes. The repository's Pages source should remain set to **GitHub Actions**.

## Data and image note

Card information and images are requested from YGOPRODeck only when a visitor opens a Type picker. YGOPRODeck recommends downloading and re-hosting images for a high-traffic public project. For a large launch, replace the remote image URLs with locally hosted card images.

Yu-Gi-Oh! and its card images are the property of their respective rights holders. This fan-made project is not affiliated with or endorsed by Konami.
