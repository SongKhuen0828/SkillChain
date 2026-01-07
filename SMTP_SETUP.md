# SMTP 邮件服务配置指南

SkillChain 支持通过 SMTP 发送邮件。由于 Deno Edge Functions 环境的限制，我们优先使用支持 HTTP API 的 SMTP 服务。

## 推荐方案

### 方案 1: Mailgun（推荐）⭐

**优点：**
- 免费层：前 3 个月每月 5,000 封，之后每月 1,000 封
- 支持 SMTP 和 HTTP API
- 可靠性高
- 易于配置

**配置步骤：**

1. **注册 Mailgun 账号**：https://www.mailgun.com/
2. **验证域名**（必需）：
   - 进入 Sending → Domains
   - 添加你的域名（如 `skillchain.app`）
   - 按照提示添加 DNS 记录（SPF, DKIM, DMARC）
   - 等待验证完成（通常几分钟）
3. **获取 SMTP 凭证**：
   - 进入 Sending → Domain Settings → SMTP credentials
   - 默认用户名：`postmaster@mg.yourdomain.com`
   - 默认密码：在 Domain Settings 中显示
4. **在 Supabase Dashboard 配置**：
   ```
   SMTP_HOST=smtp.mailgun.org
   SMTP_PORT=587
   SMTP_USER=postmaster@mg.yourdomain.com
   SMTP_PASSWORD=你的_Mailgun_SMTP_密码
   SMTP_FROM=noreply@yourdomain.com
   SMTP_FROM_NAME=SkillChain
   SMTP_SECURE=true
   ```

**注意：** 系统会自动检测 Mailgun 并使用其 HTTP API（更可靠）。

### 方案 2: SMTP2GO

**优点：**
- 免费层：每月 1,000 封邮件
- 支持 HTTP API
- 简单易用

**配置步骤：**

1. **注册 SMTP2GO 账号**：https://www.smtp2go.com/
2. **创建 API Key**：
   - 进入 Settings → API Keys
   - 创建新的 API Key
3. **在 Supabase Dashboard 配置**：
   ```
   SMTP_HOST=smtp.smtp2go.com
   SMTP_PORT=587
   SMTP_USER=你的_SMTP2GO_用户名
   SMTP_PASSWORD=你的_SMTP2GO_API_Key
   SMTP_FROM=noreply@yourdomain.com
   SMTP_FROM_NAME=SkillChain
   SMTP_SECURE=true
   ```

### 方案 3: Gmail SMTP（仅用于测试）

**优点：**
- 免费
- 简单

**缺点：**
- 每日限制 500 封
- 需要"应用专用密码"
- 不适合生产环境

**配置步骤：**

1. **启用两步验证**：Google Account → Security → 2-Step Verification
2. **生成应用专用密码**：
   - Google Account → Security → App passwords
   - 创建新的应用专用密码
   - 复制生成的 16 位密码
