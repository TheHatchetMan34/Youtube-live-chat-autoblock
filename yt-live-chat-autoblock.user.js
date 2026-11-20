// ==UserScript==
// @name         YouTube Live Chat Auto-Hide Trolls by Keyword
// @namespace    TheHatchetMan34
// @version      1.5
// @description  Auto-hides users by keyword in YouTube live chat with an in-chat keyword manager and JSON backup/restore.
// @author       TheHatchetMan34
// @license      GPL-3.0-or-later
// @homepageURL  https://github.com/TheHatchetMan34/Youtube-live-chat-autoblock
// @updateURL    https://raw.githubusercontent.com/TheHatchetMan34/Youtube-live-chat-autoblock/main/yt-live-chat-autoblock.user.js
// @downloadURL  https://raw.githubusercontent.com/TheHatchetMan34/Youtube-live-chat-autoblock/main/yt-live-chat-autoblock.user.js
// @match        https://www.youtube.com/live_chat*
// @grant        none
// ==/UserScript==

/*
 * ==========================================
 * PATCH NOTES / CHANGELOG
 * ==========================================
 * v1.5 - Added in-chat Keywords tab and Export/Import JSON backup buttons.
 * v1.4 - Added matched keyword subtitle and hover tooltip showing the offending message.
 * v1.3 - Switched to whole-word matching (\b) to stop false positives inside larger words; added MY_HANDLE self-protection.
 * v1.2 - Added on-screen "Blocked (X)" button and pop-up manager in the chat header.
 * v1.1 - Hardened chat container selector and added empty-string safety filter.
 * v1.0 - Initial release: auto-hide users by keyword and save blocklist to localStorage.
 */

