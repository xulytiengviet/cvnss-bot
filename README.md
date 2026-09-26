# CVNSS Bot

Trò chuyện tiếng Việt qua OpenRouter (người dùng tự nhập API Key), hiển thị phần giải thích/suy luận do mô hình trả về dưới dạng CVNSS4.0 và câu trả lời cuối bằng Unicode tiếng Việt.

Triển khai trên Cloudflare Pages, xuất bản thư mục `public`. API `/api/chat` chạy bằng Pages Function. Không đưa API Key vào mã nguồn.

Lưu ý: không phải mô hình nào cũng cung cấp nội dung reasoning; không thể xem toàn bộ suy luận nội bộ của mô hình.
