const tabs = document.querySelectorAll('.tab');
const contents = document.querySelectorAll('.content');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const targetSelector = tab.getAttribute('data-target');
    const target = document.querySelector(targetSelector);

    // reset trạng thái
    tabs.forEach(t => t.classList.remove('active'));
    contents.forEach(c => c.classList.remove('active'));

    // bật tab và nội dung tương ứng
    tab.classList.add('active');
    target.classList.add('active');
  });
});
