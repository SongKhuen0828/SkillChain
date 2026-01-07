# 邮件服务配置指南

SkillChain 支持多种邮件服务提供商来发送欢迎邮件。你可以选择以下任一方案：

## 方案 1: SendGrid（推荐）⭐

**优点：**
- 免费层每月 100 封邮件
- API 简单易用
- 可靠性高
- 支持自定义域名

**配置步骤：**

1. 注册 SendGrid 账号：https://sendgrid.com/
2. 创建 API Key：
   - 进入 Settings → API Keys
   - 点击 "Create API Key"
   - 选择 "Full Access" 或 "Restricted Access" (Mail Send)
   - 复制生成的 API Key
3. 验证发件人邮箱（可选，但推荐）：
   - 进入 Settings → Sender Authentication
   - 验证你的域名或单个邮箱
4. 在 Supabase Dashboard 配置环境变量：
   - 进入 Project Settings → Edge Functions → create-org-admin
   - 添加以下 Secrets：
     ```
     SENDGRID_API_KEY=你的_SendGrid_API_Key
     SENDGRID_FROM_EMAIL=noreply@yourdomain.com  # 可选，默认 noreply@skillchain.app
     SENDGRID_FROM_NAME=SkillChain  # 可选，默认 SkillChain
     ```

## 方案 2: Resend

**优点：**
- 免费层每月 3,000 封邮件
- 开发者友好
- 支持测试域名（无需验证）

**配置步骤：**

1. 注册 Resend 账号：https://resend.com/
2. 获取 API Key：
   - 进入 API Keys 页面
   - 创建新的 API Key
   - 复制 API Key
3. 在 Supabase Dashboard 配置：
   ```
   RESEND_API_KEY=你的_Resend_API_Key
   RESEND_FROM_EMAIL=SkillChain <onboarding@resend.dev>  # 可选，使用测试域名
   ```

**注意：** 如果要使用自定义域名，需要在 Resend 中验证域名。

## 方案 3: Mailgun

**优点：**
- 免费层每月 5,000 封邮件（前 3 个月）
- 之后每月 1,000 封免费
- 强大的 API

**配置步骤：**

1. 注册 Mailgun 账号：https://www.mailgun.com/
2. 获取 API Key：
   - 进入 Sending → API Keys
   - 复制 Private API Key
3. 验证域名（必需）：
   - 进入 Sending → Domains
   - 添加并验证你的域名
4. 在 Supabase Dashboard 配置：
   ```
   MAILGUN_API_KEY=你的_Mailgun_API_Key
   MAILGUN_DOMAIN=yourdomain.com
   MAILGUN_FROM_EMAIL=noreply@yourdomain.com
   ```

**注意：** 需要在代码中添加 Mailgun 支持（当前代码未包含，需要额外开发）。

## 方案 4: AWS SES

**优点：**
- 非常便宜（$0.10 per 1,000 emails）
- 高可靠性
- 适合大规模发送

**配置步骤：**

1. 在 AWS 控制台设置 SES
2. 验证发件人邮箱或域名
3. 创建 IAM 用户并获取 Access Key
4. 在 Supabase Dashboard 配置：
   ```
   AWS_SES_ACCESS_KEY_ID=你的_AWS_Access_Key
   AWS_SES_SECRET_ACCESS_KEY=你的_AWS_Secret_Key
   AWS_SES_REGION=us-east-1
   AWS_SES_FROM_EMAIL=noreply@yourdomain.com
   ```

**注意：** 需要在代码中添加 AWS SES 支持（当前代码未包含，需要额外开发）。

## 方案 5: Gmail SMTP（仅用于测试）

**优点：**
- 免费
- 简单易用

**缺点：**
- 每日发送限制（500 封/天）
- 不适合生产环境
- 需要启用"应用专用密码"

**配置步骤：**

1. 在 Google 账号中启用两步验证
2. 生成应用专用密码：
   - 进入 Google Account → Security → App passwords
   - 创建新的应用专用密码
3. 在 Supabase Dashboard 配置：
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=你的_应用专用密码
   SMTP_FROM=your-email@gmail.com
   ```

**注意：** 当前代码中的 SMTP 支持需要额外的服务网关。建议使用 SendGrid 或 Resend。

## 推荐配置顺序

系统会按以下顺序尝试发送邮件：

1. **SendGrid** (如果配置了 `SENDGRID_API_KEY`)
2. **Resend** (如果配置了 `RESEND_API_KEY`)
3. **SMTP** (如果配置了 `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`)

## 快速开始（推荐使用 SendGrid）

1. 注册 SendGrid：https://sendgrid.com/free/
2. 创建 API Key
3. 在 Supabase Dashboard → Edge Functions → create-org-admin → Secrets 中添加：
   ```
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
   ```
4. 重新部署 Edge Function（如果需要）
5. 测试创建组织，检查邮件是否发送成功

## 测试邮件发送

创建组织后，系统会返回：
- `emailSent: true/false` - 邮件是否发送成功
- `emailProvider: "SendGrid" | "Resend" | "none"` - 使用的邮件服务
- `emailError: null | string` - 错误信息（如果有）

如果邮件发送失败，系统仍会返回 `tempPassword`，你可以手动分享给组织管理员。

## 故障排除

**问题：邮件未发送**
- 检查环境变量是否正确配置
- 检查 API Key 是否有效
- 查看 Edge Function 日志中的错误信息

**问题：邮件进入垃圾箱**
- 验证发件人域名（SPF, DKIM, DMARC）
- 使用专业的邮件服务（SendGrid, Mailgun）而不是 Gmail SMTP

**问题：API 限制**
- SendGrid 免费层：100 封/月
- Resend 免费层：3,000 封/月
- 如需更多，考虑升级到付费计划

