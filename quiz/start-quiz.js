const QUIZZES_STORAGE_KEY = 'quizzlab_quizzes';
let currentQuizData = null;
let quizSubmitted = false;
let totalQuestions = 0;

function getQuizzes() {
    const storedQuizzes = localStorage.getItem(QUIZZES_STORAGE_KEY);
    return storedQuizzes ? JSON.parse(storedQuizzes) : [];
}

function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

/**
 * 1. Logic chuyển câu hỏi khi bấm nút Sidebar
 */
function jumpToQuestion(questionIndex) {
    const targetId = `question-${questionIndex}`;
    const targetElement = document.getElementById(targetId);
    
    if (targetElement) {
        window.scrollTo({
            top: targetElement.offsetTop - 100, 
            behavior: 'smooth'
        });
    }
}

/**
 * 2. Logic tạo các nút Sidebar
 */
function renderSidebarButtons() {
    const sidebarList = document.getElementById('question-button-list');
    sidebarList.innerHTML = '';
    
    let groupNumber = 1;
    let groupDiv = document.createElement('div');
    groupDiv.classList.add('question-buttons-group');
    
    if (totalQuestions > 0) {
        let groupHeader = document.createElement('h3');
        groupHeader.textContent = `Nhóm ${groupNumber}`;
        sidebarList.appendChild(groupHeader);
        sidebarList.appendChild(groupDiv);
    }


    for (let i = 0; i < totalQuestions; i++) {
        if (i > 0 && i % 10 === 0) {
            groupNumber++;
            groupDiv = document.createElement('div');
            groupDiv.classList.add('question-buttons-group');
            groupHeader = document.createElement('h3');
            groupHeader.textContent = `Nhóm ${groupNumber}`;
            sidebarList.appendChild(groupHeader);
            sidebarList.appendChild(groupDiv);
        }

        const btn = document.createElement('a');
        btn.classList.add('question-button');
        btn.textContent = String(i + 1).padStart(2, '0');
        btn.setAttribute('data-index', i);
        btn.setAttribute('onclick', `jumpToQuestion(${i})`);
        
        groupDiv.appendChild(btn);
    }
}

/**
 * 3. Kiểm tra hoàn thành và cập nhật trạng thái Sidebar 
 */
function checkCompletion() {
    if (quizSubmitted) return;

    const form = document.getElementById('quiz-form');
    const sidebarButtons = document.querySelectorAll('.question-button');
    
    let answeredCount = 0;
    
    for (let i = 0; i < totalQuestions; i++) {
        const questionName = `q${i}`;
        const selectedOption = form.querySelector(`input[name="${questionName}"]:checked`);
        const sidebarBtn = sidebarButtons[i];

        if (selectedOption) {
            answeredCount++;
            if (sidebarBtn) sidebarBtn.classList.add('answered'); // Đã sửa
        } else {
            if (sidebarBtn) sidebarBtn.classList.remove('answered'); // Đã sửa
        }
    }
    
    // Cập nhật text của nút submit (ở header)
    const topSubmitBtn = document.getElementById('top-submit-btn');
    if (topSubmitBtn) {
         topSubmitBtn.textContent = `HOÀN THÀNH BÀI LÀM (${answeredCount}/${totalQuestions})`;
    }
}

/**
 * 4. Hiển thị Quiz lên giao diện 
 */
function renderQuiz(quiz) {
    currentQuizData = quiz.questionsData;
    totalQuestions = currentQuizData.length;
    
    document.getElementById('quiz-title-display').textContent = quiz.title;
    document.getElementById('page-title-display').textContent = `Bắt đầu Quiz - ${quiz.title}`;
    document.getElementById('quiz-topic-display').textContent = quiz.topic;
    document.getElementById('quiz-count-display').textContent = totalQuestions;

    const questionsArea = document.getElementById('questions-area');
    questionsArea.innerHTML = '';
    
    // --- Bổ sung nút Submit vào Header ---
    const submitArea = document.getElementById('submit-button-area');
    submitArea.innerHTML = `
        <button type="button" id="top-submit-btn">
            HOÀN THÀNH BÀI LÀM (0/${totalQuestions})
        </button>
    `;
    document.getElementById('top-submit-btn').addEventListener('click', handleSubmit);
    // -------------------------------------

    currentQuizData.forEach((q, qIndex) => {
        const item = document.createElement('div');
        item.classList.add('question-item');
        item.id = `question-${qIndex}`; 
        item.setAttribute('data-q-index', qIndex);

        let questionHtml = `<h3><span style="color:#00bcd4;">Câu ${qIndex + 1}:</span> ${q.questionText}</h3>`;
        let optionsHtml = '';
        const questionName = `q${qIndex}`;

        q.options.forEach((option, oIndex) => {
            const prefix = option.prefix + (q.optionFormat === 'letter_dot' ? '.' : ')');
            
            optionsHtml += `
                <label class="option-label" for="${questionName}-${oIndex}">
                    <input type="radio" 
                           id="${questionName}-${oIndex}" 
                           name="${questionName}" 
                           value="${oIndex}" 
                           onclick="checkCompletion()">
                    <span style="font-weight: 600; color: #333;">${prefix}</span> 
                    ${option.content}
                </label>
            `;
        });

        item.innerHTML = questionHtml + optionsHtml;
        questionsArea.appendChild(item);
    });

    renderSidebarButtons();
    document.getElementById('quiz-form').addEventListener('change', checkCompletion);
    checkCompletion(); 
}

