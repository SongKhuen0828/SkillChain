# AD-F7: Certificate Minting Flow (确认版)

## 流程概述

证书铸造流程在课程完成时自动触发，将证书生成为NFT并铸造到区块链上。

## 完整流程步骤

### 1. 触发点 (Trigger Points)

证书铸造在以下两种情况下被触发：

**A. Quiz完成时（QuizPlayerPage.tsx）**
```typescript
// 文件: apps/web/src/pages/learner/QuizPlayerPage.tsx:208
await updateEnrollmentStatus(user.id, lessonData.modules.course_id);
```

**B. Lesson完成时（CoursePlayer.tsx）**
```typescript
// 文件: apps/web/src/pages/CoursePlayer.tsx
// 通过 updateEnrollmentStatus 间接触发
```

### 2. 课程完成检查 (checkCourseCompletion)

**文件**: `apps/web/src/lib/certificate.ts:25-82`

**逻辑**:
1. 查询课程所有模块和课程
   ```sql
   SELECT id, modules(id, lessons(id)) FROM courses WHERE id = ?
   ```
2. 获取用户已完成课程
   ```sql
   SELECT lesson_id FROM user_progress WHERE user_id = ? AND lesson_id IN (...)
   ```
3. 比较：`completedCount === totalCount` → `isCompleted = true`

**返回**: `{ isCompleted: boolean, completedCount: number, totalCount: number }`

### 3. 更新Enrollment状态 (updateEnrollmentStatus)

**文件**: `apps/web/src/lib/certificate.ts:88-140`

**逻辑**:
- 调用 `checkCourseCompletion()` 检查是否完成
- 如果完成，更新 `enrollments.status = 'completed'`
- **如果 `autoMintCertificate` 选项启用且提供了 `certificateElement`**:
  - 调用 `autoMintCertificate()` 函数

**注意**: 目前代码中 `updateEnrollmentStatus` 被调用时**没有传入 `autoMintCertificate: true`**，所以证书铸造需要手动触发或通过其他方式。

### 4. 自动铸造证书 (autoMintCertificate)

**文件**: `apps/web/src/lib/blockchain/autoMintCertificate.ts:25-174`

#### 4.1 预检查
- 再次检查课程完成状态
- 检查是否已有证书（`SELECT id, tx_hash FROM certificates WHERE user_id = ? AND course_id = ?`）
- 如果已有 `tx_hash`，返回现有证书

#### 4.2 生成证书图像
- 使用 `html2canvas` 将 `certificateElement` 渲染为 Canvas
- 转换为 Blob（PNG格式，quality 0.95）

#### 4.3 上传图像到IPFS
**文件**: `apps/web/src/lib/ipfs/pinata.ts:20-67`

- **API**: `POST https://api.pinata.cloud/pinning/pinFileToIPFS`
- **Headers**: `pinata_api_key`, `pinata_secret_api_key`
- **Body**: FormData (file + pinataMetadata + pinataOptions)
- **返回**: `{ IpfsHash: string }`
- **图像URL**: `ipfs://{hash}`

#### 4.4 准备元数据
```json
{
  "name": "SkillChain Certificate of Completion",
  "description": "This certifies that {studentName} has successfully completed the course \"{courseTitle}\"",
  "image": "ipfs://{imageHash}",
  "attributes": [
    { "trait_type": "Student Name", "value": "{studentName}" },
    { "trait_type": "Course Title", "value": "{courseTitle}" },
    { "trait_type": "Completion Date", "value": "{completionDate}" },
    { "trait_type": "Instructor", "value": "{educatorName}" },
    { "trait_type": "Certificate Type", "value": "Course Completion" }
  ]
}
```

#### 4.5 上传元数据到IPFS
**文件**: `apps/web/src/lib/ipfs/pinata.ts:76-117`

- **API**: `POST https://api.pinata.cloud/pinning/pinJSONToIPFS`
- **Headers**: `Content-Type: application/json`, `pinata_api_key`, `pinata_secret_api_key`
- **Body**: `{ pinataContent: metadata, pinataMetadata: {...}, pinataOptions: {...} }`
- **返回**: `{ IpfsHash: string }`
- **元数据URI**: `ipfs://{metadataHash}`

#### 4.6 获取学生钱包地址
- **查询**: `SELECT wallet_address FROM profiles WHERE id = ?`
- **Fallback**: `0x0000000000000000000000000000000000000000` (如果未绑定钱包)

#### 4.7 铸造NFT到区块链

**文件**: `apps/web/src/lib/blockchain/BlockchainService.ts:144-160`

**模式切换**:
- **Simulation模式**: `VITE_USE_SIMULATION === 'true' || !contractAddress`
- **Real模式**: 其他情况

**Simulation模式** (`BlockchainService.ts:37-56`):
- 延迟3秒（模拟网络延迟）
- 生成随机tx_hash（64 hex chars）
- 生成随机tokenId（1-1,000,000）
- 返回 `{ transactionHash, tokenId }`

