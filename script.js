diff --git a/script.js b/script.js
index dd476d2783b7ffb2702cd2dca6029c44ad768262..be99847d278c913b3b5541cc9e94c4ddc8a32c4b 100644
--- a/script.js
+++ b/script.js
@@ -152,117 +152,152 @@ document.addEventListener('DOMContentLoaded', () => {
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
-        const escapedSql = sqlData.generated_sql.replace(/</g, "<").replace(/>/g, ">");
+        const escapedSql = sqlData.generated_sql
+            .replace(/</g, "&lt;")
+            .replace(/>/g, "&gt;");
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
 
-    function appendUserMessage(text) { const escapedText = text.replace(/</g, "<").replace(/>/g, ">"); const messageHtml = `<div class="chat-message user-message"><div class="message-content">${escapedText}</div></div>`; chatFeed.insertAdjacentHTML('beforeend', messageHtml); scrollToBottom(); }
+    function appendUserMessage(text) {
+        const escapedText = text
+            .replace(/</g, "&lt;")
+            .replace(/>/g, "&gt;");
+        const messageHtml = `<div class="chat-message user-message"><div class="message-content">${escapedText}</div></div>`;
+        chatFeed.insertAdjacentHTML('beforeend', messageHtml);
+        scrollToBottom();
+    }
     
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
     
-    function appendErrorMessage(message) { const escapedMessage = message.replace(/</g, "<").replace(/>/g, ">"); const errorHtml = `<div class="chat-message bot-message"><div class="message-content error-message-content"><strong>오류 발생:</strong><p>${escapedMessage}</p></div></div>`; chatFeed.insertAdjacentHTML('beforeend', errorHtml); scrollToBottom(); }
+    function appendErrorMessage(message) {
+        const escapedMessage = message
+            .replace(/</g, "&lt;")
+            .replace(/>/g, "&gt;");
+        const errorHtml = `<div class="chat-message bot-message"><div class="message-content error-message-content"><strong>오류 발생:</strong><p>${escapedMessage}</p></div></div>`;
+        chatFeed.insertAdjacentHTML('beforeend', errorHtml);
+        scrollToBottom();
+    }
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
-    function createHtmlTable(jsonData) { if (!jsonData || jsonData.length === 0) return '결과가 없습니다.'; const headers = Object.keys(jsonData[0]); let table = '<table class="result-table"><thead><tr>'; headers.forEach(header => table += `<th>${header}</th>`); table += '</tr></thead><tbody>'; jsonData.forEach(row => { table += '<tr>'; headers.forEach(header => { const cellValue = row[header] === null ? 'NULL' : row[header]; const escapedValue = String(cellValue).replace(/</g, "<").replace(/>/g, ">"); table += `<td>${escapedValue}</td>` }); table += '</tr>'; }); table += '</tbody></table>'; return table; }
+    function createHtmlTable(jsonData) {
+        if (!jsonData || jsonData.length === 0) return '결과가 없습니다.';
+        const headers = Object.keys(jsonData[0]);
+        let table = '<table class="result-table"><thead><tr>';
+        headers.forEach(header => (table += `<th>${header}</th>`));
+        table += '</tr></thead><tbody>';
+        jsonData.forEach(row => {
+            table += '<tr>';
+            headers.forEach(header => {
+                const cellValue = row[header] === null ? 'NULL' : row[header];
+                const escapedValue = String(cellValue)
+                    .replace(/</g, "&lt;")
+                    .replace(/>/g, "&gt;");
+                table += `<td>${escapedValue}</td>`;
+            });
+            table += '</tr>';
+        });
+        table += '</tbody></table>';
+        return table;
+    }
     function scrollToBottom() { chatFeed.scrollTop = chatFeed.scrollHeight; }
 
     // --- 초기화 ---
     lucide.createIcons();
 });