/**
 * 5. Xử lý khi nộp bài
 */
function handleSubmit(event) {
    // Luôn kiểm tra để tránh lỗi nếu event là undefined
    if (event && event.preventDefault) event.preventDefault(); 
    
    if (quizSubmitted) return; 

    quizSubmitted = true;
    const form = document.getElementById('quiz-form');
    let score = 0;
    
    const questionsArea = document.getElementById('questions-area');
    const resultDisplay = document.getElementById('result-display');
    const sidebarButtons = document.querySelectorAll('.question-button');
    const topSubmitBtn = document.getElementById('top-submit-btn');

    // Vô hiệu hóa input và nút submit
    topSubmitBtn.disabled = true;
    topSubmitBtn.textContent = 'Đã nộp bài!';
    questionsArea.querySelectorAll('input[type="radio"]').forEach(input => input.disabled = true);
    
    // Duyệt qua từng câu hỏi
    currentQuizData.forEach((q, qIndex) => {
        const questionElement = questionsArea.querySelector(`[data-q-index="${qIndex}"]`);
        const questionName = `q${qIndex}`;
        const selectedOptionInput = form.querySelector(`input[name="${questionName}"]:checked`);
        const selectedAnswerIndex = selectedOptionInput ? parseInt(selectedOptionInput.value) : -1;
        
        const sidebarBtn = sidebarButtons[qIndex];
        
        // --- Đã sửa: Thay thế Optional Chaining bằng If Block ---
        if (sidebarBtn) {
            sidebarBtn.classList.remove('answered');
            sidebarBtn.removeAttribute('onclick'); 
        }
        // --------------------------------------------------------

        // Xóa tất cả các lớp feedback cũ
        questionElement.querySelectorAll('.option-label').forEach(label => {
            label.classList.remove('correct-answer-feedback', 'wrong-answer-feedback');
        });

        // Tính điểm và xử lý đáp án
        if (selectedAnswerIndex === q.correctAnswer) {
            score++;
            if (sidebarBtn) sidebarBtn.classList.add('correct'); // Đã sửa
        } else if (selectedAnswerIndex !== -1) {
            if (sidebarBtn) sidebarBtn.classList.add('wrong'); // Đã sửa
        } else {
             // Chưa trả lời
             if (sidebarBtn) sidebarBtn.style.backgroundColor = '#ffcc80'; // Đã sửa
        }

        q.options.forEach((option, oIndex) => {
            const optionLabel = questionElement.querySelector(`label[for="${questionName}-${oIndex}"]`);
            
            if (oIndex === q.correctAnswer) {
                // Đánh dấu đáp án đúng
                optionLabel.classList.add('correct-answer-feedback');
            }

            if (selectedAnswerIndex !== -1 && oIndex === selectedAnswerIndex && selectedAnswerIndex !== q.correctAnswer) {
                // Đánh dấu đáp án SAI của người dùng
                optionLabel.classList.add('wrong-answer-feedback');
            }
        });
    });

    // Hiển thị kết quả chung
    resultDisplay.style.display = 'block';
    resultDisplay.innerHTML = `
        <div class="result-box">
            <h2>🎉 Kết Quả Bài Quiz 🎉</h2>
            <p style="font-size: 1.5rem; font-weight: 700; color: ${score === totalQuestions ? '#4caf50' : '#ff9800'};">
                Bạn đã đạt ${score} / ${totalQuestions} câu đúng!
            </p>
            <p style="color: #999; margin-top: 10px;">Các đáp án đúng đã được đánh dấu màu xanh lá.</p>
        </div>
    `;
    
    resultDisplay.scrollIntoView({ behavior: 'smooth', block: 'start' });
}


function loadAndRenderQuiz() {
    const quizId = parseInt(getUrlParameter('id'));
    
    const quizzes = getQuizzes();
    
    const quiz = quizzes.find(q => q.id === quizId);
    
    const titleDisplay = document.getElementById('quiz-title-display');
    const questionsArea = document.getElementById('questions-area');

    if (!quiz || !quiz.questionsData || quiz.questionsData.length === 0) {
        titleDisplay.textContent = "Lỗi: Quiz không khả dụng";
        document.getElementById('loading-message')?.remove();
        
        document.getElementById('quiz-topic-display').textContent = "---";
        document.getElementById('quiz-count-display').textContent = "0";

        questionsArea.innerHTML = `
            <div style="padding: 20px; text-align: center; border: 1px dashed #f44336; border-radius: 10px; margin-top: 30px;">
                <p style="color: #d32f2f; font-weight: 600;">
                    Không tìm thấy dữ liệu câu hỏi cho Quiz này (ID: ${quizId}).
                </p>
                <p style="color: #666; margin-top: 10px;">
                    *Vui lòng sử dụng tính năng "Tạo Quiz" để tạo Quiz mới và kiểm tra. Các Quiz mẫu (ID 1, 2) chỉ là giữ chỗ.*
                </p>
            </div>
        `;
        return;
    }

    renderQuiz(quiz);
}

window.onload = loadAndRenderQuiz;