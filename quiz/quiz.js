const QUIZZES_STORAGE_KEY = 'quizzlab_quizzes';

// 1. Dữ liệu mẫu ban đầu
const defaultQuizzes = [
    {
        id: 1,
        title: "Toán Học Cơ Bản",
        topic: "Khoa học Tự nhiên",
        questions: 5,
        creator: "QuizzLab Admin",
        link: "start-quiz.html?id=1"
    },
    {
        id: 2,
        title: "Lịch Sử Thế Giới",
        topic: "Lịch Sử",
        questions: 10,
        creator: "QuizzLab Admin",
        link: "start-quiz.html?id=2"
    }
];

// Hàm lấy danh sách Quiz từ localStorage
function getQuizzes() {
    const storedQuizzes = localStorage.getItem(QUIZZES_STORAGE_KEY);
    if (storedQuizzes) {
        return JSON.parse(storedQuizzes);
    }
    localStorage.setItem(QUIZZES_STORAGE_KEY, JSON.stringify(defaultQuizzes));
    return defaultQuizzes;
}

// Hàm lưu danh sách Quiz vào localStorage
function saveQuizzes(quizzes) {
    localStorage.setItem(QUIZZES_STORAGE_KEY, JSON.stringify(quizzes));
}

// 2. Hàm render một Quiz Card (CẬP NHẬT để thêm nút Xóa)
function renderQuizCard(quiz) {
    const card = document.createElement('div');
    card.classList.add('quiz-card');
    card.setAttribute('data-id', quiz.id);

    // Kiểm tra xem đây có phải là Quiz tự tạo hay không để thêm nút xóa
    const isUserCreated = quiz.creator === "Người dùng (Tự tạo)";
    let deleteButton = '';
    if (isUserCreated) {
        deleteButton = `
            <button class="delete-quiz-btn" onclick="event.stopPropagation(); deleteQuiz(${quiz.id});" 
                    style="background: #f44336; margin-left: 10px; padding: 8px 12px; border-radius: 8px; border: none; color: white; cursor: pointer; transition: background 0.3s;">
                Xóa
            </button>
        `;
    }

    card.innerHTML = `
        <div onclick="window.location.href='${quiz.link}'" style="cursor: pointer;">
            <h3>${quiz.title}</h3>
            <p>Chủ đề: <span class="topic">${quiz.topic}</span></p>
            <p>Số lượng câu: ${quiz.questions}</p>
            
            <div class="meta">
                <span>Tạo bởi: ${quiz.creator}</span>
            </div>
        </div>
        <div style="display: flex; justify-content: flex-end; align-items: center; margin-top: 10px;">
            <button onclick="window.location.href='${quiz.link}'" style="flex-grow: 1;">Bắt đầu Quiz</button>
            ${deleteButton}
        </div>
    `;
    
    // Thêm style hover cho nút xóa (vì không cập nhật quiz.css)
    card.querySelector('.delete-quiz-btn')?.addEventListener('mouseenter', function(e) { e.target.style.background = '#d32f2f'; });
    card.querySelector('.delete-quiz-btn')?.addEventListener('mouseleave', function(e) { e.target.style.background = '#f44336'; });


    document.getElementById('quiz-list').appendChild(card);
}

// 3. Hàm hiển thị tất cả Quiz
function loadQuizzes() {
    const quizListContainer = document.getElementById('quiz-list');
    quizListContainer.innerHTML = '';
    document.getElementById('loading-text')?.remove();

    const quizzes = getQuizzes();
    
    if (quizzes.length === 0) {
        quizListContainer.innerHTML = '<p style="color: #999;">Chưa có Quiz nào được tạo.</p>';
        return;
    }

    quizzes.forEach(quiz => renderQuizCard(quiz));
}

// --- LOGIC XÓA QUIZ MỚI ---
function deleteQuiz(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa Quiz này không? Dữ liệu sẽ bị mất vĩnh viễn.")) {
        return;
    }

    let quizzes = getQuizzes();
    // Lọc ra Quiz có ID cần xóa
    quizzes = quizzes.filter(q => q.id !== id);
    
    saveQuizzes(quizzes); // Lưu lại danh sách mới
    loadQuizzes(); // Tải lại giao diện
    alert("Quiz đã được xóa thành công!");
}


// --- LOGIC TRÌNH SOẠN THẢO SPLIT-SCREEN (Giữ nguyên phần còn lại) ---

const modal = document.getElementById('create-quiz-editor-modal');
const form = document.getElementById('create-quiz-form');
const errorMessage = document.getElementById('error-message');
const quizTextInput = document.getElementById('quiz-text-input');
const previewContainer = document.getElementById('quiz-preview-container');