(function() {
    'use strict';

    // ==========================================
    // 1. PUT YOUR OWN HANDLE HERE SO YOU ARE NEVER BLOCKED
    // (Leave blank "" to auto-detect from your chat input box)
    // ==========================================
    const MY_HANDLE = "@thehatchetman670";

    // ==========================================
    // 2. INITIAL SEED KEYWORDS (You can add/remove words inside the chat pop-up)
    // ==========================================
    const DEFAULT_PHRASES = [
        "rip",
        "cher"
    ];

    const USERS_STORAGE_KEY = 'yt_chat_auto_blocked_users';
    const PHRASES_STORAGE_KEY = 'yt_chat_auto_blocked_phrases';

    function escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function loadBlockedUsers() {
        const raw = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '{}');
        if (Array.isArray(raw)) {
            const migrated = {};
            raw.forEach(user => {
                migrated[user] = { phrase: '(saved earlier)', message: '' };
            });
            localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(migrated));
            return migrated;
        }
        return raw;
    }

    function loadBlockedPhrases() {
        const saved = JSON.parse(localStorage.getItem(PHRASES_STORAGE_KEY) || 'null');
        if (Array.isArray(saved)) {
            return saved;
        }
        const initial = DEFAULT_PHRASES.map(p => p.trim()).filter(p => p.length > 0);
        localStorage.setItem(PHRASES_STORAGE_KEY, JSON.stringify(initial));
        return initial;
    }

    let blockedUsers = loadBlockedUsers();
    let blockedPhrases = loadBlockedPhrases();
    let activeRules = [];
    let toggleBtn = null;
    let modalOverlay = null;
    let activeTab = 'users';

    function rebuildRules() {
        activeRules = blockedPhrases
            .map(p => p.trim())
            .filter(p => p.length > 0)
            .map(p => ({
                phrase: p,
                regex: new RegExp(`\\b${escapeRegex(p)}\\b`, 'i')
            }));
    }

    rebuildRules();

    function getBlockedCount() {
        return Object.keys(blockedUsers).length;
    }

    function getOwnHandle() {
        if (MY_HANDLE.trim()) return MY_HANDLE.trim().toLowerCase();
        const inputAuthor = document.querySelector('yt-live-chat-message-input-renderer #author-name');
        return inputAuthor ? inputAuthor.textContent.trim().toLowerCase() : '';
    }

    function saveBlockedUsers() {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(blockedUsers));
        updateButtonLabel();
    }

    function saveBlockedPhrases() {
        localStorage.setItem(PHRASES_STORAGE_KEY, JSON.stringify(blockedPhrases));
        rebuildRules();
    }

    function updateButtonLabel() {
        if (toggleBtn) {
            toggleBtn.textContent = `Blocked (${getBlockedCount()})`;
        }
    }

    function findMatchedRule(text) {
        if (!text || activeRules.length === 0) return null;
        return activeRules.find(rule => rule.regex.test(text)) || null;
    }

    function processMessage(node) {
        if (!node || node.nodeType !== 1) return;

        if (
            node.tagName === 'YT-LIVE-CHAT-TEXT-MESSAGE-RENDERER' ||
            node.tagName === 'YT-LIVE-CHAT-PAID-MESSAGE-RENDERER' ||
            node.tagName === 'YT-LIVE-CHAT-MEMBERSHIP-ITEM-RENDERER'
        ) {
            const authorEl = node.querySelector('#author-name');
            const messageEl = node.querySelector('#message');

            if (!authorEl) return;

            const authorName = authorEl.textContent.trim();
            const ownHandle = getOwnHandle();

            if (ownHandle && authorName.toLowerCase() === ownHandle) {
                return;
            }

            const messageText = messageEl ? messageEl.textContent.trim() : '';

            if (Object.prototype.hasOwnProperty.call(blockedUsers, authorName)) {
                node.style.display = 'none';
                return;
            }

            const matchedRule = findMatchedRule(messageText);
            if (matchedRule) {
                blockedUsers[authorName] = {
                    phrase: matchedRule.phrase,
                    message: messageText
                };
                saveBlockedUsers();
                node.style.display = 'none';
                console.log(`[YT Auto-Block] Hid "${authorName}" | Matched: "${matchedRule.phrase}" | Message: "${messageText}"`);
            }
        }
    }

    function scanExistingMessages() {
        const chatContainer = document.querySelector('yt-live-chat-item-list-renderer #items');
        if (chatContainer) {
            chatContainer.childNodes.forEach(processMessage);
        }
    }

    function unhideUserMessages(username) {
        const messages = document.querySelectorAll(
            'yt-live-chat-text-message-renderer, yt-live-chat-paid-message-renderer, yt-live-chat-membership-item-renderer'
        );
        messages.forEach(node => {
            const authorEl = node.querySelector('#author-name');
            if (authorEl && authorEl.textContent.trim() === username) {
                node.style.display = '';
            }
        });
    }

    function exportBackup() {
        const payload = {
            version: '1.5',
            exportedAt: new Date().toISOString(),
            blockedUsers,
            blockedPhrases
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `yt-chat-autoblock-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    function importBackup(onComplete) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const data = JSON.parse(reader.result);
                    if (data.blockedUsers && typeof data.blockedUsers === 'object') {
                        blockedUsers = { ...blockedUsers, ...data.blockedUsers };
                        saveBlockedUsers();
                    }
                    if (Array.isArray(data.blockedPhrases)) {
                        const merged = new Set([
                            ...blockedPhrases,
                            ...data.blockedPhrases.map(p => String(p).trim()).filter(Boolean)
                        ]);
                        blockedPhrases = [...merged];
                        saveBlockedPhrases();
                    }
                    scanExistingMessages();
                    onComplete();
                } catch (err) {
                    alert('Invalid backup JSON file.');
                }
            };
            reader.readAsText(file);
        });
        input.click();
    }

    function renderUsersTab(bodyContainer, onCountChange) {
        const listBox = document.createElement('div');
        listBox.style.cssText = 'flex: 1; overflow-y: auto;';

        function populateUsers() {
            while (listBox.firstChild) {
                listBox.removeChild(listBox.firstChild);
            }

            const users = Object.keys(blockedUsers).reverse();
            if (users.length === 0) {
                const emptyMsg = document.createElement('div');
                emptyMsg.textContent = 'No users blocked yet.';
                emptyMsg.style.cssText = 'color: #aaa; text-align: center; padding: 20px 0; font-size: 13px;';
                listBox.appendChild(emptyMsg);
                return;
            }

            users.forEach(user => {
                const info = blockedUsers[user] || { phrase: '', message: '' };

                const row = document.createElement('div');
                row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 6px 4px; border-bottom: 1px solid #2e2e2e; font-size: 13px; gap: 8px;';
                if (info.message) {
                    row.title = `Triggered by "${info.phrase}" in message:\n"${info.message}"`;
                }

                const textWrap = document.createElement('div');
                textWrap.style.cssText = 'display: flex; flex-direction: column; overflow: hidden; min-width: 0;';

                const nameSpan = document.createElement('span');
                nameSpan.textContent = user;
                nameSpan.style.cssText = 'color: #f1f1f1; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';

                const reasonSpan = document.createElement('span');
                reasonSpan.textContent = info.phrase ? `Matched: "${info.phrase}"` : '';
                reasonSpan.style.cssText = 'color: #9e9e9e; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';

                textWrap.appendChild(nameSpan);
                if (info.phrase) textWrap.appendChild(reasonSpan);

                const removeBtn = document.createElement('button');
                removeBtn.textContent = 'Unhide';
                removeBtn.style.cssText = 'background: #3ea6ff; color: #0f0f0f; border: none; border-radius: 4px; padding: 3px 8px; font-size: 11px; font-weight: 600; cursor: pointer; flex-shrink: 0;';
                removeBtn.addEventListener('click', () => {
                    delete blockedUsers[user];
                    saveBlockedUsers();
                    unhideUserMessages(user);
                    onCountChange();
                    populateUsers();
                });

                row.appendChild(textWrap);
                row.appendChild(removeBtn);
                listBox.appendChild(row);
            });
        }

        populateUsers();
        bodyContainer.appendChild(listBox);
    }

    function renderKeywordsTab(bodyContainer, onCountChange) {
        const addForm = document.createElement('div');
        addForm.style.cssText = 'display: flex; gap: 6px; margin-bottom: 8px;';

        const kwInput = document.createElement('input');
        kwInput.type = 'text';
        kwInput.placeholder = 'Enter blocked word or phrase...';
        kwInput.style.cssText = 'flex: 1; padding: 6px 8px; background: #272727; color: #f1f1f1; border: 1px solid #3f3f3f; border-radius: 4px; font-size: 12px; outline: none;';

        const addBtn = document.createElement('button');
        addBtn.textContent = 'Add';
        addBtn.style.cssText = 'background: #3ea6ff; color: #0f0f0f; border: none; border-radius: 4px; padding: 0 12px; font-size: 12px; font-weight: 600; cursor: pointer;';

        const listBox = document.createElement('div');
        listBox.style.cssText = 'flex: 1; overflow-y: auto;';

        function populateKeywords() {
            while (listBox.firstChild) {
                listBox.removeChild(listBox.firstChild);
            }

            if (blockedPhrases.length === 0) {
                const emptyMsg = document.createElement('div');
                emptyMsg.textContent = 'No blocked keywords active.';
                emptyMsg.style.cssText = 'color: #aaa; text-align: center; padding: 20px 0; font-size: 13px;';
                listBox.appendChild(emptyMsg);
                return;
            }

            blockedPhrases.forEach((phrase, idx) => {
                const row = document.createElement('div');
                row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 6px 4px; border-bottom: 1px solid #2e2e2e; font-size: 13px; gap: 8px;';

                const label = document.createElement('span');
                label.textContent = phrase;
                label.style.cssText = 'color: #f1f1f1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';

                const delBtn = document.createElement('button');
                delBtn.textContent = 'Remove';
                delBtn.style.cssText = 'background: #383838; color: #f1f1f1; border: 1px solid #555; border-radius: 4px; padding: 3px 8px; font-size: 11px; cursor: pointer; flex-shrink: 0;';
                delBtn.addEventListener('click', () => {
                    blockedPhrases.splice(idx, 1);
                    saveBlockedPhrases();
                    onCountChange();
                    populateKeywords();
                });

                row.appendChild(label);
                row.appendChild(delBtn);
                listBox.appendChild(row);
            });
        }

        function handleAdd() {
            const val = kwInput.value.trim();
            if (!val) return;
            const exists = blockedPhrases.some(p => p.toLowerCase() === val.toLowerCase());
            if (!exists) {
                blockedPhrases.push(val);
                saveBlockedPhrases();
                scanExistingMessages();
                onCountChange();
            }
            kwInput.value = '';
            populateKeywords();
        }

        addBtn.addEventListener('click', handleAdd);
        kwInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleAdd();
        });

        addForm.appendChild(kwInput);
        addForm.appendChild(addBtn);
        populateKeywords();
        bodyContainer.appendChild(addForm);
        bodyContainer.appendChild(listBox);
    }

    function toggleModal() {
        if (modalOverlay) {
            modalOverlay.remove();
            modalOverlay = null;
            return;
        }

        modalOverlay = document.createElement('div');
        modalOverlay.style.cssText = 'position: fixed; top: 48px; right: 12px; left: 12px; bottom: 60px; background: #181818; border: 1px solid #383838; border-radius: 8px; z-index: 9999; display: flex; flex-direction: column; box-shadow: 0 4px 16px rgba(0,0,0,0.7); font-family: Roboto, Arial, sans-serif;';

        const header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-bottom: 1px solid #333;';

        const tabWrap = document.createElement('div');
        tabWrap.style.cssText = 'display: flex; gap: 6px;';

        const usersTabBtn = document.createElement('button');
        const kwTabBtn = document.createElement('button');

        function styleTabs() {
            const base = 'border: none; border-radius: 4px; padding: 4px 10px; font-size: 12px; font-weight: 600; cursor: pointer;';
            usersTabBtn.style.cssText = base + (activeTab === 'users' ? 'background: #3ea6ff; color: #0f0f0f;' : 'background: #272727; color: #ccc;');
            kwTabBtn.style.cssText = base + (activeTab === 'keywords' ? 'background: #3ea6ff; color: #0f0f0f;' : 'background: #272727; color: #ccc;');
            usersTabBtn.textContent = `Blocked Users (${getBlockedCount()})`;
            kwTabBtn.textContent = `Keywords (${blockedPhrases.length})`;
        }

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = 'background: transparent; color: #aaa; border: none; font-size: 16px; cursor: pointer; padding: 0 4px;';
        closeBtn.addEventListener('click', toggleModal);

        const bodyContainer = document.createElement('div');
        bodyContainer.style.cssText = 'flex: 1; display: flex; flex-direction: column; overflow: hidden; padding: 8px 10px;';

        function refreshBody() {
            styleTabs();
            while (bodyContainer.firstChild) {
                bodyContainer.removeChild(bodyContainer.firstChild);
            }
            if (activeTab === 'users') {
                renderUsersTab(bodyContainer, styleTabs);
            } else {
                renderKeywordsTab(bodyContainer, styleTabs);
            }
        }

        usersTabBtn.addEventListener('click', () => {
            activeTab = 'users';
            refreshBody();
        });
        kwTabBtn.addEventListener('click', () => {
            activeTab = 'keywords';
            refreshBody();
        });

        tabWrap.appendChild(usersTabBtn);
        tabWrap.appendChild(kwTabBtn);
        header.appendChild(tabWrap);
        header.appendChild(closeBtn);

        const footer = document.createElement('div');
        footer.style.cssText = 'padding: 8px 10px; border-top: 1px solid #333; display: flex; justify-content: space-between; align-items: center; gap: 6px;';

        const backupWrap = document.createElement('div');
        backupWrap.style.cssText = 'display: flex; gap: 6px;';

        const exportBtn = document.createElement('button');
        exportBtn.textContent = 'Export';
        exportBtn.title = 'Download blocked users and keywords as a JSON backup file';
        exportBtn.style.cssText = 'background: #272727; color: #f1f1f1; border: 1px solid #444; border-radius: 4px; padding: 4px 8px; font-size: 11px; cursor: pointer;';
        exportBtn.addEventListener('click', exportBackup);

        const importBtn = document.createElement('button');
        importBtn.textContent = 'Import';
        importBtn.title = 'Restore blocked users and keywords from a JSON backup file';
        importBtn.style.cssText = 'background: #272727; color: #f1f1f1; border: 1px solid #444; border-radius: 4px; padding: 4px 8px; font-size: 11px; cursor: pointer;';
        importBtn.addEventListener('click', () => importBackup(refreshBody));

        backupWrap.appendChild(exportBtn);
        backupWrap.appendChild(importBtn);

        const clearAllBtn = document.createElement('button');
        clearAllBtn.textContent = 'Clear All Users';
        clearAllBtn.style.cssText = 'background: #cc0000; color: #fff; border: none; border-radius: 4px; padding: 4px 8px; font-size: 11px; font-weight: 500; cursor: pointer;';
        clearAllBtn.addEventListener('click', () => {
            const allUsers = Object.keys(blockedUsers);
            blockedUsers = {};
            saveBlockedUsers();
            allUsers.forEach(unhideUserMessages);
            refreshBody();
        });

        footer.appendChild(backupWrap);
        footer.appendChild(clearAllBtn);

        modalOverlay.appendChild(header);
        modalOverlay.appendChild(bodyContainer);
        modalOverlay.appendChild(footer);
        document.body.appendChild(modalOverlay);
        refreshBody();
    }

    function injectHeaderButton() {
        if (document.getElementById('yt-autoblock-btn')) return;

        const header = document.querySelector('yt-live-chat-header-renderer #primary-content') ||
                       document.querySelector('yt-live-chat-header-renderer');

        if (!header) {
            setTimeout(injectHeaderButton, 1000);
            return;
        }

        toggleBtn = document.createElement('button');
        toggleBtn.id = 'yt-autoblock-btn';
        toggleBtn.textContent = `Blocked (${getBlockedCount()})`;
        toggleBtn.title = 'View and manage auto-blocked chat users & keywords';
        toggleBtn.style.cssText = 'margin-left: 8px; padding: 4px 8px; background: #272727; color: #f1f1f1; border: 1px solid #3f3f3f; border-radius: 12px; font-size: 11px; font-weight: 500; cursor: pointer; white-space: nowrap;';

        toggleBtn.addEventListener('mouseenter', () => {
            toggleBtn.style.background = '#3f3f3f';
        });
        toggleBtn.addEventListener('mouseleave', () => {
            toggleBtn.style.background = '#272727';
        });
        toggleBtn.addEventListener('click', toggleModal);

        header.appendChild(toggleBtn);
    }

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const addedNode of mutation.addedNodes) {
                processMessage(addedNode);
            }
        }
    });

    function init() {
        if (!window.location.pathname.startsWith('/live_chat')) return;

        const chatContainer = document.querySelector('yt-live-chat-item-list-renderer #items');
        if (chatContainer) {
            injectHeaderButton();
            scanExistingMessages();
            observer.observe(chatContainer, { childList: true });
            console.log('[YT Auto-Block] v1.5 active.');
        } else {
            setTimeout(init, 1000);
        }
    }

    init();
})();
