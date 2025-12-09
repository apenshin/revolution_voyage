<!-- Вставьте этот код перед </body> на всех страницах -->

<div style="display: none;">
    <script>
        (function() {
            'use strict';
            
            // Сохраняем UTM из URL при заходе
            const urlParams = new URLSearchParams(location.search);
            const utmData = {};
            
            // Основные UTM параметры
            const utmParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid'];
            
            utmParams.forEach(param => {
                const value = urlParams.get(param);
                if (value) {
                    utmData[param] = value.substring(0, 100);
                }
            });
            
            // Если нашли UTM - сохраняем
            if (Object.keys(utmData).length > 0) {
                utmData._landing = location.href;
                utmData._time = new Date().toISOString();
                localStorage.setItem('utm_saved', JSON.stringify(utmData));
            }
            
            // Заполняем существующие UTM поля в формах
            document.addEventListener('DOMContentLoaded', function() {
                const saved = localStorage.getItem('utm_saved');
                if (!saved) return;
                
                const data = JSON.parse(saved);
                
                // Находим все формы
                document.querySelectorAll('form').forEach(form => {
                    // Находим все UTM поля внутри формы
                    utmParams.forEach(param => {
                        if (data[param]) {
                            const input = form.querySelector(`input.input-"${param}"`);
                            if (input && !input.value) {
                                input.value = data[param];
                            }
                        }
                    });
                    
                    // Заполняем landing_page если поле есть
                    const landingInput = form.querySelector('input[name="landing_page"]');
                    if (landingInput && data._landing) {
                        landingInput.value = data._landing;
                    }
                });
            });
            
        })();
    </script>
</div>