function openCreateQuizEditor() {
    modal.style.display = 'flex';
    errorMessage.style.display = 'none';
    quizTextInput.value = "câu 1 Thủ đô của Việt Nam là gì?\nA. Đà Nẵng\nB. TP Hồ Chí Minh\nC. Hà Nội.*\nD. Hải Phòng\n\ncâu 2 Đây là câu đúng/sai?\na) Đúng.*\nb) Sai"; 
    updatePreview();
}

function closeCreateQuizEditor() {
    modal.style.display = 'none';
    form.reset();
    errorMessage.style.display = 'none';
}


/**
 * 4. Hàm phân tích cú pháp văn bản Quiz (Parse Text)
 */
function parseQuizText(text) {
    const lines = text.split('\n').map(line => line.trim());
    const questions = [];
    let currentQuestion = null;
    const optionRegex = /^\s*([A-Z]\.|\S\))/; 

    for (const line of lines) {
        if (line.length === 0) continue;

        // 1. Kiểm tra bắt đầu câu hỏi mới: "câu n"
        if (line.match(/^câu\s+\d+/i)) {
            currentQuestion = {
                questionText: line.replace(/^câu\s+\d+/i, '').trim(),
                options: [],
                correctAnswer: null, 
                optionFormat: null 
            };
            questions.push(currentQuestion);
        } 
        // 2. Kiểm tra các đáp án (A. B. C. D. hoặc a) b) c) d)
        else if (currentQuestion && line.match(optionRegex)) {
            let optionText = line.trim();
            let isCorrect = false;

            // Kiểm tra đáp án đúng bằng dấu *
            if (optionText.endsWith('*')) { 
                isCorrect = true;
                optionText = optionText.slice(0, -1); 
            }
            
            const match = line.match(optionRegex);
            const prefix = match[1]; 
            
            if (!currentQuestion.optionFormat) {
                currentQuestion.optionFormat = prefix.endsWith('.') ? 'letter_dot' : 'letter_paren';
            }

            const optionContent = optionText.replace(prefix, '').trim();

            const option = {
                content: optionContent,
                prefix: prefix.replace(/[\.\)]$/, ''), 
                isCorrect: isCorrect
            };

            currentQuestion.options.push(option);

            if (isCorrect) {
                const index = option.prefix.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
                currentQuestion.correctAnswer = index;
            }
        }
        // 3. Coi các dòng văn bản còn lại là phần mở rộng của câu hỏi (Chỉ khi chưa có đáp án nào)
        else if (currentQuestion && currentQuestion.options.length === 0) {
             currentQuestion.questionText += ' ' + line;
        }
    }
    
    return questions.length > 0 ? questions : null;
}

/**
 * 5. Hàm cập nhật Preview (chạy mỗi khi gõ phím)
 */
function updatePreview() {
    const text = quizTextInput.value;
    const allParsedQuestions = parseQuizText(text);

    const renderableQuestions = (allParsedQuestions || []).filter(q => q.options.length > 0);

    renderPreview(renderableQuestions);
}

/**
 * 6. Hàm hiển thị giao diện Preview
 */
function renderPreview(questionsData) {
    previewContainer.innerHTML = '';
    
    if (questionsData.length === 0) {
        previewContainer.innerHTML = '<p class="empty-state">Bắt đầu gõ để xem câu hỏi hiển thị tại đây.</p>';
        return;
    }

    questionsData.forEach((q, index) => {
        const card = document.createElement('div');
        card.classList.add('preview-question-card');
        card.setAttribute('data-q-index', index);
        
        const questionHtml = `
            <h4>Câu ${index + 1}: ${q.questionText}</h4>
        `;
        
        let optionsHtml = '';
        
        q.options.forEach((option, i) => {
            const prefixChar = option.prefix; 
            const isCorrect = option.isCorrect;
            const correctClass = isCorrect ? 'correct-indicator' : '';

            optionsHtml += `
                <div class="preview-option ${correctClass}" 
                     data-option-index="${i}" 
                     data-option-prefix="${prefixChar}"
                     onclick="selectAnswer(${index + 1}, '${prefixChar}')">
                    <span>${prefixChar}</span>
                    ${option.content}
                </div>
            `;
        });
        
        card.innerHTML = questionHtml + optionsHtml;
        previewContainer.appendChild(card);
    });
}

/**
 * 7. Hàm chọn đáp án bằng giao diện (Cập nhật Textarea)
 */
