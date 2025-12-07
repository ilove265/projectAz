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
    const lines = text.split('\n').map(l => l.replace(/\r/g, '').trim());
    const questions = [];
    let currentQuestion = null;
    const optionRegex = /^\s*([A-Za-z][\.\)])/; // bắt A. hoặc a) hoặc B. hoặc b)

    for (const line of lines) {
        if (!line) continue;

        // Bắt đầu câu mới
        if (/^câu\s+\d+/i.test(line)) {
            currentQuestion = {
                questionText: line.replace(/^câu\s+\d+/i, '').trim(),
                options: [],
                correctAnswer: null,
                optionFormat: null,
                type: 'multiple_choice'
            };
            questions.push(currentQuestion);
            continue;
        }

        if (currentQuestion && optionRegex.test(line)) {
            let optionLine = line;
            let isCorrect = false;
            if (optionLine.endsWith('*')) {
                isCorrect = true;
                optionLine = optionLine.slice(0, -1).trim();
            }

            const match = optionLine.match(optionRegex);
            const prefixRaw = match ? match[1] : '';
            const prefix = prefixRaw.replace(/[\.\)]$/, '');

            if (!currentQuestion.optionFormat) {
                currentQuestion.optionFormat = prefixRaw.endsWith('.') ? 'letter_dot' : 'letter_paren';
            }

            const content = optionLine.replace(optionRegex, '').trim();

            currentQuestion.options.push({
                content: content,
                prefix: prefix,
                isCorrect: isCorrect
            });

            // Nếu là A. (letter_dot) và có dấu * -> set correctAnswer index
            if (isCorrect && currentQuestion.optionFormat === 'letter_dot') {
                const up = prefix.toUpperCase();
                if (up >= 'A' && up <= 'Z') {
                    currentQuestion.correctAnswer = up.charCodeAt(0) - 'A'.charCodeAt(0);
                }
            }
            continue;
        }

        // nối phần mô tả câu nếu chưa có option
        if (currentQuestion && currentQuestion.options.length === 0) {
            currentQuestion.questionText += ' ' + line;
        }
    }
    if (currentQuestion && !questions.includes(currentQuestion)) {
        questions.push(currentQuestion);
    }
    
    // Xác định loại câu: nếu dùng letter_paren (a) b)) và prefix là chữ thường => statements_tf
    for (const q of questions) {
        if (q.optionFormat === 'letter_paren') {
            const firstPrefix = q.options[0]?.prefix || '';
            if (firstPrefix && firstPrefix === firstPrefix.toLowerCase()) {
                q.type = 'statements_tf';
            } else {
                q.type = 'multiple_choice';
            }
        } else {
            q.type = 'multiple_choice';
        }
    }

    return questions.length ? questions : null;
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

    if (!questionsData || questionsData.length === 0) {
        previewContainer.innerHTML = '<p class="empty-state">Bắt đầu gõ để xem câu hỏi hiển thị tại đây.</p>';
        return;
    }

    questionsData.forEach((q, index) => {
        const card = document.createElement('div');
        card.classList.add('preview-question-card');
        card.setAttribute('data-q-index', index);

        const questionHtml = `<h4>Câu ${index + 1}: ${q.questionText}</h4>`;
        let optionsHtml = '';

        if (q.type === 'statements_tf') {
            // Mỗi option là một phát biểu; click sẽ toggle * (đúng) cho phát biểu đó
            q.options.forEach((option, i) => {
                const correctClass = option.isCorrect ? 'correct-indicator' : '';
                optionsHtml += `
                    <div class="preview-option ${correctClass}"
                         data-option-index="${i}"
                         onclick="selectAnswer(${index + 1}, ${i}, 'statement')">
                        <span>${option.prefix}</span>
                        ${option.content}
                    </div>
                `;
            });
        } else {
            // multiple choice (A. B. C.)
            q.options.forEach((option, i) => {
                const prefixChar = option.prefix;
                const correctClass = option.isCorrect ? 'correct-indicator' : '';
                optionsHtml += `
                    <div class="preview-option ${correctClass}"
                         data-option-index="${i}"
                         data-option-prefix="${prefixChar}"
                         onclick="selectAnswer(${index + 1}, ${i}, 'mc')">
                        <span>${prefixChar}</span>
                        ${option.content}
                    </div>
                `;
            });
        }

        card.innerHTML = questionHtml + optionsHtml;
        previewContainer.appendChild(card);
    });
}

