// frontend/script.js

document.addEventListener('DOMContentLoaded', () => {
    // ---- 중요 ----
    // Cloud Run 배포 후 얻은 URL을 여기에 붙여넣으세요.
    const BACKEND_BASE_URL = 'https://nl-to-sql-api-xxxxxxxx-an.a.run.app';

    // --- UI 요소 ---
    const loadingOverlay = document.getElementById('loading-overlay');

    // 디버깅 창 요소
    const debugRefinedQuery = document.getElementById('debug-refined-query');
    const debugGeneratedSql = document.getElementById('debug-generated-sql');
    const debugSimilarityCheck = document.getElementById('debug-similarity-check');
    
    // 단계별 카드
    const steps = {
        step1: document.getElementById('step1'),
        step2: document.getElementById('step2'),
        step3: document.getElementById('step3'),
        step4: document.getElementById('step4'),
    };

    // 각 단계의 컴포넌트
    const nlInput = document.getElementById('nl-input');
    const refineBtn = document.getElementById('refine-btn');
    const refinedQueryDiv = document.getElementById('refined-query');
    const generateSqlBtn = document.getElementById('generate-sql-btn');
    const cancelRefineBtn = document.getElementById('cancel-refine-btn');

    const generatedSqlPre = document.getElementById('generated-sql');
    const sqlStatusDiv = document.getElementById('sql-status');
    const runSqlBtn = document.getElementById('run-sql-btn');
    const cancelSqlBtn = document.getElementById('cancel-sql-btn');
    
    const queryResultTableDiv = document.getElementById('query-result-table');
    const queryResultChartDiv = document.getElementById('query-result-chart');

    // --- 상태 변수 ---
    let currentRefinedQuery = '';
    let currentFinalSql = '';

    // --- 함수 ---

    // UI 흐름 제어
    function showStep(stepName) {
        Object.keys(steps).forEach(key => {
            steps[key].style.display = key === stepName ? 'block' : 'none';
        });
    }

    // 로딩 오버레이 제어
    function showLoading(show) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }
    
    // 디버깅 창 업데이트
    function updateDebugInfo({ refined_query, generated_sql, similarity_check }) {
        debugRefinedQuery.textContent = refined_query || 'N/A';
        debugGeneratedSql.textContent = generated_sql || 'N/A';
        debugSimilarityCheck.textContent = similarity_check !== undefined ? similarity_check : 'N/A';
    }

    // API 호출 헬퍼
    async function apiCall(endpoint, body) {
        showLoading(true);
        try {
            const response = await fetch(`${BACKEND_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'API 요청 실패');
            }
            return await response.json();
        } finally {
            showLoading(false);
        }
    }

    // 결과 테이블 생성
    function createHtmlTable(jsonData) {
        if (!jsonData || jsonData.length === 0) return '<p>결과가 없습니다.</p>';
        const headers = Object.keys(jsonData[0]);
        let table = '<table><thead><tr>';
        headers.forEach(header => table += `<th>${header}</th>`);
        table += '</tr></thead><tbody>';
        jsonData.forEach(row => {
            table += '<tr>';
            headers.forEach(header => table += `<td>${row[header]}</td>`);
            table += '</tr>';
        });
        table += '</tbody></table>';
        return table;
    }


    // --- 이벤트 리스너 ---

    // 1. 질문 정제 버튼
    refineBtn.addEventListener('click', async () => {
        const question = nlInput.value;
        if (!question) { alert('질문을 입력해주세요.'); return; }
        try {
            const data = await apiCall('/refine-query', { question });
            currentRefinedQuery = data.refined_query;
            refinedQueryDiv.textContent = currentRefinedQuery;
            updateDebugInfo({ refined_query: currentRefinedQuery });
            showStep('step2');
        } catch (error) {
            alert(`오류: ${error.message}`);
        }
    });
    
    cancelRefineBtn.addEventListener('click', () => showStep('step1'));

    // 2. SQL 생성 버튼
    generateSqlBtn.addEventListener('click', async () => {
        try {
            const data = await apiCall('/generate-sql', { refined_query: currentRefinedQuery });
            
            updateDebugInfo(data);

            if (!data.generated_sql || !data.similarity_check) {
                alert(`SQL 생성 실패. 추천 질문: ${data.suggestion || '질문을 수정해보세요.'}`);
                return;
            }

            currentFinalSql = data.generated_sql;
            generatedSqlPre.textContent = currentFinalSql;
            sqlStatusDiv.textContent = `상태: ${data.status || '생성됨'}`;
            
            showStep('step3');
        } catch (error) {
            alert(`오류: ${error.message}`);
        }
    });

    cancelSqlBtn.addEventListener('click', () => showStep('step2'));

    // 3. SQL 실행 버튼
    runSqlBtn.addEventListener('click', async () => {
        try {
            const data = await apiCall('/run-sql', { sql: currentFinalSql });
            
            // 테이블 결과 렌더링
            queryResultTableDiv.innerHTML = createHtmlTable(data.results);
            
            // 차트 렌더링
            queryResultChartDiv.innerHTML = ''; // 이전 차트 초기화
            if (data.chart_spec) {
                vegaEmbed('#query-result-chart', data.chart_spec, { "actions": true }).catch(console.error);
            } else if (data.results && data.results.length > 0){
                queryResultChartDiv.innerHTML = '<p>차트를 생성할 수 있는 숫자 데이터가 없습니다.</p>';
            }
            
            showStep('step4');
        } catch (error) {
            alert(`오류: ${error.message}`);
        }
    });

    // 초기 상태
    showStep('step1');
});