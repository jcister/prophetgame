# Prophet Order Challenge

Prophet Order Challenge is a retro-inspired Next.js game where you arrange the 18 presidents of The Church of Jesus Christ of Latter-day Saints in chronological order. Combine pixel-art UI with authentic portrait photography, compete for a perfect score, and race the clock in Timed Challenge mode.

## Tech Stack

- Next.js 14 (App Router) with React and TypeScript
- Tailwind CSS for styling
- CSS custom properties for pixel borders and UI accents
- Optional chiptune-style audio cues (WAV files)

## Gameplay Highlights

- **Two Modes:** Standard (no timer) and Timed Challenge with a customizable 1–10 minute countdown
- **Scoring:** Earn 1 point per correctly placed card. Reach 18 points for a perfect game.
- **Swapping Controls:** Click a card to pick it up, then click another to swap positions.
- **Immediate Feedback:** Green checkmarks confirm correct placements; red marks flag mistakes.
- **Pause & Exit Controls:** Pause timed runs or exit back to the title screen with safety prompts.
- **Distinct Screens:** Title, active board with top/bottom HUD, and end results screen.

## Getting Started

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Run the development server:

   ```powershell
   npm run dev
   ```

3. Open `http://localhost:3000` in your browser.

## Production Build

```powershell
npm run build
npm run start
```

## Asset Preparation

- Portrait images are bundled under `public/images/presidents/` as numbered JPEGs. Replace them as desired while keeping the filenames.
- Supply retro audio cues in `public/audio/` using the expected filenames outlined there. WAV or OGG files are recommended.
- Without audio assets the game still runs, but sound effects silently skip.

## Tailwind & Styling

- Global pixel styling lives in `app/globals.css`.
- Additional Tailwind customization resides in `tailwind.config.ts`.

## Type Safety & Linting

```powershell
npm run lint
```

## Project Structure

```
app/               # App Router entry, layout, and page logic
components/        # UI building blocks (TitleScreen, GameBoard, EndScreen)
data/              # President data definitions
hooks/             # Custom hooks (audio playback)
public/            # Portrait images and audio asset placeholders
types/             # Shared TypeScript types
```

## Known Caveats

- Portrait assets must be sourced manually to respect licensing.
- Audio playback depends on browser support for the `Audio` API; graceful fallbacks prevent runtime errors if unavailable.

Enjoy mastering the historical lineup!
