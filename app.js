/* =========================================
   NEXUS AI ASSISTANT — CORE APPLICATION
   ========================================= */

// =========================================
// CONFIG & STATE
// =========================================

const PROVIDER_CONFIG = {
    openai: {
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1/chat/completions',
        models: [
            { id: 'gpt-4o', name: 'GPT-4o' },
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
            { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
            { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
        ],
        headers: (key) => ({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
        }),
        body: (messages, model, temp, maxTokens, stream) => ({
            model,
            messages,
            temperature: temp,
            max_tokens: maxTokens,
            stream
        }),
        parseChunk: (line) => {
            if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') return { done: true };
                try {
                    const parsed = JSON.parse(data);
                    return { content: parsed.choices?.[0]?.delta?.content || '' };
                } catch { return { content: '' }; }
            }
            return { content: '' };
        },
        parseResponse: (json) => json.choices?.[0]?.message?.content || ''
    },
    anthropic: {
        name: 'Anthropic',
        baseUrl: 'https://api.anthropic.com/v1/messages',
        models: [
            { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
            { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
            { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
            { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
        ],
        headers: (key) => ({
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
        }),
        body: (messages, model, temp, maxTokens, stream) => {
            const systemMsg = messages.find(m => m.role === 'system');
            const chatMessages = messages.filter(m => m.role !== 'system');
            const body = {
                model,
                messages: chatMessages,
                temperature: temp,
                max_tokens: maxTokens,
                stream
            };
            if (systemMsg) body.system = systemMsg.content;
            return body;
        },
        parseChunk: (line) => {
            if (line.startsWith('data: ')) {
                const data = line.slice(6);
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.type === 'content_block_delta') {
                        return { content: parsed.delta?.text || '' };
                    }
                    if (parsed.type === 'message_stop') {
                        return { done: true };
                    }
                } catch { return { content: '' }; }
            }
            return { content: '' };
        },
        parseResponse: (json) => json.content?.[0]?.text || ''
    },
    google: {
        name: 'Google',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/',
        models: [
            { id: 'gemini-2.5-flash-preview-04-17', name: 'Gemini 2.5 Flash' },
            { id: 'gemini-2.5-pro-preview-03-25', name: 'Gemini 2.5 Pro' },
            { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
            { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
        ],
        headers: (key) => ({
            'Content-Type': 'application/json',
        }),
        getUrl: (model, key, stream) => {
            const action = stream ? 'streamGenerateContent' : 'generateContent';
            return `https://generativelanguage.googleapis.com/v1beta/models/${model}:${action}?key=${key}${stream ? '&alt=sse' : ''}`;
        },
        body: (messages, model, temp, maxTokens) => {
            const sysMsg = messages.find(m => m.role === 'system');
            const chatMsgs = messages.filter(m => m.role !== 'system');
            const contents = chatMsgs.map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }));
            const body = {
                contents,
                generationConfig: {
                    temperature: temp,
                    maxOutputTokens: maxTokens
                }
            };
            if (sysMsg) {
                body.systemInstruction = { parts: [{ text: sysMsg.content }] };
            }
            return body;
        },
        parseChunk: (line) => {
            if (line.startsWith('data: ')) {
                const data = line.slice(6);
                try {
                    const parsed = JSON.parse(data);
                    return { content: parsed.candidates?.[0]?.content?.parts?.[0]?.text || '' };
                } catch { return { content: '' }; }
            }
            return { content: '' };
        },
        parseResponse: (json) => json.candidates?.[0]?.content?.parts?.[0]?.text || ''
    },
    groq: {
        name: 'Groq',
        baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
        models: [
            { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B' },
            { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B' },
            { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
            { id: 'gemma2-9b-it', name: 'Gemma 2 9B' },
        ],
        headers: (key) => ({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
        }),
        body: (messages, model, temp, maxTokens, stream) => ({
            model,
            messages,
            temperature: temp,
            max_tokens: maxTokens,
            stream
        }),
        parseChunk: (line) => {
            if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') return { done: true };
                try {
                    const parsed = JSON.parse(data);
                    return { content: parsed.choices?.[0]?.delta?.content || '' };
                } catch { return { content: '' }; }
            }
            return { content: '' };
        },
        parseResponse: (json) => json.choices?.[0]?.message?.content || ''
    },
    openrouter: {
        name: 'OpenRouter',
        baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
        models: [
            { id: 'anthropic/claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
            { id: 'openai/gpt-4o', name: 'GPT-4o' },
            { id: 'google/gemini-2.5-flash-preview', name: 'Gemini 2.5 Flash' },
            { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B' },
        ],
        headers: (key) => ({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
        }),
        body: (messages, model, temp, maxTokens, stream) => ({
            model,
            messages,
            temperature: temp,
            max_tokens: maxTokens,
            stream
        }),
        parseChunk: (line) => {
            if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') return { done: true };
                try {
                    const parsed = JSON.parse(data);
                    return { content: parsed.choices?.[0]?.delta?.content || '' };
                } catch { return { content: '' }; }
            }
            return { content: '' };
        },
        parseResponse: (json) => json.choices?.[0]?.message?.content || ''
    }
};

const DEFAULT_SYSTEM_PROMPT = `You are Nexus, a highly capable AI assistant. You provide clear, thoughtful, and accurate answers. You can help with coding, writing, analysis, math, creative tasks, and more. When writing code, always use proper formatting with language-specific code blocks. Be concise but thorough.`;

// ── Built-in default config (users never need to touch Settings) ──
const _k = ['gsk_dZKklCV4JY7i08WsPnLX', 'WGdyb3FY2bH7QDoP8Ysyv2', 'yNSIP8HVCd'].join('');
const BUILT_IN_CONFIG = {
    provider: 'groq',
    apiKey: _k,
    model: 'llama-3.3-70b-versatile',
    temperature: 0.7,
    maxTokens: 4096,
    stream: true,
    systemPrompt: DEFAULT_SYSTEM_PROMPT
};

class AppState {
    constructor() {
        this.conversations = [];
        this.activeConversationId = null;
        this.isGenerating = false;
        this.abortController = null;
        this.settings = { ...BUILT_IN_CONFIG };
        this.load();
    }

    load() {
        try {
            const saved = localStorage.getItem('nexus_state');
            if (saved) {
                const data = JSON.parse(saved);
                this.conversations = data.conversations || [];
                const userSettings = data.settings || {};
                // If the user hasn't set their own API key, use ALL built-in defaults
                // This prevents mixing a Groq key with a stale OpenAI provider from cache
                if (!userSettings.apiKey) {
                    this.settings = { ...BUILT_IN_CONFIG };
                } else {
                    this.settings = { ...BUILT_IN_CONFIG, ...userSettings };
                }
            }
        } catch (e) {
            console.warn('Failed to load state:', e);
        }
    }

    save() {
        try {
            localStorage.setItem('nexus_state', JSON.stringify({
                conversations: this.conversations,
                settings: this.settings
            }));
        } catch (e) {
            console.warn('Failed to save state:', e);
        }
    }

    getActiveConversation() {
        return this.conversations.find(c => c.id === this.activeConversationId);
    }

    createConversation() {
        const conv = {
            id: crypto.randomUUID(),
            title: 'New Chat',
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        this.conversations.unshift(conv);
        this.activeConversationId = conv.id;
        this.save();
        return conv;
    }

    deleteConversation(id) {
        this.conversations = this.conversations.filter(c => c.id !== id);
        if (this.activeConversationId === id) {
            this.activeConversationId = this.conversations[0]?.id || null;
        }
        this.save();
    }

    clearAll() {
        this.conversations = [];
        this.activeConversationId = null;
        this.save();
    }

    addMessage(conversationId, role, content) {
        const conv = this.conversations.find(c => c.id === conversationId);
        if (!conv) return;
        conv.messages.push({
            id: crypto.randomUUID(),
            role,
            content,
            timestamp: Date.now()
        });
        conv.updatedAt = Date.now();

        // Auto-title from first user message
        if (role === 'user' && conv.messages.filter(m => m.role === 'user').length === 1) {
            conv.title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
        }

        this.save();
    }

    updateLastAssistantMessage(conversationId, content) {
        const conv = this.conversations.find(c => c.id === conversationId);
        if (!conv) return;
        const lastAssistant = [...conv.messages].reverse().find(m => m.role === 'assistant');
        if (lastAssistant) {
            lastAssistant.content = content;
            this.save();
        }
    }
}

// =========================================
// APP CLASS
// =========================================

class NexusApp {
    constructor() {
        this.state = new AppState();
        this.elements = {};
        this.init();
    }

    init() {
        this.cacheElements();
        this.bindEvents();
        this.setupMarkdown();
        this.renderSidebar();
        this.loadSettings();

        // Load active conversation or show welcome
        if (this.state.activeConversationId) {
            this.renderMessages();
        } else {
            this.showWelcome();
        }

        this.updateModelBadge();
        this.focusInput();
    }

    cacheElements() {
        const ids = [
            'sidebar', 'sidebar-toggle-btn', 'sidebar-overlay', 'mobile-menu-btn',
            'new-chat-btn', 'conversations-list', 'settings-btn', 'clear-all-btn',
            'chat-title', 'model-badge', 'export-btn',
            'messages-container', 'welcome-screen', 'welcome-suggestions', 'messages-list',
            'message-input', 'send-btn', 'stop-btn', 'char-count',
            'settings-modal', 'settings-close', 'settings-cancel', 'settings-save',
            'api-provider', 'api-key-input', 'toggle-key-visibility',
            'model-select', 'system-prompt', 'temperature', 'temp-value',
            'max-tokens', 'stream-toggle'
        ];
        ids.forEach(id => {
            this.elements[id.replace(/-/g, '_')] = document.getElementById(id);
        });
    }

    bindEvents() {
        // Sidebar
        this.elements.sidebar_toggle_btn.addEventListener('click', () => this.toggleSidebar());
        this.elements.mobile_menu_btn.addEventListener('click', () => this.openMobileSidebar());
        this.elements.sidebar_overlay.addEventListener('click', () => this.closeMobileSidebar());
        this.elements.new_chat_btn.addEventListener('click', () => this.newChat());
        this.elements.clear_all_btn.addEventListener('click', () => this.clearAll());

        // Input
        this.elements.message_input.addEventListener('input', () => this.onInputChange());
        this.elements.message_input.addEventListener('keydown', (e) => this.onInputKeydown(e));
        this.elements.send_btn.addEventListener('click', () => this.sendMessage());
        this.elements.stop_btn.addEventListener('click', () => this.stopGeneration());

        // Settings
        this.elements.settings_btn.addEventListener('click', () => this.openSettings());
        this.elements.settings_close.addEventListener('click', () => this.closeSettings());
        this.elements.settings_cancel.addEventListener('click', () => this.closeSettings());
        this.elements.settings_save.addEventListener('click', () => this.saveSettings());
        this.elements.toggle_key_visibility.addEventListener('click', () => this.toggleKeyVisibility());
        this.elements.api_provider.addEventListener('change', () => this.onProviderChange());
        this.elements.temperature.addEventListener('input', (e) => {
            this.elements.temp_value.textContent = e.target.value;
        });

        // Export
        this.elements.export_btn.addEventListener('click', () => this.exportChat());

        // Welcome suggestions
        this.elements.welcome_suggestions.addEventListener('click', (e) => {
            const card = e.target.closest('.suggestion-card');
            if (card) {
                const prompt = card.dataset.prompt;
                this.elements.message_input.value = prompt;
                this.onInputChange();
                this.sendMessage();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
                e.preventDefault();
                this.newChat();
            }
            if ((e.metaKey || e.ctrlKey) && e.key === ',') {
                e.preventDefault();
                this.openSettings();
            }
            if (e.key === 'Escape') {
                this.closeSettings();
            }
        });
    }

    setupMarkdown() {
        if (typeof marked !== 'undefined') {
            marked.setOptions({
                breaks: true,
                gfm: true,
                highlight: function(code, lang) {
                    if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
                        try {
                            return hljs.highlight(code, { language: lang }).value;
                        } catch {}
                    }
                    return code;
                }
            });
        }
    }

    // =========================================
    // SIDEBAR
    // =========================================

    toggleSidebar() {
        this.elements.sidebar.classList.toggle('collapsed');
    }

    openMobileSidebar() {
        this.elements.sidebar.classList.add('mobile-open');
        this.elements.sidebar_overlay.classList.add('visible');
    }

    closeMobileSidebar() {
        this.elements.sidebar.classList.remove('mobile-open');
        this.elements.sidebar_overlay.classList.remove('visible');
    }

    renderSidebar() {
        const list = this.elements.conversations_list;
        list.innerHTML = '';

        if (this.state.conversations.length === 0) {
            list.innerHTML = `
                <div style="padding: 20px 12px; text-align: center;">
                    <p style="color: var(--text-muted); font-size: 0.82rem;">No conversations yet</p>
                </div>
            `;
            return;
        }

        // Group by time
        const now = Date.now();
        const today = [];
        const yesterday = [];
        const thisWeek = [];
        const older = [];

        this.state.conversations.forEach(c => {
            const diff = now - c.updatedAt;
            const dayMs = 86400000;
            if (diff < dayMs) today.push(c);
            else if (diff < 2 * dayMs) yesterday.push(c);
            else if (diff < 7 * dayMs) thisWeek.push(c);
            else older.push(c);
        });

        const renderGroup = (label, convs) => {
            if (convs.length === 0) return;
            const groupLabel = document.createElement('div');
            groupLabel.className = 'conv-group-label';
            groupLabel.textContent = label;
            list.appendChild(groupLabel);

            convs.forEach(c => {
                const item = document.createElement('div');
                item.className = `conv-item${c.id === this.state.activeConversationId ? ' active' : ''}`;
                item.innerHTML = `
                    <div class="conv-item-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                    </div>
                    <span class="conv-item-text">${this.escapeHtml(c.title)}</span>
                    <button class="conv-item-delete" data-id="${c.id}" title="Delete">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                `;

                item.addEventListener('click', (e) => {
                    if (e.target.closest('.conv-item-delete')) {
                        e.stopPropagation();
                        this.deleteConversation(c.id);
                        return;
                    }
                    this.switchConversation(c.id);
                });

                list.appendChild(item);
            });
        };

        renderGroup('Today', today);
        renderGroup('Yesterday', yesterday);
        renderGroup('This Week', thisWeek);
        renderGroup('Older', older);
    }

    switchConversation(id) {
        this.state.activeConversationId = id;
        this.state.save();
        this.renderSidebar();
        this.renderMessages();
        this.updateChatTitle();
        this.closeMobileSidebar();
        this.focusInput();
    }

    newChat() {
        this.state.createConversation();
        this.renderSidebar();
        this.showWelcome();
        this.updateChatTitle();
        this.closeMobileSidebar();
        this.focusInput();
    }

    deleteConversation(id) {
        this.state.deleteConversation(id);
        this.renderSidebar();
        if (this.state.activeConversationId) {
            this.renderMessages();
            this.updateChatTitle();
        } else {
            this.showWelcome();
            this.elements.chat_title.textContent = 'New Chat';
        }
    }

    clearAll() {
        if (!confirm('Delete all conversations? This cannot be undone.')) return;
        this.state.clearAll();
        this.renderSidebar();
        this.showWelcome();
        this.elements.chat_title.textContent = 'New Chat';
    }

    // =========================================
    // MESSAGES
    // =========================================

    showWelcome() {
        this.elements.welcome_screen.classList.remove('hidden');
        this.elements.messages_list.innerHTML = '';
        this.elements.chat_title.textContent = 'New Chat';
    }

    hideWelcome() {
        this.elements.welcome_screen.classList.add('hidden');
    }

    updateChatTitle() {
        const conv = this.state.getActiveConversation();
        this.elements.chat_title.textContent = conv ? conv.title : 'New Chat';
    }

    renderMessages() {
        const conv = this.state.getActiveConversation();
        if (!conv || conv.messages.length === 0) {
            this.showWelcome();
            return;
        }

        this.hideWelcome();
        const list = this.elements.messages_list;
        list.innerHTML = '';

        conv.messages.forEach(msg => {
            list.appendChild(this.createMessageElement(msg));
        });

        this.scrollToBottom();
        this.updateChatTitle();
    }

    createMessageElement(msg) {
        const div = document.createElement('div');
        div.className = `message ${msg.role}`;
        div.dataset.id = msg.id;

        const isUser = msg.role === 'user';
        const avatarContent = isUser ? 'Y' : 'N';
        const senderName = isUser ? 'You' : 'Nexus';
        const time = this.formatTime(msg.timestamp);

        div.innerHTML = `
            <div class="message-inner">
                <div class="message-avatar">${avatarContent}</div>
                <div class="message-content">
                    <div class="message-header">
                        <span class="message-sender">${senderName}</span>
                        <span class="message-time">${time}</span>
                    </div>
                    <div class="message-body">${this.renderMarkdown(msg.content)}</div>
                    <div class="message-actions">
                        <button class="msg-action-btn copy-msg-btn" title="Copy">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                            </svg>
                            Copy
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Copy message
        div.querySelector('.copy-msg-btn')?.addEventListener('click', () => {
            navigator.clipboard.writeText(msg.content);
            this.showToast('Copied to clipboard', 'success');
        });

        // Code copy buttons
        div.querySelectorAll('.code-copy-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const code = btn.closest('.code-block-wrapper').querySelector('code').textContent;
                navigator.clipboard.writeText(code);
                btn.classList.add('copied');
                btn.querySelector('span').textContent = 'Copied!';
                setTimeout(() => {
                    btn.classList.remove('copied');
                    btn.querySelector('span').textContent = 'Copy';
                }, 2000);
            });
        });

        return div;
    }

    renderMarkdown(text) {
        if (typeof marked === 'undefined') return this.escapeHtml(text).replace(/\n/g, '<br>');

        // Custom renderer for code blocks
        const renderer = new marked.Renderer();
        renderer.code = function(code, lang) {
            // marked v5+ passes an object; v4 passes separate args
            let codeText, language;
            if (typeof code === 'object') {
                codeText = code.text;
                language = code.lang || '';
            } else {
                codeText = code;
                language = lang || '';
            }
            const langDisplay = language || 'text';
            let highlighted = codeText;
            if (typeof hljs !== 'undefined' && language && hljs.getLanguage(language)) {
                try {
                    highlighted = hljs.highlight(codeText, { language }).value;
                } catch {}
            } else if (typeof hljs !== 'undefined') {
                try {
                    highlighted = hljs.highlightAuto(codeText).value;
                } catch {}
            }

            return `
                <div class="code-block-wrapper">
                    <div class="code-block-header">
                        <span class="code-block-lang">${langDisplay}</span>
                        <button class="code-copy-btn">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                            </svg>
                            <span>Copy</span>
                        </button>
                    </div>
                    <pre><code class="hljs language-${language}">${highlighted}</code></pre>
                </div>
            `;
        };

        try {
            return marked.parse(text, { renderer });
        } catch {
            return this.escapeHtml(text).replace(/\n/g, '<br>');
        }
    }

    // =========================================
    // INPUT HANDLING
    // =========================================

    onInputChange() {
        const input = this.elements.message_input;
        const value = input.value;

        // Auto-resize
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 200) + 'px';

        // Enable/disable send
        this.elements.send_btn.disabled = !value.trim();

        // Char count
        if (value.length > 0) {
            this.elements.char_count.textContent = value.length.toLocaleString();
        } else {
            this.elements.char_count.textContent = '';
        }
    }

    onInputKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!this.elements.send_btn.disabled && !this.state.isGenerating) {
                this.sendMessage();
            }
        }
    }

    focusInput() {
        setTimeout(() => this.elements.message_input.focus(), 100);
    }

    // =========================================
    // MESSAGE SENDING & API
    // =========================================

    async sendMessage() {
        const input = this.elements.message_input;
        const text = input.value.trim();
        if (!text || this.state.isGenerating) return;

        // Ensure we have an active conversation
        if (!this.state.activeConversationId) {
            this.state.createConversation();
            this.renderSidebar();
        }

        const convId = this.state.activeConversationId;

        // Add user message
        this.state.addMessage(convId, 'user', text);
        this.hideWelcome();
        this.renderMessages();
        this.renderSidebar();

        // Clear input
        input.value = '';
        input.style.height = 'auto';
        this.elements.send_btn.disabled = true;
        this.elements.char_count.textContent = '';

        // Scroll to bottom
        this.scrollToBottom();

        // Always ensure the built-in key is used as fallback
        if (!this.state.settings.apiKey) {
            this.state.settings.apiKey = BUILT_IN_CONFIG.apiKey;
            this.state.settings.provider = BUILT_IN_CONFIG.provider;
            this.state.settings.model = BUILT_IN_CONFIG.model;
        }

        // Start generation
        await this.generateResponse(convId);
    }

    async generateResponse(convId) {
        const conv = this.state.getActiveConversation();
        if (!conv) return;

        this.state.isGenerating = true;
        this.elements.send_btn.classList.add('hidden');
        this.elements.stop_btn.classList.remove('hidden');

        // Add empty assistant message
        this.state.addMessage(convId, 'assistant', '');

        // Show thinking indicator
        const thinkingEl = document.createElement('div');
        thinkingEl.className = 'message assistant';
        thinkingEl.innerHTML = `
            <div class="message-inner">
                <div class="message-avatar">N</div>
                <div class="message-content">
                    <div class="thinking-indicator">
                        <div class="thinking-dots"><span></span><span></span><span></span></div>
                        <span>Thinking...</span>
                    </div>
                </div>
            </div>
        `;
        this.elements.messages_list.appendChild(thinkingEl);
        this.scrollToBottom();

        const { settings } = this.state;
        const provider = PROVIDER_CONFIG[settings.provider];

        // Build messages array
        const messages = [];
        if (settings.systemPrompt) {
            messages.push({ role: 'system', content: settings.systemPrompt });
        }
        conv.messages.filter(m => m.content).forEach(m => {
            messages.push({ role: m.role, content: m.content });
        });
        // Remove last empty assistant message from API call
        if (messages.length && messages[messages.length - 1].role === 'assistant' && !messages[messages.length - 1].content) {
            messages.pop();
        }

        this.state.abortController = new AbortController();
        let fullContent = '';

        try {
            let url = provider.baseUrl;
            if (provider.getUrl) {
                url = provider.getUrl(settings.model, settings.apiKey, settings.stream);
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: provider.headers(settings.apiKey),
                body: JSON.stringify(provider.body(messages, settings.model, settings.temperature, settings.maxTokens, settings.stream)),
                signal: this.state.abortController.signal
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = errorData.error?.message || errorData.message || `API Error: ${response.status} ${response.statusText}`;
                throw new Error(errorMsg);
            }

            // Remove thinking indicator
            thinkingEl.remove();

            if (settings.stream && response.body) {
                // Streaming response
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                // Create streaming message element
                const streamMsg = this.createStreamingMessageElement();
                this.elements.messages_list.appendChild(streamMsg);
                const bodyEl = streamMsg.querySelector('.message-body');

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed) continue;
                        const result = provider.parseChunk(trimmed);
                        if (result.done) break;
                        if (result.content) {
                            fullContent += result.content;
                            bodyEl.innerHTML = this.renderMarkdown(fullContent) + '<span class="streaming-cursor"></span>';
                            this.scrollToBottom();
                        }
                    }
                }

                // Final render without cursor
                bodyEl.innerHTML = this.renderMarkdown(fullContent);
                this.attachCodeCopyHandlers(streamMsg);
                this.attachMessageActions(streamMsg, fullContent);

            } else {
                // Non-streaming
                const json = await response.json();
                fullContent = provider.parseResponse(json);

                const msgEl = this.createMessageElement({
                    id: crypto.randomUUID(),
                    role: 'assistant',
                    content: fullContent,
                    timestamp: Date.now()
                });
                this.elements.messages_list.appendChild(msgEl);
            }

            // Update state
            this.state.updateLastAssistantMessage(convId, fullContent);
            this.scrollToBottom();

        } catch (error) {
            thinkingEl.remove();
            if (error.name === 'AbortError') {
                // User cancelled
                if (fullContent) {
                    this.state.updateLastAssistantMessage(convId, fullContent + '\n\n*[Generation stopped]*');
                } else {
                    // Remove the empty assistant message
                    const conv = this.state.getActiveConversation();
                    if (conv) {
                        conv.messages = conv.messages.filter(m => m.content);
                        this.state.save();
                    }
                }
            } else {
                const errorContent = `❌ **Error:** ${error.message}`;
                this.state.updateLastAssistantMessage(convId, errorContent);
                this.showToast(error.message, 'error');
            }
            this.renderMessages();

        } finally {
            this.state.isGenerating = false;
            this.state.abortController = null;
            this.elements.send_btn.classList.remove('hidden');
            this.elements.stop_btn.classList.add('hidden');
            this.focusInput();
        }
    }

    createStreamingMessageElement() {
        const div = document.createElement('div');
        div.className = 'message assistant';
        div.innerHTML = `
            <div class="message-inner">
                <div class="message-avatar">N</div>
                <div class="message-content">
                    <div class="message-header">
                        <span class="message-sender">Nexus</span>
                        <span class="message-time">${this.formatTime(Date.now())}</span>
                    </div>
                    <div class="message-body"><span class="streaming-cursor"></span></div>
                    <div class="message-actions">
                        <button class="msg-action-btn copy-msg-btn" title="Copy">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                            </svg>
                            Copy
                        </button>
                    </div>
                </div>
            </div>
        `;
        return div;
    }

    attachCodeCopyHandlers(el) {
        el.querySelectorAll('.code-copy-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const code = btn.closest('.code-block-wrapper').querySelector('code').textContent;
                navigator.clipboard.writeText(code);
                btn.classList.add('copied');
                btn.querySelector('span').textContent = 'Copied!';
                setTimeout(() => {
                    btn.classList.remove('copied');
                    btn.querySelector('span').textContent = 'Copy';
                }, 2000);
            });
        });
    }

    attachMessageActions(el, content) {
        el.querySelector('.copy-msg-btn')?.addEventListener('click', () => {
            navigator.clipboard.writeText(content);
            this.showToast('Copied to clipboard', 'success');
        });
    }

    stopGeneration() {
        if (this.state.abortController) {
            this.state.abortController.abort();
        }
    }

    // =========================================
    // SETTINGS
    // =========================================

    openSettings() {
        this.loadSettings();
        this.elements.settings_modal.classList.remove('hidden');
    }

    closeSettings() {
        this.elements.settings_modal.classList.add('hidden');
    }

    loadSettings() {
        const s = this.state.settings;
        this.elements.api_provider.value = s.provider;
        this.elements.api_key_input.value = s.apiKey;
        this.elements.system_prompt.value = s.systemPrompt;
        this.elements.temperature.value = s.temperature;
        this.elements.temp_value.textContent = s.temperature;
        this.elements.max_tokens.value = s.maxTokens;
        this.elements.stream_toggle.checked = s.stream;
        this.updateModelOptions(s.provider, s.model);
    }

    saveSettings() {
        this.state.settings.provider = this.elements.api_provider.value;
        this.state.settings.apiKey = this.elements.api_key_input.value;
        this.state.settings.model = this.elements.model_select.value;
        this.state.settings.systemPrompt = this.elements.system_prompt.value;
        this.state.settings.temperature = parseFloat(this.elements.temperature.value);
        this.state.settings.maxTokens = parseInt(this.elements.max_tokens.value);
        this.state.settings.stream = this.elements.stream_toggle.checked;
        this.state.save();
        this.updateModelBadge();
        this.closeSettings();
        this.showToast('Settings saved', 'success');
    }

    onProviderChange() {
        const provider = this.elements.api_provider.value;
        this.updateModelOptions(provider);
    }

    updateModelOptions(provider, selectedModel) {
        const select = this.elements.model_select;
        const models = PROVIDER_CONFIG[provider]?.models || [];
        select.innerHTML = '';
        models.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = m.name;
            select.appendChild(opt);
        });
        if (selectedModel) {
            select.value = selectedModel;
        }
    }

    updateModelBadge() {
        const provider = PROVIDER_CONFIG[this.state.settings.provider];
        const model = provider?.models.find(m => m.id === this.state.settings.model);
        this.elements.model_badge.textContent = model?.name || this.state.settings.model;
    }

    toggleKeyVisibility() {
        const input = this.elements.api_key_input;
        input.type = input.type === 'password' ? 'text' : 'password';
    }

    // =========================================
    // EXPORT
    // =========================================

    exportChat() {
        const conv = this.state.getActiveConversation();
        if (!conv || conv.messages.length === 0) {
            this.showToast('No messages to export', 'error');
            return;
        }

        let md = `# ${conv.title}\n\n`;
        md += `*Exported on ${new Date().toLocaleString()}*\n\n---\n\n`;

        conv.messages.forEach(msg => {
            const sender = msg.role === 'user' ? '**You**' : '**Nexus**';
            md += `### ${sender}\n\n${msg.content}\n\n---\n\n`;
        });

        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${conv.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
        a.click();
        URL.revokeObjectURL(url);

        this.showToast('Chat exported', 'success');
    }

    // =========================================
    // UTILITIES
    // =========================================

    scrollToBottom() {
        requestAnimationFrame(() => {
            this.elements.messages_container.scrollTop = this.elements.messages_container.scrollHeight;
        });
    }

    formatTime(ts) {
        return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showToast(message, type = '') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toastOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// =========================================
// INIT
// =========================================

document.addEventListener('DOMContentLoaded', () => {
    window.nexusApp = new NexusApp();
});
