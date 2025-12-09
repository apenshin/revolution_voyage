(function() {
            'use strict';
            
            // Конфигурация UTM параметров и их CSS классов
            const UTM_CONFIG = {
                // Соответствие между CSS классами и UTM параметрами
                fieldClasses: {
                    // Основные UTM
                    'input-utm_source': 'utm_source',
                    'input-utm_medium': 'utm_medium',
                    'input-utm_campaign': 'utm_campaign',
                    'input-utm_term': 'utm_term',
                    'input-utm_content': 'utm_content',
                    
                    // Рекламные системы
                    'input-gclid': 'gclid',
                    'input-yclid': 'yclid',
                    'input-fbclid': 'fbclid',
                    
                    // Дополнительные поля
                    'input-landing_page': 'landing_url',
                    'input-referrer': 'referrer_url',
                    'input-session_id': 'session_id'
                },
                
                storageKey: 'utm_simple_data',
                expiryDays: 30
            };
            
            // Функция для сохранения UTM из URL
            function saveUTMFromURL() {
                const urlParams = new URLSearchParams(window.location.search);
                const utmData = {};
                let hasUTM = false;
                
                // Проверяем все возможные UTM параметры
                Object.values(UTM_CONFIG.fieldClasses).forEach(param => {
                    const value = urlParams.get(param);
                    if (value) {
                        utmData[param] = cleanValue(value);
                        hasUTM = true;
                    }
                });
                
                // Если нашли UTM - сохраняем с дополнительной информацией
                if (hasUTM) {
                    const fullData = {
                        ...utmData,
                        landing_url: window.location.href,
                        referrer_url: document.referrer || '',
                        timestamp: new Date().toISOString(),
                        saved_at: Date.now()
                    };
                    
                    try {
                        localStorage.setItem(UTM_CONFIG.storageKey, JSON.stringify(fullData));
                        console.log('UTM сохранены:', utmData);
                    } catch (e) {
                        console.log('Не удалось сохранить UTM в localStorage');
                    }
                    
                    return fullData;
                }
                
                return null;
            }
            
            // Функция для загрузки сохраненных UTM
            function loadSavedUTM() {
                try {
                    const saved = localStorage.getItem(UTM_CONFIG.storageKey);
                    if (saved) {
                        const data = JSON.parse(saved);
                        
                        // Проверяем срок годности
                        const expiryTime = data.saved_at + (UTM_CONFIG.expiryDays * 24 * 60 * 60 * 1000);
                        if (Date.now() < expiryTime) {
                            return data;
                        } else {
                            localStorage.removeItem(UTM_CONFIG.storageKey);
                        }
                    }
                } catch (e) {
                    console.log('Ошибка загрузки UTM данных');
                }
                
                return null;
            }
            
            // Функция для заполнения полей в формах
            function fillUTMFields() {
                const utmData = loadSavedUTM();
                if (!utmData) {
                    console.log('Нет UTM данных для заполнения');
                    return;
                }
                
                let filledCount = 0;
                
                // Находим все формы на странице
                document.querySelectorAll('form').forEach(form => {
                    // Пропускаем формы с атрибутом data-no-utm
                    if (form.hasAttribute('data-no-utm')) {
                        return;
                    }
                    
                    // Для каждого класса из конфигурации
                    Object.entries(UTM_CONFIG.fieldClasses).forEach(([cssClass, paramName]) => {
                        const value = utmData[paramName];
                        if (value) {
                            // Ищем input с таким классом внутри формы
                            const input = form.querySelector(`input.${cssClass}`);
                            if (input && !input.value.trim()) {
                                input.value = value;
                                filledCount++;
                                console.log(`Заполнено поле .${cssClass}: ${value}`);
                            }
                        }
                    });
                    
                    // Заполняем landing_url если есть соответствующее поле
                    if (utmData.landing_url) {
                        const landingInput = form.querySelector('input.input-landing_page');
                        if (landingInput && !landingInput.value) {
                            landingInput.value = utmData.landing_url;
                            filledCount++;
                        }
                    }
                    
                    // Заполняем referrer_url если есть соответствующее поле
                    if (utmData.referrer_url) {
                        const referrerInput = form.querySelector('input.input-referrer');
                        if (referrerInput && !referrerInput.value) {
                            referrerInput.value = utmData.referrer_url;
                            filledCount++;
                        }
                    }
                });
                
                if (filledCount > 0) {
                    console.log(`Заполнено ${filledCount} UTM полей`);
                }
            }
            
            // Очистка значения
            function cleanValue(value) {
                return String(value)
                    .substring(0, 200)
                    .replace(/[<>"']/g, '')
                    .trim();
            }
            
            // Генерация ID сессии
            function generateSessionId() {
                let sessionId = sessionStorage.getItem('utm_session_id');
                
                if (!sessionId) {
                    sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    sessionStorage.setItem('utm_session_id', sessionId);
                }
                
                return sessionId;
            }
            
            // Основная функция инициализации
            function init() {
                console.log('Минимальный UTM трекер запущен');
                
                // 1. Сохраняем UTM из текущего URL
                const newUTM = saveUTMFromURL();
                
                // 2. Если нет новых UTM, загружаем сохраненные
                const utmData = newUTM || loadSavedUTM();
                
                // 3. Добавляем session_id к данным
                if (utmData) {
                    utmData.session_id = generateSessionId();
                    
                    // Обновляем сохраненные данные с session_id
                    try {
                        localStorage.setItem(UTM_CONFIG.storageKey, JSON.stringify(utmData));
                    } catch (e) {
                        // ignore
                    }
                }
                
                // 4. Заполняем поля в формах
                fillUTMFields();
                
                // 5. Настраиваем обновление при переходе по страницам (для SPA)
                if (window.history && window.history.pushState) {
                    const originalPushState = history.pushState;
                    history.pushState = function(state, title, url) {
                        originalPushState.apply(this, arguments);
                        setTimeout(fillUTMFields, 50);
                    };
                }
            }
            
            // Запускаем при полной загрузке DOM
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', init);
            } else {
                // Если DOM уже загружен, запускаем сразу
                setTimeout(init, 100);
            }
            
            // Экспортируем функции для ручного использования
            window.SimpleUTM = {
                // Принудительно заполнить все UTM поля
                fillFields: fillUTMFields,
                
                // Получить текущие UTM данные
                getData: loadSavedUTM,
                
                // Очистить все UTM поля в формах
                clearFields: function() {
                    Object.keys(UTM_CONFIG.fieldClasses).forEach(cssClass => {
                        document.querySelectorAll(`input.${cssClass}`).forEach(input => {
                            input.value = '';
                        });
                    });
                    console.log('UTM поля очищены');
                },
                
                // Проверить какие поля заполнены
                checkFields: function() {
                    const results = {};
                    
                    Object.entries(UTM_CONFIG.fieldClasses).forEach(([cssClass, paramName]) => {
                        const inputs = document.querySelectorAll(`input.${cssClass}`);
                        results[cssClass] = {
                            param: paramName,
                            found: inputs.length,
                            filled: 0,
                            values: []
                        };
                        
                        inputs.forEach(input => {
                            if (input.value.trim()) {
                                results[cssClass].filled++;
                                results[cssClass].values.push(input.value);
                            }
                        });
                    });
                    
                    console.log('Статус UTM полей:', results);
                    return results;
                }
            };
            
        })();
