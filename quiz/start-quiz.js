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
 * Kiểm tra xem người dùng đã trả lời đủ câu hỏi chưa để kích hoạt nút submit.
 */
function checkCompletion() {
    if (quizSubmitted) return;

    const form = document.getElementById('quiz-form');
    const submitBtn = document.getElementById('submit-quiz-btn');
    
    // Đếm số lượng câu hỏi đã được chọn
    let answeredCount = 0;
    for (let i = 0; i < totalQuestions; i++) {
        const questionName = `q${i}`;
        const selectedOption = form.querySelector(`input[name="${questionName}"]:checked`);
        if (selectedOption) {
            answeredCount++;
        }
    }

    // Kích hoạt nút Submit nếu tất cả câu hỏi đã được trả lời
    if (answeredCount === totalQuestions) {
        submitBtn.removeAttribute('disabled');
        submitBtn.textContent = 'HOÀN THÀNH BÀI LÀM';
    } else {
        submitBtn.setAttribute('disabled', 'true');
        submitBtn.textContent = `Trả lời đủ (${answeredCount}/${totalQuestions})`;
    }
}

/**
 * Hiển thị Quiz lên giao diện
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

    currentQuizData.forEach((q, qIndex) => {
        const item = document.createElement('div');
        item.classList.add('question-item');
        item.setAttribute('data-q-index', qIndex);

        let questionHtml = `<h3>Câu ${qIndex + 1}: ${q.questionText}</h3>`;
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

    document.getElementById('quiz-form').addEventListener('change', checkCompletion);
    checkCompletion(); // Kiểm tra lần đầu khi tải xong
}

/**
 * Xử lý khi nộp bài
 */
function handleSubmit(event) {
    event.preventDefault();
    if (quizSubmitted) return; 

    quizSubmitted = true;
    const form = event.target;
    let score = 0;
    
    const questionsArea = document.getElementById('questions-area');
    const resultDisplay = document.getElementById('result-display');
    const submitBtn = document.getElementById('submit-quiz-btn');

    // Vô hiệu hóa form và nút submit
    submitBtn.setAttribute('disabled', 'true');
    submitBtn.textContent = 'Đã nộp bài!';
    questionsArea.querySelectorAll('input[type="radio"]').forEach(input => input.disabled = true);
    
    // Duyệt qua từng câu hỏi
    currentQuizData.forEach((q, qIndex) => {
        const questionElement = questionsArea.querySelector(`[data-q-index="${qIndex}"]`);
        const questionName = `q${qIndex}`;
        const selectedOptionInput = form.querySelector(`input[name="${questionName}"]:checked`);
        const selectedAnswerIndex = selectedOptionInput ? parseInt(selectedOptionInput.value) : -1;

        // Xóa tất cả các lớp feedback cũ
        questionElement.querySelectorAll('.option-label').forEach(label => {
            label.classList.remove('correct-answer-feedback', 'wrong-answer-feedback');
        });

        // Xử lý đáp án
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
        
        // Tính điểm
        if (selectedAnswerIndex === q.correctAnswer) {
            score++;
        }
    });

    // Hiển thị kết quả chung
    resultDisplay.style.display = 'block';
    resultDisplay.innerHTML = `
        <div class="result-box">
            <h2>🎉 Kết Quả Bài Quiz 🎉</h2>
            <p style="font-size: 1.5rem; font-weight: 700; color: #4caf50;">Bạn đã đạt ${score} / ${totalQuestions} câu đúng!</p>
            <p style="color: #999; margin-top: 10px;">Các đáp án đúng đã được đánh dấu màu xanh lá.</p>
        </div>
    `;
    
    // Tự động cuộn lên kết quả
    resultDisplay.scrollIntoView({ behavior: 'smooth', block: 'start' });
}


function loadAndRenderQuiz() {
    const quizId = parseInt(getUrlParameter('id'));
    const quizzes = getQuizzes();
    
    const quiz = quizzes.find(q => q.id === quizId);

    if (!quiz || !quiz.questionsData) {
        document.getElementById('quiz-title-display').textContent = "Lỗi: Không tìm thấy Quiz!";
        document.getElementById('questions-area').innerHTML = '<p style="color: red;">Không tìm thấy dữ liệu câu hỏi cho Quiz này. Vui lòng quay lại trang Quiz.</p>';
        return;
    }

    renderQuiz(quiz);
    document.getElementById('quiz-form').addEventListener('submit', handleSubmit);
}

// Khởi động khi trang tải xong
window.onload = loadAndRenderQuiz;