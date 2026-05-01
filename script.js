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
                <p class="full-description">${idea.full_description}</p>
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
