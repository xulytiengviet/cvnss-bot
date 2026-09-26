# CVNSS Bot

CVNSS Bot là chatbot tiếng Việt dùng OpenRouter với API Key do từng người dùng tự cấu hình (BYOK). Câu trả lời cuối hiển thị Unicode tiếng Việt, còn phần nội dung reasoning do mô hình thực sự trả về được mã hóa bằng bộ chuyển đổi CVNSS4.0 v5.0 audit-safe.

## Triển khai Cloudflare Pages

Git repository: `xulytiengviet/cvnss-bot`; nhánh Production: `main`; Build command: `npm run build`; Build output directory: `public`; Root directory: `/`.

`functions/api/chat.js` triển khai Pages Function ở `/api/chat`, chuyển tiếp streaming đến OpenRouter. Không cần thiết lập OPENROUTER_API_KEY trong Cloudflare: người dùng nhập khóa riêng qua giao diện và khóa chỉ lưu trong bộ nhớ tab (không dùng localStorage). Không đưa khóa vào repository, URL hoặc log.

## Giới hạn quan trọng

Chỉ hiển thị văn bản giải thích/suy luận mà nhà cung cấp mô hình trả về, không thể truy cập suy luận nội bộ ẩn của mô hình. Chuyển mã CVNSS4.0 có thể có trường hợp nhập nhằng; bộ chuyển đổi áp dụng quy tắc canonical audit-safe.

## Bảo mật

Nếu bạn từng đặt OpenRouter API Key trong HTML công khai, hãy thu hồi khóa cũ trên OpenRouter và tạo khóa mới.
