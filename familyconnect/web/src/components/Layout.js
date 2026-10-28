// Menu dùng chung: điền vào <aside id="sidebar"> và đánh dấu trang hiện tại theo <body data-page="...">.
// Hiện là script thường (chạy được khi mở file trực tiếp); sau này có thể chuyển thành ES module.
(function () {
  var items = [
    ['dashboard', 'Tổng quan', 'dashboard.html'],
    ['tree', 'Cây gia phả', 'tree.html'],
    ['members', 'Danh bạ', 'members.html'],
    ['feed', 'Bảng tin', 'feed.html'],
    ['events', 'Sự kiện', 'events.html'],
    ['heritage', 'Di sản số', 'heritage.html'],
    ['admin', 'Quản trị', 'admin.html']
  ];
  var box = document.getElementById('sidebar');
  if (!box) return;
  var page = document.body.getAttribute('data-page');
  var html = '<div class="brand">FamilyConnect</div><nav>';
  items.forEach(function (i) {
    html += '<a href="' + i[2] + '"' + (i[0] === page ? ' class="active"' : '') + '>' + i[1] + '</a>';
  });
  box.innerHTML = html + '</nav><a href="index.html">Đăng xuất</a>';
})();
