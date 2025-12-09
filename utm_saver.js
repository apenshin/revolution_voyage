/**
 * Simple UTM Saver v1.0
 * Минимальное решение для сохранения UTM меток с первого захода
 * и добавления их в форму как скрытые поля
 */

(function() {
    'use strict';
    
    // Конфигурация
    const CONFIG = {
        storageKey: 'utm_first_visit',  // Ключ для хранения в localStorage
        cookieName: 'utm_data',         // Ключ для хранения в cookie (резерв)
        expiryDays: 30,                 // Сколько дней хранить данные
        paramsToTrack: [                // Какие параметры отслеживать
            'utm_source',
            'utm_medium',
            'utm_campaign',
            'utm_term',
            'utm_content',
            'gclid',
            'yclid',
            'fbclid'
        ]
    };
    
    // Основная функция
    function initUTMSaver() {
        // 1. Получаем UTM параметры из URL
        const urlParams = new URLSearchParams(window.location.search);
        const utmFromURL = {};
        
        // 2. Собираем UTM из текущего URL
        CONFIG.paramsToTrack.forEach(param => {
            const value = urlParams.get(param);
            if (value) {
                utmFromURL[param] = cleanValue(value);
            }
        });
        
        // 3. Если есть UTM в URL - сохраняем
        if (Object.keys(utmFromURL).length > 0) {
            saveUTMData(utmFromURL);
        }
        
        // 4. Добавляем UTM поля во все формы на странице
        addUTMFieldsToForms();
    }
    
    // Сохраняем UTM данные
    function saveUTMData(utmData) {
        // Добавляем дополнительную информацию
        const fullData = {
            ...utmData,
            landing_page: window.location.href,
            first_visit_date: new Date().toISOString().split('T')[0],
            first_visit_time: new Date().toISOString(),
            referrer: document.referrer || ''
        };
        
        // Сохраняем в localStorage (основное хранилище)
        try {
            localStorage.setItem(CONFIG.storageKey, JSON.stringify(fullData));
            console.log('UTM данные сохранены в localStorage:', fullData);
        } catch (e) {
            console.log('Не удалось сохранить в localStorage, используем cookie');
            saveToCookie(fullData);
        }
    }
    
    // Сохраняем в cookie (резервный метод)
    function saveToCookie(data) {
        const expires = new Date();
        expires.setDate(expires.getDate() + CONFIG.expiryDays);
        
        const cookieValue = encodeURIComponent(JSON.stringify(data));
        document.cookie = `${CONFIG.cookieName}=${cookieValue}; expires=${expires.toUTCString()}; path=/`;
    }
    
    // Получаем сохраненные UTM данные
    function getSavedUTMData() {
        // Пробуем получить из localStorage
        try {
            const saved = localStorage.getItem(CONFIG.storageKey);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            // Если не получилось из localStorage, пробуем из cookie
            const cookieData = getFromCookie();
            if (cookieData) {
                // Сохраняем в localStorage для будущего использования
                try {
                    localStorage.setItem(CONFIG.storageKey, JSON.stringify(cookieData));
                } catch (e) {}
                return cookieData;
            }
        }
        
        return null;
    }
    
    // Получаем данные из cookie
    function getFromCookie() {
        const name = CONFIG.cookieName + '=';
        const decodedCookie = decodeURIComponent(document.cookie);
        const cookies = decodedCookie.split(';');
        
        for (let cookie of cookies) {
            while (cookie.charAt(0) === ' ') {
                cookie = cookie.substring(1);
            }
            if (cookie.indexOf(name) === 0) {
                try {
                    return JSON.parse(cookie.substring(name.length));
                } catch (e) {
                    return null;
                }
            }
        }
        return null;
    }
    
    // Добавляем UTM поля в формы
    function addUTMFieldsToForms() {
        // Получаем сохраненные UTM данные
        const utmData = getSavedUTMData();
        
        if (!utmData) {
            console.log('Нет сохраненных UTM данных');
            return;
        }
        
        // Находим все формы на странице
        const forms = document.querySelectorAll('form');
        
        forms.forEach(form => {
            // Не добавляем к формам, которые этого не хотят
            if (form.hasAttribute('data-no-utm')) {
                return;
            }
            
            // Добавляем скрытые поля для каждого UTM параметра
            Object.entries(utmData).forEach(([key, value]) => {
                if (value && shouldAddField(key)) {
                    addHiddenField(form, key, value);
                }
            });
            
            console.log('UTM поля добавлены в форму:', form);
        });
    }
    
    // Добавляем скрытое поле в форму
    function addHiddenField(form, name, value) {
        // Проверяем, не существует ли уже такое поле
        const existingField = form.querySelector(`[name="${name}"]`);
        if (existingField) {
            existingField.value = value;
            return;
        }
        const fieldWrapper = document.createElement('div');
        fieldWrapper.setAttribute('data-type-field', 'text');
        
        fieldWrapper.className = 'form__field utm-field';
        
        
        // Создаем новое скрытое поле
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        
        / Добавляем input в div
        fieldWrapper.appendChild(input);
                    
        // Добавляем div в форму
        form.appendChild(fieldWrapper);
    }
    
    // Проверяем, нужно ли добавлять это поле
    function shouldAddField(fieldName) {
        // Добавляем UTM параметры и некоторые системные поля
        return CONFIG.paramsToTrack.includes(fieldName) ||
               fieldName === 'landing_page' ||
               fieldName === 'first_visit_date' ||
               fieldName === 'referrer';
    }
    
    // Очищаем значение
    function cleanValue(value) {
        if (typeof value !== 'string') {
            value = String(value);
        }
        
        // Удаляем опасные символы и ограничиваем длину
        return value
            .replace(/[<>"'`]/g, '')
            .substring(0, 200)
            .trim();
    }
    
    // Инициализируем при загрузке страницы
    document.addEventListener('DOMContentLoaded', initUTMSaver);
    
    // Экспортируем функции для ручного использования
    window.UTMSaver = {
        // Принудительно сохранить UTM из текущего URL
        saveFromURL: function() {
            const urlParams = new URLSearchParams(window.location.search);
            const utmFromURL = {};
            
            CONFIG.paramsToTrack.forEach(param => {
                const value = urlParams.get(param);
                if (value) {
                    utmFromURL[param] = cleanValue(value);
                }
            });
            
            if (Object.keys(utmFromURL).length > 0) {
                saveUTMData(utmFromURL);
                return true;
            }
            return false;
        },
        
        // Получить сохраненные UTM данные
        getData: getSavedUTMData,
        
        // Добавить UTM поля в конкретную форму
        attachToForm: function(formId) {
            const form = document.getElementById(formId);
            if (!form) {
                console.log('Форма не найдена:', formId);
                return false;
            }
            
            const utmData = getSavedUTMData();
            if (!utmData) {
                console.log('Нет UTM данных для добавления');
                return false;
            }
            
            Object.entries(utmData).forEach(([key, value]) => {
                if (value && shouldAddField(key)) {
                    addHiddenField(form, key, value);
                }
            });
            
            console.log('UTM поля добавлены в форму:', formId);
            return true;
        },
        
        // Очистить сохраненные UTM данные
        clear: function() {
            try {
                localStorage.removeItem(CONFIG.storageKey);
                document.cookie = `${CONFIG.cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                console.log('UTM данные очищены');
                return true;
            } catch (e) {
                console.log('Ошибка при очистке UTM данных:', e);
                return false;
            }
        }
    };
    
})();