function selectAnswer(questionNumber, selectedPrefix) {
    const currentText = quizTextInput.value;
    const lines = currentText.split('\n');
    let questionActive = false;
    let optionFound = false;
    
    const newLines = [];

    for (const line of lines) {
        let trimmedLine = line.trim();
        
        // 1. Kiểm tra bắt đầu câu hỏi
        if (trimmedLine.match(/^câu\s+\d+/i) && parseInt(trimmedLine.match(/\d+/)[0]) === questionNumber) {
            questionActive = true;
            newLines.push(line);
            continue;
        }

        // 2. Xử lý các dòng trong câu hỏi đang hoạt động
        if (questionActive) {
            const optionRegex = /^\s*([A-Z]\.|\S\))/; 

            if (trimmedLine.match(optionRegex)) {
                 
                 const match = trimmedLine.match(optionRegex);
                 const prefix = match[1].replace(/[\.\)]$/, ''); 

                 // Xóa dấu * ở tất cả các đáp án cũ
                 if (trimmedLine.endsWith('*')) {
                     trimmedLine = trimmedLine.slice(0, -1);
                 }

                 // Thêm dấu * vào đáp án được chọn
                 if (prefix === selectedPrefix) {
                    trimmedLine += '*';
                    optionFound = true;
                 }
            }
            
            newLines.push(line.replace(line.trim(), trimmedLine));
            
            if (trimmedLine.match(/^câu\s+\d+/i)) {
                questionActive = false;
            }
        } else {
            newLines.push(line);
        }
    }
    
    if (optionFound) {
        quizTextInput.value = newLines.join('\n');
        updatePreview();
    }
}


// --- AUTO-SUGGEST LOGIC ---
function autoSuggestOptions(e) {
    if (e.key !== 'Enter' || e.shiftKey) {
        return;
    }
    
    const start = quizTextInput.selectionStart;
    const text = quizTextInput.value;
    const beforeCursor = text.substring(0, start);
    
    const lastNewline = beforeCursor.lastIndexOf('\n');
    const line = beforeCursor.substring(lastNewline + 1);

    setTimeout(() => {
        let newText = quizTextInput.value;
        const currentEnd = quizTextInput.selectionEnd; 
        
        if (line.trim().match(/^A\.\s*$/i)) {
            newText = newText.substring(0, currentEnd) + 
                            'B.\nC.\nD.' + 
                            newText.substring(currentEnd);
            
            quizTextInput.value = newText;
            
            const newCursorPos = currentEnd + 2;
            quizTextInput.selectionStart = newCursorPos;
            quizTextInput.selectionEnd = newCursorPos;
            
            updatePreview();
        }
        else if (line.trim().match(/^a\)\s*$/i)) {
            newText = newText.substring(0, currentEnd) + 
                            'b)\nc)\nd)' + 
                            newText.substring(currentEnd);
            
            quizTextInput.value = newText;

            const newCursorPos = currentEnd + 2;
            quizTextInput.selectionStart = newCursorPos;
            quizTextInput.selectionEnd = newCursorPos;
            
            updatePreview();
        }
    }, 0);
}

quizTextInput.addEventListener('keydown', autoSuggestOptions);
quizTextInput.addEventListener('input', updatePreview);


/**
 * 8. Xử lý sự kiện Submit Form (Tạo Quiz)
 */
form.addEventListener('submit', function(e) {
    e.preventDefault();

    const title = document.getElementById('quiz-title').value;
    const topic = document.getElementById('quiz-topic').value;
    const text = quizTextInput.value;
    
    const allParsedQuestions = parseQuizText(text);

    const finalQuestionsToSave = (allParsedQuestions || []).filter(q => 
        (q.optionFormat === 'letter_dot' && q.options.length === 4 && q.correctAnswer !== null) || 
        (q.optionFormat === 'letter_paren' && q.options.length >= 2 && q.correctAnswer !== null)
    );

    if (finalQuestionsToSave.length === 0) {
        errorMessage.textContent = "Không tìm thấy câu hỏi hoàn chỉnh nào. Quiz phải có Tiêu đề, Đáp án (A. B. C. D. hoặc a) b)), và Đáp án Đúng (dấu *).";
        errorMessage.style.display = 'block';
        return;
    }

    errorMessage.style.display = 'none';

    const quizzes = getQuizzes();
    const newId = quizzes.length > 0 ? Math.max(...quizzes.map(q => q.id)) + 1 : 1;

    const newQuiz = {
        id: newId,
        title: title,
        topic: topic,
        questions: finalQuestionsToSave.length,
        creator: "Người dùng (Tự tạo)",
        link: `start-quiz.html?id=${newId}`, 
        questionsData: finalQuestionsToSave
    };

    quizzes.push(newQuiz);
    saveQuizzes(quizzes);

    alert(`Quiz "${title}" đã được tạo thành công với ${finalQuestionsToSave.length} câu hỏi!`);

    closeCreateQuizEditor();
    loadQuizzes(); 
});


// 9. Khởi tạo khi trang tải xong
window.onload = loadQuizzes;

// 10. Đóng modal khi click ra ngoài
window.onclick = function(event) {
    if (event.target == modal) {
        closeCreateQuizEditor();
    }
}