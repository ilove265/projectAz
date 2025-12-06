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

// 2. Hàm render một Quiz Card (Giữ nguyên)
function renderQuizCard(quiz) {
    const card = document.createElement('div');
    card.classList.add('quiz-card');
    card.setAttribute('data-id', quiz.id);

    card.innerHTML = `
        <h3>${quiz.title}</h3>
        <p>Chủ đề: <span class="topic">${quiz.topic}</span></p>
        <p>Số lượng câu: ${quiz.questions}</p>
        
        <div class="meta">
            <span>Tạo bởi: ${quiz.creator}</span>
        </div>
        <button onclick="window.location.href='${quiz.link}'">Bắt đầu Quiz</button>
    `;

    document.getElementById('quiz-list').appendChild(card);
}

// 3. Hàm hiển thị tất cả Quiz (Giữ nguyên)
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


// --- LOGIC TRÌNH SOẠN THẢO SPLIT-SCREEN ---

const modal = document.getElementById('create-quiz-editor-modal');
const form = document.getElementById('create-quiz-form');
const errorMessage = document.getElementById('error-message');
const quizTextInput = document.getElementById('quiz-text-input');
const previewContainer = document.getElementById('quiz-preview-container');

function openCreateQuizEditor() {
    modal.style.display = 'flex';
    errorMessage.style.display = 'none';
    // Đặt Textarea về ví dụ mặc định để người dùng biết cách dùng
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
 * Hỗ trợ cú pháp: Câu n, A. B. C. D., a) b) c) d), và dấu * sau dấu chấm cuối câu.
 */
function parseQuizText(text) {
    const lines = text.split('\n').map(line => line.trim());
    const questions = [];
    let currentQuestion = null;
    const optionRegex = /^\s*([A-Z]\.|\S\))/; // A. or a)

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
            if (optionText.endsWith('*')) { // Dấu * sau dấu chấm/ngoặc
                isCorrect = true;
                optionText = optionText.slice(0, -1); // Xóa dấu *
            }
            
            const match = line.match(optionRegex);
            const prefix = match[1]; // Lấy A. hoặc a)
            
            if (!currentQuestion.optionFormat) {
                currentQuestion.optionFormat = prefix.endsWith('.') ? 'letter_dot' : 'letter_paren';
            }

            // Loại bỏ tiền tố (A., a), ...)
            const optionContent = optionText.replace(prefix, '').trim();

            const option = {
                content: optionContent,
                prefix: prefix.replace(/[\.\)]$/, ''), // Lấy chữ A hoặc a
                isCorrect: isCorrect
            };

            currentQuestion.options.push(option);

            if (isCorrect) {
                // Chuyển đổi prefix sang index 0, 1, 2...
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

    // Hiển thị tất cả câu hỏi có đáp án
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
            // Lấy ký tự prefix (A, B, a, b...)
            const prefixChar = option.prefix; 
            const isCorrect = option.isCorrect;
            const correctClass = isCorrect ? 'correct-indicator' : '';

            // Thêm onclick để tương tác
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
    
    // Biến tạm để lưu nội dung Textarea mới
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
            let lineIsOption = false;
            const optionRegex = /^\s*([A-Z]\.|\S\))/; 

            // Kiểm tra xem dòng hiện tại có phải là đáp án không
            if (trimmedLine.match(optionRegex)) {
                 lineIsOption = true;
                 
                 const match = trimmedLine.match(optionRegex);
                 const prefix = match[1].replace(/[\.\)]$/, ''); // Lấy chữ A hoặc a

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
            
            // Nếu gặp câu hỏi mới, dừng xử lý câu hỏi hiện tại
            if (trimmedLine.match(/^câu\s+\d+/i)) {
                questionActive = false;
            }
        } else {
            newLines.push(line);
        }
    }
    
    if (optionFound) {
        // Cập nhật Textarea và Preview
        quizTextInput.value = newLines.join('\n');
        updatePreview();
    }
}


// --- AUTO-SUGGEST LOGIC ---
function autoSuggestOptions(e) {
    // Chỉ xử lý khi nhấn Enter (hoặc Shift+Enter, nhưng chỉ cần Enter)
    if (e.key !== 'Enter' || e.shiftKey) {
        return;
    }
    
    const start = quizTextInput.selectionStart;
    const end = quizTextInput.selectionEnd;
    const text = quizTextInput.value;
    const beforeCursor = text.substring(0, start);
    
    // Tìm dòng ngay trước con trỏ
    const lastNewline = beforeCursor.lastIndexOf('\n');
    const line = beforeCursor.substring(lastNewline + 1);

    // Trì hoãn việc thêm nội dung cho đến sau khi trình duyệt xử lý Enter
    setTimeout(() => {
        let newText = quizTextInput.value;
        const currentEnd = quizTextInput.selectionEnd; // Vị trí sau khi Enter đã được xử lý
        
        // Kiểm tra cú pháp gợi ý A. (Trắc nghiệm)
        if (line.trim().match(/^A\.\s*$/i)) {
            newText = newText.substring(0, currentEnd) + 
                            'B.\nC.\nD.' + 
                            newText.substring(currentEnd);
            
            quizTextInput.value = newText;
            
            // Đặt con trỏ về đúng vị trí (sau B.)
            const newCursorPos = currentEnd + 2;
            quizTextInput.selectionStart = newCursorPos;
            quizTextInput.selectionEnd = newCursorPos;
            
            updatePreview();
        }
        // Kiểm tra cú pháp gợi ý a) (Đúng/Sai/Tuỳ chọn)
        else if (line.trim().match(/^a\)\s*$/i)) {
            newText = newText.substring(0, currentEnd) + 
                            'b)\nc)\nd)' + 
                            newText.substring(currentEnd);
            
            quizTextInput.value = newText;

            // Đặt con trỏ về đúng vị trí (sau b))
            const newCursorPos = currentEnd + 2;
            quizTextInput.selectionStart = newCursorPos;
            quizTextInput.selectionEnd = newCursorPos;
            
            updatePreview();
        }
    }, 0);
}

// Thêm sự kiện lắng nghe gõ phím cho autoSuggestOptions
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
    
    // Lấy tất cả câu hỏi đã parse
    const allParsedQuestions = parseQuizText(text);

    // Lọc ra các câu hỏi HOÀN CHỈNH để lưu
    const finalQuestionsToSave = (allParsedQuestions || []).filter(q => 
        (q.optionFormat === 'letter_dot' && q.options.length === 4 && q.correctAnswer !== null) || // Trắc nghiệm 4 đáp án
        (q.optionFormat === 'letter_paren' && q.options.length >= 2 && q.correctAnswer !== null) // Đúng/Sai (tối thiểu 2 đáp án)
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
        questionsData: finalQuestionsToSave // Lưu dữ liệu câu hỏi hoàn chỉnh
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