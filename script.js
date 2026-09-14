document.addEventListener('DOMContentLoaded', () => {
    const ideasContainer = document.getElementById('ideas-container');
    const modal = document.getElementById('idea-modal');
    const modalBody = document.getElementById('modal-body');
    const closeButton = document.querySelector('.close-button');

    // Lightbox elements
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = document.querySelector('.lightbox-close');

    // Hide lightbox initially (fix for display: flex in CSS)
    if (lightbox) lightbox.style.display = 'none';

    // Load ideas from JSON
    fetch('ideas.json')
        .then(response => response.json())
        .then(ideas => {
            renderIdeas(ideas);
        })
        .catch(error => {
            console.error('Error loading ideas:', error);
            ideasContainer.innerHTML = '<p class="loading">No ideas found. Start by adding one to ideas.json.</p>';
        });

    // Descriptions live as markdown in descriptions/<id>.md rather than inside
    // ideas.json, so long prose can be written and diffed as ordinary text. This
    // renderer covers exactly what those files use — headings, lists, emphasis,
    // inline code and links — which keeps the page dependency-free.
    const descriptionCache = {};
    let openIdeaId = null;

    function escapeHtml(text) {
        return String(text).replace(/[&<>"']/g, (c) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    function renderInline(text) {
        // Code spans are lifted out first so their contents are never re-read as
        // emphasis: `a**b**` is code, not a bold run.
        const code = [];
        let html = escapeHtml(text).replace(/`([^`]+)`/g, (m, body) => {
            code.push(body);
            return '\u0000' + (code.length - 1) + '\u0000';
        });
        html = html
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,
                '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
        return html.replace(/\u0000(\d+)\u0000/g, (m, i) => '<code>' + code[i] + '</code>');
    }

    function renderMarkdown(src) {
        const lines = String(src).replace(/\r\n?/g, '\n').split('\n');
        const out = [];
        let paragraph = [];
        let list = null;
        let quote = null;

        const flushParagraph = () => {
            if (!paragraph.length) return;
            out.push('<p>' + renderInline(paragraph.join(' ')) + '</p>');
            paragraph = [];
        };
        const flushList = () => {
            if (!list) return;
            out.push('<' + list.tag + '>'
                + list.items.map(item => '<li>' + renderInline(item) + '</li>').join('')
                + '</' + list.tag + '>');
            list = null;
        };
        const flushQuote = () => {
            if (!quote) return;
            out.push('<blockquote>' + renderInline(quote.join(' ')) + '</blockquote>');
            quote = null;
        };
        const flush = () => { flushParagraph(); flushList(); flushQuote(); };

        lines.forEach(raw => {
            const line = raw.trim();
            if (!line) { flush(); return; }

            const heading = line.match(/^(#{1,4})\s+(.*)$/);
            if (heading) {
                flush();
                // '#' lands on h3 so a description never outranks the modal's own
                // section headings; '##' — what the files actually use — gives h4.
                const level = Math.min(heading[1].length + 2, 6);
                out.push('<h' + level + '>' + renderInline(heading[2]) + '</h' + level + '>');
                return;
            }

            if (/^(-{3,}|\*{3,})$/.test(line)) { flush(); out.push('<hr>'); return; }

            const quoted = line.match(/^>\s?(.*)$/);
            if (quoted) {
                flushParagraph();
                flushList();
                if (!quote) quote = [];
                quote.push(quoted[1]);
                return;
            }
            flushQuote();

            const bullet = line.match(/^[-*]\s+(.*)$/);
            const numbered = line.match(/^\d+\.\s+(.*)$/);
            if (bullet || numbered) {
                flushParagraph();
                const tag = bullet ? 'ul' : 'ol';
                if (!list || list.tag !== tag) { flushList(); list = { tag: tag, items: [] }; }
                list.items.push((bullet || numbered)[1]);
                return;
            }

            // An unmarked line continues whatever block is already open, so a wrapped
            // bullet or a soft-wrapped paragraph stays one block.
            if (list) { list.items[list.items.length - 1] += ' ' + line; return; }
            paragraph.push(line);
        });

        flush();
        return out.join('');
    }

    function loadDescription(id) {
        if (descriptionCache[id]) return Promise.resolve(descriptionCache[id]);
        return fetch('descriptions/' + encodeURIComponent(id) + '.md')
            .then(response => {
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return response.text();
            })
            .then(markdown => { descriptionCache[id] = markdown; return markdown; });
    }

    function renderIdeas(ideas) {
        ideasContainer.innerHTML = '';
        ideas.forEach((idea, index) => {
            const card = document.createElement('div');
            card.className = 'idea-card';
            card.innerHTML = `
                <div class="idea-header">
                    <div class="title-group">
                        <span class="idea-id">${idea.id}</span>
                        <h2 class="idea-title">${idea.title}</h2>
                    </div>
                    <span class="idea-status ${idea.status.toLowerCase().replace(' ', '-')}">${idea.status}</span>
                </div>
                ${idea.images && idea.images.length > 0 ? `<img src="${idea.images[0]}" class="idea-thumbnail" alt="${idea.title}">` : ''}
                <p class="idea-excerpt">${idea.excerpt}</p>
                <div class="idea-footer">Registered: ${idea.timestamp}</div>
            `;
            card.addEventListener('click', () => openModal(idea));
            ideasContainer.appendChild(card);
        });
    }

    function openModal(idea) {
        modalBody.innerHTML = `
            <div class="modal-header">
                <div class="title-group">
                    <span class="idea-id">${idea.id}</span>
                    <h2>${idea.title}</h2>
                </div>
                <div class="idea-status ${idea.status.toLowerCase().replace(' ', '-')}">${idea.status}</div>
            </div>
            
            <div class="modal-section">
                <h3>Description</h3>
                <div class="full-description" data-description>Loading description\u2026</div>
            </div>

            ${idea.images && idea.images.length > 0 ? `
                <div class="modal-section">
                    <h3>Mockups / Screenshots</h3>
                    <div class="image-gallery">
                        ${idea.images.map(img => `<img src="${img}" class="gallery-image" alt="Mockup">`).join('')}
                    </div>
                </div>
            ` : ''}

            <div class="modal-section">
                <h3>Main Features</h3>
                <ul class="feature-list">
                    ${idea.features.map(f => `<li class="feature-item">${f}</li>`).join('')}
                </ul>
            </div>

            <div class="modal-section">
                <h3>Development Stages</h3>
                <div class="stages-container">
                    ${idea.stages.map((s, i) => `
                        <div class="stage-item">
                            <span class="stage-number">0${i + 1}</span>
                            <span class="stage-text">${s}</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="modal-section">
                <h3>Market Analysis</h3>
                <div class="pro-con-list">
                    ${idea.advantages.map(a => `<div class="pro-item"><b>+</b> ${a}</div>`).join('')}
                    ${idea.pitfalls.map(p => `<div class="con-item"><b>-</b> ${p}</div>`).join('')}
                </div>
            </div>

            ${idea.roadmap && idea.roadmap.some(item => !item.done) ? `
            <div class="modal-section">
                <h3>Features to implement</h3>
                <div class="roadmap-container">
                    ${idea.roadmap.filter(item => !item.done).map(item => `
                        <div class="roadmap-item">
                            <span class="roadmap-check">○</span>
                            <div class="roadmap-task-wrap">
                                <span class="roadmap-task">${item.task}</span>
                                ${item.complexity ? `<span class="roadmap-meta">${item.complexity}${item.monetization ? ' · ' + item.monetization : ''}</span>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            ${idea.roadmap && idea.roadmap.some(item => item.done) ? `
            <div class="modal-section">
                <h3>Shipped</h3>
                <div class="roadmap-container">
                    ${idea.roadmap.filter(item => item.done).map(item => `
                        <div class="roadmap-item roadmap-done">
                            <span class="roadmap-check">✓</span>
                            <span class="roadmap-task">${item.task}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            ${idea.links ? `
                <div class="modal-section">
                    <h3>Resources</h3>
                    <ul>
                        ${idea.links.map(link => `<li><a href="${link.url}" target="_blank">${link.label}</a></li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            
            <div class="modal-footer">
                <p class="timestamp">Registered on ${idea.timestamp}</p>
            </div>
        `;
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';

        // The fetch is async, so a fast second click must not let the first
        // description land in the modal that replaced it.
        openIdeaId = idea.id;
        const slot = modalBody.querySelector('[data-description]');
        loadDescription(idea.id)
            .then(markdown => {
                if (openIdeaId !== idea.id || !slot.isConnected) return;
                slot.innerHTML = renderMarkdown(markdown);
            })
            .catch(error => {
                console.error('Error loading description for ' + idea.id + ':', error);
                if (openIdeaId !== idea.id || !slot.isConnected) return;
                slot.innerHTML = '<p class="description-error">Description unavailable.</p>';
            });

        // Add event listeners to gallery images for lightbox
        const images = modalBody.querySelectorAll('.gallery-image, .idea-thumbnail');
        images.forEach(img => {
            img.style.cursor = 'zoom-in';
            img.addEventListener('click', (e) => {
                e.stopPropagation();
                lightboxImg.src = img.src;
                lightbox.style.display = 'flex';
            });
        });
    }

    if (lightbox) {
        lightbox.addEventListener('click', () => {
            lightbox.style.display = 'none';
        });

        lightboxClose.addEventListener('click', (e) => {
            e.stopPropagation();
            lightbox.style.display = 'none';
        });
    }

    closeButton.addEventListener('click', () => {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    });

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });
});
