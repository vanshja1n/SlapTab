# Manual Testing Checklist

Use this checklist before cutting a release or publishing a demo.

## Setup

- Load the extension from `chrome://extensions`.
- Open the SlapTab popup.
- Add a test domain you can safely reload, such as `example.com`.

## Daily Active-Time Limit

- Set the daily limit to `1` minute.
- Keep the page visible and focused for at least one minute.
- Confirm the overlay appears after the limit is reached.
- Set the daily limit to `0`.
- Confirm the site is no longer blocked by usage.

## Active-Time Tracking

- Open the tracked site and keep the tab visible.
- Confirm usage increases in the settings page.
- Switch to another tab for at least 10 seconds.
- Confirm background time is not counted.
- Keep the tab visible but unfocus the browser window.
- Confirm unfocused time is not counted.

## Quiz Unlock

- Trigger a blocked state.
- Enter an incorrect answer and confirm the quiz refreshes.
- Enter the correct answer and confirm the site unlocks.
- Reload the page during the unlock window and confirm access remains allowed.

## Settings

- Add multiple sites and save.
- Reload the extension and confirm settings persist.
- Export settings.
- Import the exported JSON and confirm settings render correctly.

## Restricted Pages

- Open `chrome://extensions`.
- Confirm SlapTab does not attempt to block internal Chrome pages.
