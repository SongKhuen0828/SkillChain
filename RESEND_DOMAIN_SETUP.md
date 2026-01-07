# Resend 域名配置指南

本指南将帮助你配置 Resend 使用自定义域名发送邮件。

## 📋 前置要求

1. 已注册 Resend 账号：https://resend.com/
2. 拥有一个域名（例如：`skillchain.app`）
3. 可以访问域名的 DNS 设置

---

## 🚀 步骤 1: 在 Resend 中添加域名

### 1.1 登录 Resend Dashboard

访问 https://resend.com/domains 并登录你的账号。

### 1.2 添加域名

1. 点击 **"Add Domain"** 按钮
2. 输入你的域名（例如：`skillchain.app`）
3. 点击 **"Add"**

### 1.3 配置 DNS 记录

Resend 会显示需要添加的 DNS 记录。通常包括：

#### **SPF 记录**（验证发件人）
```
类型: TXT
名称: @ (或根域名)
值: v=spf1 include:_spf.resend.com ~all
TTL: 3600
```

#### **DKIM 记录**（邮件签名）
```
类型: TXT
名称: resend._domainkey (或类似)
值: [Resend 提供的长字符串]
TTL: 3600
```

#### **DMARC 记录**（可选，但推荐）
```
类型: TXT
名称: _dmarc
值: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com
TTL: 3600
```

### 1.4 在域名提供商处添加 DNS 记录

1. 登录你的域名提供商（如 Cloudflare, GoDaddy, Namecheap 等）
2. 进入 DNS 管理页面
3. 添加 Resend 要求的所有 DNS 记录
4. 等待 DNS 传播（通常 5-30 分钟）

### 1.5 验证域名

1. 返回 Resend Dashboard
2. 点击域名旁边的 **"Verify"** 按钮
3. 等待验证完成（绿色勾号 ✅）

---

## 🔑 步骤 2: 获取 Resend API Key

1. 访问 https://resend.com/api-keys
2. 点击 **"Create API Key"**
3. 输入名称（例如：`SkillChain Production`）
4. 选择权限：**"Sending access"** 或 **"Full access"**
5. 复制生成的 API Key（格式：`re_xxxxxxxxxxxxx`）
   - ⚠️ **重要**：API Key 只显示一次，请妥善保存

---

## ⚙️ 步骤 3: 在 Supabase 中配置环境变量

### 3.1 进入 Supabase Dashboard

1. 访问 https://supabase.com/dashboard
2. 选择你的项目
3. 进入 **Settings** → **Edge Functions**
4. 找到 `create-org-admin` 函数

### 3.2 添加 Secrets

点击 **"Secrets"** 标签，添加以下环境变量：

```bash
# Resend API Key（必需）
RESEND_API_KEY=re_xxxxxxxxxxxxx

# 发件人邮箱（使用你验证的域名）
RESEND_FROM_EMAIL=SkillChain <noreply@skillchain.app>
# 或者
RESEND_FROM_EMAIL=noreply@skillchain.app
```

**注意：**
- `RESEND_FROM_EMAIL` 中的邮箱必须使用你验证过的域名
- 格式可以是：`Name <email@domain.com>` 或 `email@domain.com`
- 如果不设置 `RESEND_FROM_EMAIL`，默认会使用 `onboarding@resend.dev`（测试域名）

---

## 🧪 步骤 4: 测试邮件发送

### 4.1 重新部署 Edge Function（如果需要）

如果修改了环境变量，可能需要重新部署：

```bash
# 在项目根目录
cd supabase/functions/create-org-admin
supabase functions deploy create-org-admin
```

### 4.2 测试创建组织

1. 在 SkillChain 管理后台创建新组织
2. 输入组织名称和管理员邮箱
3. 检查返回结果中的 `emailProvider` 应该是 `"Resend"`
4. 检查管理员邮箱是否收到欢迎邮件

---

## 📧 邮件发送优先级

系统会按以下顺序尝试发送邮件：

1. **SendGrid** (如果配置了 `SENDGRID_API_KEY`)
2. **Resend** (如果配置了 `RESEND_API_KEY`) ← 你正在配置这个
3. **SMTP** (如果配置了 `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`)

如果 SendGrid 未配置，系统会自动使用 Resend。

---

## 🔍 故障排除

### 问题 1: 域名验证失败

**症状：** Resend 显示域名未验证

**解决方案：**
- 检查 DNS 记录是否正确添加
- 等待 DNS 传播（最多 48 小时）
- 使用 `dig` 或 `nslookup` 检查 DNS 记录是否生效
- 确保 DNS 记录的 TTL 不是太长（建议 3600 秒）

### 问题 2: 邮件发送失败，错误 "Domain not verified"

**症状：** API 返回 403 错误

**解决方案：**
- 确保 `RESEND_FROM_EMAIL` 使用的域名已在 Resend 中验证
- 检查域名验证状态是否为 "Verified" ✅
- 确保 API Key 有发送邮件的权限

### 问题 3: 邮件进入垃圾箱

**症状：** 邮件发送成功但进入收件人垃圾箱

**解决方案：**
- 确保所有 DNS 记录（SPF, DKIM, DMARC）都已正确配置
- 使用专业的发件人名称（如 `SkillChain <noreply@skillchain.app>`）
- 避免使用 `noreply` 等可能被标记为垃圾邮件的地址
- 考虑使用 `hello@skillchain.app` 或 `support@skillchain.app`

### 问题 4: API Key 无效

**症状：** 401 Unauthorized 错误

**解决方案：**
- 检查 API Key 是否正确复制（没有多余空格）
- 确保 API Key 有 "Sending access" 权限
- 如果 API Key 泄露，删除并创建新的

---

## 📝 完整配置示例

### Supabase Edge Function Secrets

```bash
# Resend 配置
RESEND_API_KEY=re_AbCdEfGhIjKlMnOpQrStUvWxYz1234567890
RESEND_FROM_EMAIL=SkillChain <noreply@skillchain.app>
RESEND_FROM_NAME=SkillChain  # 可选，如果 from 格式是 Name <email>
```

### 代码中的使用

当前代码会自动使用 Resend（如果配置了 `RESEND_API_KEY`）：

```typescript
// 在 supabase/functions/create-org-admin/index.ts 中
const resendApiKey = Deno.env.get("RESEND_API_KEY");
const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "SkillChain <onboarding@resend.dev>";

if (resendApiKey) {
  const emailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,  // 使用你验证的域名
      to: [contactEmail],
      subject: emailSubject,
      html: emailHtml,
    }),
  });
}
```

---

## ✅ 验证清单

完成以下所有步骤后，你的 Resend 配置就完成了：

- [ ] 在 Resend 中添加并验证域名
- [ ] 所有 DNS 记录（SPF, DKIM）已添加
- [ ] 域名验证状态为 "Verified" ✅
- [ ] 已创建 Resend API Key
- [ ] 在 Supabase Edge Functions 中添加了 `RESEND_API_KEY`
- [ ] 在 Supabase Edge Functions 中添加了 `RESEND_FROM_EMAIL`（使用验证的域名）
- [ ] 测试创建组织，邮件发送成功
- [ ] 邮件正常到达收件箱（不在垃圾箱）

---

## 🎉 完成！

配置完成后，系统会自动使用 Resend 发送组织创建欢迎邮件。所有邮件都会从你验证的域名发送，提高邮件送达率和可信度。

如有问题，请查看：
- Resend 文档：https://resend.com/docs
- Supabase Edge Functions 文档：https://supabase.com/docs/guides/functions