/**
 * 7. Hàm chọn đáp án bằng giao diện (Cập nhật Textarea)
 */
function selectAnswer(questionNumber, selectedIndex, mode = 'mc') {
    const text = quizTextInput.value.split('\n');
    let inQuestion = false;
    let optionCount = 0;
    const optionRegex = /^\s*([A-Za-z][\.\)])/;

    for (let i = 0; i < text.length; i++) {
        const raw = text[i];
        const trimmed = raw.trim();

        if (/^câu\s+\d+/i.test(trimmed) && parseInt(trimmed.match(/\d+/)[0]) === questionNumber) {
            inQuestion = true;
            optionCount = 0;
            continue;
        }

        if (inQuestion && /^câu\s+\d+/i.test(trimmed)) {
            inQuestion = false;
        }

        if (!inQuestion) continue;

        if (optionRegex.test(trimmed)) {
            // current option index within this question
            const idx = optionCount;
            optionCount++;

            if (mode === 'statement') {
                if (idx === selectedIndex) {
                    // toggle star
                    if (trimmed.endsWith('*')) {
                        text[i] = raw.replace(/\*+\s*$/, '').replace(/\s+$/, '');
                    } else {
                        text[i] = raw + '*';
                    }
                }
            } else {
                // mc: remove * from all options in this question, then add to selected
                // remove star if present
                if (trimmed.endsWith('*')) {
                    text[i] = raw.replace(/\*+\s*$/, '').replace(/\s+$/, '');
                }
                if (idx === selectedIndex) {
                    text[i] = raw + '*';
                }
            }
        }
    }

    quizTextInput.value = text.join('\n');
    updatePreview();
}
// bổ sung hàm autoSuggestOptions
function autoSuggestOptions(e) {
    if (e.key !== 'Enter' || e.shiftKey) return;

    const start = quizTextInput.selectionStart;
    const text = quizTextInput.value;
    const beforeCursor = text.substring(0, start);
    const lastNewline = beforeCursor.lastIndexOf('\n');
    const line = beforeCursor.substring(lastNewline + 1).trim();

    setTimeout(() => {
        let newText = quizTextInput.value;
        const currentEnd = quizTextInput.selectionEnd;

        // Gõ "A." (chữ hoa + .) -> thêm B.\nC.\nD.
        if (/^A\.\s*$/i.test(line) && /^[A-Z]\.$/.test(line)) {
            newText = newText.substring(0, currentEnd) +
                'B.\nC.\nD.' +
                newText.substring(currentEnd);

            quizTextInput.value = newText;
            const newCursorPos = currentEnd + 2;
            quizTextInput.selectionStart = newCursorPos;
            quizTextInput.selectionEnd = newCursorPos;
            updatePreview();
            return;
        }

        // Gõ "a)" (chữ thường + )) -> thêm b)\nc)\nd)
        if (/^a\)\s*$/i.test(line)) {
            // preserve case: if user typed lowercase a) we insert lowercase b)...
            const isLower = /^[a-z]\)/.test(line);
            const b = isLower ? 'b)\nc)\nd)' : 'B)\nC)\nD)';
            newText = newText.substring(0, currentEnd) +
                b +
                newText.substring(currentEnd);

            quizTextInput.value = newText;
            const newCursorPos = currentEnd + 2;
            quizTextInput.selectionStart = newCursorPos;
            quizTextInput.selectionEnd = newCursorPos;
            updatePreview();
            return;
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

    const finalQuestionsToSave = (allParsedQuestions || []).filter(q => {
        // Nếu là statements (dùng a) b) c)...) => chấp nhận >=2 phát biểu và ít nhất 1 phát biểu có isCorrect === true
        if (q.type === 'statements_tf') {
            return Array.isArray(q.options) && q.options.length >= 2 && q.options.some(opt => opt.isCorrect === true);
        }
        // True/False (2-option kiểu Đúng/Sai) => cần 2 option và có đáp án đúng
        if (q.type === 'true_false') {
            return Array.isArray(q.options) && q.options.length === 2 && q.correctAnswer !== null;
        }
        // Multiple choice (A. B. C.) => giữ điều kiện cũ nhưng an toàn hơn
        if (q.optionFormat === 'letter_dot') {
            return Array.isArray(q.options) && q.options.length >= 2 && q.correctAnswer !== null;
        }
        if (q.optionFormat === 'letter_paren') {
            return Array.isArray(q.options) && q.options.length >= 2 && q.correctAnswer !== null;
        }
        return false;
    });

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