**Real模式** (`BlockchainService.ts:62-139`):
- 使用 `ethers.js`
- Provider: `VITE_POLYGON_RPC_URL` 或默认 `https://rpc-amoy.polygon.technology`
- Wallet: 从 `VITE_ADMIN_PRIVATE_KEY` 创建
- Contract: `CertificateNFT.sol` at `VITE_CERTIFICATE_CONTRACT_ADDRESS`

**合约调用**:
```solidity
function mintCertificate(
    address learner,
    string memory learnerName,
    string memory courseTitle,
    string memory metadataURI
) external returns (uint256)
```

**参数**:
- `learner`: 学生钱包地址
- `learnerName`: 学生姓名
- `courseTitle`: 课程标题
- `metadataURI`: `ipfs://{metadataHash}`

**事件**:
```solidity
event CertificateMinted(
    uint256 indexed tokenId,
    address indexed learner,
    string courseTitle,
    uint256 completionDate
)
```

**Token ID获取**:
1. 从 `CertificateMinted` 事件解析 `tokenId`（优先）
2. 如果事件解析失败，使用 `receipt.blockNumber` 作为fallback

**返回**: `{ transactionHash: string, tokenId: bigint }`

#### 4.8 保存到数据库

**文件**: `apps/web/src/lib/blockchain/autoMintCertificate.ts:150-163`

```sql
INSERT INTO certificates (
    user_id,
    course_id,
    tx_hash,
    ipfs_hash,
    token_id,
    minted_at
) VALUES (?, ?, ?, ?, ?, NOW())
```

**字段**:
- `tx_hash`: 区块链交易哈希
- `ipfs_hash`: **元数据的IPFS哈希**（不是图像哈希）
- `token_id`: Token ID（字符串格式）

**错误处理**: 如果保存失败，只记录日志，不抛出错误（因为NFT已铸造）

## 数据流图

```
Course Completion
    ↓
checkCourseCompletion() → { isCompleted: true }
    ↓
updateEnrollmentStatus() → status = 'completed'
    ↓ (如果 autoMintCertificate 启用)
autoMintCertificate()
    ↓
1. 检查是否已有证书 → 如果有，返回
    ↓
2. html2canvas(certificateElement) → Canvas → Blob
    ↓
3. uploadImageToIPFS(blob) → imageHash
    ↓
4. 准备metadata JSON
    ↓
5. uploadMetadataToIPFS(metadata) → metadataHash
    ↓
6. SELECT wallet_address FROM profiles → studentWalletAddress
    ↓
7. mintCertificateNFT(...)
    ├─ Simulation: 生成假tx_hash和tokenId
    └─ Real: 调用合约 mintCertificate() → { txHash, tokenId }
    ↓
8. INSERT INTO certificates (...) → 保存到数据库
```

## 关键文件

| 文件 | 职责 |
|------|------|
| `apps/web/src/lib/certificate.ts` | 课程完成检查，Enrollment状态更新 |
| `apps/web/src/lib/blockchain/autoMintCertificate.ts` | 证书铸造编排（主流程） |
| `apps/web/src/lib/ipfs/pinata.ts` | IPFS上传（图像和元数据） |
| `apps/web/src/lib/blockchain/BlockchainService.ts` | 区块链铸造（Simulation/Real模式） |
| `packages/contracts/contracts/CertificateNFT.sol` | ERC-721智能合约 |

## 环境变量

| 变量 | 用途 | 必需 |
|------|------|------|
| `VITE_PINATA_API_KEY` | Pinata API密钥 | ✅ |
| `VITE_PINATA_SECRET_KEY` | Pinata Secret密钥 | ✅ |
| `VITE_CERTIFICATE_CONTRACT_ADDRESS` | 合约地址 | Real模式必需 |
| `VITE_ADMIN_PRIVATE_KEY` | Admin钱包私钥 | Real模式必需 |
| `VITE_POLYGON_RPC_URL` | Polygon RPC URL | Optional（有默认值） |
| `VITE_USE_SIMULATION` | 启用模拟模式 | Optional（默认false） |

## 当前问题 / 待确认

1. **证书铸造触发点**: `updateEnrollmentStatus` 目前调用时**没有传入 `autoMintCertificate: true`**，所以证书不会被自动铸造。需要：
   - 在 `QuizPlayerPage.tsx` 和 `CoursePlayer.tsx` 中传入正确的参数
   - 或者提供一个独立的触发点（如证书页面点击"Mint Certificate"按钮）

2. **证书元素**: `autoMintCertificate` 需要 `certificateElement: HTMLElement` 参数，需要确认在哪里获取这个元素。

3. **合约函数名**: `certificateMinting.ts` 中使用了错误的函数名 `issueCertificate`，应改为 `mintCertificate`（已修复）。

4. **Token ID解析**: Real模式下，如果事件解析失败，使用 `blockNumber` 作为fallback，这可能不准确。建议：
   - 改进事件解析逻辑
   - 或者添加合约视图函数 `getCertificateTokenId(address, string)`

## 验证清单

- [x] 课程完成检查逻辑正确
- [x] IPFS上传（图像和元数据）实现正确
- [x] Simulation模式工作正常
- [x] Real模式合约调用正确
- [x] 数据库保存字段正确
- [ ] 证书铸造自动触发（需要修复调用点）
- [ ] 证书元素获取（需要确认UI实现）

