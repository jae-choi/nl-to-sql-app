// frontend/script.js

document.addEventListener('DOMContentLoaded', () => {
    // ---- 중요 ----
    // 2단계에서 배포 후 얻은 Cloud Run 서비스 URL을 여기에 붙여넣으세요.
    const BACKEND_BASE_URL = 'https://nl-to-sql-api-xxxxxxxx-an.a.run.app';

    // UI 요소 가져오기
    const nlInput = document.getElementById('nl-input');
    const refineBtn = document.getElementById('refine-btn');
    const step1Result = document.getElementById('step1-result');
    const refinedQueryDiv = document.getElementById('refined-query');
    const generateSqlBtn = document.getElementById('generate-sql-btn');

    const step2 = document.getElementById('step2');
    const generatedSqlPre = document.getElementById('generated-sql');
    const sqlStatusDiv = document.getElementById('sql-status');
    const runSqlBtn = document.getElementById('run-sql-btn');
    
    const step3 = document.getElementById('step3');
    const queryResultDiv = document.getElementById('query-result');

    const spinner = document.getElementById('spinner');

    // 상태 저장을 위한 변수
    let currentRefinedQuery = '';
    let currentFinalSql = '';

    // API 호출 헬퍼 함수
    async function apiCall(endpoint, body) {
        spinner.style.display = 'block';
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
            spinner.style.display = 'none';
        }
    }

    // 1. 질문 정제 버튼 클릭
    refineBtn.addEventListener('click', async () => {
        const question = nlInput.value;
        if (!question) {
            alert('질문을 입력해주세요.');
            return;
        }
        try {
            const data = await apiCall('/refine-query', { question });
            currentRefinedQuery = data.refined_query;
            refinedQueryDiv.textContent = currentRefinedQuery;
            step1Result.style.display = 'block';
            step2.style.display = 'none';
            step3.style.display = 'none';
        } catch (error) {
            alert(`오류: ${error.message}`);
        }
    });

    // 2. SQL 생성 버튼 클릭
    generateSqlBtn.addEventListener('click', async () => {
        try {
            const data = await apiCall('/generate-sql', { refined_query: currentRefinedQuery });
            
            if (!data.generated_sql || !data.similarity_check) {
                alert(`SQL 생성 실패. 추천 질문: ${data.suggestion || '질문을 수정해보세요.'}`);
                return;
            }

            currentFinalSql = data.generated_sql;
            generatedSqlPre.textContent = currentFinalSql;
            sqlStatusDiv.textContent = `상태: ${data.status || '생성됨'}`;
            
            step2.style.display = 'block';
            step3.style.display = 'none';

        } catch (error) {
            alert(`오류: ${error.message}`);
        }
    });

    // 3. SQL 실행 버튼 클릭
    runSqlBtn.addEventListener('click', async () => {
        try {
            const data = await apiCall('/run-sql', { sql: currentFinalSql });
            
            // 결과를 테이블로 변환하여 표시
            queryResultDiv.innerHTML = createHtmlTable(data);
            step3.style.display = 'block';

        } catch (error) {
            alert(`오류: ${error.message}`);
        }
    });

    // JSON 데이터를 HTML 테이블로 만드는 함수
    function createHtmlTable(jsonData) {
        if (!jsonData || jsonData.length === 0) {
            return '<p>결과가 없습니다.</p>';
        }
        const headers = Object.keys(jsonData[0]);
        let table = '<table border="1"><thead><tr>';
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
});