3. **在 Supabase Dashboard 配置**：
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=你的_16位_应用专用密码
   SMTP_FROM=your-email@gmail.com
   SMTP_FROM_NAME=SkillChain
   SMTP_SECURE=true
   ```

**注意：** Gmail SMTP 在 Edge Functions 中可能无法直接使用，建议使用 Mailgun 或 SMTP2GO。

### 方案 4: Outlook/Hotmail SMTP

**配置：**
```
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=你的_Outlook_密码
SMTP_FROM=your-email@outlook.com
SMTP_FROM_NAME=SkillChain
SMTP_SECURE=true
```

**注意：** 同样可能受 Edge Functions 限制，建议使用 Mailgun。

### 方案 5: 自定义 SMTP 服务器

如果你的公司有自己的 SMTP 服务器：

```
SMTP_HOST=mail.yourcompany.com
SMTP_PORT=587
SMTP_USER=noreply@yourcompany.com
SMTP_PASSWORD=你的_SMTP_密码
SMTP_FROM=noreply@yourcompany.com
SMTP_FROM_NAME=SkillChain
SMTP_SECURE=true
```

**注意：** 自定义 SMTP 服务器在 Edge Functions 中可能无法直接连接。建议：
- 使用支持 HTTP API 的服务（Mailgun, SMTP2GO）
- 或者使用一个 SMTP-to-HTTP 网关服务

## 环境变量说明

在 Supabase Dashboard → Edge Functions → create-org-admin → Secrets 中配置：

| 变量名 | 说明 | 必需 | 示例 |
|--------|------|------|------|
| `SMTP_HOST` | SMTP 服务器地址 | ✅ | `smtp.mailgun.org` |
| `SMTP_PORT` | SMTP 端口（通常 587 或 465） | ✅ | `587` |
| `SMTP_USER` | SMTP 用户名 | ✅ | `postmaster@mg.yourdomain.com` |
| `SMTP_PASSWORD` | SMTP 密码或 API Key | ✅ | `your-password-or-api-key` |
| `SMTP_FROM` | 发件人邮箱地址 | ❌ | `noreply@yourdomain.com` |
| `SMTP_FROM_NAME` | 发件人名称 | ❌ | `SkillChain` |
| `SMTP_SECURE` | 是否使用 TLS（默认 true） | ❌ | `true` |

## 系统优先级

系统会按以下顺序尝试发送邮件：

1. **SendGrid** (如果配置了 `SENDGRID_API_KEY`)
2. **Resend** (如果配置了 `RESEND_API_KEY`)
3. **SMTP** (如果配置了 `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`)

## 快速开始（推荐使用 Mailgun）

1. **注册 Mailgun**：https://www.mailgun.com/
2. **验证域名**（添加 DNS 记录）
3. **获取 SMTP 凭证**（Domain Settings → SMTP credentials）
4. **在 Supabase Dashboard 配置**：
   - Project Settings → Edge Functions → create-org-admin → Secrets
   - 添加所有 `SMTP_*` 环境变量
5. **测试**：创建组织，检查邮件是否发送成功

## 故障排除

### 问题：邮件未发送

**检查清单：**
- ✅ 所有必需的环境变量都已配置
- ✅ SMTP 凭证正确（用户名、密码）
- ✅ 端口号正确（587 用于 STARTTLS，465 用于 SSL）
- ✅ 发件人邮箱已验证（对于 Mailgun）
- ✅ 查看 Edge Function 日志中的错误信息

### 问题：认证失败

- **Gmail/Outlook**：确保使用"应用专用密码"，不是普通密码
- **Mailgun**：确保使用 SMTP 密码，不是 API Key（虽然系统会自动检测并使用 HTTP API）
- **自定义服务器**：检查用户名格式是否正确

### 问题：连接超时

- **Edge Functions 限制**：Deno Edge Functions 可能无法直接连接某些 SMTP 服务器
- **解决方案**：使用支持 HTTP API 的服务（Mailgun, SMTP2GO）
- **防火墙**：确保 SMTP 端口未被阻止

### 问题：邮件进入垃圾箱

- **SPF/DKIM/DMARC**：确保正确配置 DNS 记录
- **发件人域名**：使用已验证的域名发送
- **内容**：避免使用垃圾邮件关键词

## 推荐配置（生产环境）

对于生产环境，强烈推荐：

1. **Mailgun** + 已验证的自定义域名
2. 配置 SPF, DKIM, DMARC DNS 记录
3. 使用专业的发件人地址（如 `noreply@yourdomain.com`）
4. 监控邮件发送状态和退信率

## 测试邮件发送

创建组织后，系统会返回：
- `emailSent: true/false` - 邮件是否发送成功
- `emailProvider: "SMTP"` - 使用的邮件服务
- `emailError: null | string` - 错误信息（如果有）

如果邮件发送失败，系统仍会返回 `tempPassword`，你可以手动分享给组织管理员。

