# 邮件发送配置（简化版）

SkillChain 支持两种邮件发送方式：

## 方案 1: SendGrid（推荐）⭐

**优点：**
- 免费层每月 100 封邮件
- API 简单易用
- 可靠性高

**配置步骤：**

1. 注册 SendGrid：https://sendgrid.com/free/
2. 创建 API Key：
   - Settings → API Keys → Create API Key
   - 选择 "Full Access" 或 "Restricted Access" (Mail Send)
   - 复制 API Key
3. 在 Supabase Dashboard 配置：
   - Settings → Edge Functions → create-org-admin → Secrets
   - 添加：
     ```
     SENDGRID_API_KEY=SG.你的_API_Key
     SENDGRID_FROM_EMAIL=noreply@yourdomain.com  # 可选
     SENDGRID_FROM_NAME=SkillChain  # 可选
     ```

## 方案 2: SMTP

**支持的 SMTP 服务：**
- Mailgun（推荐，免费 5,000 封/月）
- SMTP2GO（推荐，免费 1,000 封/月）
- Gmail（仅测试，每日 500 封限制）

**配置步骤：**

1. 选择 SMTP 服务并获取配置信息
2. 在 Supabase Dashboard 配置：
   ```
   SMTP_HOST=smtp.mailgun.org  # 或 smtp.smtp2go.com
   SMTP_PORT=587
   SMTP_USER=你的用户名
   SMTP_PASSWORD=你的密码
   SMTP_FROM=noreply@yourdomain.com
   SMTP_FROM_NAME=SkillChain
   ```

## 邮件发送优先级

系统会按以下顺序尝试：
1. **SendGrid** (如果配置了 `SENDGRID_API_KEY`)
2. **SMTP** (如果配置了 `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`)

如果都没有配置，系统会返回密码，你可以手动分享给组织管理员。

## 快速开始

**最简单的方式：使用 SendGrid**

1. 注册 SendGrid（免费）
2. 创建 API Key
3. 在 Supabase 添加 `SENDGRID_API_KEY`
4. 完成！

---

**注意：** Supabase 本身不提供自定义邮件发送功能，只能通过 Edge Functions 调用外部服务。

