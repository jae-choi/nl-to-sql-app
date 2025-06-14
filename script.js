document.addEventListener('DOMContentLoaded', () => {
    // --- 중요 ---
    // Cloud Run 배포 후 얻은 URL을 여기에 붙여넣으세요.
    const BACKEND_BASE_URL = 'http://127.0.0.1:8000'; // 로컬 테스트용 기본값

    // --- UI 요소 ---
    const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    const chatFeed = document.getElementById('chat-feed');
    const nlInput = document.getElementById('nl-input');
    const sendBtn = document.getElementById('send-btn');
    const loadingTemplate = document.getElementById('loading-template');

    // 결과 패널 요소
    const resultsWrapper = document.getElementById('results-wrapper');
    const resultsHeader = document.getElementById('results-header');
    const resultsDisplay = document.getElementById('results-display');
    const chartTypeSelect = document.getElementById('chart-type-select'); // 차트 유형 선택

    // 디버깅 창 요소
    const debugRefinedQuery = document.getElementById('debug-refined-query');
    const debugGeneratedSql = document.getElementById('debug-generated-sql');
    const debugSimilarityCheck = document.getElementById('debug-similarity-check');
    
    // --- 상태 변수 ---
    let currentRefinedQuery = '';
    let currentFinalSql = '';
    let isLoading = false;

    // --- 사이드바 및 패널 제어 ---
    sidebarToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('sidebar-collapsed');
    });

    resultsHeader.addEventListener('click', (e) => {
        // 차트 컨트롤 영역 클릭 시 패널이 닫히지 않도록 함
        if (e.target.closest('.chart-controls')) {
            return;
        }
        resultsWrapper.classList.toggle('collapsed');
    });


    // --- 이벤트 리스너 ---
    sendBtn.addEventListener('click', handleSend);
    nlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });

    chatFeed.addEventListener('click', (e) => {
        const targetButton = e.target.closest('button');
        if (!targetButton) return;
        const action = targetButton.dataset.action;
        if (action === 'generate-sql') handleGenerateSql();
        if (action === 'run-sql') handleRunSql();
        if (action === 'cancel') targetButton.closest('.bot-message').remove();
        if (targetButton.classList.contains('copy-btn')) {
            navigator.clipboard.writeText(unescape(targetButton.dataset.sql)).then(() => {
                targetButton.innerHTML = '<i data-lucide="check"></i>';
                lucide.createIcons();
                setTimeout(() => { 
                    targetButton.innerHTML = '<i data-lucide="copy"></i>'; 
                    lucide.createIcons(); 
                }, 2000);
            });
        }
    });

    document.getElementById('debug-sidebar').addEventListener('click', (e) => {
        const targetButton = e.target.closest('.copy-btn-debug');
        if (!targetButton) return;
        const sqlToCopy = debugGeneratedSql.textContent;
        if (sqlToCopy && sqlToCopy !== 'N/A') {
            navigator.clipboard.writeText(sqlToCopy).then(() => {
                targetButton.innerHTML = '<i data-lucide="check"></i>';
                lucide.createIcons();
                setTimeout(() => { 
                    targetButton.innerHTML = '<i data-lucide="copy"></i>'; 
                    lucide.createIcons(); 
                }, 2000);
            });
        }
    });
    
    nlInput.addEventListener('input', () => {
        nlInput.style.height = 'auto';
        nlInput.style.height = (nlInput.scrollHeight) + 'px';
    });

    chartTypeSelect.addEventListener('change', () => {
        if (currentFinalSql) { // 이미 실행된 SQL이 있을 경우에만 차트 다시 그림
            handleRunSql();
        }
    });


    // --- 주요 함수들 ---
    async function handleSend() {
        if (isLoading) return;
        const question = nlInput.value.trim();
        if (!question) return;
        appendUserMessage(question);
        nlInput.value = '';
        nlInput.style.height = 'auto';
        if (!resultsWrapper.classList.contains('collapsed')) {
            resultsWrapper.classList.add('collapsed'); 
        }

        const loadingIndicator = appendLoadingIndicator();
        try {
            const refineData = await apiCall('/refine-query', { question });
            currentRefinedQuery = refineData.refined_query;
            loadingIndicator.remove();
            appendRefineCard(currentRefinedQuery);
            updateDebugInfo({ refined_query: currentRefinedQuery, generated_sql: null, similarity_check: null });
        } catch (error) {
            loadingIndicator.remove();
            appendErrorMessage(error.message);
        }
    }

    async function handleGenerateSql() {
        if (isLoading) return;
        const loadingIndicator = appendLoadingIndicator();
        try {
            const sqlData = await apiCall('/generate-sql', { refined_query: currentRefinedQuery });
            loadingIndicator.remove();
            updateDebugInfo(sqlData);
            if (!sqlData.generated_sql || !sqlData.similarity_check) {
                appendErrorMessage(`SQL 생성 실패. 추천 질문: ${sqlData.suggestion || '질문을 수정해보세요.'}`);
                return;
            }
            currentFinalSql = sqlData.generated_sql;
            appendSqlCard(sqlData);
        } catch (error) {
            loadingIndicator.remove();
            appendErrorMessage(error.message);
        }
    }
    
    async function handleRunSql() {
        if (isLoading || !currentFinalSql) return; // currentFinalSql이 없으면 실행하지 않음
        const selectedChartType = chartTypeSelect.value;
        const loadingIndicator = appendLoadingIndicator();
        try {
            const resultData = await apiCall('/run-sql', { sql: currentFinalSql, chart_type: selectedChartType });
            loadingIndicator.remove();
            renderResults(resultData);
            appendSystemMessage("✅ 쿼리 실행 완료! 아래 결과 패널을 확인하세요.");
        } catch (error) {
            loadingIndicator.remove();
            appendErrorMessage(error.message);
        }
    }

    // --- 메시지/카드/결과 생성 함수들 ---
    function renderResults(resultData) {
        const tableHtml = createHtmlTable(resultData.results);
        const resultsContentHtml = `
            <div class="result-table-container">${tableHtml}</div>
            <div class="result-chart" id="chart-${Date.now()}"></div>
        `;
        resultsDisplay.innerHTML = resultsContentHtml;
        
        const chartContainer = resultsDisplay.querySelector('.result-chart');
        if (resultData.chart_spec) {
            vegaEmbed(chartContainer, resultData.chart_spec, { "actions": true }).catch(console.error);
        } else if (resultData.results && resultData.results.length > 0){
            chartContainer.innerHTML = '<p class="info-box">차트를 생성할 수 있는 숫자 데이터가 없습니다.</p>';
        }
        resultsWrapper.classList.remove('collapsed'); 
    }
    
    function appendSqlCard(sqlData) {
        const escapedSql = sqlData.generated_sql.replace(/</g, "<").replace(/>/g, ">");
        const modelUsedHtml = sqlData.model_used ? `<div class="model-used-badge">Model: ${sqlData.model_used}</div>` : '';
        const cardHtml = `
            <div class="chat-message bot-message">
                <div class="message-content">
                    <h3><i data-lucide="search-code"></i> SQL 생성 및 검증 완료</h3>
                    ${modelUsedHtml}
                    <p>생성된 SQL을 BigQuery에서 실행하시겠습니까?</p>
                    <div class="code-box">
                        <button class="copy-btn" data-sql="${escape(sqlData.generated_sql)}" aria-label="코드 복사">
                           <i data-lucide="copy"></i>
                        </button>
                        <code class="language-sql">${escapedSql}</code>
                    </div>
                    <div class="button-group">
                        <button class="action-btn primary" data-action="run-sql">예, 실행합니다</button>
                        <button class="action-btn secondary" data-action="cancel">아니오, 취소합니다</button>
                    </div>
                </div>
            </div>`;
        chatFeed.insertAdjacentHTML('beforeend', cardHtml);
        
        const newCodeBlock = chatFeed.lastElementChild.querySelector('code.language-sql');
        if (newCodeBlock) {
            hljs.highlightElement(newCodeBlock);
        }

        lucide.createIcons();
        scrollToBottom();
    }
    
    function appendSystemMessage(text) {
        const messageHtml = `<div class="chat-message bot-message"><div class="message-content info-box">${text}</div></div>`;
        chatFeed.insertAdjacentHTML('beforeend', messageHtml);
        scrollToBottom();
    }

    function appendUserMessage(text) { const escapedText = text.replace(/</g, "<").replace(/>/g, ">"); const messageHtml = `<div class="chat-message user-message"><div class="message-content">${escapedText}</div></div>`; chatFeed.insertAdjacentHTML('beforeend', messageHtml); scrollToBottom(); }
    
    function appendRefineCard(refinedQuery) { 
        const cleanQuery = refinedQuery.replace(/\*\*/g, '').replace(/\*/g, '');
        const cardHtml = `
            <div class="chat-message bot-message">
                <div class="message-content">
                    <h3><i data-lucide="file-pen"></i> 질문 확인</h3>
                    <p>AI가 이해한 질문은 다음과 같습니다. 이 내용으로 계속할까요?</p>
                    <div class="info-box">${cleanQuery}</div>
                    <div class="button-group">
                        <button class="action-btn primary" data-action="generate-sql">예, 진행합니다</button>
                        <button class="action-btn secondary" data-action="cancel">아니오, 다시 입력합니다</button>
                    </div>
                </div>
            </div>`; 
        chatFeed.insertAdjacentHTML('beforeend', cardHtml); 
        lucide.createIcons();
        scrollToBottom(); 
    }
    
    function appendErrorMessage(message) { const escapedMessage = message.replace(/</g, "<").replace(/>/g, ">"); const errorHtml = `<div class="chat-message bot-message"><div class="message-content error-message-content"><strong>오류 발생:</strong><p>${escapedMessage}</p></div></div>`; chatFeed.insertAdjacentHTML('beforeend', errorHtml); scrollToBottom(); }
    function appendLoadingIndicator() { const loadingNode = loadingTemplate.content.cloneNode(true); chatFeed.appendChild(loadingNode); scrollToBottom(); return chatFeed.lastElementChild; }

    // --- 디버깅 창 업데이트 함수 ---
    function updateDebugInfo({ refined_query, generated_sql, similarity_check }) {
        if (refined_query) {
            const cleanQuery = refined_query.replace(/\*\*/g, '').replace(/\*/g, '');
            debugRefinedQuery.textContent = cleanQuery;
        } else {
            debugRefinedQuery.textContent = 'N/A';
        }

        if (generated_sql) {
            debugGeneratedSql.textContent = generated_sql;
            hljs.highlightElement(debugGeneratedSql);
        } else {
            debugGeneratedSql.textContent = 'N/A';
        }
        
        if (similarity_check !== undefined && similarity_check !== null) {
            debugSimilarityCheck.textContent = String(similarity_check);
        } else {
            debugSimilarityCheck.textContent = 'N/A';
        }
    }

    // --- 유틸리티 함수 ---
    async function apiCall(endpoint, body) { isLoading = true; try { const response = await fetch(`${BACKEND_BASE_URL}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), }); if (!response.ok) { const errData = await response.json(); throw new Error(errData.detail || 'API 요청 실패'); } return await response.json(); } finally { isLoading = false; } }
    function createHtmlTable(jsonData) { if (!jsonData || jsonData.length === 0) return '결과가 없습니다.'; const headers = Object.keys(jsonData[0]); let table = '<table class="result-table"><thead><tr>'; headers.forEach(header => table += `<th>${header}</th>`); table += '</tr></thead><tbody>'; jsonData.forEach(row => { table += '<tr>'; headers.forEach(header => { const cellValue = row[header] === null ? 'NULL' : row[header]; const escapedValue = String(cellValue).replace(/</g, "<").replace(/>/g, ">"); table += `<td>${escapedValue}</td>` }); table += '</tr>'; }); table += '</tbody></table>'; return table; }
    function scrollToBottom() { chatFeed.scrollTop = chatFeed.scrollHeight; }

    // --- 초기화 ---
    lucide.createIcons();
});
