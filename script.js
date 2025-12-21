document.addEventListener('DOMContentLoaded', function() {
    // Конфигурация - ЗАМЕНИТЕ ЭТИ ЗНАЧЕНИЯ НА СВОИ!
    const config = {
        username: 'Segej-x7',     // Замените на ваш GitHub логин
        repo: 'images',         // Замените на имя репозитория
        folder: 'images',                      // Папка с изображениями
        perPage: 1000,                          // Максимальное количество загружаемых файлов
        token: ''                              // Токен для GitHub API (если нужен)
    };
    
    // Элементы DOM
    const gallery = document.getElementById('gallery');
    const refreshBtn = document.getElementById('refreshBtn');
    const infoDiv = document.getElementById('info');
    const imageModal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const modalCaption = document.getElementById('modalCaption');
    const closeModal = document.querySelector('.close');
    
    // Текущие изображения
    let images = [];
    
    // Инициализация
    checkConfig();
    loadImages();
    
    // Обработчики событий
    refreshBtn.addEventListener('click', loadImages);
    closeModal.addEventListener('click', () => {
        imageModal.style.display = 'none';
    });
    
    // Закрытие модального окна при клике вне изображения
    imageModal.addEventListener('click', (e) => {
        if (e.target === imageModal) {
            imageModal.style.display = 'none';
        }
    });
    
    // Функция проверки конфигурации
    function checkConfig() {
        if (config.username.includes('YOUR_GITHUB_USERNAME') || 
            config.repo.includes('YOUR_REPOSITORY_NAME')) {
            showError('Пожалуйста, настройте конфигурацию в файле script.js: укажите ваш GitHub логин и имя репозитория.');
            return false;
        }
        return true;
    }
    
    // Основная функция загрузки изображений
    async function loadImages() {
        if (!checkConfig()) return;
        
        showLoading();
        infoDiv.textContent = 'Загрузка данных с GitHub...';
        
        try {
            // Получаем список файлов из папки
            const apiUrl = `https://api.github.com/repos/${config.username}/${config.repo}/contents/${config.folder}`;
            
            const response = await fetch(apiUrl, {
                headers: config.token ? {
                    'Authorization': `token ${config.token}`
                } : {}
            });
            
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(`Папка "${config.folder}" не найдена в репозитории. Создайте папку "${config.folder}" и загрузите в неё изображения.`);
                }
                throw new Error(`Ошибка GitHub API: ${response.status} ${response.statusText}`);
            }
            
            const files = await response.json();
            
            // Фильтруем только изображения
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
            images = files.filter(file => 
                !file.name.startsWith('.') && 
                imageExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
            );
            
            if (images.length === 0) {
                showEmptyGallery();
                infoDiv.textContent = `В папке "${config.folder}" нет изображений. Загрузите изображения в репозиторий.`;
                return;
            }
            
            // Получаем историю коммитов для сортировки по дате
            await fetchCommitHistory();
            
            // Сортируем по дате (новые сверху)
            images.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
            
            // Отображаем галерею
            renderGallery();
            
            infoDiv.textContent = `Загружено ${images.length} изображений. Последнее обновление: ${new Date().toLocaleTimeString()}`;
            
        } catch (error) {
            showError(error.message);
            console.error('Ошибка загрузки изображений:', error);
        }
    }
    
    // Функция получения истории коммитов для сортировки
    async function fetchCommitHistory() {
        try {
            // Для каждого изображения получаем последний коммит
            for (const image of images) {
                const commitsUrl = `https://api.github.com/repos/${config.username}/${config.repo}/commits?path=${config.folder}/${image.name}&per_page=1`;
                
                const response = await fetch(commitsUrl, {
                    headers: config.token ? {
                        'Authorization': `token ${config.token}`
                    } : {}
                });
                
                if (response.ok) {
                    const commits = await response.json();
                    if (commits.length > 0) {
                        image.lastModified = commits[0].commit.committer.date;
                        image.author = commits[0].commit.author.name;
                    } else {
                        image.lastModified = image.created_at || new Date().toISOString();
                        image.author = 'Неизвестно';
                    }
                } else {
                    image.lastModified = image.created_at || new Date().toISOString();
                    image.author = 'Неизвестно';
                }
            }
        } catch (error) {
            console.warn('Не удалось получить историю коммитов:', error);
            // Если не удалось получить историю, используем дату создания файла
            images.forEach(image => {
                image.lastModified = image.created_at || new Date().toISOString();
                image.author = 'Неизвестно';
            });
        }
    }
    
    // Функция отрисовки галереи
    function renderGallery() {
        gallery.innerHTML = '';
        
        images.forEach((image, index) => {
            const card = document.createElement('div');
            card.className = 'image-card';
            
            // Форматируем дату
            const date = new Date(image.lastModified);
            const formattedDate = date.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
            
            const time = date.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
            });
            
            // Создаем HTML для карточки
            card.innerHTML = `
                <div class="image-container">
                    <img src="${image.download_url}" 
                         alt="${image.name}" 
                         loading="lazy"
                         data-index="${index}">
                </div>
                <div class="image-info">
                    <div class="image-name">${image.name}</div>
                    <div class="image-link">
                        <span class="link-text" id="link-${index}">${image.download_url}</span>
                        <button class="copy-btn" data-url="${image.download_url}">
                            <i class="fas fa-copy"></i> Копировать
                        </button>
                    </div>
                    <div class="image-meta">
                        <span><i class="far fa-calendar"></i> ${formattedDate}</span>
                        <span><i class="far fa-user"></i> ${image.author || 'Неизвестно'}</span>
                    </div>
                </div>
            `;
            
            gallery.appendChild(card);
            
            // Добавляем обработчик для клика по изображению
            const imgElement = card.querySelector('img');
            imgElement.addEventListener('click', () => openModal(image.download_url, image.name));
            
            // Добавляем обработчик для кнопки копирования
            const copyBtn = card.querySelector('.copy-btn');
            copyBtn.addEventListener('click', () => copyToClipboard(image.download_url, copyBtn));
        });
    }
    
    // Функция открытия модального окна с изображением
    function openModal(imageUrl, imageName) {
        modalImage.src = imageUrl;
        modalCaption.textContent = imageName;
        imageModal.style.display = 'flex';
    }
    
    // Функция копирования ссылки в буфер обмена
    async function copyToClipboard(url, button) {
        try {
            await navigator.clipboard.writeText(url);
            
            // Визуальный фидбек
            const originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-check"></i> Скопировано!';
            button.style.backgroundColor = '#27ae60';
            
            setTimeout(() => {
                button.innerHTML = originalText;
                button.style.backgroundColor = '';
            }, 2000);
            
        } catch (err) {
            console.error('Ошибка копирования:', err);
            alert('Не удалось скопировать ссылку. Скопируйте её вручную.');
        }
    }
    
    // Функция показа состояния загрузки
    function showLoading() {
        gallery.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i> Загрузка изображений...
            </div>
        `;
    }
    
    // Функция показа пустой галереи
    function showEmptyGallery() {
        gallery.innerHTML = `
            <div class="empty">
                <i class="far fa-folder-open"></i>
                <h3>Галерея пуста</h3>
                <p>Загрузите изображения в папку "${config.folder}" вашего репозитория GitHub.</p>
                <p>Убедитесь, что в файле script.js указаны правильные имя пользователя и репозитория.</p>
            </div>
        `;
    }
    
    // Функция показа ошибки
    function showError(message) {
        gallery.innerHTML = `
            <div class="empty">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Произошла ошибка</h3>
                <p>${message}</p>
                <p>Проверьте конфигурацию и подключение к интернету.</p>
            </div>
        `;
        infoDiv.textContent = 'Ошибка загрузки данных';
    }
});