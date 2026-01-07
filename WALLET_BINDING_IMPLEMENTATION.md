# Wallet Binding Implementation

## 概述
实现了用户钱包绑定功能，使证书NFT可以直接铸造到用户的钱包地址。

## 数据库变更

### Migration: `supabase/migrations/add_wallet_address.sql`
- 添加 `wallet_address TEXT` 列到 `profiles` 表
- 添加索引 `idx_profiles_wallet_address` (仅对非空值)
- 添加列注释说明用途

## 代码变更

### 1. 类型定义更新
**文件**: `apps/web/src/lib/supabase.ts`
- `UserProfile` 接口添加 `wallet_address?: string` 字段

### 2. Settings 页面钱包连接
**文件**: `apps/web/src/pages/learner/Settings.tsx`

#### 新增状态:
- `walletAddress`: 当前绑定的钱包地址
- `connectingWallet`: 连接中状态
- `disconnectingWallet`: 断开中状态

#### 新增功能:
- **连接钱包**: 使用 thirdweb 检测并连接 MetaMask 等钱包
- **显示钱包地址**: 连接后显示完整地址（可复制）
- **断开钱包**: 清除绑定的钱包地址
- **区块浏览器链接**: 在 Polygon Amoy Explorer 查看地址

#### UI组件:
- 新增 "Wallet Connection" Card（在 Privacy & Security 之前）
- 未连接: 显示说明和 "Connect Wallet" 按钮
- 已连接: 显示地址、复制按钮、Explorer链接、断开按钮

### 3. 证书铸造集成
**文件**: `apps/web/src/lib/blockchain/autoMintCertificate.ts`
- 已支持读取 `profiles.wallet_address`
- 如果地址存在，使用用户钱包地址
- 如果不存在，使用零地址（现在用户可以绑定了）

## 工作流程

1. 用户在 Settings 页面点击 "Connect Wallet"
2. 系统检测可用的 Web3 钱包（MetaMask等）
3. 用户授权连接钱包
4. 钱包地址保存到 `profiles.wallet_address`
5. 当用户完成课程时，证书NFT铸造到该钱包地址

## 环境变量

需要配置（可选，thirdweb 连接可能需要）:
- `VITE_THIRDWEB_CLIENT_ID`: Thirdweb Client ID

## 测试步骤

1. 运行数据库迁移:
   ```bash
   supabase migration up
   ```

2. 在 Settings 页面测试钱包连接
3. 完成一个课程，验证证书是否铸造到连接的钱包地址

## 注意事项

- 钱包地址以 EIP-55 格式存储（checksummed）
- 支持 Polygon Amoy 测试网
- 用户可以随时断开钱包（设置为 null）
- 证书铸造会优先使用用户钱包地址，未绑定则使用零地址
