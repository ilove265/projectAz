
const tabs = document.querySelectorAll('.tab');
const contents = document.querySelectorAll('.content');

tabs.forEach((tab, index) => {
tab.addEventListener('click', () => {
// bỏ active ở tất cả tab và content
tabs.forEach(t => t.classList.remove('active'));
contents.forEach(c => c.classList.remove('active'));

// thêm active cho tab được chọn
tab.classList.add('active');
contents[index].classList.add('active');
    });
});
