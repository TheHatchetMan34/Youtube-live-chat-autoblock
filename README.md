# Youtube-live-chat-autoblock

A lightweight Tampermonkey / Violentmonkey userscript that automatically hides trolls—and all of their future messages across streams—the moment they type a word or phrase on your keyword blacklist in YouTube Live Chat.

## Features

* **Automatic User-Level Hiding:** Once a user types a blocked keyword or phrase, their message is hidden immediately and their username is saved locally so all future messages from them are hidden automatically across streams.
* **Whole-Word Matching (`\b`):** Prevents false positives from matching letters buried inside normal words (for example, blocking `rip` will not accidentally hide messages containing `script`).
* **Self-Protection (`MY_HANDLE`):** Automatically detects your own handle from the chat input box (or via a manual setting in the script) so your own messages are never blocked.
* **In-Chat Manager (`Blocked (X)` Button):** Adds a compact button to the YouTube live chat header to view caught users, see which exact keyword triggered each block, hover for the full message, or unhide anyone with one click.
* **Live Keyword Editor:** Add or remove blocked words and phrases directly from the **Keywords** tab inside the chat pop-up without editing the script or refreshing the stream.
* **JSON Export / Import Backup:** Download your caught users and keyword list as a `.json` backup file or restore them anytime.

## Installation

1. Install a userscript manager extension for your browser:
   * **Tampermonkey** or **Violentmonkey** (Chrome, Edge, Firefox, Brave).
   * *(Chrome / Edge users: Make sure **Developer Mode** and **Allow User Scripts** are enabled in your browser's Extensions settings.)*
2. Install the script directly from the Raw GitHub file:
   * Open `[Click here to install](https://raw.githubusercontent.com/TheHatchetMan34/Youtube-live-chat-autoblock/main/yt-live-chat-autoblock.user.js)`
   * Click **Install** when Tampermonkey prompts you.
3. Open or refresh (`F5`) any YouTube live stream with chat open.

## How to Use

1. Look for the **`Blocked (0)`** button at the top of the YouTube live chat panel.
2. Click **`Blocked (0)`** and switch to the **Keywords** tab to add the words or phrases you want to filter out.
3. Anyone who sends a message matching your list will be hidden automatically.
4. *(Optional)* To guarantee your own account is never flagged even in read-only or subscriber-only chats, open the script in Tampermonkey and set `const MY_HANDLE = "@YourHandle";` near the top.
5. Use the **Export** and **Import** buttons at the bottom of the pop-up to back up your blocklist to a `.json` file.

## Privacy & Storage

All blocked usernames, trigger logs, and custom keywords are stored **100% locally in your browser's `localStorage`**. Nothing is sent to any external server.

## License

Licensed under the **GNU General Public License v3.0 (GPL-3.0-or-later)**. See the `LICENSE` file for full details.
